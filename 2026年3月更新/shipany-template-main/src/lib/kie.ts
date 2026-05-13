/**
 * kie.ts — kie.ai API service module
 *
 * Docs: https://docs.kie.ai/market/google/nanobanana2
 * Task status: https://docs.kie.ai/market/common/get-task-detail
 */

const BASE_URL = process.env.KIE_BASE_URL ?? 'https://api.kie.ai';
const API_KEY  = process.env.KIE_API_KEY ?? '';

async function kieRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  if (!API_KEY) throw new Error('KIE_API_KEY is not configured');

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`kie.ai ${options.method ?? 'GET'} ${path} failed (${res.status}): ${text.slice(0, 300)}`);
  }

  const json = await res.json();

  // kie.ai wraps all responses in { code, msg, data }
  // Treat any non-200 code as an error
  if (json.code !== 200 && json.code !== 0) {
    throw new Error(`kie.ai error ${json.code}: ${json.msg ?? 'unknown'}`);
  }

  return json as T;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type KieTaskState = 'waiting' | 'queuing' | 'generating' | 'success' | 'fail';

export interface CreateNanoBananaParams {
  prompt: string;
  /** Reference image URLs (up to 14) */
  imageInput?: string[];
  /** e.g. "1:1" | "9:16" | "16:9" | "3:4" | "4:3" | "2:3" | "3:2" | "auto" */
  aspectRatio?: string;
  /** "1K" | "2K" | "4K" — default "1K" */
  resolution?: string;
  /** "png" | "jpg" — default "jpg" */
  outputFormat?: string;
  /** Webhook URL called on completion */
  callBackUrl?: string;
}

export interface CreateTaskResponse {
  code: number;
  msg: string;
  data: { taskId: string };
}

export interface TaskStatusResponse {
  code: number;
  msg: string;
  data: {
    taskId: string;
    model: string;
    state: KieTaskState;
    resultJson: string; // JSON string: { resultUrls: string[] }
    failCode?: string;
    failMsg?: string;
    progress?: number;
    creditsConsumed?: number;
  };
}

export interface TaskResult {
  state: KieTaskState;
  /** Populated when state === 'success' */
  resultUrls: string[];
  failMsg?: string;
  progress?: number;
}

// ── API methods ───────────────────────────────────────────────────────────────

// ── Unified image task ────────────────────────────────────────────────────────

export type ImageModelSlug =
  | 'nano-banana-pro'
  | 'gpt-image-2'
  | 'flux-2-pro'
  | 'ideogram-v3'
  | 'seedream5'
  | 'ai-image-upscaler';

export interface CreateImageTaskParams {
  modelSlug:    ImageModelSlug;
  mode:         'text-to-image' | 'image-to-image';
  prompt:       string;
  imageUrls?:   string[];
  /** e.g. "1:1" | "9:16" | "16:9" */
  aspectRatio?: string;
  /** 'sd' | 'hd2k' | 'uhd4k' | 'basic' | 'high' | '2' | '4' */
  resolution?:  string;
  /** Seedream 5 only: enable NSFW content filter */
  nsfwChecker?: boolean;
}

const RESOLUTION_TO_KIE: Record<string, string> = { sd: '1K', hd2k: '2K', uhd4k: '4K' };

// Ideogram v3 uses image_size instead of aspect_ratio
const IDEOGRAM_SIZE_MAP: Record<string, string> = {
  '1:1':  'square_hd',
  '9:16': 'portrait_16_9',
  '16:9': 'landscape_16_9',
  '3:4':  'portrait_4_3',
  '4:3':  'landscape_4_3',
};
const IDEOGRAM_SPEED_MAP: Record<string, string> = { sd: 'BALANCED', hd2k: 'QUALITY', uhd4k: 'QUALITY' };

export async function createImageTask(params: CreateImageTaskParams): Promise<string> {
  const { modelSlug, mode, prompt, imageUrls, aspectRatio, resolution } = params;
  const isI2I = mode === 'image-to-image' && (imageUrls?.length ?? 0) > 0;

  let kieModel: string;
  let input: Record<string, unknown>;

  switch (modelSlug) {
    case 'nano-banana-pro':
      kieModel = 'nano-banana-2';
      input = {
        prompt,
        ...(isI2I && imageUrls?.length ? { image_input: imageUrls } : {}),
        ...(aspectRatio ? { aspect_ratio: aspectRatio } : {}),
        resolution: RESOLUTION_TO_KIE[resolution ?? 'sd'] ?? '1K',
      };
      break;

    case 'gpt-image-2':
      kieModel = isI2I ? 'gpt-image-2-image-to-image' : 'gpt-image-2-text-to-image';
      input = {
        prompt,
        ...(isI2I && imageUrls?.length ? { input_urls: imageUrls } : {}),
        ...(aspectRatio ? { aspect_ratio: aspectRatio } : {}),
        resolution: RESOLUTION_TO_KIE[resolution ?? 'sd'] ?? '1K',
      };
      break;

    case 'flux-2-pro':
      kieModel = isI2I ? 'flux-2/pro-image-to-image' : 'flux-2/pro-text-to-image';
      input = {
        prompt,
        ...(isI2I && imageUrls?.length ? { input_urls: imageUrls } : {}),
        aspect_ratio: aspectRatio ?? '1:1',
        resolution:   RESOLUTION_TO_KIE[resolution ?? 'sd'] === '4K'
          ? '2K'  // Flux max is 2K
          : (RESOLUTION_TO_KIE[resolution ?? 'sd'] ?? '1K'),
      };
      break;

    case 'ideogram-v3':
      kieModel = 'ideogram/v3-text-to-image';
      input = {
        prompt,
        image_size:       IDEOGRAM_SIZE_MAP[aspectRatio ?? '1:1'] ?? 'square_hd',
        rendering_speed:  IDEOGRAM_SPEED_MAP[resolution ?? 'sd']  ?? 'BALANCED',
        expand_prompt:    true,
      };
      break;

    case 'seedream5':
      kieModel = isI2I ? 'seedream/5-lite-image-to-image' : 'seedream/5-lite-text-to-image';
      input = {
        prompt,
        ...(isI2I && imageUrls?.length ? { image_urls: imageUrls } : {}),
        aspect_ratio: aspectRatio ?? '1:1',
        quality:      ['basic', 'high'].includes(resolution ?? '') ? resolution : 'basic',
        ...(params.nsfwChecker !== undefined ? { nsfw_checker: params.nsfwChecker } : {}),
      };
      break;

    case 'ai-image-upscaler':
      kieModel = 'topaz/image-upscale';
      input = {
        image_url:       imageUrls?.[0] ?? '',
        upscale_factor:  ['1', '2', '4', '8'].includes(resolution ?? '') ? resolution : '2',
      };
      break;

    default:
      throw new Error(`Unknown model slug: ${modelSlug}`);
  }

  const res = await kieRequest<CreateTaskResponse>(
    '/api/v1/jobs/createTask',
    { method: 'POST', body: JSON.stringify({ model: kieModel, input }) }
  );

  if (!res.data?.taskId) throw new Error('kie.ai did not return a taskId');
  return res.data.taskId;
}

// ── Seedream 5 standalone ─────────────────────────────────────────────────────

export interface CreateSeedream5Params {
  mode:          'text-to-image' | 'image-to-image';
  prompt:        string;
  imageUrls?:    string[];
  aspectRatio?:  string;
  quality?:      'basic' | 'high';
  nsfwChecker?:  boolean;
}

export async function createSeedream5Task(params: CreateSeedream5Params): Promise<string> {
  const isI2I = params.mode === 'image-to-image' && (params.imageUrls?.length ?? 0) > 0;
  const model  = isI2I ? 'seedream/5-lite-image-to-image' : 'seedream/5-lite-text-to-image';
  const input: Record<string, unknown> = {
    prompt:       params.prompt,
    aspect_ratio: params.aspectRatio ?? '1:1',
    quality:      params.quality ?? 'basic',
    ...(isI2I && params.imageUrls?.length ? { image_urls: params.imageUrls } : {}),
    ...(params.nsfwChecker !== undefined ? { nsfw_checker: params.nsfwChecker } : {}),
  };

  const res = await kieRequest<CreateTaskResponse>(
    '/api/v1/jobs/createTask',
    { method: 'POST', body: JSON.stringify({ model, input }) }
  );
  if (!res.data?.taskId) throw new Error('kie.ai did not return a taskId');
  return res.data.taskId;
}

// ── Topaz Image Upscale standalone ────────────────────────────────────────────

export interface CreateImageUpscaleParams {
  imageUrl:      string;
  upscaleFactor?: '1' | '2' | '4' | '8';
}

export async function createImageUpscaleTask(params: CreateImageUpscaleParams): Promise<string> {
  const input = {
    image_url:     params.imageUrl,
    upscale_factor: params.upscaleFactor ?? '2',
  };

  const res = await kieRequest<CreateTaskResponse>(
    '/api/v1/jobs/createTask',
    { method: 'POST', body: JSON.stringify({ model: 'topaz/image-upscale', input }) }
  );
  if (!res.data?.taskId) throw new Error('kie.ai did not return a taskId');
  return res.data.taskId;
}

// ── Nano Banana (legacy, kept for existing /api/nano-banana routes) ───────────

/** Create a Nano Banana 2 image generation task. Returns taskId. */
export async function createNanoBananaTask(
  params: CreateNanoBananaParams
): Promise<string> {
  const body: Record<string, unknown> = {
    model: 'nano-banana-2',
    input: {
      prompt: params.prompt,
      ...(params.imageInput?.length ? { image_input: params.imageInput } : {}),
      ...(params.aspectRatio  ? { aspect_ratio:   params.aspectRatio  } : {}),
      ...(params.resolution   ? { resolution:     params.resolution   } : {}),
      ...(params.outputFormat ? { output_format:  params.outputFormat } : {}),
    },
  };
  if (params.callBackUrl) body.callBackUrl = params.callBackUrl;

  const res = await kieRequest<CreateTaskResponse>(
    '/api/v1/jobs/createTask',
    { method: 'POST', body: JSON.stringify(body) }
  );

  if (!res.data?.taskId) throw new Error('kie.ai did not return a taskId');
  return res.data.taskId;
}

// ── Unified video task ────────────────────────────────────────────────────────

export type VideoModelSlug = 'seedance2' | 'hailuo' | 'grok-video';

export interface CreateVideoTaskParams {
  modelSlug:   VideoModelSlug;
  mode:        'text-to-video' | 'image-to-video';
  prompt:      string;
  /** Reference images (Seedance: first frame; Hailuo I2V: single; Grok: up to 7) */
  imageUrls?:  string[];
  aspectRatio?: string;
  /** '480p' | '720p' | '768P' | '1080P' */
  resolution?:  string;
  /** Duration in seconds (Seedance: 4-15; Hailuo I2V: 6|10; Grok: 6-30) */
  duration?:    number;
  /** Grok only: 'fun' | 'normal' | 'spicy' */
  grokMode?:   'fun' | 'normal' | 'spicy';
  callBackUrl?: string;
}

export async function createVideoTask(params: CreateVideoTaskParams): Promise<string> {
  const {
    modelSlug, mode, prompt, imageUrls, aspectRatio,
    resolution, duration, grokMode, callBackUrl,
  } = params;

  const isI2V = mode === 'image-to-video' && (imageUrls?.length ?? 0) > 0;

  let kieModel: string;
  let input: Record<string, unknown>;

  switch (modelSlug) {
    case 'seedance2':
      kieModel = 'bytedance/seedance-2';
      input = {
        prompt,
        ...(isI2V && imageUrls?.[0] ? { first_frame_url: imageUrls[0] } : {}),
        duration: duration != null ? Math.max(4, Math.min(15, Math.round(duration))) : 5,
        ...(aspectRatio ? { aspect_ratio: aspectRatio }            : {}),
        ...(resolution  ? { resolution:   resolution.toUpperCase() } : {}),
      };
      break;

    case 'hailuo':
      if (isI2V) {
        kieModel = 'hailuo/2-3-image-to-video-pro';
        input = {
          image_url:  imageUrls![0],
          prompt,
          duration:   duration ? String(Math.round(duration)) : '6',
          resolution: resolution ?? '768P',
        };
      } else {
        kieModel = 'hailuo/02-text-to-video-pro';
        input = { prompt, prompt_optimizer: true };
      }
      break;

    case 'grok-video':
      kieModel = isI2V ? 'grok-imagine/image-to-video' : 'grok-imagine/text-to-video';
      input = {
        prompt,
        ...(isI2V && imageUrls?.length ? { image_urls: imageUrls } : {}),
        mode:       grokMode  ?? 'normal',
        duration:   duration  ?? 6,
        resolution: resolution ?? '720p',
        ...(aspectRatio ? { aspect_ratio: aspectRatio } : {}),
      };
      break;

    default:
      throw new Error(`Unknown video model slug: ${modelSlug}`);
  }

  const body: Record<string, unknown> = { model: kieModel, input };
  if (callBackUrl) body.callBackUrl = callBackUrl;

  const res = await kieRequest<CreateTaskResponse>(
    '/api/v1/jobs/createTask',
    { method: 'POST', body: JSON.stringify(body) }
  );

  if (!res.data?.taskId) throw new Error('kie.ai did not return a taskId');
  return res.data.taskId;
}

// ── Query task status ─────────────────────────────────────────────────────────

/** Query a task's current status and result. */
export async function getTaskStatus(taskId: string): Promise<TaskResult> {
  const res = await kieRequest<TaskStatusResponse>(
    `/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`
  );

  const d = res.data;
  let resultUrls: string[] = [];

  if (d.resultJson) {
    try {
      const parsed = JSON.parse(d.resultJson) as { resultUrls?: string[] };
      resultUrls = parsed.resultUrls ?? [];
    } catch {
      // resultJson may be malformed on failure; ignore
    }
  }

  return {
    state:      d.state,
    resultUrls,
    failMsg:    d.failMsg,
    progress:   d.progress,
  };
}

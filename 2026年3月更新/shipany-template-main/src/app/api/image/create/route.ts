import { NextRequest } from 'next/server';

import { createImageTask, ImageModelSlug } from '@/lib/kie';
import { getUuid } from '@/shared/lib/hash';
import { respData, respErr } from '@/shared/lib/resp';
import { createAITask } from '@/shared/models/ai_task';
import { getRemainingCredits } from '@/shared/models/credit';
import { getUserInfo } from '@/shared/models/user';

// Credits consumed per generation (0 = free)
const IMAGE_CREDIT_COSTS: Record<string, number> = {
  'gpt-image-2':      5,
  'nano-banana-pro':  3,
  'seedream5':        3,
  'ai-image-upscaler': 2,
};

export const runtime     = 'nodejs';
export const maxDuration = 10;

export async function POST(req: NextRequest) {
  try {
    const user = await getUserInfo();
    if (!user) return respErr('no auth, please sign in');

    const {
      model, mode, prompt, imageUrls, aspectRatio,
      resolution, nsfwChecker,
    } = await req.json();

    if (!model) {
      return Response.json({ code: -1, message: 'model is required' }, { status: 400 });
    }

    const isUpscaler = model === 'ai-image-upscaler';

    // Upscaler only needs an image URL; all other models need a prompt
    if (!isUpscaler && !prompt?.trim()) {
      return Response.json({ code: -1, message: 'prompt is required' }, { status: 400 });
    }
    if (isUpscaler && !imageUrls?.length) {
      return Response.json({ code: -1, message: 'imageUrls is required for upscaler' }, { status: 400 });
    }

    const scene = isUpscaler ? 'image-to-image' : (mode ?? 'text-to-image') as string;

    // Pre-flight credit check
    const costCredits = IMAGE_CREDIT_COSTS[model as string] ?? 0;
    if (costCredits > 0) {
      const remaining = await getRemainingCredits(user.id);
      if (remaining < costCredits) {
        return Response.json({ code: -2, message: 'insufficient credits' }, { status: 200 });
      }
    }

    const kieTaskId = await createImageTask({
      modelSlug:   model as ImageModelSlug,
      mode:        scene as 'text-to-image' | 'image-to-image',
      prompt:      prompt?.trim() ?? '',
      imageUrls,
      aspectRatio,
      resolution,
      nsfwChecker: typeof nsfwChecker === 'boolean' ? nsfwChecker : undefined,
    });

    await createAITask({
      id:          getUuid(),
      userId:      user.id,
      mediaType:   'image',
      provider:    'kie',
      model:       model as string,
      prompt:      prompt?.trim() ?? '',
      scene,
      options:     imageUrls?.length ? JSON.stringify({ imageUrls }) : null,
      status:      'pending',
      costCredits,
      taskId:      kieTaskId,
      taskInfo:    null,
      taskResult:  null,
    });

    return respData({ taskId: kieTaskId });
  } catch (e: any) {
    console.error('[image/create]', e);
    return respErr(e.message ?? 'failed to create task');
  }
}

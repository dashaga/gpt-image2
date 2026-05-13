'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { AlertCircle, Download, Loader2, Sparkles } from 'lucide-react';
import { useLocale } from 'next-intl';
import { toast } from 'sonner';

import { Link } from '@/core/i18n/navigation';

import {
  ImageUploader,
  ImageUploaderValue,
} from '@/shared/blocks/common/image-uploader';
import { SmartIcon } from '@/shared/blocks/common/smart-icon';
import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Switch } from '@/shared/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Textarea } from '@/shared/components/ui/textarea';
import { useAppContext } from '@/shared/contexts/app';
import { cn } from '@/shared/lib/utils';
import { Section } from '@/shared/types/blocks/landing';
import { IMAGE_MODEL_META } from '../../../lib/imageModels';

// ── Types ──────────────────────────────────────────────────────────────────────

type Locale  = 'en' | 'zh';
type SubMode = 'image-to-image' | 'text-to-image';
type Status  = 'idle' | 'loading' | 'polling' | 'done' | 'error';

type Bilingual = { en: string; zh: string };

type ImageModel = {
  slug:        string;
  name:        Bilingual;
  icon:        string;
  iconBg:      string;
  iconColor:   string;
  badge?:      string;
  badgeColor?: string;
};

// ── Constants ──────────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 3_000;
const TIMEOUT_MS       = 60_000;

const IMAGE_MODELS: ImageModel[] = [
  {
    slug:      'gpt-image-2',
    name:      { en: 'GPT Image 2', zh: 'GPT Image 2' },
    icon:      'Bot',
    iconBg:    '#EEF2FF',
    iconColor: '#6366F1',
    badge:     'NEW',
    badgeColor: '#16a34a',
  },
  {
    slug:      'nano-banana-pro',
    name:      { en: 'Nano Banana 2', zh: 'Nano Banana 2' },
    icon:      'Sparkles',
    iconBg:    '#FEF9C3',
    iconColor: '#CA8A04',
  },
  {
    slug:       'seedream5',
    name:       { en: 'Seedream 5', zh: 'Seedream 5' },
    icon:       'Leaf',
    iconBg:     '#FFF7ED',
    iconColor:  '#EA580C',
    badge:      'WILD',
    badgeColor: '#EA580C',
  },
  {
    slug:      'ai-image-upscaler',
    name:      { en: 'Image Enhancer', zh: '图像增强' },
    icon:      'ZoomIn',
    iconBg:    '#EFF6FF',
    iconColor: '#2563EB',
  },
];

type AspectRatio = { value: string; w: number; h: number; label: Bilingual };

const ASPECT_RATIOS: AspectRatio[] = [
  { value: '1:1',  w: 1,  h: 1,  label: { en: 'Social avatar',   zh: '社交头像'   } },
  { value: '9:16', w: 9,  h: 16, label: { en: 'Vertical video',  zh: '竖屏短视频' } },
  { value: '16:9', w: 16, h: 9,  label: { en: 'Widescreen',      zh: '横屏视频'   } },
  { value: '3:4',  w: 3,  h: 4,  label: { en: 'Vertical photo',  zh: '竖版照片'   } },
  { value: '4:3',  w: 4,  h: 3,  label: { en: 'Landscape photo', zh: '横版照片'   } },
  { value: '3:2',  w: 3,  h: 2,  label: { en: 'Classic photo',   zh: '经典照片'   } },
  { value: '2:3',  w: 2,  h: 3,  label: { en: 'Vertical classic', zh: '竖版经典'  } },
  { value: '5:4',  w: 5,  h: 4,  label: { en: 'Medium format',   zh: '中画幅'     } },
  { value: '4:5',  w: 4,  h: 5,  label: { en: 'Vertical medium', zh: '竖版中画幅' } },
  { value: '21:9', w: 21, h: 9,  label: { en: 'Ultra-wide',      zh: '超宽屏'     } },
];

type ExampleCard = {
  image?:     string;
  gradient?:  string;
  category:   Bilingual;
  prompt:     Bilingual;
  href?:      string;
  hideCaption?: boolean;
};

const EXAMPLES: ExampleCard[] = [
  {
    image:    'https://assets.gptimage2.it.com/examples/gptimage2-1778611823885.png',
    category: { en: 'Style Transfer', zh: '风格迁移' },
    prompt: {
      en: 'American vintage comic strip — Potato and Garlic travel to southern France',
      zh: '美式复古漫画 — 土豆和大蒜的法国南部之旅',
    },
    href:        '/showcases#gptimage2-1778611823885',
    hideCaption: true,
  },
];

type ThumbLink = { image: string; href: string; alt: string };
const THUMBS: ThumbLink[] = [
  {
    image: 'https://assets.gptimage2.it.com/examples/gptimage2-1778611310144.png',
    href:  '/showcases#gptimage2-1778611310144',
    alt:   '模特设定表 — 纯欲风多角度',
  },
  {
    image: 'https://assets.gptimage2.it.com/examples/6cc9ce620ab59c07b52d70aaecd194f0.png',
    href:  '/showcases#6cc9ce620ab59c07b52d70aaecd194f0',
    alt:   '霜鸾·栾安 - 灵鸟精灵',
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function RatioThumb({ w, h }: { w: number; h: number }) {
  const max = 26;
  const asp = w / h;
  const tw  = asp >= 1 ? max : Math.round(max * asp);
  const th  = asp >= 1 ? Math.round(max / asp) : max;
  return (
    <div className="flex h-7 w-9 items-center justify-center">
      <div className="rounded-[2px] bg-current opacity-50 transition-opacity group-hover:opacity-70"
        style={{ width: tw, height: th }} />
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

export function CreationWorkbench({ section, className }: { section: Section; className?: string }) {
  const locale = useLocale() as Locale;
  const { user, setIsShowSignModal, setIsShowInsufficientCreditsModal, fetchUserCredits } = useAppContext();
  const zh = locale === 'zh';

  // ── Form state ────────────────────────────────────────────────────────────
  const [model,       setModel]       = useState(IMAGE_MODELS[0].slug);
  const [subMode,     setSubMode]     = useState<SubMode>('text-to-image');
  const [prompt,      setPrompt]      = useState('');
  const [ratio,       setRatio]       = useState(ASPECT_RATIOS[0].value);
  const [resolution,  setResolution]  = useState('sd');
  const [count,       setCount]       = useState(1);
  const [uploads,     setUploads]     = useState<ImageUploaderValue[]>([]);
  const [nsfwChecker, setNsfwChecker] = useState(false);
  const [activeIdx,   setActiveIdx]   = useState(0);

  // ── Generation state ──────────────────────────────────────────────────────
  const [status,    setStatus]   = useState<Status>('idle');
  const [results,   setResults]  = useState<string[]>([]);
  const [errorMsg,  setErrorMsg] = useState<string | null>(null);
  const [progress,  setProgress] = useState<number | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeoutRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Model metadata ────────────────────────────────────────────────────────
  const modelMeta  = IMAGE_MODEL_META[model];
  const isUpscaler = modelMeta?.isUpscaler ?? false;

  // Reset model-specific state when model changes
  useEffect(() => {
    if (!modelMeta) return;
    setResolution(modelMeta.defaultResolution);
    setCount(1);
    setNsfwChecker(false);
    if (isUpscaler) setSubMode('image-to-image');
    else if (!modelMeta.supportsI2I) setSubMode('text-to-image');
  }, [model, modelMeta, isUpscaler]);

  // ── Resolution options depend on model ────────────────────────────────────
  const currentResolutions = useMemo(() => {
    return modelMeta?.resolutions ?? [
      { value: 'sd',    labelEn: 'Standard HD', labelZh: '标准高清', subEn: '1024×1024', subZh: '1024×1024' },
      { value: 'hd2k',  labelEn: 'HD 2K',       labelZh: '高清 2K' },
      { value: 'uhd4k', labelEn: 'Ultra HD 4K',  labelZh: '超清 4K' },
    ];
  }, [modelMeta]);

  // ── Aspect ratios depend on model ─────────────────────────────────────────
  const currentRatios = useMemo(() => {
    if (isUpscaler) return [];
    const allowed = modelMeta?.aspectRatios;
    if (!allowed?.length) return ASPECT_RATIOS;
    return ASPECT_RATIOS.filter((r) => allowed.includes(r.value));
  }, [modelMeta, isUpscaler]);

  // ── Polling ───────────────────────────────────────────────────────────────
  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    if (timeoutRef.current)   clearTimeout(timeoutRef.current);
    pollTimerRef.current = null;
    timeoutRef.current   = null;
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const pollUntilDone = useCallback(
    (taskId: string): Promise<string | null> =>
      new Promise((resolve) => {
        const tick = async () => {
          try {
            const res  = await fetch(`/api/image/status/${taskId}`);
            const json = await res.json();
            if (json.code !== 0) { resolve(null); return; }
            const { status: s, resultUrl, progress: p } = json.data as {
              status: string; resultUrl: string | null; progress: number | null;
            };
            if (p !== null) setProgress(p);
            if (s === 'success') { resolve(resultUrl); return; }
            if (s === 'fail')    { resolve(null); return; }
            pollTimerRef.current = setTimeout(tick, POLL_INTERVAL_MS);
          } catch {
            resolve(null);
          }
        };
        pollTimerRef.current = setTimeout(tick, POLL_INTERVAL_MS);
      }),
    []
  );

  // ── Generate ──────────────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (!user) { setIsShowSignModal(true); return; }

    if (isUpscaler) {
      if (!uploads.some((u) => u.status === 'uploaded' && u.url)) {
        toast.error(zh ? '请先上传要增强的图片' : 'Please upload an image to enhance');
        return;
      }
    } else {
      if (modelMeta?.supportsI2I && subMode === 'image-to-image') {
        if (!uploads.some((u) => u.status === 'uploaded' && u.url)) {
          toast.error(zh ? '请先上传参考图片' : 'Please upload a reference image');
          return;
        }
      }
      if (!prompt.trim()) {
        toast.error(zh ? '请输入提示词再创作' : 'Please enter a prompt before generating');
        return;
      }
    }

    stopPolling();
    setStatus('loading');
    setResults([]);
    setErrorMsg(null);
    setProgress(null);

    try {
      const imageUrls = uploads
        .filter((u) => u.status === 'uploaded' && u.url)
        .map((u) => u.url as string);

      const actualCount = (!isUpscaler && modelMeta?.supportsCount) ? count : 1;

      const taskIds = await Promise.all(
        Array.from({ length: actualCount }, () =>
          fetch('/api/image/create', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model,
              mode:        isUpscaler ? 'image-to-image' : subMode,
              prompt:      isUpscaler ? '' : prompt.trim(),
              imageUrls:   imageUrls.length ? imageUrls : undefined,
              aspectRatio: isUpscaler ? undefined : ratio,
              resolution,
              nsfwChecker: modelMeta?.hasNsfwChecker ? nsfwChecker : undefined,
            }),
          })
            .then((r) => r.json())
            .then((j) => {
              if (j.code === -2) {
                setIsShowInsufficientCreditsModal(true);
                throw new Error('insufficient credits');
              }
              if (j.code !== 0) throw new Error(j.message ?? 'create failed');
              return j.data.taskId as string;
            })
        )
      );

      setStatus('polling');

      timeoutRef.current = setTimeout(() => {
        stopPolling();
        setErrorMsg(zh ? '生成超时（60 秒），请重试' : 'Timed out (60 s), please retry');
        setStatus('error');
      }, TIMEOUT_MS);

      const urls  = await Promise.all(taskIds.map(pollUntilDone));
      stopPolling();
      const valid = urls.filter(Boolean) as string[];

      if (valid.length === 0) {
        setErrorMsg(zh ? '生成失败，请重试' : 'Generation failed, please retry');
        setStatus('error');
      } else {
        setResults(valid);
        setStatus('done');
        setProgress(null);
        fetchUserCredits();
      }
    } catch (err: any) {
      stopPolling();
      if (err.message !== 'insufficient credits') {
        setErrorMsg(err.message ?? 'unknown error');
        setStatus('error');
      } else {
        setStatus('idle');
      }
    }
  }, [
    user, model, subMode, uploads, prompt, ratio, resolution, count,
    nsfwChecker, isUpscaler, modelMeta, stopPolling, pollUntilDone,
    setIsShowSignModal, setIsShowInsufficientCreditsModal, fetchUserCredits, zh,
  ]);

  // ── Labels ────────────────────────────────────────────────────────────────
  const isGenerating = status === 'loading' || status === 'polling';
  const localizedName = (m: ImageModel) => m.name[locale] ?? m.name.en;

  return (
    <section
      id={section.id || 'creation-workbench'}
      className={cn('py-[30px]', section.className, className)}
    >
      <div className="container">
        {/* Section header */}
        <div className="mx-auto mb-10 max-w-3xl text-center">
          {section.label && (
            <span className="bg-primary/10 text-primary mb-4 inline-block rounded-full px-3 py-1 text-xs font-medium">
              {section.label}
            </span>
          )}
          {section.title && (
            <h2 className="text-3xl font-bold md:text-4xl">{section.title}</h2>
          )}
          {section.description && (
            <p className="text-muted-foreground mt-3 text-sm md:text-base">{section.description}</p>
          )}
        </div>

        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* ── Left: workbench ───────────────────────────────────────────── */}
            <div className="bg-card border-foreground/5 flex flex-col rounded-xl border p-6 shadow-sm md:p-8">

              {/* Mode tabs — hidden for upscaler */}
              {!isUpscaler && modelMeta?.supportsI2I && (
                <Tabs value={subMode} onValueChange={(v) => setSubMode(v as SubMode)}>
                  <TabsList className="bg-primary/10 grid w-full grid-cols-2">
                    <TabsTrigger value="image-to-image">
                      {zh ? '图片编辑' : 'Image edit'}
                    </TabsTrigger>
                    <TabsTrigger value="text-to-image">
                      {zh ? '文生图' : 'Text to image'}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              )}

              {/* Model dropdown */}
              <div className={cn('space-y-2', (!isUpscaler && modelMeta?.supportsI2I) ? 'mt-6' : '')}>
                <Label>{zh ? '模型' : 'Model'}</Label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger className="h-auto w-full py-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {IMAGE_MODELS.map((m) => (
                      <SelectItem key={m.slug} value={m.slug} className="py-2">
                        <span className="flex items-center gap-2.5">
                          <span className="flex h-7 w-7 items-center justify-center rounded-md"
                            style={{ backgroundColor: m.iconBg }}>
                            <SmartIcon name={m.icon} size={16} style={{ color: m.iconColor }} />
                          </span>
                          <span className="text-sm font-medium">{localizedName(m)}</span>
                          {m.badge && (
                            <span className="rounded-sm px-1 py-px text-[9px] font-semibold uppercase leading-none text-white"
                              style={{ backgroundColor: m.badgeColor ?? 'var(--color-primary)' }}>
                              {m.badge}
                            </span>
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Image upload — always for upscaler, or in I2I mode */}
              {(isUpscaler || (!isUpscaler && modelMeta?.supportsI2I && subMode === 'image-to-image')) && (
                <div className="mt-6">
                  <ImageUploader
                    allowMultiple={!isUpscaler}
                    maxImages={isUpscaler ? 1 : 4}
                    maxSizeMB={10}
                    onChange={setUploads}
                    largeDropZone
                    dropZoneTitle={isUpscaler ? (zh ? '上传需要增强的图片' : 'Upload image to enhance') : (zh ? '添加参考图片（1-4）' : 'Add images (1–4)')}
                    dropZoneSub={zh ? 'JPG，PNG，WebP — 每张最大 10MB' : 'JPG, PNG, WebP — max 10MB each'}
                  />
                </div>
              )}

              {/* Prompt — hidden for upscaler */}
              {!isUpscaler && (
                <div className="mt-6 space-y-2">
                  <Label htmlFor="workbench-prompt">{zh ? '提示词' : 'Prompt'}</Label>
                  <Textarea
                    id="workbench-prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={
                      zh
                        ? '描述你想要的效果，例如「把背景换成夜晚的街道」、「加上赛博朋克风格」…'
                        : 'Describe the result — e.g. "swap the background to a night street" or "add a cyberpunk vibe"…'
                    }
                    className="min-h-28"
                    disabled={isGenerating}
                  />
                </div>
              )}

              {/* Aspect ratio — hidden for upscaler */}
              {!isUpscaler && currentRatios.length > 0 && (
                <div className="mt-6 space-y-2">
                  <Label>{zh ? '图片比例' : 'Aspect ratio'}</Label>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                    {currentRatios.map((r) => {
                      const active = r.value === ratio;
                      return (
                        <button key={r.value} type="button" disabled={isGenerating}
                          onClick={() => setRatio(r.value)}
                          className={cn(
                            'group flex flex-col items-center justify-center gap-1 rounded-lg border px-2 py-2 text-center transition-colors',
                            active
                              ? 'border-primary bg-primary/5 text-primary'
                              : 'border-foreground/10 text-foreground/60 hover:border-foreground/20 hover:text-foreground'
                          )}
                        >
                          <RatioThumb w={r.w} h={r.h} />
                          <div className="mt-1 text-[11px] font-medium leading-none">{r.value}</div>
                          <div className={cn('text-[10px] leading-tight', active ? 'text-primary/70' : 'text-muted-foreground')}>
                            {r.label[locale] ?? r.label.en}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Resolution / Scale factor */}
              <div className="mt-6 space-y-2">
                <Label>{isUpscaler ? (zh ? '放大倍数' : 'Scale factor') : (zh ? '分辨率' : 'Resolution')}</Label>
                <div className={cn('grid gap-2', currentResolutions.length === 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2')}>
                  {currentResolutions.map((r) => {
                    const active = resolution === r.value;
                    const label  = zh ? r.labelZh : r.labelEn;
                    const sub    = zh ? r.subZh   : r.subEn;
                    return (
                      <button key={r.value} type="button" disabled={isGenerating}
                        onClick={() => setResolution(r.value)}
                        className={cn(
                          'flex flex-col items-start rounded-lg border px-3 py-2 text-left transition-colors',
                          active
                            ? 'border-primary bg-primary/5'
                            : 'border-foreground/10 hover:border-foreground/20'
                        )}
                      >
                        <span className={cn('text-sm font-medium', active ? 'text-primary' : 'text-foreground')}>
                          {label}
                        </span>
                        {sub && (
                          <span className="text-muted-foreground mt-0.5 text-[11px]">{sub}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Count — only GPT Image 2 */}
              {!isUpscaler && modelMeta?.supportsCount && (
                <div className="mt-6 space-y-2">
                  <Label>{zh ? '生成张数' : 'Image count'}</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map((n) => {
                      const active = count === n;
                      return (
                        <button key={n} type="button" disabled={isGenerating}
                          onClick={() => setCount(n)}
                          className={cn(
                            'rounded-lg border py-2 text-sm font-medium transition-colors',
                            active
                              ? 'border-primary bg-primary/5 text-primary'
                              : 'border-foreground/10 text-foreground/60 hover:border-foreground/20 hover:text-foreground'
                          )}
                        >
                          {n}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* NSFW toggle — Seedream 5 only */}
              {modelMeta?.hasNsfwChecker && (
                <div className="mt-6 flex items-center justify-between rounded-lg border border-foreground/10 px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium">{zh ? '安全内容过滤' : 'Content safety filter'}</p>
                    <p className="text-muted-foreground text-[11px]">{zh ? '开启后过滤 NSFW 内容' : 'Filter NSFW content when enabled'}</p>
                  </div>
                  <Switch checked={nsfwChecker} onCheckedChange={setNsfwChecker} disabled={isGenerating} />
                </div>
              )}

              {/* Generate button */}
              <div className="mt-auto pt-6">
                <Button size="lg" className="w-full" disabled={isGenerating} onClick={handleGenerate}>
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {progress !== null ? `${zh ? '生成中' : 'Generating'} ${progress}%` : (zh ? '生成中…' : 'Generating…')}
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      {isUpscaler ? (zh ? '开始增强' : 'Enhance image') : (zh ? '开始创作' : 'Start creating')}
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* ── Right: results / examples ──────────────────────────────────── */}
            <div className="bg-card border-foreground/5 flex flex-col gap-4 rounded-xl border p-6 shadow-sm md:p-8">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold">
                  {status === 'done' ? (zh ? '生成结果' : 'Result') : (zh ? '示例' : 'Examples')}
                </h3>
                {status === 'idle' && (
                  <Link href="/showcases"
                    className="text-primary hover:text-primary/80 flex items-center gap-0.5 text-xs transition-colors">
                    {zh ? '查看更多' : 'More examples'}<span aria-hidden>→</span>
                  </Link>
                )}
              </div>

              {/* Loading state */}
              {isGenerating && (
                <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 py-16">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p className="text-muted-foreground text-sm">
                    {progress !== null ? `${zh ? '生成中' : 'Generating'} ${progress}%` : (zh ? '正在生成，请稍候…' : 'Generating, please wait…')}
                  </p>
                  <p className="text-muted-foreground/60 text-xs">
                    {zh ? '通常需要 10–30 秒' : 'Usually takes 10–30 s'}
                  </p>
                </div>
              )}

              {/* Error state */}
              {status === 'error' && (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-red-300 bg-red-50 py-16 text-center dark:border-red-800 dark:bg-red-950/20">
                  <AlertCircle className="h-10 w-10 text-red-500" />
                  <p className="text-sm font-medium text-red-600 dark:text-red-400">
                    {errorMsg ?? (zh ? '生成失败' : 'Generation failed')}
                  </p>
                  <Button variant="outline" size="sm" onClick={handleGenerate}>
                    {zh ? '重试' : 'Retry'}
                  </Button>
                </div>
              )}

              {/* Results */}
              {status === 'done' && results.length > 0 && (
                <div className="flex flex-1 flex-col gap-3">
                  <div className={cn('grid gap-2', results.length > 1 ? 'grid-cols-2' : 'grid-cols-1')}>
                    {results.map((url, i) => (
                      <div key={i} className="group relative overflow-hidden rounded-xl border border-foreground/10">
                        <Image src={url} alt={`result ${i + 1}`} width={800} height={800}
                          className="h-auto w-full object-cover" unoptimized />
                        <a href={url} download={`${model}-${Date.now()}-${i + 1}.jpg`}
                          target="_blank" rel="noreferrer"
                          className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
                          <Download className="h-4 w-4" />
                        </a>
                      </div>
                    ))}
                  </div>
                  <Button className="w-full gap-1.5" onClick={handleGenerate}>
                    <Sparkles className="h-4 w-4" />
                    {zh ? '再次创作' : 'Create again'}
                  </Button>
                </div>
              )}

              {/* Examples (idle state) */}
              {status === 'idle' && (() => {
                const ex = EXAMPLES[activeIdx];
                const promptText   = ex.prompt[locale as 'en' | 'zh']   ?? ex.prompt.en;
                const categoryText = ex.category[locale as 'en' | 'zh'] ?? ex.category.en;
                const cardClass    = 'group bg-card border-foreground/5 block cursor-pointer overflow-hidden rounded-xl border shadow-sm transition-shadow hover:shadow-md';
                const inner = (
                  <>
                    {ex.image ? (
                      <div className="max-h-[400px] w-full overflow-hidden">
                        <Image src={ex.image} alt={promptText} width={900} height={1600}
                          className="h-auto w-full transition-transform duration-500 group-hover:scale-[1.03]" unoptimized />
                      </div>
                    ) : (
                      <div className="aspect-[4/3] w-full" style={{ background: ex.gradient }} />
                    )}
                    {!ex.hideCaption && (
                      <div className="p-4">
                        <p className="text-foreground mb-2.5 line-clamp-2 text-sm leading-relaxed">{promptText}</p>
                        <span className="bg-primary/10 text-primary rounded-full px-2.5 py-0.5 text-xs font-medium">{categoryText}</span>
                      </div>
                    )}
                  </>
                );
                return (
                  <>
                    {ex.href ? (
                      <Link href={ex.href} className={cardClass}>{inner}</Link>
                    ) : (
                      <div className={cardClass} onClick={() => setPrompt(promptText)}
                        title={zh ? '点击填入提示词' : 'Click to use this prompt'}>
                        {inner}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      {THUMBS.map((thumb) => (
                        <Link key={thumb.href} href={thumb.href}
                          className="group overflow-hidden rounded-lg border border-foreground/10 transition-colors hover:border-foreground/30">
                          <Image src={thumb.image} alt={thumb.alt} width={300} height={400}
                            className="h-auto w-full transition-transform duration-500 group-hover:scale-[1.06]" unoptimized />
                        </Link>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

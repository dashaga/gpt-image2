'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import {
  AlertCircle,
  Check,
  ChevronDown,
  Download,
  ImageIcon,
  Loader2,
  Sparkles,
  User,
} from 'lucide-react';
import { useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

import { useRouter } from '@/core/i18n/navigation';
import {
  ImageUploader,
  ImageUploaderValue,
} from '@/shared/blocks/common/image-uploader';
import { SmartIcon } from '@/shared/blocks/common/smart-icon';
import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import { Switch } from '@/shared/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Textarea } from '@/shared/components/ui/textarea';
import { useAppContext } from '@/shared/contexts/app';
import { cn } from '@/shared/lib/utils';

import { IMAGE_MODEL_META } from '../../../lib/imageModels';
import { MODEL_BY_SLUG } from './registry';

// ── Constants ─────────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 3_000;
const TIMEOUT_MS       = 60_000;
const ACCENT           = '#6366F1';

// ── Types ─────────────────────────────────────────────────────────────────────

type Bilingual      = { en: string; zh: string };
type SubMode        = 'image-to-image' | 'text-to-image';
type GenerateStatus = 'idle' | 'loading' | 'polling' | 'done' | 'error';

// ── Model switcher data (the 4 unified image models) ─────────────────────────

type SwitcherModel = {
  slug:        string;
  name:        Bilingual;
  icon:        string;
  iconBg:      string;
  iconColor:   string;
  badge?:      string;
  badgeColor?: string;
  desc:        Bilingual;
};

const SWITCHER_MODELS: SwitcherModel[] = [
  {
    slug:       'gpt-image-2',
    name:       { en: 'GPT Image 2', zh: 'GPT Image 2' },
    icon:       'Bot',
    iconBg:     '#EEF2FF',
    iconColor:  ACCENT,
    badge:      'NEW',
    badgeColor: '#16a34a',
    desc:       { en: 'OpenAI · photoreal & precise text', zh: 'OpenAI 出品，照片级真实感' },
  },
  {
    slug:      'nano-banana-pro',
    name:      { en: 'Nano Banana 2', zh: 'Nano Banana 2' },
    icon:      'Sparkles',
    iconBg:    '#FEF9C3',
    iconColor: '#CA8A04',
    desc:      { en: 'Fast · rich detail from short prompts', zh: '速度快，短提示词生成丰富细节' },
  },
  {
    slug:       'seedream5',
    name:       { en: 'Seedream 5', zh: 'Seedream 5' },
    icon:       'Leaf',
    iconBg:     '#FFF7ED',
    iconColor:  '#EA580C',
    badge:      'WILD',
    badgeColor: '#EA580C',
    desc:       { en: 'ByteDance · 2K/4K · bilingual prompts', zh: '字节跳动，2K/4K，中文提示词' },
  },
  {
    slug:      'ai-image-upscaler',
    name:      { en: 'Image Enhancer', zh: '图像增强' },
    icon:      'ZoomIn',
    iconBg:    '#EFF6FF',
    iconColor: '#2563EB',
    desc:      { en: 'Topaz · 2× / 4× upscale', zh: 'Topaz，2×/4× 无损放大' },
  },
];

// ── Aspect ratio definitions ──────────────────────────────────────────────────

type AspectRatioOption = { value: string; w: number; h: number; label: Bilingual };

const ALL_ASPECT_RATIOS: AspectRatioOption[] = [
  { value: '1:1',  w: 1,  h: 1,  label: { en: 'Social avatar',   zh: '社交头像'   } },
  { value: '9:16', w: 9,  h: 16, label: { en: 'Vertical video',  zh: '竖屏短视频' } },
  { value: '16:9', w: 16, h: 9,  label: { en: 'Widescreen',      zh: '横屏视频'   } },
  { value: '3:4',  w: 3,  h: 4,  label: { en: 'Vertical photo',  zh: '竖版照片'   } },
  { value: '4:3',  w: 4,  h: 3,  label: { en: 'Landscape photo', zh: '横版照片'   } },
  { value: '3:2',  w: 3,  h: 2,  label: { en: 'Classic photo',   zh: '经典照片'   } },
  { value: '2:3',  w: 2,  h: 3,  label: { en: 'Vert. classic',   zh: '竖版经典'   } },
  { value: '5:4',  w: 5,  h: 4,  label: { en: 'Medium format',   zh: '中画幅'     } },
  { value: '4:5',  w: 4,  h: 5,  label: { en: 'Vert. medium',    zh: '竖版中画幅' } },
  { value: '21:9', w: 21, h: 9,  label: { en: 'Ultra-wide',      zh: '超宽屏'     } },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function RatioThumb({ w, h }: { w: number; h: number }) {
  const max = 24;
  const a   = w / h;
  const tw  = a >= 1 ? max : Math.round(max * a);
  const th  = a >= 1 ? Math.round(max / a) : max;
  return (
    <div className="flex h-7 w-8 items-center justify-center">
      <div className="rounded-[2px] bg-current opacity-50 transition-opacity group-hover:opacity-70"
        style={{ width: tw, height: th }} />
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function UnifiedImagePage({ slug }: { slug: string }) {
  const router       = useRouter();
  const locale       = useLocale() as 'en' | 'zh';
  const searchParams = useSearchParams();
  const { user, isCheckSign, setIsShowSignModal, setIsShowInsufficientCreditsModal, fetchUserCredits } = useAppContext();

  const [selectedSlug, setSelectedSlug] = useState(slug);
  useEffect(() => { setSelectedSlug(slug); }, [slug]);

  // ── Form state: prompt + uploads persist across model switches ──────────────
  const [subMode,  setSubMode]  = useState<SubMode>(() =>
    searchParams.get('mode') === 'image' ? 'image-to-image' : 'text-to-image'
  );
  const [uploads,  setUploads]  = useState<ImageUploaderValue[]>([]);
  const [prompt,   setPrompt]   = useState(() => searchParams.get('prompt') ?? '');

  // ── Model-specific state: resets on model switch ───────────────────────────
  const [aspect,      setAspect]      = useState('1:1');
  const [resolution,  setResolution]  = useState('sd');
  const [count,       setCount]       = useState(1);
  const [nsfwChecker, setNsfwChecker] = useState(false);

  useEffect(() => {
    const meta = IMAGE_MODEL_META[selectedSlug];
    if (!meta) return;
    setAspect(meta.aspectRatios[0] ?? '1:1');
    setResolution(meta.defaultResolution);
    setCount(1);
    setNsfwChecker(false);
    if (meta.isUpscaler) setSubMode('image-to-image');
    else if (!meta.supportsI2I) setSubMode('text-to-image');
  }, [selectedSlug]);

  // ── Generation state ───────────────────────────────────────────────────────
  const [status,   setStatus]   = useState<GenerateStatus>('idle');
  const [results,  setResults]  = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);

  const [isModelOpen,    setIsModelOpen]    = useState(false);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const formPanelRef     = useRef<HTMLDivElement>(null);
  const pollTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeoutRef       = useRef<ReturnType<typeof setTimeout> | null>(null);

  const zh = locale === 'zh';

  // Close dropdown on outside click
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) {
        setIsModelOpen(false);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  // Scroll to form on ?prompt= deep-link
  useEffect(() => {
    if (searchParams.get('prompt') && formPanelRef.current) {
      const id = setTimeout(() => {
        formPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
      return () => clearTimeout(id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    if (timeoutRef.current)   clearTimeout(timeoutRef.current);
    pollTimerRef.current = null;
    timeoutRef.current   = null;
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  // ── Poll a single task ─────────────────────────────────────────────────────
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
            if (s === 'fail')    { resolve(null);       return; }
            pollTimerRef.current = setTimeout(tick, POLL_INTERVAL_MS);
          } catch {
            resolve(null);
          }
        };
        pollTimerRef.current = setTimeout(tick, POLL_INTERVAL_MS);
      }),
    []
  );

  // ── Switch model ───────────────────────────────────────────────────────────
  const handleSwitchModel = useCallback(
    (newSlug: string) => {
      if (newSlug === selectedSlug) return;
      setSelectedSlug(newSlug);
      setStatus('idle');
      setResults([]);
      setErrorMsg(null);
      setProgress(null);
      router.push(`/ai/${newSlug}`);
    },
    [selectedSlug, router]
  );

  // ── Generate ───────────────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (!user) { setIsShowSignModal(true); return; }

    const modelMeta  = IMAGE_MODEL_META[selectedSlug];
    const isUpscaler = modelMeta?.isUpscaler ?? false;

    if (isUpscaler) {
      if (!uploads.some((u) => u.status === 'uploaded' && u.url)) {
        toast.error(zh ? '请先上传要放大的图片' : 'Please upload an image to enhance');
        return;
      }
    } else {
      if (modelMeta?.supportsI2I && subMode === 'image-to-image') {
        if (!uploads.some((u) => u.status === 'uploaded' && u.url)) {
          toast.error(zh ? '请先上传参考图片' : 'Please upload a reference image first');
          return;
        }
      }
      if (!prompt.trim()) {
        toast.error(zh ? '请输入提示词' : 'Please enter a prompt');
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

      const actualCount = (modelMeta?.supportsCount && !isUpscaler) ? count : 1;

      const taskIds = await Promise.all(
        Array.from({ length: actualCount }, () =>
          fetch('/api/image/create', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model:       selectedSlug,
              mode:        isUpscaler ? 'image-to-image' : subMode,
              prompt:      isUpscaler ? '' : prompt.trim(),
              imageUrls:   imageUrls.length ? imageUrls : undefined,
              aspectRatio: isUpscaler ? undefined : aspect,
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
        setErrorMsg(zh ? '生成超时（60 秒），请重试' : 'Generation timed out (60 s), please retry');
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
    user, selectedSlug, subMode, uploads, prompt, count, aspect,
    resolution, nsfwChecker, stopPolling, pollUntilDone,
    setIsShowSignModal, setIsShowInsufficientCreditsModal, fetchUserCredits, zh,
  ]);

  // ── Derived values ─────────────────────────────────────────────────────────
  const meta      = MODEL_BY_SLUG[selectedSlug];
  const modelMeta = IMAGE_MODEL_META[selectedSlug];
  if (!meta) return null;

  const isGenerating = status === 'loading' || status === 'polling';
  const isUpscaler   = modelMeta?.isUpscaler ?? false;
  const supportsI2I  = !isUpscaler && (modelMeta?.supportsI2I ?? false);
  const maxImages    = modelMeta?.maxImages ?? 8;
  const availRatios  = ALL_ASPECT_RATIOS.filter((r) =>
    (modelMeta?.aspectRatios ?? ['1:1']).includes(r.value)
  );
  const availRes     = modelMeta?.resolutions ?? [];

  const name        = meta.name[locale]        ?? meta.name.en;
  const tagline     = meta.tagline[locale]     ?? meta.tagline.en;
  const description = meta.description[locale] ?? meta.description.en;

  const activeOpt = SWITCHER_MODELS.find((m) => m.slug === selectedSlug) ?? SWITCHER_MODELS[0];

  const L = {
    model:      zh ? '选择模型'     : 'Select model',
    prompt:     zh ? '提示词'       : 'Prompt',
    aspect:     zh ? '图片比例'     : 'Aspect ratio',
    resolution: zh ? (isUpscaler ? '放大倍数' : '分辨率')  : (isUpscaler ? 'Scale factor' : 'Resolution'),
    count:      zh ? '生成张数'     : 'Image count',
    generate:   zh ? '开始创作'     : 'Start creating',
    upscale:    zh ? '开始增强'     : 'Enhance image',
    modeEdit:   zh ? '图片编辑'     : 'Image edit',
    modeText:   zh ? '文生图'       : 'Text to image',
    uploadTitle: zh ? (isUpscaler ? '上传需要放大的图片' : '添加参考图片') : (isUpscaler ? 'Upload image to enhance' : 'Add reference images'),
    uploadSub:   zh ? 'JPG，PNG，WebP — 每张最大 10MB' : 'JPG, PNG, WebP — max 10MB each',
    promptPH: zh
      ? '描述你想要的效果，例如「一只站在雨中的橙色猫咪，吉卜力风格」…'
      : 'Describe the result — e.g. "an orange cat standing in the rain, Ghibli style"…',
  };

  return (
    <section className="py-16 md:py-24">
      <div className="container">

        {/* ── Page header ───────────────────────────────────────────────────── */}
        <div className="mx-auto mb-10 max-w-4xl text-center">
          <div className="mb-4 inline-flex items-center justify-center gap-2">
            <SmartIcon name={meta.icon} className="text-primary h-8 w-8" />
            <h1 className="text-3xl font-bold md:text-4xl">{name}</h1>
          </div>
          <p className="text-foreground text-lg font-medium md:text-xl">{tagline}</p>
          <p className="text-muted-foreground mt-3 text-sm md:text-base">{description}</p>
        </div>

        {/* ── Two-column layout ─────────────────────────────────────────────── */}
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

            {/* ── Left: form panel ──────────────────────────────────────────── */}
            <div ref={formPanelRef} className="bg-card border-foreground/5 rounded-xl border p-6 shadow-sm md:p-8">

              {/* Model dropdown */}
              <div className="space-y-2">
                <Label>{L.model}</Label>
                <div ref={modelDropdownRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setIsModelOpen((o) => !o)}
                    className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg border border-foreground/10 px-3 py-2.5 transition-colors hover:border-foreground/20"
                  >
                    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md"
                      style={{ backgroundColor: activeOpt.iconBg }}>
                      <SmartIcon name={activeOpt.icon} size={16} style={{ color: activeOpt.iconColor }} />
                    </span>
                    <span className="flex-1 text-left text-sm font-medium">
                      {activeOpt.name[locale] ?? activeOpt.name.en}
                    </span>
                    {activeOpt.badge && (
                      <span className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white"
                        style={{ backgroundColor: activeOpt.badgeColor ?? ACCENT }}>
                        {activeOpt.badge}
                      </span>
                    )}
                    <ChevronDown className={cn(
                      'h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform duration-200',
                      isModelOpen && 'rotate-180'
                    )} />
                  </button>

                  {isModelOpen && (
                    <div className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-foreground/8 bg-card shadow-lg shadow-black/10 ring-1 ring-black/5">
                      {SWITCHER_MODELS.map((m) => {
                        const isSel = m.slug === selectedSlug;
                        return (
                          <button key={m.slug} type="button"
                            onClick={() => { setIsModelOpen(false); handleSwitchModel(m.slug); }}
                            className={cn(
                              'flex w-full items-center gap-3 px-3 py-3 text-left transition-colors',
                              isSel ? 'bg-[#6366F1]/8' : 'hover:bg-muted/60'
                            )}
                          >
                            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
                              style={{ backgroundColor: m.iconBg }}>
                              <SmartIcon name={m.icon} size={16} style={{ color: m.iconColor }} />
                            </span>
                            <span className="flex min-w-0 flex-1 flex-col">
                              <span className="flex items-center gap-1.5">
                                <span className="text-sm font-medium">{m.name[locale] ?? m.name.en}</span>
                                {m.badge && (
                                  <span className="rounded px-1 py-px text-[9px] font-bold uppercase leading-none text-white"
                                    style={{ backgroundColor: m.badgeColor ?? ACCENT }}>
                                    {m.badge}
                                  </span>
                                )}
                              </span>
                              <span className="mt-0.5 truncate text-[11px] text-muted-foreground">
                                {m.desc[locale] ?? m.desc.en}
                              </span>
                            </span>
                            {isSel && <Check className="h-4 w-4 flex-shrink-0 text-[#6366F1]" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Mode tabs — hidden for upscaler */}
              {supportsI2I && (
                <Tabs value={subMode} onValueChange={(v) => setSubMode(v as SubMode)} className="mt-6">
                  <TabsList className="bg-primary/10 grid w-full grid-cols-2">
                    <TabsTrigger value="image-to-image">{L.modeEdit}</TabsTrigger>
                    <TabsTrigger value="text-to-image">{L.modeText}</TabsTrigger>
                  </TabsList>
                </Tabs>
              )}

              {/* Image upload — always for upscaler, or when in I2I mode */}
              {(isUpscaler || (supportsI2I && subMode === 'image-to-image')) && (
                <div className="mt-6">
                  <ImageUploader
                    allowMultiple={!isUpscaler && maxImages > 1}
                    maxImages={isUpscaler ? 1 : maxImages}
                    maxSizeMB={10}
                    largeDropZone
                    dropZoneTitle={L.uploadTitle}
                    dropZoneSub={L.uploadSub}
                    onChange={setUploads}
                  />
                </div>
              )}

              {/* Prompt — hidden for upscaler */}
              {!isUpscaler && (
                <div className={cn('space-y-2', supportsI2I ? 'mt-6' : 'mt-6')}>
                  <Label htmlFor="uni-prompt">{L.prompt}</Label>
                  <Textarea
                    id="uni-prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={L.promptPH}
                    className="min-h-28"
                    disabled={isGenerating}
                  />
                </div>
              )}

              {/* Aspect ratio — hidden for upscaler */}
              {!isUpscaler && availRatios.length > 0 && (
                <div className="mt-6 space-y-2">
                  <Label>{L.aspect}</Label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {availRatios.map((r) => {
                      const active = r.value === aspect;
                      return (
                        <button key={r.value} type="button" disabled={isGenerating}
                          onClick={() => setAspect(r.value)}
                          className={cn(
                            'group flex flex-col items-center justify-center gap-0.5 rounded-lg border px-1 py-2 text-center transition-colors',
                            active
                              ? 'border-[#6366F1] bg-[#6366F1]/5 text-[#6366F1]'
                              : 'border-foreground/10 text-foreground/60 hover:border-foreground/20 hover:text-foreground'
                          )}
                        >
                          <RatioThumb w={r.w} h={r.h} />
                          <div className="mt-0.5 text-[11px] font-semibold leading-none">{r.value}</div>
                          <div className={cn('text-[9px] leading-tight', active ? 'text-[#6366F1]/70' : 'text-muted-foreground')}>
                            {r.label[locale] ?? r.label.en}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Resolution / Scale factor */}
              {availRes.length > 0 && (
                <div className="mt-6 space-y-2">
                  <Label>{L.resolution}</Label>
                  <div className={cn('grid gap-2', availRes.length === 3 ? 'grid-cols-3' : 'grid-cols-2')}>
                    {availRes.map((r) => {
                      const active = resolution === r.value;
                      const label  = locale === 'zh' ? r.labelZh : r.labelEn;
                      const sub    = locale === 'zh' ? r.subZh   : r.subEn;
                      return (
                        <button key={r.value} type="button" disabled={isGenerating}
                          onClick={() => setResolution(r.value)}
                          className={cn(
                            'flex flex-col items-start rounded-lg border px-3 py-2 text-left transition-colors',
                            active
                              ? 'border-[#6366F1] bg-[#6366F1]/5'
                              : 'border-foreground/10 hover:border-foreground/20'
                          )}
                        >
                          <span className={cn('text-sm font-semibold', active ? 'text-[#6366F1]' : 'text-foreground')}>
                            {label}
                          </span>
                          {sub && (
                            <span className="text-muted-foreground mt-0.5 text-[10px] leading-tight">{sub}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Count — only for models that support it */}
              {!isUpscaler && (modelMeta?.supportsCount) && (
                <div className="mt-6 space-y-2">
                  <Label>{L.count}</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map((n) => {
                      const active = count === n;
                      return (
                        <button key={n} type="button" disabled={isGenerating}
                          onClick={() => setCount(n)}
                          className={cn(
                            'rounded-lg border py-2 text-sm font-medium transition-colors',
                            active
                              ? 'border-[#6366F1] bg-[#6366F1]/5 text-[#6366F1]'
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

              {/* NSFW checker toggle — Seedream 5 only */}
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
              <div className="mt-8">
                {isCheckSign ? (
                  <Button className="w-full" disabled size="lg">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isUpscaler ? L.upscale : L.generate}
                  </Button>
                ) : !user ? (
                  <Button size="lg" className="w-full" onClick={() => setIsShowSignModal(true)}>
                    <User className="mr-2 h-4 w-4" />
                    {zh ? '登录后创作' : 'Sign in to create'}
                  </Button>
                ) : (
                  <Button size="lg" className="w-full" disabled={isGenerating} onClick={handleGenerate}>
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {progress !== null
                          ? `${zh ? '生成中' : 'Generating'} ${progress}%`
                          : zh ? '生成中…' : 'Generating…'}
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        {isUpscaler ? L.upscale : L.generate}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* ── Right: result panel ───────────────────────────────────────── */}
            <div className="bg-card border-foreground/5 flex flex-col rounded-xl border p-6 shadow-sm md:p-8">
              <h3 className="mb-4 text-base font-semibold">
                {zh ? '生成结果' : 'Result'}
              </h3>

              {status === 'idle' && (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-[#6366F1]/30 bg-[#6366F1]/5 py-16 text-center">
                  <ImageIcon className="h-12 w-12 text-[#6366F1]/40" />
                  <p className="text-muted-foreground text-sm">
                    {isUpscaler
                      ? (zh ? '上传图片后点击「开始增强」' : 'Upload an image and click Enhance')
                      : (zh ? '输入提示词后点击「开始创作」' : 'Enter a prompt and click Start creating')}
                  </p>
                </div>
              )}

              {isGenerating && (
                <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-[#6366F1]/30 bg-[#6366F1]/5 py-16">
                  <Loader2 className="h-10 w-10 animate-spin text-[#6366F1]" />
                  <p className="text-muted-foreground text-sm">
                    {progress !== null
                      ? `${zh ? '生成中' : 'Generating'} ${progress}%`
                      : zh ? '正在生成，请稍候…' : 'Generating, please wait…'}
                  </p>
                  <p className="text-muted-foreground/60 text-xs">
                    {zh ? '通常需要 10–30 秒' : 'Usually takes 10–30 s'}
                  </p>
                </div>
              )}

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

              {status === 'done' && results.length > 0 && (
                <div className="flex flex-1 flex-col gap-3">
                  <div className={cn('grid gap-2', results.length > 1 ? 'grid-cols-2' : 'grid-cols-1')}>
                    {results.map((url, i) => (
                      <div key={i} className="group relative overflow-hidden rounded-xl border border-foreground/10">
                        <Image
                          src={url}
                          alt={`${prompt} (${i + 1})`}
                          width={800}
                          height={800}
                          className="h-auto w-full object-cover"
                          unoptimized
                        />
                        <a
                          href={url}
                          download={`${selectedSlug}-${Date.now()}-${i + 1}.jpg`}
                          target="_blank"
                          rel="noreferrer"
                          className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100"
                        >
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
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}

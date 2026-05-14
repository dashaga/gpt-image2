'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  ChevronDown,
  Download,
  Loader2,
  Sparkles,
  User,
  VideoIcon,
} from 'lucide-react';
import { useLocale } from 'next-intl';
import { toast } from 'sonner';

import { useRouter } from '@/core/i18n/navigation';
import {
  ImageUploader,
  ImageUploaderValue,
} from '@/shared/blocks/common/image-uploader';
import { SmartIcon } from '@/shared/blocks/common/smart-icon';
import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Textarea } from '@/shared/components/ui/textarea';
import { useAppContext } from '@/shared/contexts/app';
import { cn } from '@/shared/lib/utils';

import { MODEL_BY_SLUG } from './registry';

// ── Constants ──────────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 10_000;
const TIMEOUT_MS       = 15 * 60 * 1000; // 15 minutes
const ACCENT           = '#6366F1';
const LS_KEY           = 'unified-video-pending-task';

// ── Types ──────────────────────────────────────────────────────────────────────

type Bilingual      = { en: string; zh: string };
type VideoMode      = 'text-to-video' | 'image-to-video';
type GenerateStatus = 'idle' | 'loading' | 'polling' | 'done' | 'error';
type GrokMode       = 'fun' | 'normal' | 'spicy';

// ── Video model switcher data ──────────────────────────────────────────────────

type VideoModelOption = {
  slug:        string;
  url:         string;
  name:        Bilingual;
  icon:        string;
  iconBg:      string;
  iconColor:   string;
  badge?:      string;
  badgeColor?: string;
  desc:        Bilingual;
};

const VIDEO_SWITCHER_MODELS: VideoModelOption[] = [
  {
    slug:      'seedance2',
    url:       '/ai/seedance2',
    name:      { en: 'Seedance 2', zh: 'Seedance 2' },
    icon:      'RiMovie2Line',
    iconBg:    '#EEF2FF',
    iconColor: ACCENT,
    badge:     'PRO',
    badgeColor: ACCENT,
    desc:      { en: 'ByteDance · Cinematic quality', zh: '字节跳动，影院级画质' },
  },
  {
    slug:      'hailuo',
    url:       '/ai/hailuo',
    name:      { en: 'Hailuo AI Video', zh: '海螺 AI Video' },
    icon:      'RiFilmLine',
    iconBg:    '#EFF6FF',
    iconColor: '#2563EB',
    desc:      { en: 'MiniMax · Precise frame control', zh: 'MiniMax，首尾帧精准控制' },
  },
  {
    slug:      'grok-video',
    url:       '/ai/grok-video',
    name:      { en: 'Grok Video', zh: 'Grok Video' },
    icon:      'RiFlashlightLine',
    iconBg:    '#F0FDF4',
    iconColor: '#16A34A',
    desc:      { en: 'xAI · Spicy mode support', zh: 'xAI，支持辣味模式' },
  },
];

// ── Per-model capability config ────────────────────────────────────────────────

const MODEL_SUPPORTS_I2V: Record<string, boolean> = {
  seedance2:   true,
  hailuo:      true,
  'grok-video': true,
};

// Maximum reference images
const MODEL_MAX_IMAGES: Record<string, number> = {
  seedance2:   1,
  hailuo:      1,
  'grok-video': 7,
};

// Aspect ratios per model (undefined = show none)
const MODEL_ASPECT_RATIOS: Record<string, string[]> = {
  seedance2:   ['16:9', '9:16', '1:1', '4:3', '3:4'],
  hailuo:      [],   // Hailuo doesn't expose aspect_ratio
  'grok-video': ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9'],
};

// Durations: [min, max, step, default]
const MODEL_DURATION: Record<string, [number, number, number, number] | null> = {
  seedance2:   [4, 15, 1, 5],
  hailuo:      null, // T2V: no duration param; I2V: 6 or 10 only
  'grok-video': [6, 30, 1, 6],
};

// Hailuo I2V discrete durations
const HAILUO_DURATIONS = [6, 10];

// Resolutions per model
const MODEL_RESOLUTIONS: Record<string, { value: string; label: string }[] | null> = {
  seedance2:   [{ value: '720P', label: '720P' }, { value: '1080P', label: '1080P' }],
  hailuo:      [{ value: '768P', label: '768P' }, { value: '1080P', label: '1080P' }],
  'grok-video': [{ value: '480p', label: '480p' }, { value: '720p', label: '720p' }],
};

const ASPECT_LABELS: Record<string, Bilingual> = {
  '16:9': { en: 'Landscape', zh: '横屏' },
  '9:16': { en: 'Portrait',  zh: '竖屏' },
  '1:1':  { en: 'Square',    zh: '方形' },
  '4:3':  { en: '4:3',       zh: '4:3'  },
  '3:4':  { en: '3:4',       zh: '3:4'  },
  '21:9': { en: 'Cinematic', zh: '电影' },
};

// ── localStorage helpers ───────────────────────────────────────────────────────

function savePendingTask(slug: string, taskId: string) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ slug, taskId, ts: Date.now() }));
  } catch {}
}

function loadPendingTask(): { slug: string; taskId: string; ts: number } | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw) as { slug: string; taskId: string; ts: number };
    // Discard if older than 15 min
    if (Date.now() - obj.ts > TIMEOUT_MS) { localStorage.removeItem(LS_KEY); return null; }
    return obj;
  } catch { return null; }
}

function clearPendingTask() {
  try { localStorage.removeItem(LS_KEY); } catch {}
}

// ── Component ──────────────────────────────────────────────────────────────────

export function UnifiedVideoPage({ slug }: { slug: string }) {
  const router = useRouter();
  const locale = useLocale() as 'en' | 'zh';
  const { user, isCheckSign, setIsShowSignModal, setIsShowInsufficientCreditsModal, fetchUserCredits } = useAppContext();

  const zh = locale === 'zh';

  // ── Selected model ──────────────────────────────────────────────────────────
  const [selectedSlug, setSelectedSlug] = useState(slug);

  useEffect(() => {
    setSelectedSlug(slug);
  }, [slug]);

  // ── Dropdown state ──────────────────────────────────────────────────────────
  const [isModelOpen, setIsModelOpen] = useState(false);
  const modelDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) {
        setIsModelOpen(false);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  // ── Form state ──────────────────────────────────────────────────────────────
  const [videoMode,  setVideoMode]  = useState<VideoMode>('text-to-video');
  const [uploads,    setUploads]    = useState<ImageUploaderValue[]>([]);
  const [prompt,     setPrompt]     = useState('');
  const [aspect,     setAspect]     = useState('16:9');
  const [resolution, setResolution] = useState('720P');
  const [duration,   setDuration]   = useState(5);
  const [grokMode,   setGrokMode]   = useState<GrokMode>('normal');
  const [hailuoDur,  setHailuoDur]  = useState(6);

  // Pre-fill prompt from ?prompt= URL param (e.g. coming from Showcase "Try this example")
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlPrompt = params.get('prompt');
    if (urlPrompt) setPrompt(urlPrompt);
  }, []);

  // Reset model-specific form values on slug change
  useEffect(() => {
    const ratios = MODEL_ASPECT_RATIOS[selectedSlug] ?? [];
    setAspect(ratios[0] ?? '16:9');
    const durationCfg = MODEL_DURATION[selectedSlug];
    setDuration(durationCfg ? durationCfg[3] : 5);
    const resOpts = MODEL_RESOLUTIONS[selectedSlug];
    setResolution(resOpts?.[0]?.value ?? '720P');
    setHailuoDur(6);
    if (!MODEL_SUPPORTS_I2V[selectedSlug]) setVideoMode('text-to-video');
  }, [selectedSlug]);

  // ── Generation state ────────────────────────────────────────────────────────
  const [status,     setStatus]    = useState<GenerateStatus>('idle');
  const [resultUrl,  setResultUrl] = useState<string | null>(null);
  const [errorMsg,   setErrorMsg]  = useState<string | null>(null);
  const [progress,   setProgress]  = useState<number | null>(null);

  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeoutRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    if (timeoutRef.current)   clearTimeout(timeoutRef.current);
    pollTimerRef.current = null;
    timeoutRef.current   = null;
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  // ── Restore pending task from localStorage on mount ─────────────────────────
  useEffect(() => {
    const pending = loadPendingTask();
    if (pending && pending.slug === slug) {
      setStatus('polling');
      startPoll(pending.taskId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Poll ────────────────────────────────────────────────────────────────────
  const startPoll = useCallback(
    (taskId: string) => {
      const tick = async () => {
        try {
          const res  = await fetch(`/api/video/status/${taskId}`);
          const json = await res.json();
          if (json.code !== 0) {
            clearPendingTask();
            setErrorMsg(zh ? '查询失败，请重试' : 'Status query failed, please retry');
            setStatus('error');
            return;
          }

          const { status: s, resultUrl: url, progress: p } = json.data as {
            status:    string;
            resultUrl: string | null;
            progress:  number | null;
          };

          if (p !== null) setProgress(p);

          if (s === 'success') {
            clearPendingTask();
            setResultUrl(url);
            setStatus('done');
            setProgress(null);
            fetchUserCredits();
            return;
          }

          if (s === 'fail') {
            clearPendingTask();
            setErrorMsg(zh ? '生成失败，请重试' : 'Generation failed, please retry');
            setStatus('error');
            return;
          }

          pollTimerRef.current = setTimeout(tick, POLL_INTERVAL_MS);
        } catch {
          clearPendingTask();
          setErrorMsg(zh ? '网络错误，请重试' : 'Network error, please retry');
          setStatus('error');
        }
      };

      pollTimerRef.current = setTimeout(tick, POLL_INTERVAL_MS);
    },
    [zh, fetchUserCredits]
  );

  // ── Switch model ────────────────────────────────────────────────────────────
  const handleSwitchModel = useCallback(
    (newSlug: string) => {
      if (newSlug === selectedSlug) return;
      stopPolling();
      setSelectedSlug(newSlug);
      setStatus('idle');
      setResultUrl(null);
      setErrorMsg(null);
      setProgress(null);
      router.push(`/ai/${newSlug}`);
    },
    [selectedSlug, router, stopPolling]
  );

  // ── Generate ────────────────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (!user) { setIsShowSignModal(true); return; }

    const supI2V = MODEL_SUPPORTS_I2V[selectedSlug] ?? false;
    if (supI2V && videoMode === 'image-to-video') {
      if (!uploads.some((u) => u.status === 'uploaded' && u.url)) {
        toast.error(zh ? '请先上传参考图片' : 'Please upload a reference image first');
        return;
      }
    }
    if (!prompt.trim()) {
      toast.error(zh ? '请输入提示词' : 'Please enter a prompt');
      return;
    }

    stopPolling();
    setStatus('loading');
    setResultUrl(null);
    setErrorMsg(null);
    setProgress(null);

    try {
      const imageUrls = uploads
        .filter((u) => u.status === 'uploaded' && u.url)
        .map((u) => u.url as string);

      const payload: Record<string, unknown> = {
        model:       selectedSlug,
        mode:        videoMode,
        prompt:      prompt.trim(),
        imageUrls:   imageUrls.length ? imageUrls : undefined,
        aspectRatio: MODEL_ASPECT_RATIOS[selectedSlug]?.length ? aspect : undefined,
        resolution,
      };

      // Model-specific params
      if (selectedSlug === 'seedance2') {
        payload.duration = duration;
      } else if (selectedSlug === 'hailuo') {
        if (videoMode === 'image-to-video') payload.duration = hailuoDur;
      } else if (selectedSlug === 'grok-video') {
        payload.duration = duration;
        payload.grokMode = grokMode;
      }

      const res  = await fetch('/api/video/create', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
      const json = await res.json();

      if (json.code === -2) {
        setIsShowInsufficientCreditsModal(true);
        setStatus('idle');
        return;
      }
      if (json.code !== 0) throw new Error(json.message ?? 'create failed');

      const taskId = json.data.taskId as string;

      savePendingTask(selectedSlug, taskId);
      setStatus('polling');

      timeoutRef.current = setTimeout(() => {
        stopPolling();
        clearPendingTask();
        setErrorMsg(zh ? '生成超时（15 分钟），请重试' : 'Generation timed out (15 min), please retry');
        setStatus('error');
      }, TIMEOUT_MS);

      startPoll(taskId);
    } catch (err: any) {
      stopPolling();
      setErrorMsg(err.message ?? 'unknown error');
      setStatus('error');
    }
  }, [
    user, selectedSlug, videoMode, uploads, prompt, aspect, resolution,
    duration, grokMode, hailuoDur, stopPolling, startPoll,
    setIsShowSignModal, setIsShowInsufficientCreditsModal, zh,
  ]);

  // ── Derived values ──────────────────────────────────────────────────────────
  const meta = MODEL_BY_SLUG[selectedSlug];
  if (!meta) return null;

  const isGenerating = status === 'loading' || status === 'polling';
  const supportsI2V  = MODEL_SUPPORTS_I2V[selectedSlug] ?? false;
  const maxImages    = MODEL_MAX_IMAGES[selectedSlug]   ?? 1;
  const availRatios  = MODEL_ASPECT_RATIOS[selectedSlug] ?? [];
  const resOpts      = MODEL_RESOLUTIONS[selectedSlug]  ?? [];
  const durationCfg  = MODEL_DURATION[selectedSlug];

  const name        = meta.name[locale]        ?? meta.name.en;
  const tagline     = meta.tagline[locale]     ?? meta.tagline.en;
  const description = meta.description[locale] ?? meta.description.en;

  const activeModelOpt =
    VIDEO_SWITCHER_MODELS.find((m) => m.slug === selectedSlug) ?? VIDEO_SWITCHER_MODELS[0];

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <section className="py-16 md:py-24">
      <div className="container">

        {/* ── Page header ───────────────────────────────────────────────────── */}
        <div className="mx-auto mb-10 max-w-4xl text-center">
          <div className="mb-4 inline-flex items-center justify-center gap-2">
            <SmartIcon name={meta.icon} className="text-primary h-8 w-8" />
            <h1 className="text-3xl font-bold md:text-4xl">{name}</h1>
            {meta.badge && (
              <span className="rounded-md border border-[#6366F1]/40 px-2 py-0.5 text-xs font-semibold tracking-wide text-[#6366F1] uppercase">
                {meta.badge}
              </span>
            )}
          </div>
          <p className="text-foreground text-lg font-medium md:text-xl">{tagline}</p>
          <p className="text-muted-foreground mt-3 text-sm md:text-base">{description}</p>
        </div>

        {/* ── Two-column layout ─────────────────────────────────────────────── */}
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

            {/* ── Left: form panel ──────────────────────────────────────────── */}
            <div className="bg-card border-foreground/5 rounded-xl border p-6 shadow-sm md:p-8">

              {/* Model dropdown */}
              <div className="space-y-2">
                <Label>{zh ? '选择模型' : 'Select model'}</Label>
                <div ref={modelDropdownRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setIsModelOpen((o) => !o)}
                    className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg border border-foreground/10 px-3 py-2.5 transition-colors hover:border-foreground/20"
                  >
                    <span
                      className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md"
                      style={{ backgroundColor: activeModelOpt.iconBg }}
                    >
                      <SmartIcon name={activeModelOpt.icon} size={16} style={{ color: activeModelOpt.iconColor }} />
                    </span>
                    <span className="flex-1 text-left text-sm font-medium">
                      {activeModelOpt.name[locale] ?? activeModelOpt.name.en}
                    </span>
                    {activeModelOpt.badge && (
                      <span
                        className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white"
                        style={{ backgroundColor: activeModelOpt.badgeColor ?? ACCENT }}
                      >
                        {activeModelOpt.badge}
                      </span>
                    )}
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform duration-200',
                        isModelOpen && 'rotate-180'
                      )}
                    />
                  </button>

                  {isModelOpen && (
                    <div className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-foreground/8 bg-card shadow-lg shadow-black/10 ring-1 ring-black/5">
                      {VIDEO_SWITCHER_MODELS.map((m) => {
                        const isSel = m.slug === selectedSlug;
                        return (
                          <button
                            key={m.slug}
                            type="button"
                            onClick={() => {
                              setIsModelOpen(false);
                              handleSwitchModel(m.slug);
                            }}
                            className={cn(
                              'flex w-full items-center gap-3 px-3 py-3 text-left transition-colors',
                              isSel ? 'bg-[#6366F1]/8' : 'hover:bg-muted/60'
                            )}
                          >
                            <span
                              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
                              style={{ backgroundColor: m.iconBg }}
                            >
                              <SmartIcon name={m.icon} size={16} style={{ color: m.iconColor }} />
                            </span>
                            <span className="flex min-w-0 flex-1 flex-col">
                              <span className="flex items-center gap-1.5">
                                <span className="text-sm font-medium">
                                  {m.name[locale] ?? m.name.en}
                                </span>
                                {m.badge && (
                                  <span
                                    className="rounded px-1 py-px text-[9px] font-bold uppercase leading-none text-white"
                                    style={{ backgroundColor: m.badgeColor ?? ACCENT }}
                                  >
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

              {/* Mode tabs — only for models that support image-to-video */}
              {supportsI2V && (
                <Tabs
                  value={videoMode}
                  onValueChange={(v) => setVideoMode(v as VideoMode)}
                  className="mt-6"
                >
                  <TabsList className="bg-primary/10 grid w-full grid-cols-2">
                    <TabsTrigger value="text-to-video">{zh ? '文生视频' : 'Text to Video'}</TabsTrigger>
                    <TabsTrigger value="image-to-video">{zh ? '图生视频' : 'Image to Video'}</TabsTrigger>
                  </TabsList>
                </Tabs>
              )}

              {/* Reference image upload (I2V mode) */}
              {supportsI2V && videoMode === 'image-to-video' && (
                <div className="mt-6">
                  <ImageUploader
                    allowMultiple={maxImages > 1}
                    maxImages={maxImages}
                    maxSizeMB={10}
                    largeDropZone
                    dropZoneTitle={zh ? '上传参考图片' : 'Upload reference image'}
                    dropZoneSub={
                      maxImages > 1
                        ? (zh ? `JPG，PNG，WebP — 最多 ${maxImages} 张` : `JPG, PNG, WebP — up to ${maxImages} images`)
                        : (zh ? 'JPG，PNG，WebP — 最大 10MB' : 'JPG, PNG, WebP — max 10 MB')
                    }
                    onChange={setUploads}
                  />
                </div>
              )}

              {/* Prompt */}
              <div className="mt-6 space-y-2">
                <Label htmlFor="video-prompt">{zh ? '提示词' : 'Prompt'}</Label>
                <Textarea
                  id="video-prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={zh
                    ? '详细描述你想要的视频内容，例如「一位穿着红裙的女孩在海滩上奔跑，慢镜头，电影感」…'
                    : 'Describe the video in detail — e.g. "A girl in a red dress running on the beach, slow-motion, cinematic"…'}
                  className="min-h-28"
                  disabled={isGenerating}
                />
              </div>

              {/* Aspect ratio — Seedance & Grok */}
              {availRatios.length > 0 && (
                <div className="mt-6 space-y-2">
                  <Label>{zh ? '画面比例' : 'Aspect ratio'}</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {availRatios.map((r) => {
                      const active = r === aspect;
                      const lbl = ASPECT_LABELS[r];
                      return (
                        <button
                          key={r}
                          type="button"
                          disabled={isGenerating}
                          onClick={() => setAspect(r)}
                          className={cn(
                            'rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-colors',
                            active
                              ? 'border-[#6366F1] bg-[#6366F1]/5 text-[#6366F1]'
                              : 'border-foreground/10 text-foreground/60 hover:border-foreground/20 hover:text-foreground'
                          )}
                        >
                          {r}
                          {lbl && (
                            <span className={cn('ml-1 text-[10px]', active ? 'text-[#6366F1]/70' : 'text-muted-foreground')}>
                              {lbl[locale]}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Duration slider — Seedance & Grok */}
              {durationCfg && selectedSlug !== 'hailuo' && (
                <div className="mt-6 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>{zh ? '时长' : 'Duration'}</Label>
                    <span className="text-sm font-semibold text-[#6366F1]">{duration}s</span>
                  </div>
                  <input
                    type="range"
                    min={durationCfg[0]}
                    max={durationCfg[1]}
                    step={durationCfg[2]}
                    value={duration}
                    disabled={isGenerating}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-foreground/10 accent-[#6366F1]"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground/60">
                    <span>{durationCfg[0]}s</span>
                    <span>{durationCfg[1]}s</span>
                  </div>
                </div>
              )}

              {/* Hailuo I2V duration chips */}
              {selectedSlug === 'hailuo' && videoMode === 'image-to-video' && (
                <div className="mt-6 space-y-2">
                  <Label>{zh ? '时长' : 'Duration'}</Label>
                  <div className="flex gap-2">
                    {HAILUO_DURATIONS.map((d) => (
                      <button
                        key={d}
                        type="button"
                        disabled={isGenerating}
                        onClick={() => setHailuoDur(d)}
                        className={cn(
                          'flex-1 rounded-lg border py-2 text-sm font-medium transition-colors',
                          hailuoDur === d
                            ? 'border-[#6366F1] bg-[#6366F1]/5 text-[#6366F1]'
                            : 'border-foreground/10 text-foreground/60 hover:border-foreground/20 hover:text-foreground'
                        )}
                      >
                        {d}s
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Resolution */}
              {resOpts.length > 0 && (
                <div className="mt-6 space-y-2">
                  <Label>{zh ? '分辨率' : 'Resolution'}</Label>
                  <div className={cn('grid gap-2', resOpts.length === 2 ? 'grid-cols-2' : 'grid-cols-3')}>
                    {resOpts.map((r) => {
                      const active = resolution === r.value;
                      return (
                        <button
                          key={r.value}
                          type="button"
                          disabled={isGenerating}
                          onClick={() => setResolution(r.value)}
                          className={cn(
                            'rounded-lg border py-2 text-sm font-medium transition-colors',
                            active
                              ? 'border-[#6366F1] bg-[#6366F1]/5 text-[#6366F1]'
                              : 'border-foreground/10 text-foreground/60 hover:border-foreground/20 hover:text-foreground'
                          )}
                        >
                          {r.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Grok mode */}
              {selectedSlug === 'grok-video' && (
                <div className="mt-6 space-y-2">
                  <Label>{zh ? '创作模式' : 'Style mode'}</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { key: 'normal' as GrokMode, zh: '普通',    en: 'Normal' },
                        { key: 'fun'    as GrokMode, zh: '趣味',    en: 'Fun'    },
                        { key: 'spicy'  as GrokMode, zh: '辣味 🌶', en: 'Spicy 🌶' },
                      ] as const
                    ).map(({ key, zh: labelZh, en: labelEn }) => {
                      const active = grokMode === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          disabled={isGenerating}
                          onClick={() => setGrokMode(key)}
                          className={cn(
                            'rounded-lg border py-2 text-sm font-medium transition-colors',
                            active
                              ? 'border-[#6366F1] bg-[#6366F1]/5 text-[#6366F1]'
                              : 'border-foreground/10 text-foreground/60 hover:border-foreground/20 hover:text-foreground'
                          )}
                        >
                          {zh ? labelZh : labelEn}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Generate button */}
              <div className="mt-8">
                {isCheckSign ? (
                  <Button className="w-full" disabled size="lg">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {zh ? '生成视频' : 'Generate video'}
                  </Button>
                ) : !user ? (
                  <Button size="lg" className="w-full" onClick={() => setIsShowSignModal(true)}>
                    <User className="mr-2 h-4 w-4" />
                    {zh ? '登录后生成' : 'Sign in to generate'}
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    className="w-full"
                    disabled={isGenerating}
                    onClick={handleGenerate}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {progress !== null
                          ? `${zh ? '生成中' : 'Generating'} ${progress}%`
                          : zh ? '正在生成…' : 'Generating…'}
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        {zh ? '生成视频' : 'Generate video'}
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
                  <VideoIcon className="h-12 w-12 text-[#6366F1]/40" />
                  <p className="text-muted-foreground text-sm">
                    {zh ? '输入提示词后点击「生成视频」' : 'Enter a prompt and click Generate video'}
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
                    {zh ? '视频生成通常需要 1–3 分钟' : 'Video generation usually takes 1–3 minutes'}
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

              {status === 'done' && resultUrl && (
                <div className="flex flex-1 flex-col gap-3">
                  <div className="group relative overflow-hidden rounded-xl border border-foreground/10">
                    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                    <video
                      src={resultUrl}
                      controls
                      autoPlay
                      loop
                      playsInline
                      className="h-auto w-full"
                    />
                    <a
                      href={resultUrl}
                      download={`${selectedSlug}-${Date.now()}.mp4`}
                      target="_blank"
                      rel="noreferrer"
                      className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  </div>
                  <Button className="w-full gap-1.5" onClick={handleGenerate}>
                    <Sparkles className="h-4 w-4" />
                    {zh ? '再次生成' : 'Generate again'}
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

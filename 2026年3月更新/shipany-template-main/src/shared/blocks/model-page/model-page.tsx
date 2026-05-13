'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { Check, ChevronDown, Loader2, Sparkles, User } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

import { Link, useRouter } from '@/core/i18n/navigation';
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
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Textarea } from '@/shared/components/ui/textarea';
import { useAppContext } from '@/shared/contexts/app';
import { cn } from '@/shared/lib/utils';

import { MODELS_BY_TYPE, ModelMeta } from './registry';

// ── Types ────────────────────────────────────────────────────────────────────

type Locale = 'en' | 'zh';
type SubMode = 'image-to-image' | 'text-to-image';
type Bilingual = { en: string; zh: string };

// ── Image model dropdown data ─────────────────────────────────────────────────

type ImageModelOption = {
  slug: string;
  url: string;
  name: Bilingual;
  icon: string;
  iconBg: string;
  iconColor: string;
  badge?: string;
  badgeColor?: string;
  desc: Bilingual;
};

const IMAGE_MODEL_OPTIONS: ImageModelOption[] = [
  {
    slug: 'gpt-image-2',
    url: '/ai/gpt-image-2',
    name: { en: 'GPT Image 2', zh: 'GPT Image 2' },
    icon: 'Bot',
    iconBg: '#EEF2FF',
    iconColor: '#6366F1',
    badge: 'NEW',
    badgeColor: '#16a34a',
    desc: { en: 'OpenAI · Photoreal & precise text', zh: 'OpenAI 出品，照片级真实感与精准文字' },
  },
  {
    slug: 'nano-banana-pro',
    url: '/ai/nano-banana-pro',
    name: { en: 'Nano Banana 2', zh: 'Nano Banana 2' },
    icon: 'Sparkles',
    iconBg: '#FEF9C3',
    iconColor: '#CA8A04',
    desc: { en: 'Fast · Rich detail from short prompts', zh: '速度快，短提示词生成丰富细节' },
  },
  {
    slug: 'seedream5',
    url: '/ai/seedream5',
    name: { en: 'Seedream 5', zh: 'Seedream 5' },
    icon: 'Leaf',
    iconBg: '#FFF7ED',
    iconColor: '#EA580C',
    badge: 'WILD',
    badgeColor: '#EA580C',
    desc: { en: 'ByteDance · 4K, 8 aspect ratios', zh: '字节跳动，4K 画质，8 种宽高比' },
  },
  {
    slug: 'ai-image-upscaler',
    url: '/ai/ai-image-upscaler',
    name: { en: 'Image Enhancer', zh: '图像增强' },
    icon: 'ZoomIn',
    iconBg: '#EFF6FF',
    iconColor: '#2563EB',
    desc: { en: 'Upscale to 4K, sharpen details', zh: '一键升清至 4K，锐化细节' },
  },
];

// ── Aspect ratio grid data ────────────────────────────────────────────────────

type AspectRatioOption = { value: string; w: number; h: number; label: Bilingual };

const IMAGE_ASPECT_RATIOS_GRID: AspectRatioOption[] = [
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

// ── Resolution grid data ──────────────────────────────────────────────────────

type ResolutionOption = { value: string; label: Bilingual; sub?: Bilingual };

const IMAGE_RESOLUTIONS_GRID: ResolutionOption[] = [
  {
    value: 'sd',
    label: { en: 'Standard HD', zh: '标准高清' },
    sub:   { en: '1024×1024 · general', zh: '1024×1024·通用画质' },
  },
  {
    value: 'hd2k',
    label: { en: 'HD 2K', zh: '高清 2K' },
  },
  {
    value: 'uhd4k',
    label: { en: 'Ultra HD 4K', zh: '超清 4K' },
  },
];

// ── Video model data (kept as dropdowns) ──────────────────────────────────────

const VIDEO_ASPECT_RATIOS = ['16:9', '9:16', '1:1', '4:3'];
const VIDEO_RESOLUTIONS   = ['720p', '1080p', '4K'];
const VIDEO_DURATIONS     = ['5s', '10s', '15s'];

const COUNT_OPTIONS = [1, 2, 3, 4];

// ── Helpers ───────────────────────────────────────────────────────────────────

function RatioThumb({ w, h }: { w: number; h: number }) {
  const max = 24;
  const a = w / h;
  const tw = a >= 1 ? max : Math.round(max * a);
  const th = a >= 1 ? Math.round(max / a) : max;
  return (
    <div className="flex h-7 w-8 items-center justify-center">
      <div
        className="rounded-[2px] bg-current opacity-50 transition-opacity group-hover:opacity-70"
        style={{ width: tw, height: th }}
      />
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ModelPage({ slug }: { slug: string }) {
  const router = useRouter();
  const locale = useLocale() as Locale;
  const t = useTranslations('common.model_page');
  const { user, isCheckSign, setIsShowSignModal } = useAppContext();

  const all = MODELS_BY_TYPE.image.concat(MODELS_BY_TYPE.video);
  const meta = useMemo<ModelMeta | undefined>(
    () => all.find((m) => m.slug === slug),
    [slug]
  );

  // All hooks unconditionally before any early return
  const searchParams = useSearchParams();
  const [subMode, setSubMode]     = useState<SubMode>(() =>
    searchParams.get('mode') === 'image' ? 'image-to-image' : 'text-to-image'
  );
  const [model, setModel]         = useState(slug);
  const [isModelOpen, setIsModelOpen] = useState(false);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const formPanelRef     = useRef<HTMLDivElement>(null);
  const [uploads, setUploads]     = useState<ImageUploaderValue[]>([]);

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) {
        setIsModelOpen(false);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  // Scroll to form when arriving via "试试这个示例" link
  useEffect(() => {
    if (searchParams.get('prompt') && formPanelRef.current) {
      const id = setTimeout(() => {
        formPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
      return () => clearTimeout(id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [prompt, setPrompt]       = useState(() => searchParams.get('prompt') ?? '');
  const [aspect, setAspect]       = useState('1:1');
  const [vidAspect, setVidAspect] = useState('16:9');
  const [resolution, setResolution]       = useState('sd');
  const [vidResolution, setVidResolution] = useState(VIDEO_RESOLUTIONS[1]);
  const [count, setCount]         = useState<number>(1);
  const [duration, setDuration]   = useState(VIDEO_DURATIONS[0]);

  if (!meta) return null;

  const siblings = MODELS_BY_TYPE[meta.type];
  const isImage  = meta.type === 'image';

  const name        = meta.name[locale]        ?? meta.name.en;
  const tagline     = meta.tagline[locale]     ?? meta.tagline.en;
  const description = meta.description[locale] ?? meta.description.en;

  const uploadedUrls = uploads
    .filter((u) => u.status === 'uploaded' && u.url)
    .map((u) => u.url as string);

  const handleSwitchModel = (nextSlug: string) => {
    if (nextSlug !== slug) router.push(`/ai/${nextSlug}`);
  };

  const handleGenerate = () => {
    if (!user) { setIsShowSignModal(true); return; }

    if (isImage && subMode === 'image-to-image' && uploadedUrls.length === 0) {
      toast.error(t('form.upload_required_toast'));
      return;
    }
    if (!prompt.trim()) {
      toast.error(t('form.prompt_required_toast'));
      return;
    }
    toast.info(t('form.coming_soon_toast'));
  };

  // ── Localized labels ────────────────────────────────────────────────────────
  const zh = locale === 'zh';
  const L = {
    model:       zh ? '模型'     : 'Model',
    prompt:      zh ? '提示词'   : 'Prompt',
    aspect:      zh ? '图片比例' : 'Aspect ratio',
    resolution:  zh ? '分辨率'   : 'Resolution',
    count:       zh ? '生成张数' : 'Image count',
    generate:    zh ? '开始创作' : 'Start creating',
    modeEdit:    zh ? '图片编辑' : 'Image edit',
    modeText:    zh ? '文生图'   : 'Text to image',
    uploadHint:  zh ? '点击上传图片，支持多张（最多 4 张）' : 'Click to upload images — up to 4',
    uploadZoneTitle: zh ? '添加图片（1-4）' : 'Add images (1–4)',
    uploadZoneSub:   zh ? 'JPG，PNG，WebP — 每张最大 10MB' : 'JPG, PNG, WebP — max 10MB each',
    promptPlaceholder: zh
      ? '描述你想要的效果，例如「把背景换成夜晚的街道」…'
      : 'Describe the result — e.g. "swap background to a night street"…',
  };

  return (
    <section className="py-16 md:py-24">
      <div className="container">

        {/* ── Page header ─────────────────────────────────────────────────── */}
        <div className="mx-auto mb-10 max-w-4xl text-center">
          <div className="mb-4 inline-flex items-center justify-center gap-2">
            <SmartIcon name={meta.icon} className="text-primary h-8 w-8" />
            <h1 className="text-3xl font-bold md:text-4xl">{name}</h1>
            {meta.badge && (
              <span className="border-primary/40 text-primary rounded-md border px-2 py-0.5 text-xs font-semibold tracking-wide uppercase">
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

            {/* Left: form panel */}
            <div ref={formPanelRef} className="bg-card border-foreground/5 rounded-xl border p-6 shadow-sm md:p-8">

              {isImage ? (
                /* ── Image model form ──────────────────────────────────── */
                <>
                  {/* sub-mode tabs */}
                  <Tabs value={subMode} onValueChange={(v) => setSubMode(v as SubMode)}>
                    <TabsList className="bg-primary/10 grid w-full grid-cols-2">
                      <TabsTrigger value="image-to-image">{L.modeEdit}</TabsTrigger>
                      <TabsTrigger value="text-to-image">{L.modeText}</TabsTrigger>
                    </TabsList>
                  </Tabs>

                  {/* model dropdown */}
                  <div className="mt-6 space-y-2">
                    <Label>{zh ? '选择模型' : 'Select model'}</Label>
                    {(() => {
                      const activeOpt = IMAGE_MODEL_OPTIONS.find((m) => m.slug === model) ?? IMAGE_MODEL_OPTIONS[0];
                      return (
                        <div ref={modelDropdownRef} className="relative">
                          {/* Trigger */}
                          <button
                            type="button"
                            onClick={() => setIsModelOpen((o) => !o)}
                            className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg border border-foreground/10 px-3 py-2.5 transition-colors hover:border-foreground/20"
                          >
                            <span
                              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md"
                              style={{ backgroundColor: activeOpt.iconBg }}
                            >
                              <SmartIcon name={activeOpt.icon} size={16} style={{ color: activeOpt.iconColor }} />
                            </span>
                            <span className="flex-1 text-left text-sm font-medium">
                              {activeOpt.name[locale] ?? activeOpt.name.en}
                            </span>
                            {activeOpt.badge && (
                              <span
                                className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white"
                                style={{ backgroundColor: activeOpt.badgeColor ?? '#6366F1' }}
                              >
                                {activeOpt.badge}
                              </span>
                            )}
                            <ChevronDown
                              className={cn(
                                'h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform duration-200',
                                isModelOpen && 'rotate-180'
                              )}
                            />
                          </button>

                          {/* Dropdown panel */}
                          {isModelOpen && (
                            <div className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-foreground/8 bg-card shadow-lg shadow-black/10 ring-1 ring-black/5">
                              {IMAGE_MODEL_OPTIONS.map((m) => {
                                const isSelected = m.slug === model;
                                return (
                                  <button
                                    key={m.slug}
                                    type="button"
                                    onClick={() => {
                                      setIsModelOpen(false);
                                      if (m.slug !== slug) {
                                        router.push(m.url);
                                      } else {
                                        setModel(m.slug);
                                      }
                                    }}
                                    className={cn(
                                      'flex w-full items-center gap-3 px-3 py-3 text-left transition-colors',
                                      isSelected ? 'bg-[#6366F1]/8' : 'hover:bg-muted/60'
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
                                            style={{ backgroundColor: m.badgeColor ?? '#6366F1' }}
                                          >
                                            {m.badge}
                                          </span>
                                        )}
                                      </span>
                                      <span className="mt-0.5 truncate text-[11px] text-muted-foreground">
                                        {m.desc[locale] ?? m.desc.en}
                                      </span>
                                    </span>
                                    {isSelected && <Check className="h-4 w-4 flex-shrink-0 text-[#6366F1]" />}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* reference image upload (image-edit mode only) */}
                  {subMode === 'image-to-image' && (
                    <div className="mt-6">
                      <ImageUploader
                        allowMultiple
                        maxImages={4}
                        maxSizeMB={10}
                        emptyHint={L.uploadHint}
                        largeDropZone
                        dropZoneTitle={L.uploadZoneTitle}
                        dropZoneSub={L.uploadZoneSub}
                        onChange={setUploads}
                      />
                    </div>
                  )}

                  {/* prompt */}
                  <div className="mt-6 space-y-2">
                    <Label htmlFor="model-prompt">{L.prompt}</Label>
                    <Textarea
                      id="model-prompt"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder={L.promptPlaceholder}
                      className="min-h-28"
                    />
                  </div>

                  {/* aspect ratio grid — 5 columns, 2 rows */}
                  <div className="mt-6 space-y-2">
                    <Label>{L.aspect}</Label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {IMAGE_ASPECT_RATIOS_GRID.map((r) => {
                        const active = r.value === aspect;
                        return (
                          <button
                            key={r.value}
                            type="button"
                            onClick={() => setAspect(r.value)}
                            className={cn(
                              'group flex flex-col items-center justify-center gap-0.5 rounded-lg border px-1 py-2 text-center transition-colors',
                              active
                                ? 'border-primary bg-primary/5 text-primary'
                                : 'border-foreground/10 text-foreground/60 hover:border-foreground/20 hover:text-foreground'
                            )}
                          >
                            <RatioThumb w={r.w} h={r.h} />
                            <div className="mt-0.5 text-[11px] font-semibold leading-none">
                              {r.value}
                            </div>
                            <div
                              className={cn(
                                'text-[9px] leading-tight',
                                active ? 'text-primary/70' : 'text-muted-foreground'
                              )}
                            >
                              {r.label[locale] ?? r.label.en}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* resolution — 3 buttons horizontal */}
                  <div className="mt-6 space-y-2">
                    <Label>{L.resolution}</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {IMAGE_RESOLUTIONS_GRID.map((r) => {
                        const active = resolution === r.value;
                        return (
                          <button
                            key={r.value}
                            type="button"
                            onClick={() => setResolution(r.value)}
                            className={cn(
                              'flex flex-col items-start rounded-lg border px-3 py-2 text-left transition-colors',
                              active
                                ? 'border-primary bg-primary/5'
                                : 'border-foreground/10 hover:border-foreground/20'
                            )}
                          >
                            <span
                              className={cn(
                                'text-sm font-semibold',
                                active ? 'text-primary' : 'text-foreground'
                              )}
                            >
                              {r.label[locale] ?? r.label.en}
                            </span>
                            {r.sub && (
                              <span className="text-muted-foreground mt-0.5 text-[10px] leading-tight">
                                {r.sub[locale] ?? r.sub.en}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* count — 4 buttons horizontal */}
                  <div className="mt-6 space-y-2">
                    <Label>{L.count}</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {COUNT_OPTIONS.map((n) => {
                        const active = count === n;
                        return (
                          <button
                            key={n}
                            type="button"
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
                </>
              ) : (
                /* ── Video model form ──────────────────────────────────── */
                <>
                  <div className="space-y-2">
                    <Label htmlFor="model-prompt">{t('form.prompt_title')}</Label>
                    <Textarea
                      id="model-prompt"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder={t('form.prompt_placeholder')}
                      className="min-h-32"
                    />
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t('form.aspect_ratio')}</Label>
                      <Select value={vidAspect} onValueChange={setVidAspect}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {VIDEO_ASPECT_RATIOS.map((opt) => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>{t('form.resolution')}</Label>
                      <Select value={vidResolution} onValueChange={setVidResolution}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {VIDEO_RESOLUTIONS.map((opt) => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>{t('form.duration')}</Label>
                      <Select value={duration} onValueChange={setDuration}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {VIDEO_DURATIONS.map((opt) => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              )}

              {/* generate button */}
              <div className="mt-8">
                {isCheckSign ? (
                  <Button className="w-full" disabled size="lg">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('form.generate')}
                  </Button>
                ) : user ? (
                  <Button size="lg" className="w-full" onClick={handleGenerate}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    {isImage ? L.generate : t('form.generate')}
                  </Button>
                ) : (
                  <Button size="lg" className="w-full" onClick={() => setIsShowSignModal(true)}>
                    <User className="mr-2 h-4 w-4" />
                    {t('form.sign_in_to_generate')}
                  </Button>
                )}
              </div>
            </div>

            {/* Right: examples panel */}
            <div className="bg-card border-foreground/5 flex flex-col gap-4 rounded-xl border p-6 shadow-sm md:p-8">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold">{t('examples_title')}</h3>
                <Link
                  href="/showcases"
                  className="text-primary hover:text-primary/80 flex items-center gap-0.5 text-xs transition-colors"
                >
                  {locale === 'zh' ? '查看更多' : 'More examples'}
                  <span aria-hidden>→</span>
                </Link>
              </div>

              {/* Featured card — examples[0] */}
              {meta.examples[0] && (() => {
                const ex = meta.examples[0];
                const cardClass =
                  'group bg-card border-foreground/5 block cursor-pointer overflow-hidden rounded-xl border shadow-sm transition-shadow hover:shadow-md';
                const inner = (
                  <div className="max-h-[400px] w-full overflow-hidden">
                    <Image
                      src={ex.src}
                      alt={ex.alt}
                      width={900}
                      height={1600}
                      className="h-auto w-full transition-transform duration-500 group-hover:scale-[1.03]"
                      unoptimized
                    />
                  </div>
                );
                return ex.href ? (
                  <Link href={ex.href} className={cardClass}>{inner}</Link>
                ) : (
                  <div
                    className={cardClass}
                    onClick={() => ex.prompt && setPrompt(ex.prompt)}
                    title={ex.prompt ? (locale === 'zh' ? '点击填入提示词' : 'Click to use this prompt') : undefined}
                  >
                    {inner}
                  </div>
                );
              })()}

              {/* Thumbnail strip — examples[1..2] */}
              <div className="grid grid-cols-2 gap-2">
                {meta.examples.slice(1, 3).map((ex, idx) =>
                  ex.href ? (
                    <Link
                      key={idx}
                      href={ex.href}
                      className="group overflow-hidden rounded-lg border border-foreground/10 transition-colors hover:border-foreground/30"
                    >
                      <Image
                        src={ex.src}
                        alt={ex.alt}
                        width={300}
                        height={400}
                        className="h-auto w-full transition-transform duration-500 group-hover:scale-[1.06]"
                        unoptimized
                      />
                    </Link>
                  ) : (
                    <div
                      key={idx}
                      className="group cursor-pointer overflow-hidden rounded-lg border border-foreground/10 transition-colors hover:border-foreground/30"
                      onClick={() => ex.prompt && setPrompt(ex.prompt)}
                    >
                      <Image
                        src={ex.src}
                        alt={ex.alt}
                        width={300}
                        height={400}
                        className="h-auto w-full transition-transform duration-500 group-hover:scale-[1.06]"
                        unoptimized
                      />
                    </div>
                  )
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}

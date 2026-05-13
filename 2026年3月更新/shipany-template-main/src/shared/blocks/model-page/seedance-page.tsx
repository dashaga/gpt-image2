'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Crown,
  ImageIcon,
  Loader2,
  Music,
  Sparkles,
  Upload,
  User,
  Video,
  Zap,
} from 'lucide-react';
import { useLocale } from 'next-intl';
import { toast } from 'sonner';

import { useRouter } from '@/core/i18n/navigation';
import { SmartIcon } from '@/shared/blocks/common/smart-icon';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Switch } from '@/shared/components/ui/switch';
import { useAppContext } from '@/shared/contexts/app';
import { cn } from '@/shared/lib/utils';

import { MODELS_BY_TYPE, ModelMeta } from './registry';

// ── Types ─────────────────────────────────────────────────────────────────────

type Locale = 'en' | 'zh';
type CreationMode = 'media' | 'image' | 'text';
type ModelTier = 'fast' | 'pro';
type StyleMode = 'standard' | 'realistic' | 'wild';

// ── Constants ─────────────────────────────────────────────────────────────────

type Bilingual = { en: string; zh: string };

type VideoModelOption = {
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

const VIDEO_MODEL_OPTIONS: VideoModelOption[] = [
  {
    slug: 'seedance2',
    url: '/ai/seedance2',
    name: { en: 'Seedance 2', zh: 'Seedance 2' },
    icon: 'RiMovie2Line',
    iconBg: '#EEF2FF',
    iconColor: '#6366F1',
    badge: 'PRO',
    badgeColor: '#6366F1',
    desc: { en: 'ByteDance · Cinematic quality', zh: '字节跳动出品，影院级画质' },
  },
  {
    slug: 'hailuo',
    url: '/ai/hailuo',
    name: { en: 'Hailuo AI Video', zh: '海螺 AI Video' },
    icon: 'RiFilmLine',
    iconBg: '#EFF6FF',
    iconColor: '#2563EB',
    desc: { en: 'MiniMax · Precise first/last frame', zh: 'MiniMax 出品，首尾帧精准控制' },
  },
  {
    slug: 'grok-video',
    url: '/ai/grok-video',
    name: { en: 'Grok Video', zh: 'Grok Video' },
    icon: 'RiFlashlightLine',
    iconBg: '#F0FDF4',
    iconColor: '#16A34A',
    desc: { en: 'xAI · Creative style generation', zh: 'xAI 出品，创意风格生成' },
  },
];

const RESOLUTIONS = ['720p', '1080p', '4K'];

const ASPECT_RATIOS: { value: string; w: number; h: number }[] = [
  { value: '16:9', w: 16, h: 9 },
  { value: '9:16', w: 9,  h: 16 },
  { value: '1:1',  w: 1,  h: 1 },
  { value: '4:3',  w: 4,  h: 3 },
  { value: '3:4',  w: 3,  h: 4 },
  { value: '21:9', w: 21, h: 9 },
];

// ── Aspect ratio visual thumbnail ─────────────────────────────────────────────

function RatioThumb({ w, h, active }: { w: number; h: number; active: boolean }) {
  const max = 20;
  const a = w / h;
  const tw = a >= 1 ? max : Math.round(max * a);
  const th = a >= 1 ? Math.round(max / a) : max;
  return (
    <span
      className={cn(
        'inline-block flex-shrink-0 rounded-[2px] transition-colors',
        active ? 'bg-[#6366F1]/60' : 'bg-foreground/30'
      )}
      style={{ width: tw, height: th }}
    />
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

export function SeedancePage({ slug }: { slug: string }) {
  const router   = useRouter();
  const locale   = useLocale() as Locale;
  const { user, isCheckSign, setIsShowSignModal } = useAppContext();

  const meta = useMemo<ModelMeta | undefined>(
    () => MODELS_BY_TYPE.video.find((m) => m.slug === slug),
    [slug]
  );

  // ── All state unconditionally ─────────────────────────────────────────────
  const [mode, setMode]             = useState<CreationMode>('media');
  const [modelTier, setModelTier]   = useState<ModelTier>('fast');
  const [styleMode, setStyleMode]   = useState<StyleMode>('standard');
  const [prompt, setPrompt]         = useState('');
  const [promptFocused, setPromptFocused] = useState(false);
  const [aspect, setAspect]         = useState('16:9');
  const [resolution, setResolution] = useState('720p');
  const [duration, setDuration]     = useState(5);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [tailFrame, setTailFrame]   = useState(false);
  const [selectedModel, setSelectedModel] = useState('seedance2');
  const [isModelOpen, setIsModelOpen]     = useState(false);
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

  if (!meta) return null;

  const siblings = MODELS_BY_TYPE.video;
  const zh       = locale === 'zh';

  const name        = meta.name[locale]        ?? meta.name.en;
  const tagline     = meta.tagline[locale]     ?? meta.tagline.en;
  const description = meta.description[locale] ?? meta.description.en;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleGenerate = () => {
    if (!user) { setIsShowSignModal(true); return; }
    if (!prompt.trim()) {
      toast.error(zh ? '请输入提示词再创作。' : 'Please enter a prompt before generating.');
      return;
    }
    toast.info(zh ? '生成功能即将上线，敬请期待！' : 'Generation is coming soon — stay tuned!');
  };

  // ── Shared sub-sections (inlined JSX, not inner components) ──────────────

  // Style mode + Model tier row
  const styleModeItems: { key: StyleMode; zh: string; en: string }[] = [
    { key: 'standard',  zh: '标准', en: 'Standard'  },
    { key: 'realistic', zh: '真人', en: 'Realistic' },
    { key: 'wild',      zh: '狂野', en: 'Wild'      },
  ];

  const styleTierBlock = (
    <div className="mt-4 grid grid-cols-2 gap-3">
      {/* Style */}
      <div className="space-y-1.5">
        <p className="text-[11px] font-medium text-muted-foreground">
          {zh ? '模式' : 'Style'}
        </p>
        <div className="flex gap-1">
          {styleModeItems.map(({ key, zh: labelZh, en: labelEn }) => (
            <button
              key={key}
              type="button"
              onClick={() => setStyleMode(key)}
              className={cn(
                'flex-1 rounded-md border py-1.5 text-[11px] font-medium transition-colors',
                styleMode === key
                  ? 'border-[#6366F1] bg-[#6366F1]/5 text-[#6366F1]'
                  : 'border-foreground/10 text-muted-foreground hover:border-foreground/20 hover:text-foreground'
              )}
            >
              {zh ? labelZh : labelEn}
            </button>
          ))}
        </div>
      </div>

      {/* Model tier */}
      <div className="space-y-1.5">
        <p className="text-[11px] font-medium text-muted-foreground">
          {zh ? '模型' : 'Model'}
        </p>
        <div className="flex gap-1">
          {([
            { key: 'fast' as ModelTier, Icon: Zap,   label: 'Fast' },
            { key: 'pro'  as ModelTier, Icon: Crown, label: 'PRO'  },
          ] as const).map(({ key, Icon, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setModelTier(key)}
              className={cn(
                'flex flex-1 items-center justify-center gap-1 rounded-md border py-1.5 text-[11px] font-medium transition-colors',
                modelTier === key
                  ? 'border-[#6366F1] bg-[#6366F1]/5 text-[#6366F1]'
                  : 'border-foreground/10 text-muted-foreground hover:border-foreground/20 hover:text-foreground'
              )}
            >
              <Icon className="h-3 w-3" />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // Duration + Resolution row
  const durationResolutionBlock = (
    <div className="mt-4 grid grid-cols-2 gap-3">
      {/* Duration */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-medium text-muted-foreground">
            {zh ? '时长' : 'Duration'}
          </p>
          <span className="text-[11px] font-semibold text-[#6366F1]">{duration}s</span>
        </div>
        <input
          type="range"
          min={5}
          max={15}
          step={5}
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-foreground/10 accent-[#6366F1]"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground/60">
          <span>5s</span><span>10s</span><span>15s</span>
        </div>
      </div>

      {/* Resolution */}
      <div className="space-y-1.5">
        <p className="text-[11px] font-medium text-muted-foreground">
          {zh ? '分辨率' : 'Resolution'}
        </p>
        <Select value={resolution} onValueChange={setResolution}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RESOLUTIONS.map((r) => (
              <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  // Aspect ratio grid
  const aspectBlock = (
    <div className="mt-4 space-y-1.5">
      <p className="text-[11px] font-medium text-muted-foreground">
        {zh ? '画面比例' : 'Aspect ratio'}
      </p>
      <div className="grid grid-cols-3 gap-1.5">
        {ASPECT_RATIOS.map((r) => {
          const active = aspect === r.value;
          return (
            <button
              key={r.value}
              type="button"
              onClick={() => setAspect(r.value)}
              className={cn(
                'flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors',
                active
                  ? 'border-[#6366F1] bg-[#6366F1]/5'
                  : 'border-foreground/10 hover:border-foreground/20'
              )}
            >
              <RatioThumb w={r.w} h={r.h} active={active} />
              <span
                className={cn(
                  'text-[11px] font-medium',
                  active ? 'text-[#6366F1]' : 'text-muted-foreground'
                )}
              >
                {r.value}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  // Advanced settings row
  const advancedBlock = (
    <button
      type="button"
      onClick={() => setShowAdvanced(!showAdvanced)}
      className="mt-4 flex w-full items-center justify-between rounded-lg border border-foreground/10 px-3 py-2.5 text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
    >
      <span className="flex items-center gap-2 text-xs font-medium">
        <ChevronRight className={cn('h-3.5 w-3.5 transition-transform', showAdvanced && 'rotate-90')} />
        {zh ? '高级设置' : 'Advanced settings'}
      </span>
    </button>
  );

  // Generate button
  const generateBtn = (
    <div className="mt-5">
      {isCheckSign ? (
        <button
          disabled
          className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg bg-[#6366F1]/60 py-3 text-sm font-semibold text-white"
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          {zh ? '生成（40 积分）' : 'Generate (40 credits)'}
        </button>
      ) : user ? (
        <button
          type="button"
          onClick={handleGenerate}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#6366F1] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#4F46E5] active:bg-[#4338CA]"
        >
          <Sparkles className="h-4 w-4" />
          {zh ? '生成（40 积分）' : 'Generate (40 credits)'}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsShowSignModal(true)}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#6366F1] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#4F46E5]"
        >
          <User className="h-4 w-4" />
          {zh ? '登录后生成' : 'Sign in to generate'}
        </button>
      )}
    </div>
  );

  // Media mode prompt with overlay
  const mediaPrompt = (
    <div className="relative mt-3">
      <div
        className={cn(
          'relative rounded-lg border transition-colors',
          promptFocused ? 'border-[#6366F1]' : 'border-foreground/10 hover:border-foreground/15'
        )}
      >
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onFocus={() => setPromptFocused(true)}
          onBlur={() => setPromptFocused(false)}
          maxLength={10000}
          rows={6}
          className="w-full resize-none bg-transparent p-3 pb-7 text-sm outline-none"
        />
        {/* Placeholder overlay (hidden once typing starts) */}
        {!prompt && (
          <div className="pointer-events-none absolute inset-0 p-3">
            <p className="text-[13px] text-muted-foreground">
              {zh ? '描述你想要生成的视频...' : 'Describe the video you want to generate...'}
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground/60">
              {zh
                ? '使用 @1、@2、@3 引用已上传素材。最多 9 张图片、3 段视频、3 段音频，每个 2~15 秒，所有视频/音频总时长不超过 15 秒。'
                : 'Use @1, @2, @3 to reference uploaded media. Up to 9 images, 3 videos, 3 audio clips (2–15 s each; total ≤ 15 s).'}
            </p>
          </div>
        )}
        {/* Char count */}
        <span className="pointer-events-none absolute bottom-2 right-3 text-[10px] text-muted-foreground/60">
          {prompt.length}/10000
        </span>
      </div>
    </div>
  );

  // Simple prompt box (image / text modes)
  const simplePrompt = (
    <div className="relative mt-4">
      <div className="relative rounded-lg border border-foreground/10 hover:border-foreground/15 focus-within:border-[#6366F1] transition-colors">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          maxLength={10000}
          rows={4}
          placeholder={zh
            ? '详细描述你想要生成的视频，以获得最佳效果...'
            : 'Describe in detail the video you want to generate for best results...'}
          className="w-full resize-none bg-transparent p-3 pb-7 text-sm outline-none placeholder:text-muted-foreground/50"
        />
        <span className="pointer-events-none absolute bottom-2 right-3 text-[10px] text-muted-foreground/60">
          {prompt.length}/10000
        </span>
      </div>
    </div>
  );

  return (
    <section className="py-16 md:py-24">
      <div className="container">

        {/* ── Page header ──────────────────────────────────────────────────── */}
        <div className="mx-auto mb-10 max-w-4xl text-center">
          <div className="mb-4 inline-flex items-center justify-center gap-2">
            <SmartIcon name={meta.icon} className="h-8 w-8 text-[#6366F1]" />
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
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">

            {/* ── Left: Seedance form ──────────────────────────────────────── */}
            <div className="bg-card border-foreground/5 rounded-xl border p-6 shadow-sm">

              {/* 选择模型 title */}
              <div className="mb-4 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#6366F1]" />
                <span className="text-sm font-semibold">
                  {zh ? '选择模型' : 'Select model'}
                </span>
              </div>

              {/* Model dropdown */}
              {(() => {
                const active = VIDEO_MODEL_OPTIONS.find((m) => m.slug === selectedModel) ?? VIDEO_MODEL_OPTIONS[0];
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
                        style={{ backgroundColor: active.iconBg }}
                      >
                        <SmartIcon name={active.icon} size={16} style={{ color: active.iconColor }} />
                      </span>
                      <span className="flex-1 text-left text-sm font-medium">
                        {active.name[locale] ?? active.name.en}
                      </span>
                      {active.badge && (
                        <span
                          className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white"
                          style={{ backgroundColor: active.badgeColor ?? '#6366F1' }}
                        >
                          {active.badge}
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
                        {VIDEO_MODEL_OPTIONS.map((m) => {
                          const isSelected = m.slug === selectedModel;
                          return (
                            <button
                              key={m.slug}
                              type="button"
                              onClick={() => {
                                setIsModelOpen(false);
                                if (m.slug !== slug) {
                                  router.push(m.url);
                                } else {
                                  setSelectedModel(m.slug);
                                }
                              }}
                              className={cn(
                                'flex w-full items-center gap-3 px-3 py-3 text-left transition-colors',
                                isSelected
                                  ? 'bg-[#6366F1]/8'
                                  : 'hover:bg-muted/60'
                              )}
                            >
                              {/* Icon */}
                              <span
                                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
                                style={{ backgroundColor: m.iconBg }}
                              >
                                <SmartIcon name={m.icon} size={16} style={{ color: m.iconColor }} />
                              </span>

                              {/* Name + desc */}
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

                              {/* Checkmark */}
                              {isSelected && (
                                <Check className="h-4 w-4 flex-shrink-0 text-[#6366F1]" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Creation mode tabs */}
              <div className="mt-4 space-y-1">
                <p className="text-[11px] text-muted-foreground">
                  {zh ? '选择输入类型' : 'Select input type'}
                </p>
                <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted/50 p-1">
                  {([
                    { key: 'media' as CreationMode, zh: '媒体', en: 'Media' },
                    { key: 'image' as CreationMode, zh: '图片', en: 'Image' },
                    { key: 'text'  as CreationMode, zh: '文本', en: 'Text'  },
                  ] as const).map(({ key, zh: labelZh, en: labelEn }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setMode(key)}
                      className={cn(
                        'rounded-md py-2 text-sm font-medium transition-all',
                        mode === key
                          ? 'bg-[#6366F1] text-white shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {zh ? labelZh : labelEn}
                    </button>
                  ))}
                </div>
              </div>

              {/* ──────────── 媒体 mode ──────────── */}
              {mode === 'media' && (
                <>
                  {/* Media upload row */}
                  <div className="mt-4 flex items-center gap-2.5 rounded-lg border border-dashed border-foreground/20 bg-muted/20 px-3 py-3">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <ImageIcon className="h-4.5 w-4.5" />
                      <Video className="h-4.5 w-4.5" />
                      <Music className="h-4.5 w-4.5" />
                    </div>
                    <span className="flex-1 text-xs text-muted-foreground">
                      {zh ? '拖放或点击上传' : 'Drag & drop or click to upload'}
                    </span>
                    <button
                      type="button"
                      className="flex-shrink-0 rounded-md border border-foreground/10 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
                    >
                      {zh ? '添加链接' : 'Add link'}
                    </button>
                  </div>

                  {/* Prompt with overlay placeholder */}
                  {mediaPrompt}

                  {/* Style / tier */}
                  {styleTierBlock}

                  {/* Duration / resolution */}
                  {durationResolutionBlock}

                  {/* Aspect ratio */}
                  {aspectBlock}

                  {/* Advanced */}
                  {advancedBlock}

                  {/* Generate */}
                  {generateBtn}
                </>
              )}

              {/* ──────────── 图片 mode ──────────── */}
              {mode === 'image' && (
                <>
                  {/* Header row */}
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      {zh ? '参考图片 (0/1)' : 'Reference image (0/1)'}
                    </span>
                    <label className="flex cursor-pointer items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">
                        {zh ? '添加尾帧' : 'Add tail frame'}
                      </span>
                      <Switch
                        checked={tailFrame}
                        onCheckedChange={setTailFrame}
                      />
                    </label>
                  </div>

                  {/* Upload zone */}
                  <div
                    className="mt-2 flex flex-col items-center justify-center gap-2"
                    style={{
                      border: '2px dashed #6366F1',
                      borderRadius: '16px',
                      padding: '16px',
                      background: 'transparent',
                    }}
                  >
                    <Upload className="h-6 w-6" style={{ color: '#6366F1' }} />
                    <p className="text-sm font-semibold" style={{ color: '#6366F1' }}>
                      {zh ? '添加图片（1-2）' : 'Add images (1–2)'}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {zh
                        ? 'JPG, PNG, WebP — 每张最大 10MB'
                        : 'JPG, PNG, WebP — max 10 MB each'}
                    </p>
                  </div>

                  {/* Help text */}
                  <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground/70">
                    {zh
                      ? '上传最多 2 张图片（JPEG、PNG、WebP、BMP），每张最大 10MB。'
                      : 'Upload up to 2 images (JPEG, PNG, WebP, BMP), max 10 MB each.'}
                  </p>

                  {/* Prompt */}
                  {simplePrompt}

                  {styleTierBlock}
                  {durationResolutionBlock}
                  {aspectBlock}
                  {advancedBlock}
                  {generateBtn}
                </>
              )}

              {/* ──────────── 文本 mode ──────────── */}
              {mode === 'text' && (
                <>
                  {simplePrompt}
                  {styleTierBlock}
                  {durationResolutionBlock}
                  {aspectBlock}
                  {advancedBlock}
                  {generateBtn}
                </>
              )}
            </div>

            {/* ── Right: examples (unchanged) ─────────────────────────────── */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-semibold">
                  <ImageIcon className="h-5 w-5" />
                  {zh ? '示例' : 'Examples'}
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-8">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {meta.examples.map((ex, idx) => (
                    <div key={idx} className="flex flex-col gap-1">
                      <div className="bg-muted relative aspect-square overflow-hidden rounded-md border">
                        <Image
                          src={ex.src}
                          alt={ex.alt}
                          fill
                          sizes="(max-width: 640px) 50vw, 200px"
                          className="object-cover"
                        />
                      </div>
                      {ex.caption && (
                        <p className="text-muted-foreground truncate text-center text-xs">
                          {ex.caption}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </section>
  );
}

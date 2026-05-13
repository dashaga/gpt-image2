'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  Image as ImageIcon,
  Music as MusicIcon,
  Sparkles,
  User,
  Video as VideoIcon,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';

import {
  ImageUploader,
  ImageUploaderValue,
} from '@/shared/blocks/common/image-uploader';
import { MODELS_BY_TYPE } from '@/shared/blocks/model-page/registry';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { Checkbox } from '@/shared/components/ui/checkbox';
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

type Mode = 'image' | 'video' | 'music';
type ImageSubMode = 'text-to-image' | 'image-to-image';
type VideoMethod = 'media' | 'image' | 'text';

const IMAGE_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3'];
const VIDEO_RATIOS = ['16:9', '9:16', '1:1', '4:3'];
const IMAGE_RESOLUTIONS = ['1024 × 1024', '2048 × 2048', '4096 × 4096'];
const COUNT_OPTIONS = ['1', '2', '3', '4'];
const VIDEO_DURATIONS = ['5s', '10s', '15s'];
const MUSIC_DURATIONS = ['30s', '60s', '120s', '180s'];

// Music doesn't have per-model landing pages yet, so the dropdown is local.
const MUSIC_MODELS: { slug: string; name: string }[] = [
  { slug: 'suno', name: 'Suno' },
  { slug: 'udio', name: 'Udio' },
  { slug: 'stable-audio', name: 'Stable Audio' },
];

const EXAMPLES = [
  { src: '/imgs/cases/1.png', alt: 'Example 1' },
  { src: '/imgs/cases/2.png', alt: 'Example 2' },
  { src: '/imgs/cases/3.png', alt: 'Example 3' },
  { src: '/imgs/cases/4.png', alt: 'Example 4' },
  { src: '/imgs/cases/5.png', alt: 'Example 5' },
  { src: '/imgs/cases/6.png', alt: 'Example 6' },
];

export function MultiModeGenerator() {
  const locale = useLocale() as 'en' | 'zh';
  const t = useTranslations('common.multi_generator');

  const { user, isCheckSign, setIsShowSignModal } = useAppContext();

  const [mode, setMode] = useState<Mode>('image');

  // Image-mode state
  const [imageSubMode, setImageSubMode] = useState<ImageSubMode>(
    'text-to-image'
  );
  const [imageModel, setImageModel] = useState(
    MODELS_BY_TYPE.image[0]?.slug ?? ''
  );
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageRatio, setImageRatio] = useState(IMAGE_RATIOS[0]);
  const [imageResolution, setImageResolution] = useState(IMAGE_RESOLUTIONS[1]);
  const [imageCount, setImageCount] = useState(COUNT_OPTIONS[0]);
  const [imageRefs, setImageRefs] = useState<ImageUploaderValue[]>([]);

  // Video-mode state
  const [videoMethod, setVideoMethod] = useState<VideoMethod>('text');
  const [videoModel, setVideoModel] = useState(
    MODELS_BY_TYPE.video[0]?.slug ?? ''
  );
  const [videoPrompt, setVideoPrompt] = useState('');
  const [videoRatio, setVideoRatio] = useState(VIDEO_RATIOS[0]);
  const [videoDuration, setVideoDuration] = useState(VIDEO_DURATIONS[0]);
  const [videoRefs, setVideoRefs] = useState<ImageUploaderValue[]>([]);

  // Music-mode state
  const [musicModel, setMusicModel] = useState(MUSIC_MODELS[0].slug);
  const [musicPrompt, setMusicPrompt] = useState('');
  const [musicDuration, setMusicDuration] = useState(MUSIC_DURATIONS[0]);
  const [musicInstrumental, setMusicInstrumental] = useState(false);

  const localizedName = (m: { name: { en: string; zh: string } }) =>
    m.name[locale] ?? m.name.en;

  const handleGenerate = () => {
    if (!user) {
      setIsShowSignModal(true);
      return;
    }

    const prompt =
      mode === 'image'
        ? imagePrompt
        : mode === 'video'
          ? videoPrompt
          : musicPrompt;

    if (!prompt.trim()) {
      toast.error(t('form.prompt_required_toast'));
      return;
    }

    if (mode === 'image' && imageSubMode === 'image-to-image') {
      const uploaded = imageRefs.filter((i) => i.status === 'uploaded');
      if (uploaded.length === 0) {
        toast.error(t('form.image_required_toast'));
        return;
      }
    }

    if (mode === 'video' && videoMethod !== 'text') {
      const uploaded = videoRefs.filter((i) => i.status === 'uploaded');
      if (uploaded.length === 0) {
        toast.error(t('form.image_required_toast'));
        return;
      }
    }

    // Backend wiring varies per model — surface honestly until each provider
    // is configured in /api/ai/generate.
    toast.info(t('form.coming_soon_toast'));
  };

  const ModeIcon = ({ value }: { value: Mode }) => {
    if (value === 'image') return <ImageIcon className="h-4 w-4" />;
    if (value === 'video') return <VideoIcon className="h-4 w-4" />;
    return <MusicIcon className="h-4 w-4" />;
  };

  return (
    <section className="py-16 md:py-24">
      <div className="container">
        {/* Page header */}
        <div className="mx-auto mb-8 max-w-3xl text-center">
          <h1 className="text-3xl font-bold md:text-4xl">{t('title')}</h1>
          <p className="text-muted-foreground mt-3 text-sm md:text-base">
            {t('description')}
          </p>
        </div>

        {/* Top mode tabs (3 icons) */}
        <div className="mx-auto mb-10 max-w-md">
          <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
            <TabsList className="bg-primary/10 grid w-full grid-cols-3">
              <TabsTrigger value="image" className="gap-2">
                <ModeIcon value="image" />
                <span>{t('mode.image')}</span>
              </TabsTrigger>
              <TabsTrigger value="video" className="gap-2">
                <ModeIcon value="video" />
                <span>{t('mode.video')}</span>
              </TabsTrigger>
              <TabsTrigger value="music" className="gap-2">
                <ModeIcon value="music" />
                <span>{t('mode.music')}</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Two-column layout */}
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            {/* Left: controls */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-semibold">
                  <Sparkles className="h-5 w-5" />
                  {t(`mode.${mode}` as any)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pb-8">
                {/* === IMAGE MODE === */}
                {mode === 'image' && (
                  <>
                    <Tabs
                      value={imageSubMode}
                      onValueChange={(v) => setImageSubMode(v as ImageSubMode)}
                    >
                      <TabsList className="bg-primary/10 grid w-full grid-cols-2">
                        <TabsTrigger value="text-to-image">
                          {t('image_sub_mode.text-to-image')}
                        </TabsTrigger>
                        <TabsTrigger value="image-to-image">
                          {t('image_sub_mode.image-to-image')}
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>

                    <div className="space-y-2">
                      <Label>{t('form.model')}</Label>
                      <Select value={imageModel} onValueChange={setImageModel}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MODELS_BY_TYPE.image.map((m) => (
                            <SelectItem key={m.slug} value={m.slug}>
                              {localizedName(m)}
                              {m.badge && (
                                <span className="text-primary ml-2 text-[10px] font-semibold tracking-wide">
                                  {m.badge}
                                </span>
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {imageSubMode === 'image-to-image' && (
                      <ImageUploader
                        title={t('form.reference_image')}
                        allowMultiple
                        maxImages={4}
                        maxSizeMB={5}
                        onChange={setImageRefs}
                      />
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="image-prompt">{t('form.prompt')}</Label>
                      <Textarea
                        id="image-prompt"
                        value={imagePrompt}
                        onChange={(e) => setImagePrompt(e.target.value)}
                        placeholder={t('form.image_prompt_placeholder')}
                        className="min-h-32"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>{t('form.aspect_ratio')}</Label>
                        <Select
                          value={imageRatio}
                          onValueChange={setImageRatio}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {IMAGE_RATIOS.map((opt) => (
                              <SelectItem key={opt} value={opt}>
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>{t('form.resolution')}</Label>
                        <Select
                          value={imageResolution}
                          onValueChange={setImageResolution}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {IMAGE_RESOLUTIONS.map((opt) => (
                              <SelectItem key={opt} value={opt}>
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>{t('form.count')}</Label>
                        <Select
                          value={imageCount}
                          onValueChange={setImageCount}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {COUNT_OPTIONS.map((opt) => (
                              <SelectItem key={opt} value={opt}>
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </>
                )}

                {/* === VIDEO MODE === */}
                {mode === 'video' && (
                  <>
                    <Tabs
                      value={videoMethod}
                      onValueChange={(v) => setVideoMethod(v as VideoMethod)}
                    >
                      <TabsList className="bg-primary/10 grid w-full grid-cols-3">
                        <TabsTrigger value="media">
                          {t('video_method.media')}
                        </TabsTrigger>
                        <TabsTrigger value="image">
                          {t('video_method.image')}
                        </TabsTrigger>
                        <TabsTrigger value="text">
                          {t('video_method.text')}
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>

                    <div className="space-y-2">
                      <Label>{t('form.model')}</Label>
                      <Select value={videoModel} onValueChange={setVideoModel}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MODELS_BY_TYPE.video.map((m) => (
                            <SelectItem key={m.slug} value={m.slug}>
                              {localizedName(m)}
                              {m.badge && (
                                <span className="text-primary ml-2 text-[10px] font-semibold tracking-wide">
                                  {m.badge}
                                </span>
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {videoMethod !== 'text' && (
                      <ImageUploader
                        title={
                          videoMethod === 'media'
                            ? t('form.media_input')
                            : t('form.reference_image')
                        }
                        emptyHint={
                          videoMethod === 'media'
                            ? t('form.media_input_hint')
                            : undefined
                        }
                        allowMultiple={false}
                        maxImages={1}
                        maxSizeMB={50}
                        onChange={setVideoRefs}
                      />
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="video-prompt">{t('form.prompt')}</Label>
                      <Textarea
                        id="video-prompt"
                        value={videoPrompt}
                        onChange={(e) => setVideoPrompt(e.target.value)}
                        placeholder={t('form.video_prompt_placeholder')}
                        className="min-h-32"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{t('form.aspect_ratio')}</Label>
                        <Select
                          value={videoRatio}
                          onValueChange={setVideoRatio}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {VIDEO_RATIOS.map((opt) => (
                              <SelectItem key={opt} value={opt}>
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>{t('form.duration')}</Label>
                        <Select
                          value={videoDuration}
                          onValueChange={setVideoDuration}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {VIDEO_DURATIONS.map((opt) => (
                              <SelectItem key={opt} value={opt}>
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </>
                )}

                {/* === MUSIC MODE === */}
                {mode === 'music' && (
                  <>
                    <div className="space-y-2">
                      <Label>{t('form.model')}</Label>
                      <Select value={musicModel} onValueChange={setMusicModel}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MUSIC_MODELS.map((m) => (
                            <SelectItem key={m.slug} value={m.slug}>
                              {m.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="music-prompt">{t('form.prompt')}</Label>
                      <Textarea
                        id="music-prompt"
                        value={musicPrompt}
                        onChange={(e) => setMusicPrompt(e.target.value)}
                        placeholder={t('form.music_prompt_placeholder')}
                        className="min-h-32"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{t('form.duration')}</Label>
                        <Select
                          value={musicDuration}
                          onValueChange={setMusicDuration}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MUSIC_DURATIONS.map((opt) => (
                              <SelectItem key={opt} value={opt}>
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-end">
                        <label
                          className="flex cursor-pointer items-center gap-2 text-sm"
                          htmlFor="instrumental"
                        >
                          <Checkbox
                            id="instrumental"
                            checked={musicInstrumental}
                            onCheckedChange={(v) =>
                              setMusicInstrumental(v === true)
                            }
                          />
                          <span>{t('form.instrumental')}</span>
                        </label>
                      </div>
                    </div>
                  </>
                )}

                {/* Generate button (shared) */}
                {isCheckSign ? (
                  <Button className="w-full" disabled size="lg">
                    {t('form.generate')}
                  </Button>
                ) : user ? (
                  <Button size="lg" className="w-full" onClick={handleGenerate}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    {t('form.generate')}
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    className="w-full"
                    onClick={() => setIsShowSignModal(true)}
                  >
                    <User className="mr-2 h-4 w-4" />
                    {t('form.sign_in_to_generate')}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Right: examples */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-semibold">
                  <ImageIcon className="h-5 w-5" />
                  {t('examples_title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-8">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {EXAMPLES.map((ex, idx) => (
                    <div
                      key={idx}
                      className="bg-muted relative aspect-square overflow-hidden rounded-md border"
                    >
                      <Image
                        src={ex.src}
                        alt={ex.alt}
                        fill
                        sizes="(max-width: 640px) 50vw, 200px"
                        className="object-cover"
                      />
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

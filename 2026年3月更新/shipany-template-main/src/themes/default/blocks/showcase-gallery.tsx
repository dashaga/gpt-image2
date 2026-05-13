'use client';

import { useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { Sparkles, X, Copy, Check, ImageIcon, Video, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { Link } from '@/core/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogClose,
} from '@/shared/components/ui/dialog';
import { cn } from '@/shared/lib/utils';
import {
  EXAMPLE_CATEGORIES,
  EXAMPLE_ITEMS,
  ExampleItem,
} from '@/data/examples';
import { VIDEO_CATEGORIES, VIDEO_ITEMS, VideoItem } from '@/data/seedance';

type Locale = 'zh' | 'en' | string;

function catLabel(zh: string, en: string, locale: Locale) {
  return locale === 'zh' ? zh : en;
}

// Derive Cloudflare Stream thumbnail URL from the mp4 download URL
function getThumbnailUrl(videoUrl: string): string {
  return videoUrl.replace('/downloads/default.mp4', '/thumbnails/thumbnail.jpg');
}

// ── Video card with hover-to-play ─────────────────────────────────────────
function VideoCard({ item, onClick }: { item: VideoItem; onClick: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const thumbnailUrl = item.cover ?? getThumbnailUrl(item.url);

  function handleMouseEnter() {
    videoRef.current?.play().then(() => setPlaying(true)).catch(() => {});
  }
  function handleMouseLeave() {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setPlaying(false);
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25 }}
      className="group cursor-pointer"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
    >
      <div className="border-border/50 bg-muted/20 overflow-hidden rounded-xl border shadow-sm transition-shadow hover:shadow-md">
        {/* Video / Thumbnail */}
        <div className="relative aspect-video w-full bg-black">
          {/* Thumbnail shown until video plays */}
          {!playing && (
            <Image
              src={thumbnailUrl}
              alt={item.title}
              fill
              unoptimized
              className="object-cover"
            />
          )}
          <video
            ref={videoRef}
            src={item.url}
            muted
            loop
            playsInline
            preload="none"
            className={cn('h-full w-full object-cover', playing ? 'opacity-100' : 'opacity-0')}
          />
          {/* Play overlay */}
          {!playing && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity group-hover:bg-black/10">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 shadow">
                <Play className="h-5 w-5 translate-x-0.5 text-black" />
              </div>
            </div>
          )}
        </div>
        {/* Info */}
        <div className="p-3">
          <p className="text-foreground line-clamp-1 text-sm font-semibold">
            {item.title}
          </p>
          <p className="text-muted-foreground mt-1 line-clamp-2 text-xs leading-relaxed">
            {item.prompt}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export function ShowcaseGallery({ locale }: { locale: Locale }) {
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeVideoCategory, setActiveVideoCategory] = useState('all');
  const [videoPage, setVideoPage] = useState(1);
  const [selected, setSelected] = useState<ExampleItem | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [copied, setCopied] = useState(false);

  const VIDEO_PAGE_SIZE = 30;

  function copyPrompt(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const zh = locale === 'zh';

  const filteredItems = useMemo(() => {
    if (activeCategory === 'all') return EXAMPLE_ITEMS;
    return EXAMPLE_ITEMS.filter((item) => item.category === activeCategory);
  }, [activeCategory]);

  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = { all: EXAMPLE_ITEMS.length };
    for (const item of EXAMPLE_ITEMS) {
      map[item.category] = (map[item.category] ?? 0) + 1;
    }
    return map;
  }, []);

  const allFilteredVideoItems = useMemo(() => {
    if (activeVideoCategory === 'all') return VIDEO_ITEMS;
    return VIDEO_ITEMS.filter((item) => item.category === activeVideoCategory);
  }, [activeVideoCategory]);

  const filteredVideoItems = useMemo(
    () => allFilteredVideoItems.slice(0, videoPage * VIDEO_PAGE_SIZE),
    [allFilteredVideoItems, videoPage]
  );

  const hasMoreVideos = filteredVideoItems.length < allFilteredVideoItems.length;

  const videoCategoryCounts = useMemo(() => {
    const map: Record<string, number> = { all: VIDEO_ITEMS.length };
    for (const item of VIDEO_ITEMS) {
      const cat = item.category ?? 'other';
      map[cat] = (map[cat] ?? 0) + 1;
    }
    return map;
  }, []);

  return (
    <section className="py-16 md:py-24">
      <div className="container">
        {/* Page heading */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold md:text-4xl">
            {zh ? '案例展示' : 'Showcase'}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm md:text-base">
            {zh
              ? '真实提示词生成的作品，点击图片可复制示例提示词。'
              : 'Real outputs from real prompts — click any image to copy and try.'}
          </p>
        </div>

        {/* ── Media type toggle ────────────────────────────────────────── */}
        <div className="mb-8 flex justify-center">
          <div className="bg-muted flex rounded-full p-1">
            <button
              type="button"
              onClick={() => setMediaType('image')}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-5 py-1.5 text-sm font-medium transition-all',
                mediaType === 'image'
                  ? 'bg-white text-foreground border-border border shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <ImageIcon className="h-4 w-4" />
              {zh ? '图片' : 'Image'}
            </button>
            <button
              type="button"
              onClick={() => setMediaType('video')}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-5 py-1.5 text-sm font-medium transition-all',
                mediaType === 'video'
                  ? 'bg-white text-foreground border-border border shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Video className="h-4 w-4" />
              {zh ? '视频' : 'Video'}
            </button>
          </div>
        </div>

        {mediaType === 'image' ? (
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
            {/* ── Left sidebar: category filter ──────────────────────────── */}
            <aside className="lg:sticky lg:top-24 lg:h-fit lg:w-52 lg:shrink-0">
              <p className="text-muted-foreground mb-3 text-xs font-semibold uppercase tracking-wider">
                {zh ? '分类' : 'Category'}
              </p>
              <ul className="space-y-1">
                {EXAMPLE_CATEGORIES.map((cat) => {
                  const active = activeCategory === cat.name;
                  return (
                    <li key={cat.name}>
                      <button
                        type="button"
                        onClick={() => setActiveCategory(cat.name)}
                        className={cn(
                          'flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors',
                          active
                            ? 'bg-primary text-primary-foreground font-medium'
                            : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                        )}
                      >
                        <span>{catLabel(cat.zh, cat.en, locale)}</span>
                        <span
                          className={cn(
                            'ml-2 rounded-full px-1.5 py-0.5 text-[11px] leading-none',
                            active
                              ? 'bg-primary-foreground/20 text-primary-foreground'
                              : 'bg-muted text-muted-foreground'
                          )}
                        >
                          {categoryCounts[cat.name] ?? 0}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </aside>

            {/* ── Right: count + masonry grid ──────────────────────────────── */}
            <div className="min-w-0 flex-1">
              {/* Count indicator */}
              <div className="mb-5 flex items-center justify-end">
                <span className="text-muted-foreground rounded-full border px-3 py-1 text-xs">
                  {zh
                    ? `正在展示 ${filteredItems.length} / ${EXAMPLE_ITEMS.length} 条`
                    : `Showing ${filteredItems.length} / ${EXAMPLE_ITEMS.length}`}
                </span>
              </div>

              {/* Masonry grid */}
              <div className="columns-1 gap-4 space-y-4 sm:columns-2 lg:columns-3">
                <AnimatePresence>
                  {filteredItems.map((item, idx) => (
                    <motion.div
                      key={item.url}
                      id={item.url.split('/').pop()?.replace(/\.[^.]+$/, '')}
                      layout
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.25, delay: Math.min(idx * 0.03, 0.6) }}
                      className="group mb-4 cursor-pointer break-inside-avoid"
                      onClick={() => { setSelected(item); setCopied(false); }}
                    >
                      <div className="border-border/50 bg-muted/20 relative overflow-hidden rounded-xl border shadow-sm transition-shadow hover:shadow-md">
                        <Image
                          src={item.url}
                          alt={item.prompt}
                          width={600}
                          height={400}
                          className="h-auto w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                          unoptimized
                        />
                        {/* Hover overlay with title or prompt */}
                        <div className="absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-black/75 via-black/40 to-transparent p-4 pt-10 transition-transform duration-300 group-hover:translate-y-0">
                          <p className="line-clamp-2 text-sm font-medium text-white drop-shadow">
                            {item.title ?? item.prompt}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {filteredItems.length === 0 && (
                  <p className="text-muted-foreground col-span-3 py-12 text-center text-sm">
                    {zh ? '暂无内容' : 'No items found'}
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
            {/* ── Left sidebar: video category filter ──────────────────────── */}
            <aside className="lg:sticky lg:top-24 lg:h-fit lg:w-52 lg:shrink-0">
              <p className="text-muted-foreground mb-3 text-xs font-semibold uppercase tracking-wider">
                {zh ? '分类' : 'Category'}
              </p>
              <ul className="space-y-1">
                {VIDEO_CATEGORIES.map((cat) => {
                  const active = activeVideoCategory === cat.name;
                  const count = videoCategoryCounts[cat.name] ?? 0;
                  if (count === 0 && cat.name !== 'all') return null;
                  return (
                    <li key={cat.name}>
                      <button
                        type="button"
                        onClick={() => { setActiveVideoCategory(cat.name); setVideoPage(1); }}
                        className={cn(
                          'flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors',
                          active
                            ? 'bg-primary text-primary-foreground font-medium'
                            : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                        )}
                      >
                        <span>{catLabel(cat.zh, cat.en, locale)}</span>
                        <span
                          className={cn(
                            'ml-2 rounded-full px-1.5 py-0.5 text-[11px] leading-none',
                            active
                              ? 'bg-primary-foreground/20 text-primary-foreground'
                              : 'bg-muted text-muted-foreground'
                          )}
                        >
                          {count}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </aside>

            {/* ── Right: count + video grid ─────────────────────────────────── */}
            <div className="min-w-0 flex-1">
              <div className="mb-5 flex items-center justify-end">
                <span className="text-muted-foreground rounded-full border px-3 py-1 text-xs">
                  {zh
                    ? `正在展示 ${filteredVideoItems.length} / ${allFilteredVideoItems.length} 条`
                    : `Showing ${filteredVideoItems.length} / ${allFilteredVideoItems.length}`}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <AnimatePresence>
                  {filteredVideoItems.map((item) => (
                    <VideoCard
                      key={item.url}
                      item={item}
                      onClick={() => { setSelectedVideo(item); setCopied(false); }}
                    />
                  ))}
                </AnimatePresence>
                {filteredVideoItems.length === 0 && (
                  <p className="text-muted-foreground col-span-3 py-12 text-center text-sm">
                    {zh ? '暂无内容' : 'No items found'}
                  </p>
                )}
              </div>
              {hasMoreVideos && (
                <div className="mt-8 flex justify-center">
                  <Button
                    variant="outline"
                    onClick={() => setVideoPage((p) => p + 1)}
                  >
                    {zh
                      ? `加载更多（剩余 ${allFilteredVideoItems.length - filteredVideoItems.length} 条）`
                      : `Load more (${allFilteredVideoItems.length - filteredVideoItems.length} remaining)`}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Image Modal ───────────────────────────────────────────────────── */}
      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) { setSelected(null); setCopied(false); } }}>
        <DialogContent className="max-w-2xl overflow-hidden p-0">
          <DialogClose className="absolute right-3 top-3 z-10 rounded-full bg-black/50 p-1.5 text-white backdrop-blur transition-colors hover:bg-black/70">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>

          {selected && (
            <>
              <div className="relative w-full">
                <Image
                  src={selected.url}
                  alt={selected.prompt}
                  width={800}
                  height={600}
                  className="h-auto max-h-[60vh] w-full object-contain bg-muted"
                  unoptimized
                />
              </div>
              <div className="p-5">
                {selected.title && (
                  <p className="text-foreground mb-2 text-base font-semibold">
                    {selected.title}
                  </p>
                )}
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                    {zh ? '提示词' : 'Prompt'}
                  </p>
                  <button
                    type="button"
                    onClick={() => copyPrompt(selected.prompt)}
                    className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
                  >
                    {copied
                      ? <><Check className="h-3.5 w-3.5 text-green-500" />{zh ? '已复制' : 'Copied'}</>
                      : <><Copy className="h-3.5 w-3.5" />{zh ? '复制' : 'Copy'}</>
                    }
                  </button>
                </div>
                <div className="bg-muted/40 mb-4 max-h-40 overflow-y-auto rounded-lg p-3">
                  <p className="text-foreground whitespace-pre-wrap text-sm leading-relaxed">
                    {selected.prompt}
                  </p>
                </div>
                <Button asChild className="w-full" size="lg">
                  <Link href={`/ai/gpt-image-2?prompt=${encodeURIComponent(selected.prompt)}&mode=text`}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    {zh ? '试试这个示例' : 'Try this example'}
                  </Link>
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Video Modal ───────────────────────────────────────────────────── */}
      <Dialog open={!!selectedVideo} onOpenChange={(open) => { if (!open) { setSelectedVideo(null); setCopied(false); } }}>
        <DialogContent className="max-w-2xl overflow-hidden p-0">
          <DialogClose className="absolute right-3 top-3 z-10 rounded-full bg-black/50 p-1.5 text-white backdrop-blur transition-colors hover:bg-black/70">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>

          {selectedVideo && (
            <>
              {/* Video player */}
              <div className="relative w-full bg-black">
                <video
                  key={selectedVideo.url}
                  src={selectedVideo.url}
                  controls
                  autoPlay
                  loop
                  playsInline
                  className="max-h-[60vh] w-full object-contain"
                />
              </div>
              {/* Info */}
              <div className="p-5">
                <p className="text-foreground mb-3 text-base font-semibold">
                  {selectedVideo.title}
                </p>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                    {zh ? '提示词' : 'Prompt'}
                  </p>
                  <button
                    type="button"
                    onClick={() => copyPrompt(selectedVideo.prompt)}
                    className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
                  >
                    {copied
                      ? <><Check className="h-3.5 w-3.5 text-green-500" />{zh ? '已复制' : 'Copied'}</>
                      : <><Copy className="h-3.5 w-3.5" />{zh ? '复制' : 'Copy'}</>
                    }
                  </button>
                </div>
                <div className="bg-muted/40 mb-4 max-h-40 overflow-y-auto rounded-lg p-3">
                  <p className="text-foreground whitespace-pre-wrap text-sm leading-relaxed">
                    {selectedVideo.prompt}
                  </p>
                </div>
                <Button asChild className="w-full" size="lg">
                  <Link href={`/ai/seedance2?prompt=${encodeURIComponent(selectedVideo.prompt)}&mode=text`}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    {zh ? '试试这个示例' : 'Try this example'}
                  </Link>
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

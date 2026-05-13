'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Link } from '@/core/i18n/navigation';
import {
  Search, Sparkles, Clock, Coins, Eye, Trash2,
  User, Video, ImageIcon, Loader2, RefreshCw,
} from 'lucide-react';

// ── Model tab config ──────────────────────────────────────────────────────────

const MODEL_TABS = [
  { key: 'all',              label: '全部'        },
  { key: 'gpt-image-2',     label: 'GPT Image 2' },
  { key: 'nano-banana-pro', label: 'Nano Banana 2' },
  { key: 'seedream5',       label: 'Seedream 5'  },
  { key: 'ai-image-upscaler', label: '图像增强'  },
  { key: 'seedance2',       label: 'Seedance 2'  },
  { key: 'hailuo',          label: '海螺 AI'     },
  { key: 'grok-video',      label: 'Grok'        },
];

// Map a DB model string to a display label
const MODEL_PATTERNS: { pattern: string; label: string }[] = [
  { pattern: 'gpt-image-2',   label: 'GPT Image 2'   },
  { pattern: 'nano-banana',   label: 'Nano Banana 2'  },
  { pattern: 'seedream',      label: 'Seedream'       },
  { pattern: 'upscaler',      label: '图像增强'       },
  { pattern: 'seedance',      label: 'Seedance 2'     },
  { pattern: 'hailuo',        label: '海螺 AI'        },
  { pattern: 'grok',          label: 'Grok'           },
  { pattern: 'gemini',        label: 'Gemini'         },
  { pattern: 'flux',          label: 'Flux'           },
  { pattern: 'z-image',       label: 'Z-Image'        },
];

function getModelLabel(model: string): string {
  const m = model.toLowerCase();
  const match = MODEL_PATTERNS.find((p) => m.includes(p.pattern));
  return match?.label ?? model;
}

// Map a tab key to a match function against the DB model string
const TAB_MATCHERS: Record<string, (model: string) => boolean> = {
  'gpt-image-2':      (m) => m.includes('gpt-image-2'),
  'nano-banana-pro':  (m) => m.includes('nano-banana'),
  'seedream5':        (m) => m.includes('seedream'),
  'ai-image-upscaler':(m) => m.includes('upscaler'),
  'seedance2':        (m) => m.includes('seedance'),
  'hailuo':           (m) => m.includes('hailuo'),
  'grok-video':       (m) => m.includes('grok'),
};

// ── Types ─────────────────────────────────────────────────────────────────────

type HistoryRecord = {
  id: string;
  type: 'image' | 'video';
  model: string;
  modelLabel: string;
  prompt: string;
  status: 'completed' | 'pending' | 'failed' | string;
  createdAt: number;
  imageUrl?: string;
  credits: number;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// ── Main component ────────────────────────────────────────────────────────────

export function HistoryClient() {
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch]       = useState('');
  const [records, setRecords]     = useState<HistoryRecord[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [page, setPage]           = useState(1);
  const [hasMore, setHasMore]     = useState(false);
  const loadingRef = useRef(false);

  const LIMIT = 20;

  async function fetchHistory(p: number, replace = false) {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ai/history?page=${p}&limit=${LIMIT}`);
      const json = await res.json();
      if (json.code !== 0) throw new Error(json.message ?? 'Failed to load history');

      const raw: any[] = json.data.records ?? [];
      const mapped: HistoryRecord[] = raw.map((r) => ({
        id:         r.id,
        type:       r.type === 'video' ? 'video' : 'image',
        model:      r.model,
        modelLabel: getModelLabel(r.model),
        prompt:     r.prompt,
        status:     r.status,
        createdAt:  r.createdAt,
        imageUrl:   r.imageUrl,
        credits:    r.costCredits ?? 0,
      }));

      setRecords((prev) => replace ? mapped : [...prev, ...mapped]);
      setHasMore(raw.length === LIMIT);
      setPage(p);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }

  // Initial load
  useEffect(() => { fetchHistory(1, true); }, []);

  // Filtered view
  const filtered = records.filter((r) => {
    if (activeTab !== 'all') {
      const matcher = TAB_MATCHERS[activeTab];
      if (matcher && !matcher(r.model.toLowerCase())) return false;
    }
    if (search && !r.prompt.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-background pt-18 max-lg:pt-14">
      {/* Sticky header */}
      <div className="border-b bg-background/80 backdrop-blur-sm sticky top-18 max-lg:top-14 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* User info + search + refresh */}
          <div className="flex items-center gap-4 py-4">
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-9 h-9 rounded-full bg-[#6366F1]/10 flex items-center justify-center">
                <User className="w-5 h-5 text-[#6366F1]" />
              </div>
              <span className="font-medium text-sm">我的创作</span>
            </div>
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索提示词..."
                className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border bg-muted/40 focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1]/50 placeholder:text-muted-foreground"
              />
            </div>
            <button
              onClick={() => fetchHistory(1, true)}
              disabled={loading}
              className="shrink-0 p-2 rounded-lg hover:bg-muted/60 transition-colors disabled:opacity-50"
              title="刷新"
            >
              <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Model filter tabs */}
          <div className="flex gap-0 overflow-x-auto scrollbar-hide -mb-px">
            {MODEL_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'border-[#6366F1] text-[#6366F1]'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Page content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error state */}
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-600">
            <span>{error}</span>
            <button onClick={() => fetchHistory(1, true)} className="ml-auto underline underline-offset-2">
              重试
            </button>
          </div>
        )}

        {/* Initial loading skeleton */}
        {loading && records.length === 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border bg-card overflow-hidden animate-pulse">
                <div className="h-10 bg-muted" />
                <div className="aspect-square bg-muted/60" />
                <div className="px-3.5 py-3 space-y-2">
                  <div className="h-3 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-24 gap-5">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(99,102,241,0.1)' }}
            >
              <ImageIcon className="w-9 h-9 text-[#6366F1]" />
            </div>
            <div className="text-center space-y-1.5">
              <p className="text-lg font-semibold">暂无生成记录</p>
              <p className="text-sm text-muted-foreground">
                {activeTab !== 'all' || search
                  ? '当前筛选条件下没有记录'
                  : '开始使用 AI 创作精彩图片'}
              </p>
            </div>
            {activeTab === 'all' && !search && (
              <Link
                href="/ai/gpt-image-2"
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white"
                style={{ background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)' }}
              >
                <Sparkles className="w-4 h-4" />
                ✦ 开始创作
              </Link>
            )}
          </div>
        )}

        {/* Record grid */}
        {filtered.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((record) => (
                <RecordCard
                  key={record.id}
                  record={record}
                  onDelete={(id) => setRecords((prev) => prev.filter((r) => r.id !== id))}
                />
              ))}
            </div>

            {/* Load more */}
            {hasMore && (
              <div className="mt-8 flex justify-center">
                <button
                  onClick={() => fetchHistory(page + 1)}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-lg border text-sm font-medium hover:bg-muted/40 transition-colors disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  加载更多
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Record card ───────────────────────────────────────────────────────────────

function RecordCard({
  record,
  onDelete,
}: {
  record: HistoryRecord;
  onDelete: (id: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm('确认删除这条生成记录吗？同时删除 R2 中的文件，此操作不可撤销。')) return;
    setDeleting(true);
    try {
      const res  = await fetch(`/api/ai/history/${record.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.code !== 0) throw new Error(json.message ?? '删除失败');
      onDelete(record.id);
      toast.success('已删除');
    } catch (e: any) {
      toast.error(e.message ?? '删除失败');
    } finally {
      setDeleting(false);
    }
  }
  const statusColors: Record<string, string> = {
    completed: 'bg-green-500/10 text-green-600',
    success:   'bg-green-500/10 text-green-600',
    pending:   'bg-yellow-500/10 text-yellow-600',
    processing:'bg-yellow-500/10 text-yellow-600',
    failed:    'bg-red-500/10 text-red-600',
  };
  const statusLabels: Record<string, string> = {
    completed:  '已完成',
    success:    '已完成',
    pending:    '生成中',
    processing: '生成中',
    failed:     '已失败',
  };

  const statusKey = record.status.toLowerCase();
  const statusColor = statusColors[statusKey] ?? 'bg-muted text-muted-foreground';
  const statusLabel = statusLabels[statusKey] ?? record.status;

  return (
    <div className="rounded-xl border bg-card overflow-hidden hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor}`}>
            {statusLabel}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            {record.type === 'image' ? '图片' : '视频'}
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>{formatTime(record.createdAt)}</span>
        </div>
      </div>

      {/* Preview */}
      <div className="relative aspect-square bg-muted">
        {record.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={record.imageUrl}
            alt={record.prompt}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {record.type === 'image' ? (
              <ImageIcon className="w-10 h-10 text-muted-foreground/40" />
            ) : (
              <Video className="w-10 h-10 text-muted-foreground/40" />
            )}
          </div>
        )}
        <span
          className="absolute top-2 right-2 text-xs font-medium px-2 py-0.5 rounded-full text-white"
          style={{ background: 'rgba(234,88,12,0.85)', backdropFilter: 'blur(4px)' }}
        >
          {record.modelLabel}
        </span>
      </div>

      {/* Prompt + credits */}
      <div className="px-3.5 py-2.5 border-t border-b">
        <p className="text-xs text-foreground/80 line-clamp-2 leading-relaxed">{record.prompt}</p>
        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
          <Coins className="w-3 h-3" />
          <span>{record.credits} 积分</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex divide-x text-xs">
        <button
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
          onClick={() => record.imageUrl && window.open(record.imageUrl, '_blank')}
          disabled={!record.imageUrl}
        >
          <Eye className="w-3.5 h-3.5" />
          查看
        </button>
        <button
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-40"
          onClick={handleDelete}
          disabled={deleting}
        >
          {deleting
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <Trash2 className="w-3.5 h-3.5" />
          }
          删除
        </button>
      </div>
    </div>
  );
}

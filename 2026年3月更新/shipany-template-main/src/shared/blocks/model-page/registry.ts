// Registry of model landing pages mounted under /ai/[slug].
// Each entry defines the page metadata (title, description, badge), the
// switcher group it belongs to, and the example thumbnails shown on the right.
//
// To add a new model, append an entry here AND add its dropdown link in
// src/config/locale/messages/{en,zh}/landing.json — these are independent on
// purpose so localized labels stay in i18n while the page wiring stays here.

export type ModelType = 'image' | 'video';
export type ModelBadge = 'NEW' | 'WILD';

export type Localized = {
  en: string;
  zh: string;
};

export type ModelMeta = {
  slug: string;
  type: ModelType;
  // Display name. Bilingual so the page tab labels stay in sync with the
  // localized nav dropdown.
  name: Localized;
  // Lucide / react-icons name accepted by SmartIcon.
  icon: string;
  badge?: ModelBadge;
  tagline: Localized;
  description: Localized;
  // Path the upscaler-style flow needs an uploaded image to function.
  requiresImage?: boolean;
  // Examples shown in the right column (first = featured card, [1..2] = thumbnail strip).
  examples: { src: string; alt: string; caption?: string; prompt?: string; href?: string; hideCaption?: boolean }[];
};

const SHARED_EXAMPLES = [
  {
    src: 'https://assets.gptimage2.it.com/examples/gptimage2-1778611823885.png',
    alt: '土豆与大蒜的法国之旅',
    hideCaption: true,
    href: '/showcases#gptimage2-1778611823885',
  },
  {
    src: 'https://assets.gptimage2.it.com/examples/gptimage2-1778611310144.png',
    alt: '模特设定表 — 纯欲风多角度',
    href: '/showcases#gptimage2-1778611310144',
  },
  {
    src: 'https://assets.gptimage2.it.com/examples/6cc9ce620ab59c07b52d70aaecd194f0.png',
    alt: '霜鸾·栾安 - 灵鸟精灵',
    href: '/showcases#6cc9ce620ab59c07b52d70aaecd194f0',
  },
];

export const MODELS: ModelMeta[] = [
  {
    slug: 'gpt-image-2',
    type: 'image',
    name: { en: 'GPT Image 2', zh: 'GPT Image 2' },
    icon: 'RiImageEditLine',
    badge: 'NEW',
    tagline: {
      en: 'Photoreal realism · precise text rendering · pixel-level editing',
      zh: '照片级真实感·精准文本渲染·像素级编辑',
    },
    description: {
      en: 'GPT Image 2 is the most advanced AI image generation model — turn short prompts into stunning, editable images.',
      zh: 'GPT Image 2 是最先进的 AI 图像生成模型，简单提示词即可生成可继续编辑的高品质画面。',
    },
    examples: [
      {
        src: 'https://assets.gptimage2.it.com/examples/gptimage2-1778611823885.png',
        alt: '土豆与大蒜的法国之旅',
        hideCaption: true,
        href: '/showcases#gptimage2-1778611823885',
      },
      {
        src: 'https://assets.gptimage2.it.com/examples/gptimage2-1778611310144.png',
        alt: '模特设定表 — 纯欲风多角度',
        href: '/showcases#gptimage2-1778611310144',
      },
      {
        src: 'https://assets.gptimage2.it.com/examples/6cc9ce620ab59c07b52d70aaecd194f0.png',
        alt: '霜鸾·栾安 - 灵鸟精灵',
        href: '/showcases#6cc9ce620ab59c07b52d70aaecd194f0',
      },
    ],
  },
  {
    slug: 'nano-banana-pro',
    type: 'image',
    name: { en: 'Nano Banana 2', zh: 'Nano Banana 2' },
    icon: 'RiSparkling2Line',
    tagline: {
      en: 'Generate high-quality images from text prompts',
      zh: '根据文本描述生成高质量图像',
    },
    description: {
      en: 'A fast, prompt-friendly model that turns short descriptions into rich, detailed images.',
      zh: '快速、对提示词友好的模型，几个描述就能生成丰富、细致的画面。',
    },
    examples: SHARED_EXAMPLES,
  },
  {
    slug: 'seedream5',
    type: 'image',
    name: { en: 'Seedream 5', zh: 'Seedream 5' },
    icon: 'RiPaletteLine',
    badge: 'WILD',
    tagline: {
      en: 'Latest Seedream model · 4K quality · 8 aspect ratios',
      zh: '最新 Seedream 模型，4K 画质，8 种宽高比',
    },
    description: {
      en: 'The latest Seedream model — high-fidelity, 4K-ready output across eight aspect ratios.',
      zh: '最新一代 Seedream 模型，原生支持 4K 出图，八种宽高比随心切换。',
    },
    examples: SHARED_EXAMPLES,
  },
  {
    slug: 'ai-image-upscaler',
    type: 'image',
    name: { en: 'Image Enhancer', zh: '图像增强' },
    icon: 'RiArrowUpDoubleLine',
    tagline: {
      en: 'Upscale resolution and refine fine details',
      zh: '提升图像分辨率，优化细节表现',
    },
    description: {
      en: 'Boost low-res images up to 4K, sharpen edges, and recover fine details without overcooking the result.',
      zh: '将低分辨率图片提升至 4K，强化边缘并还原细节，自然不过度。',
    },
    requiresImage: true,
    examples: SHARED_EXAMPLES,
  },
  {
    slug: 'flux-2-pro',
    type: 'image',
    name: { en: 'Flux 2 Pro', zh: 'Flux 2 Pro' },
    icon: 'Zap',
    tagline: {
      en: 'Ultra-realistic output · reference image support · 2K quality',
      zh: '超写实出图，支持参考图，最高 2K 画质',
    },
    description: {
      en: 'Flux 2 Pro delivers stunning photorealistic images with fine-grained composition control and reference-image editing.',
      zh: 'Flux 2 Pro 生成超逼真图像，构图精准可控，支持参考图编辑。',
    },
    examples: SHARED_EXAMPLES,
  },
  {
    slug: 'ideogram-v3',
    type: 'image',
    name: { en: 'Ideogram v3', zh: 'Ideogram v3' },
    icon: 'Paintbrush',
    badge: 'WILD',
    tagline: {
      en: 'Precision typography · artistic compositions · concept designs',
      zh: '精准文字排版，艺术构图，概念设计',
    },
    description: {
      en: 'Ideogram v3 excels at typography-heavy artwork, vivid artistic compositions, and conceptual imagery with style control.',
      zh: 'Ideogram v3 擅长文字艺术、视觉构图与概念画面，提供多种风格控制。',
    },
    examples: SHARED_EXAMPLES,
  },
  {
    slug: 'seedance2',
    type: 'video',
    name: { en: 'Seedance 2', zh: 'Seedance 2' },
    icon: 'RiMovie2Line',
    badge: 'NEW',
    tagline: {
      en: 'Cinematic video with native audio, up to 15 seconds',
      zh: '影院级视频，原生音频，最长 15 秒',
    },
    description: {
      en: 'Seedance 2 produces cinematic-quality clips with native audio — up to 15 seconds from a single prompt.',
      zh: 'Seedance 2 生成影院级画质视频并自带原生音频，单条提示最长 15 秒。',
    },
    examples: SHARED_EXAMPLES,
  },
  {
    slug: 'hailuo',
    type: 'video',
    name: { en: 'Hailuo AI', zh: '海螺 AI' },
    icon: 'RiFilmLine',
    tagline: {
      en: 'MiniMax Hailuo video — exceptional first/last-frame control',
      zh: 'MiniMax Hailuo 视频，首尾帧效果出众',
    },
    description: {
      en: 'MiniMax Hailuo brings strong control over the opening and closing frames, perfect for tightly-storyboarded shots.',
      zh: 'MiniMax 海螺模型对首尾帧把控力强，适合需要稳定开场与收束的镜头。',
    },
    examples: SHARED_EXAMPLES,
  },
  {
    slug: 'grok-video',
    type: 'video',
    name: { en: 'Grok', zh: 'Grok' },
    icon: 'RiFlashlightLine',
    tagline: {
      en: 'Faster generation, supports spicy mode',
      zh: '生成速度更快，支持辣味模式',
    },
    description: {
      en: 'Grok video generation is built for speed and supports an optional spicy mode for bolder creative output.',
      zh: 'Grok 视频生成速度更快，支持可选的辣味模式以获得更大胆的创作风格。',
    },
    examples: SHARED_EXAMPLES,
  },
];

export const MODEL_BY_SLUG: Record<string, ModelMeta> = MODELS.reduce(
  (acc, m) => {
    acc[m.slug] = m;
    return acc;
  },
  {} as Record<string, ModelMeta>
);

export const MODELS_BY_TYPE: Record<ModelType, ModelMeta[]> = {
  image: MODELS.filter((m) => m.type === 'image'),
  video: MODELS.filter((m) => m.type === 'video'),
};

import rawData from '../../seedance-data.json';

export type VideoCategory = {
  name: string;
  zh: string;
  en: string;
};

export type VideoItem = {
  url: string;
  title: string;
  prompt: string;
  category?: string;
  cover?: string;
};

export const VIDEO_CATEGORIES: VideoCategory[] = [
  { name: 'all',     zh: '全部',   en: 'All'                  },
  { name: 'nature',  zh: '自然风景', en: 'Nature & Scenery'    },
  { name: 'people',  zh: '人物动态', en: 'People & Motion'     },
  { name: 'product', zh: '产品展示', en: 'Product Showcase'    },
  { name: 'effect',  zh: '动画特效', en: 'Animation & VFX'     },
  { name: 'food',    zh: '美食料理', en: 'Food & Cuisine'      },
  { name: 'city',    zh: '城市建筑', en: 'City & Architecture' },
  { name: 'other',   zh: '其他',    en: 'Other'               },
];

export const VIDEO_ITEMS: VideoItem[] = rawData as VideoItem[];

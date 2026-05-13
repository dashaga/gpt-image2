import { envConfigs } from '..';

export const localeNames: any = {
  en: '🇺🇸 English',
  zh: '🇨🇳 中文',
  ko: '🇰🇷 한국어',
  ja: '🇯🇵 日本語',
  es: '🇪🇸 Español',
  de: '🇩🇪 Deutsch',
  fr: '🇫🇷 Français',
  ru: '🇷🇺 Русский',
  ar: '🇸🇦 العربية',
  pt: '🇧🇷 Português',
  it: '🇮🇹 Italiano',
};

export const locales = ['en', 'zh', 'ko', 'ja', 'es', 'de', 'fr', 'ru', 'ar', 'pt', 'it'];

export const defaultLocale = envConfigs.locale;

export const localePrefix = 'as-needed';

export const localeDetection = false;

export const localeMessagesRootPath = '@/config/locale/messages';

export const localeMessagesPaths = [
  'common',
  'landing',
  'showcases',
  'blog',
  'updates',
  'pricing',
  'settings/sidebar',
  'settings/profile',
  'settings/security',
  'settings/billing',
  'settings/payments',
  'settings/credits',
  'settings/apikeys',
  'admin/sidebar',
  'admin/users',
  'admin/roles',
  'admin/permissions',
  'admin/categories',
  'admin/posts',
  'admin/payments',
  'admin/subscriptions',
  'admin/credits',
  'admin/settings',
  'admin/apikeys',
  'admin/ai-tasks',
  'admin/chats',
  'ai/music',
  'ai/chat',
  'ai/image',
  'ai/video',
  'activity/sidebar',
  'activity/ai-tasks',
  'activity/chats',
  'pages/index',
  'pages/pricing',
  'pages/showcases',
  'pages/blog',
  'pages/updates',
];

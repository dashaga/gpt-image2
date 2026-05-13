// .source folder will be generated when you run `next dev`
import { createElement } from 'react';
import { logs, pages, posts } from '@/.source';
import type { I18nConfig } from 'fumadocs-core/i18n';
import { loader } from 'fumadocs-core/source';
import { icons } from 'lucide-react';

export const i18n: I18nConfig = {
  defaultLanguage: 'en',
  languages: ['en', 'zh'],
};

const iconHelper = (icon: string | undefined) => {
  if (!icon) {
    // You may set a default icon
    return;
  }
  if (icon in icons) return createElement(icons[icon as keyof typeof icons]);
};

// fumadocs-mdx 11.10 returns `files` as a callable: `() => VirtualFile[]`.
// fumadocs-core 15.8 `loader()` expects `files` to already be an array
// (it calls `files.map(...)` directly). Bridge the version gap by invoking
// the function once if needed; otherwise pass through unchanged.
function normalizeMdxSource<T extends { files: unknown }>(
  source: T
): T & { files: unknown } {
  return typeof source.files === 'function'
    ? { ...source, files: (source.files as () => unknown)() }
    : source;
}

// Pages source (using root path) — feeds the [...slug] catch-all from
// content/pages/*.mdx (privacy-policy, terms-of-service, etc.).
export const pagesSource = loader({
  baseUrl: '/',
  source: normalizeMdxSource(pages.toFumadocsSource()) as ReturnType<
    typeof pages.toFumadocsSource
  >,
  i18n,
  icon: iconHelper,
});

// Posts source — kept available for any future blog/post content even
// though the /blog routes have been retired.
export const postsSource = loader({
  baseUrl: '/blog',
  source: normalizeMdxSource(posts.toFumadocsSource()) as ReturnType<
    typeof posts.toFumadocsSource
  >,
  i18n,
  icon: iconHelper,
});

// Logs source.
export const logsSource = loader({
  baseUrl: '/logs',
  source: normalizeMdxSource(logs.toFumadocsSource()) as ReturnType<
    typeof logs.toFumadocsSource
  >,
  i18n,
  icon: iconHelper,
});

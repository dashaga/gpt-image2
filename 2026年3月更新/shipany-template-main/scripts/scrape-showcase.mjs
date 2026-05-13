#!/usr/bin/env node
/**
 * scrape-showcase.mjs
 *
 * 1. 从 api.bananapro.site/api/showcase 分页拉取全部展示图（offset 分页）
 * 2. 下载到 temp_images/
 * 3. 上传到 R2 存储桶 examples/ 目录
 * 4. 生成 examples.json
 * 5. 更新 src/data/examples.ts
 *
 * 用法：node scripts/scrape-showcase.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import { AwsClient } from 'aws4fetch';

// ── 加载 .env ──────────────────────────────────────────────────────────────
function loadEnv(filePath) {
  let content;
  try { content = readFileSync(filePath, 'utf8'); } catch { return; }
  for (const line of content.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnv('.env');

const {
  R2_ACCESS_KEY,
  R2_SECRET_KEY,
  R2_BUCKET_NAME,
  R2_ENDPOINT,
  R2_DOMAIN,
} = process.env;

if (!R2_ACCESS_KEY || !R2_SECRET_KEY || !R2_BUCKET_NAME || !R2_ENDPOINT || !R2_DOMAIN) {
  console.error('❌  缺少 R2 环境变量，请检查 .env 文件');
  console.error('    需要: R2_ACCESS_KEY, R2_SECRET_KEY, R2_BUCKET_NAME, R2_ENDPOINT, R2_DOMAIN');
  process.exit(1);
}

const API_BASE   = 'https://api.bananapro.site/api/showcase';
const TEMP_DIR   = './temp_images';
const R2_FOLDER  = 'examples';
const PUBLIC_BASE = `${R2_DOMAIN}/${R2_FOLDER}`;
const OUTPUT_JSON = './examples.json';
const OUTPUT_TS   = './src/data/examples.ts';

// ── R2 客户端 ──────────────────────────────────────────────────────────────
const r2 = new AwsClient({
  accessKeyId: R2_ACCESS_KEY,
  secretAccessKey: R2_SECRET_KEY,
  service: 's3',
  region: 'auto',
});

async function uploadToR2(buffer, key, contentType) {
  const url = `${R2_ENDPOINT}/${R2_BUCKET_NAME}/${key}`;
  const res = await r2.fetch(url, {
    method: 'PUT',
    body: buffer,
    headers: {
      'Content-Type': contentType,
      'Content-Length': String(buffer.length),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`R2 PUT 失败 (${res.status}): ${text.slice(0, 200)}`);
  }
}

// ── 工具函数 ───────────────────────────────────────────────────────────────
function guessExt(url, contentType = '') {
  const urlExt = extname(url.split('?')[0]).toLowerCase();
  if (['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(urlExt)) return urlExt;
  if (contentType.includes('png'))  return '.png';
  if (contentType.includes('webp')) return '.webp';
  if (contentType.includes('gif'))  return '.gif';
  return '.jpg';
}

async function downloadImage(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; showcase-scraper/2.0)',
      'Referer': 'https://www.bananapro.site/',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const contentType = res.headers.get('content-type') || 'image/jpeg';
  const ext = guessExt(url, contentType);
  const buffer = Buffer.from(await res.arrayBuffer());
  return { buffer, contentType, ext };
}

// ── 分类自动判断 ────────────────────────────────────────────────────────────
const CATEGORY_RULES = [
  {
    name: 'scene',
    keywords: ['广告', '电商', '产品', '商品', '促销', '货架', '营销', '海报', '陈列', '门店', '上架', '展示图', '主图', '详情页'],
  },
  {
    name: 'design',
    keywords: ['设计', '蓝图', '分解', '拆解', '网格', '分镜', '信息图', '图表', '图解', '排版', '制作', '构图', '布局', '概念', '手绘', 'UI', 'logo', '字体'],
  },
  {
    name: 'style',
    keywords: ['风格', '动漫', '油画', '素描', '像素', '水彩', '漫画', '插画', '卡通', '艺术', '仿'],
  },
  {
    name: 'life',
    keywords: ['人物', '人像', '生活', '穿搭', '头像', '女', '男', '肖像', '人脸', '婚', '旅行', '食谱', '美食', '场景'],
  },
];

function assignCategory(prompt) {
  const scores = Object.fromEntries(CATEGORY_RULES.map(r => [r.name, 0]));
  for (const rule of CATEGORY_RULES) {
    for (const kw of rule.keywords) {
      if (prompt.includes(kw)) scores[rule.name]++;
    }
  }
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return best[1] > 0 ? best[0] : 'design';
}

// ── 从 API 分页拉取全部数据 ─────────────────────────────────────────────────
async function fetchAllItems() {
  const all = [];
  let offset = 0;
  const limit = 50;

  console.log('📡  拉取 api.bananapro.site/api/showcase ...');
  while (true) {
    const url = `${API_BASE}?offset=${offset}&limit=${limit}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; showcase-scraper/2.0)' },
    });
    if (!res.ok) throw new Error(`API 请求失败: HTTP ${res.status}`);
    const data = await res.json();
    const items = data.items || [];
    if (items.length === 0) break;
    all.push(...items);
    console.log(`   offset=${offset} → ${items.length} 条 (累计 ${all.length})`);
    offset += limit;
  }
  return all;
}

// ── 生成 TypeScript 文件 ────────────────────────────────────────────────────
function generateTs(items) {
  const categoryNames = {
    all:    { zh: '全部',   en: 'All' },
    design: { zh: '创意设计', en: 'Creative Design' },
    style:  { zh: '风格迁移', en: 'Style Transfer' },
    scene:  { zh: '场景广告', en: 'Scene & Ads' },
    life:   { zh: '生活人像', en: 'Life & Portrait' },
  };

  const categoriesTs = Object.entries(categoryNames).map(
    ([name, { zh, en }]) => `  { name: '${name}', zh: '${zh}', en: '${en}' },`
  ).join('\n');

  const itemsTs = items.map(({ url, prompt, category }) => {
    const safePrompt = prompt.replace(/'/g, "\\'").replace(/\n/g, ' ').slice(0, 120);
    return `  { url: '${url}', prompt: '${safePrompt}', category: '${category}' },`;
  }).join('\n');

  return `export type ExampleCategory = {
  name: string;
  zh: string;
  en: string;
};

export type ExampleItem = {
  url: string;
  prompt: string;
  category: string;
};

export const EXAMPLE_CATEGORIES: ExampleCategory[] = [
${categoriesTs}
];

export const EXAMPLE_ITEMS: ExampleItem[] = [
${itemsTs}
];
`;
}

// ── 主流程 ─────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🚀  showcase 全量抓取脚本 v2\n');

  // 1. 拉取 API 数据
  const apiItems = await fetchAllItems();
  console.log(`\n✅  API 共返回 ${apiItems.length} 条数据\n`);

  mkdirSync(TEMP_DIR, { recursive: true });

  const results = [];
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < apiItems.length; i++) {
    const item = apiItems[i];
    const imageUrl = item.imageUrl;
    const prompt = (item.prompt || '').trim();
    if (!imageUrl || !prompt) {
      console.log(`[${i + 1}/${apiItems.length}] ⚠️  跳过：缺少 imageUrl 或 prompt`);
      failCount++;
      continue;
    }

    const num = String(i + 1).padStart(3, '0');
    const origName = imageUrl.split('/').pop().split('?')[0] || `img_${num}`;
    console.log(`[${num}/${apiItems.length}] ${origName}`);
    console.log(`         提示词: ${prompt.replace(/\n/g, ' ').slice(0, 80)}`);

    // 下载
    let buffer, contentType, ext;
    try {
      ({ buffer, contentType, ext } = await downloadImage(imageUrl));
    } catch (err) {
      console.warn(`         ⚠️  下载失败: ${err.message}\n`);
      failCount++;
      continue;
    }

    // 保存本地
    const filename  = `${num}_${origName}${origName.includes('.') ? '' : ext}`;
    const localPath = join(TEMP_DIR, filename);
    writeFileSync(localPath, buffer);

    // 上传 R2
    const r2Key = `${R2_FOLDER}/${filename}`;
    try {
      await uploadToR2(buffer, r2Key, contentType);
    } catch (err) {
      console.warn(`         ⚠️  R2 上传失败: ${err.message}\n`);
      failCount++;
      continue;
    }

    const publicUrl = `${PUBLIC_BASE}/${filename}`;
    console.log(`         ✅  ${publicUrl}\n`);

    const category = assignCategory(prompt);
    results.push({ url: publicUrl, prompt, category });
    successCount++;
  }

  // 写 examples.json
  writeFileSync(OUTPUT_JSON, JSON.stringify(results, null, 2), 'utf8');
  console.log(`\n📄  examples.json 写入完成 (${results.length} 条)`);

  // 写 src/data/examples.ts
  writeFileSync(OUTPUT_TS, generateTs(results), 'utf8');
  console.log(`📄  src/data/examples.ts 写入完成`);

  console.log('\n' + '='.repeat(60));
  console.log(`🎉  完成！成功 ${successCount} 张，失败/跳过 ${failCount} 张`);
  console.log('='.repeat(60));
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});

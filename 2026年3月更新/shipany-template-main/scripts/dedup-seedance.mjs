#!/usr/bin/env node
/**
 * dedup-seedance.mjs
 *
 * 1. 从 temp_videos/ 目录读取 20 个已上传 R2 的 streamId
 * 2. 在当前 seedance-data.json 中找到这 20 条，替换 url 为 R2 地址
 * 3. 其余条目中，标题或提示词与这 20 条重复的删除
 * 4. 写回：R2 的 20 条在前，其余去重后的条目在后
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const JSON_PATH    = './seedance-data.json';
const TEMP_DIR     = './temp_videos';
const R2_BASE      = 'https://assets.gptimage2.it.com/videos/seedance';
const CF_BASE      = 'https://customer-qs6wnyfuv0gcybzj.cloudflarestream.com';

// ── 1. 读取 20 个 streamId ─────────────────────────────────────────────────
const r2StreamIds = new Set(
  readdirSync(TEMP_DIR)
    .filter(f => f.endsWith('.mp4'))
    .map(f => f.replace('.mp4', ''))
);
console.log(`📂  temp_videos 中找到 ${r2StreamIds.size} 个 streamId`);

// ── 2. 读取当前 JSON ────────────────────────────────────────────────────────
const items = JSON.parse(readFileSync(JSON_PATH, 'utf8'));
console.log(`📋  当前 JSON 共 ${items.length} 条`);

// ── 3. 找到 R2 对应的 20 条，同时构建去重集合 ──────────────────────────────
const r2Items   = [];
const otherItems = [];

for (const item of items) {
  // 从 URL 提取 streamId（兼容 CF 地址和已经是 R2 地址的情况）
  const cfMatch = item.url.match(/cloudflarestream\.com\/([a-f0-9]{32})\//i);
  const r2Match = item.url.match(/assets\.gptimage2\.it\.com\/videos\/seedance\/([a-f0-9]{32})\.mp4/i);
  const streamId = cfMatch?.[1] ?? r2Match?.[1];

  if (streamId && r2StreamIds.has(streamId)) {
    // 更新为 R2 地址
    r2Items.push({ ...item, url: `${R2_BASE}/${streamId}.mp4` });
  } else {
    otherItems.push(item);
  }
}

console.log(`☁️   识别到 R2 条目: ${r2Items.length} 条`);
console.log(`📄   其余条目: ${otherItems.length} 条`);

// ── 4. 构建去重集合（按标题 + 提示词） ────────────────────────────────────
const seen = new Set();
for (const item of r2Items) {
  seen.add(item.title.trim());
  seen.add(item.prompt.trim());
}

const dedupedOthers = [];
let dupCount = 0;
for (const item of otherItems) {
  if (seen.has(item.title.trim()) || seen.has(item.prompt.trim())) {
    dupCount++;
    continue;
  }
  seen.add(item.title.trim());
  seen.add(item.prompt.trim());
  dedupedOthers.push(item);
}

console.log(`🗑️   重复删除: ${dupCount} 条`);

// ── 5. 合并写回 ─────────────────────────────────────────────────────────────
const merged = [...r2Items, ...dedupedOthers];
writeFileSync(JSON_PATH, JSON.stringify(merged, null, 2), 'utf8');

console.log('\n' + '='.repeat(50));
console.log(`✅  R2 条目: ${r2Items.length}`);
console.log(`✅  其余去重后: ${dedupedOthers.length}`);
console.log(`📋  最终总计: ${merged.length}`);
console.log('='.repeat(50));

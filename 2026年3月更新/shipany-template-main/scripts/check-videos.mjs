#!/usr/bin/env node
/**
 * check-videos.mjs
 *
 * 遍历 seedance-data.json，对每条视频发 HEAD 请求检测链接有效性。
 * 失效（4xx/5xx 或网络错误）的条目自动从 JSON 中删除。
 *
 * 用法：node scripts/check-videos.mjs [--json path/to/file.json]
 */

import { readFileSync, writeFileSync } from 'node:fs';

const args     = process.argv.slice(2);
const jsonIdx  = args.indexOf('--json');
const JSON_PATH = jsonIdx !== -1 ? args[jsonIdx + 1] : './seedance-data.json';

const CONCURRENCY = 8;   // 并发请求数
const TIMEOUT_MS  = 10000;

async function checkUrl(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; link-checker/1.0)' },
      redirect: 'follow',
    });
    clearTimeout(timer);
    return res.ok;           // 2xx = 有效
  } catch {
    clearTimeout(timer);
    return false;            // 超时或网络错误 = 无效
  }
}

// 并发控制：把数组分成 CONCURRENCY 大小的批次顺序处理
async function checkBatch(items, onResult) {
  for (let i = 0; i < items.length; i += CONCURRENCY) {
    const batch = items.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (item) => {
        const ok = await checkUrl(item.url);
        onResult(item, ok);
        return { item, ok };
      })
    );
  }
}

async function main() {
  console.log('\n🔍  视频链接检测脚本\n');

  let items;
  try {
    items = JSON.parse(readFileSync(JSON_PATH, 'utf8'));
  } catch (e) {
    console.error(`❌  无法读取 ${JSON_PATH}: ${e.message}`);
    process.exit(1);
  }

  console.log(`📋  共 ${items.length} 条视频，并发 ${CONCURRENCY}\n`);

  let validCount   = 0;
  let invalidCount = 0;
  const validItems = [];

  const startTime = Date.now();

  await checkBatch(items, (item, ok) => {
    const idx = validItems.length + invalidCount + 1;
    if (ok) {
      validItems.push(item);
      validCount++;
      process.stdout.write(`  [${String(idx).padStart(4)}] ✅  ${item.title.slice(0, 40)}\n`);
    } else {
      invalidCount++;
      process.stdout.write(`  [${String(idx).padStart(4)}] ❌  ${item.title.slice(0, 40)} — 链接失效，已删除\n`);
    }
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  // 写回 JSON（只保留有效条目）
  writeFileSync(JSON_PATH, JSON.stringify(validItems, null, 2), 'utf8');

  console.log('\n' + '='.repeat(60));
  console.log(`✅  有效: ${validCount}  ❌  删除: ${invalidCount}  📋  剩余: ${validItems.length}`);
  console.log(`⏱   耗时: ${elapsed}s`);
  console.log('='.repeat(60) + '\n');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * upload-seedance.mjs
 *
 * 读取 seedance-data.json，逐条从 Cloudflare Stream 下载视频，
 * 上传到 R2 videos/seedance/，并将 url 字段替换为 R2 公开地址。
 *
 * 用法：node scripts/upload-seedance.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
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
        (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnv('.env');

const { R2_ACCESS_KEY, R2_SECRET_KEY, R2_BUCKET_NAME, R2_ENDPOINT, R2_DOMAIN } = process.env;
if (!R2_ACCESS_KEY || !R2_SECRET_KEY || !R2_BUCKET_NAME || !R2_ENDPOINT || !R2_DOMAIN) {
  console.error('❌  缺少 R2 环境变量');
  process.exit(1);
}

const R2_FOLDER   = 'videos/seedance';
const PUBLIC_BASE = `${R2_DOMAIN}/${R2_FOLDER}`;
const JSON_PATH   = './seedance-data.json';
const TEMP_DIR    = './temp_videos';

// ── R2 客户端 ──────────────────────────────────────────────────────────────
const r2 = new AwsClient({
  accessKeyId:     R2_ACCESS_KEY,
  secretAccessKey: R2_SECRET_KEY,
  service: 's3',
  region:  'auto',
});

async function uploadToR2(buffer, key) {
  const url = `${R2_ENDPOINT}/${R2_BUCKET_NAME}/${key}`;
  const res = await r2.fetch(url, {
    method:  'PUT',
    body:    buffer,
    headers: {
      'Content-Type':   'video/mp4',
      'Content-Length': String(buffer.length),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`R2 PUT 失败 (${res.status}): ${text.slice(0, 300)}`);
  }
}

// ── 下载视频 ───────────────────────────────────────────────────────────────
async function download(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

// ── 从 Cloudflare Stream URL 提取 streamId ─────────────────────────────────
function extractStreamId(url) {
  // https://customer-xxx.cloudflarestream.com/{streamId}/downloads/default.mp4
  const m = url.match(/cloudflarestream\.com\/([a-f0-9]{32})\//i);
  return m ? m[1] : null;
}

// ── 主流程 ─────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🚀  Seedance 视频上传脚本\n');
  console.log(`   Bucket : ${R2_BUCKET_NAME}`);
  console.log(`   Folder : ${R2_FOLDER}`);
  console.log(`   Domain : ${PUBLIC_BASE}\n`);

  mkdirSync(TEMP_DIR, { recursive: true });

  const items = JSON.parse(readFileSync(JSON_PATH, 'utf8'));
  console.log(`📋  共 ${items.length} 条视频\n`);

  let successCount = 0;
  let skipCount    = 0;
  let failCount    = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const num  = String(i + 1).padStart(3, '0');

    // 已经是 R2 地址就跳过
    if (item.url.includes('assets.gptimage2.it.com')) {
      console.log(`[${num}/${items.length}] ✅  已是 R2 地址，跳过`);
      skipCount++;
      continue;
    }

    const streamId = extractStreamId(item.url);
    if (!streamId) {
      console.warn(`[${num}/${items.length}] ⚠️  无法提取 streamId: ${item.url}`);
      failCount++;
      continue;
    }

    const filename = `${streamId}.mp4`;
    const r2Key    = `${R2_FOLDER}/${filename}`;
    const pubUrl   = `${PUBLIC_BASE}/${filename}`;

    console.log(`[${num}/${items.length}] ${item.title.slice(0, 50)}`);
    console.log(`         streamId: ${streamId}`);

    // 下载
    let buffer;
    try {
      buffer = await download(item.url);
      console.log(`         ⬇️  下载完成 ${(buffer.length / 1024 / 1024).toFixed(1)} MB`);
    } catch (err) {
      console.warn(`         ⚠️  下载失败: ${err.message}\n`);
      failCount++;
      continue;
    }

    // 本地缓存
    writeFileSync(join(TEMP_DIR, filename), buffer);

    // 上传 R2
    try {
      await uploadToR2(buffer, r2Key);
      console.log(`         ☁️  上传成功: ${pubUrl}`);
    } catch (err) {
      console.warn(`         ⚠️  上传失败: ${err.message}\n`);
      failCount++;
      continue;
    }

    // 更新 URL
    items[i] = { ...item, url: pubUrl };
    successCount++;

    // 每成功一条就写回 JSON，防止中途中断丢失进度
    writeFileSync(JSON_PATH, JSON.stringify(items, null, 2), 'utf8');
    console.log(`         ✅  JSON 已更新\n`);
  }

  console.log('='.repeat(60));
  console.log(`🎉  完成！成功 ${successCount}，跳过 ${skipCount}，失败 ${failCount}`);
  console.log('='.repeat(60) + '\n');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});

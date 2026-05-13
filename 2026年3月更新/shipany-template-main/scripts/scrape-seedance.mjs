#!/usr/bin/env node
/**
 * scrape-seedance.mjs
 *
 * 用法：
 *   node scripts/scrape-seedance.mjs              # 完整模式：下载+上传到R2
 *   node scripts/scrape-seedance.mjs --list-only  # 只生成JSON（用 Cloudflare Stream URL，不下载）
 *   node scripts/scrape-seedance.mjs --limit 50   # 只处理前50条
 *
 * 1. 用 Playwright 打开 youmind.com/zh-CN/seedance-2-0-prompts
 * 2. 拦截所有 RSC 网络响应 + 抓取内联 __next_f.push 脚本
 * 3. 解析 JSON 找到所有 streamId → title + prompt
 * 4. --list-only: 直接输出 Cloudflare Stream URL；否则下载并上传到 R2
 * 5. 生成 seedance-data.json
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { AwsClient } from 'aws4fetch';

// ── 参数解析 ───────────────────────────────────────────────────────────────
const args    = process.argv.slice(2);
const LIST_ONLY = args.includes('--list-only');
const limitIdx  = args.indexOf('--limit');
const LIMIT     = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : Infinity;

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

if (!LIST_ONLY && (!R2_ACCESS_KEY || !R2_SECRET_KEY || !R2_BUCKET_NAME || !R2_ENDPOINT || !R2_DOMAIN)) {
  console.error('❌  缺少 R2 环境变量，请检查 .env（或使用 --list-only 跳过上传）');
  console.error('    需要: R2_ACCESS_KEY, R2_SECRET_KEY, R2_BUCKET_NAME, R2_ENDPOINT, R2_DOMAIN');
  process.exit(1);
}

const CF_BASE     = 'https://customer-qs6wnyfuv0gcybzj.cloudflarestream.com';
const TEMP_DIR    = './temp_videos';
const R2_FOLDER   = 'videos/seedance';
const PUBLIC_BASE = `${R2_DOMAIN}/${R2_FOLDER}`;
const OUTPUT_JSON = './seedance-data.json';

// ── R2 客户端 ──────────────────────────────────────────────────────────────
const r2 = LIST_ONLY ? null : new AwsClient({
  accessKeyId:     R2_ACCESS_KEY,
  secretAccessKey: R2_SECRET_KEY,
  service: 's3',
  region:  'auto',
});

async function uploadToR2(buffer, key) {
  const url = `${R2_ENDPOINT}/${R2_BUCKET_NAME}/${key}`;
  const res = await r2.fetch(url, {
    method: 'PUT',
    body:   buffer,
    headers: { 'Content-Type': 'video/mp4', 'Content-Length': String(buffer.length) },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`R2 PUT 失败 (${res.status}): ${text.slice(0, 300)}`);
  }
}

// ── 从 Cloudflare Stream 下载视频 ─────────────────────────────────────────
async function downloadCfVideo(streamId) {
  const url = `${CF_BASE}/${streamId}/downloads/default.mp4`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

// ── 修复双重编码的中文（UTF-8 字节被当 Windows-1252 字符读取）────────────
// Windows-1252 特殊区 0x80-0x9F 的 Unicode 码点反查表
const CP1252_REV = new Map([
  [0x20AC, 0x80], [0x201A, 0x82], [0x0192, 0x83], [0x201E, 0x84],
  [0x2026, 0x85], [0x2020, 0x86], [0x2021, 0x87], [0x02C6, 0x88],
  [0x2030, 0x89], [0x0160, 0x8A], [0x2039, 0x8B], [0x0152, 0x8C],
  [0x017D, 0x8E], [0x2018, 0x91], [0x2019, 0x92], [0x201C, 0x93],
  [0x201D, 0x94], [0x2022, 0x95], [0x2013, 0x96], [0x2014, 0x97],
  [0x02DC, 0x98], [0x2122, 0x99], [0x0161, 0x9A], [0x203A, 0x9B],
  [0x0153, 0x9C], [0x017E, 0x9E], [0x0178, 0x9F],
]);

function fixDoubleEncoding(str) {
  if (!str || str.length < 4) return str;
  // 检测是否含有 CP1252 特殊字符或 Latin-1 扩展区（双重编码中文的特征）
  const suspect = [...str].filter(c => {
    const cp = c.codePointAt(0);
    return CP1252_REV.has(cp) || (cp >= 0xC0 && cp <= 0xFF);
  }).length;
  if (suspect / str.length < 0.25) return str;

  try {
    // 将每个字符还原为 Windows-1252 字节
    const bytes = [];
    for (const ch of str) {
      const cp = ch.codePointAt(0);
      if (cp <= 0x7F)        bytes.push(cp);
      else if (cp <= 0xFF)   bytes.push(cp);
      else if (CP1252_REV.has(cp)) bytes.push(CP1252_REV.get(cp));
      else { for (const b of Buffer.from(ch, 'utf8')) bytes.push(b); }
    }
    const fixed = Buffer.from(bytes).toString('utf8');
    // 验证修复后含有 CJK 字符
    if ([...fixed].some(c => { const cp = c.codePointAt(0); return cp >= 0x4E00 && cp <= 0x9FFF; })) {
      return fixed;
    }
  } catch {}
  return str;
}

// ── 从 RSC 文本中提取所有视频条目 ─────────────────────────────────────────
function parseItemsFromRsc(allText) {
  const items = new Map();

  const streamRe = /"?streamId"?\s*:\s*"?([a-f0-9]{32})"?/gi;
  let m;

  while ((m = streamRe.exec(allText)) !== null) {
    const streamId = m[1];
    if (items.has(streamId)) continue;

    const before = allText.slice(Math.max(0, m.index - 4000), m.index);

    const titleMatches = [...before.matchAll(/"?title"?\s*:\s*"((?:[^"\\]|\\.)*)"/gi)];
    const descMatches  = [...before.matchAll(/"?description"?\s*:\s*"((?:[^"\\]|\\.)*)"/gi)];

    const rawTitle = titleMatches.length ? titleMatches[titleMatches.length - 1][1] : '';
    const rawDesc  = descMatches.length  ? descMatches[descMatches.length - 1][1]   : '';

    function unescape(s) {
      return s
        .replace(/\\n/g, '\n').replace(/\\t/g, ' ').replace(/\\r/g, '')
        .replace(/\\"/g, '"').replace(/\\\\/g, '\\')
        .replace(/\\u([0-9a-f]{4})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
    }

    const title  = fixDoubleEncoding(unescape(rawTitle).trim());
    const prompt = fixDoubleEncoding(unescape(rawDesc).trim());

    // 跳过没有有效内容的条目
    if (!title && !prompt) {
      items.set(streamId, { streamId, title: '', prompt: '', skip: true });
    } else {
      items.set(streamId, { streamId, title, prompt });
    }
  }

  return [...items.values()].filter(it => !it.skip);
}

// ── 使用 Playwright 抓取页面 ───────────────────────────────────────────────
async function scrape() {
  console.log('🌐  启动 Chromium ...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'zh-CN',
  });
  const page = await context.newPage();

  // 拦截 RSC 网络响应 — 用 response.body() 保证 UTF-8 正确解码
  const rscBodies = [];
  page.on('response', async (response) => {
    const ct = response.headers()['content-type'] || '';
    if (ct.includes('text/x-component') || ct.includes('application/json')) {
      try {
        const buf = await response.body();
        rscBodies.push(buf.toString('utf8'));
      } catch {}
    }
  });

  console.log('📄  打开页面 ...');
  await page.goto('https://youmind.com/zh-CN/seedance-2-0-prompts', { waitUntil: 'load', timeout: 90000 });
  await page.waitForTimeout(4000);

  // ── 无限滚动 ────────────────────────────────────────────────────────────
  // 有 LIMIT 时只滚少量几次（内联脚本已含大量初始数据），全量模式滚到底
  const MAX_SCROLL_ROUNDS = LIMIT < 100 ? 8 : Infinity;
  console.log('📜  滚动加载中 ...');
  let prevHeight = 0;
  let stable = 0;
  let rounds = 0;

  while (stable < 5 && rounds < MAX_SCROLL_ROUNDS) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(2000);
    const h = await page.evaluate(() => document.body.scrollHeight);
    rounds++;
    if (h > prevHeight) {
      prevHeight = h;
      stable = 0;
      process.stdout.write('.');
    } else {
      stable++;
    }
  }
  console.log(` ✅  高度: ${prevHeight}px\n`);

  // ── 提取内联 __next_f.push 脚本文本 ──────────────────────────────────────
  const inlineScripts = await page.evaluate(() => {
    const chunks = [];
    document.querySelectorAll('script:not([src])').forEach(s => {
      if (s.textContent.includes('__next_f') || s.textContent.includes('streamId'))
        chunks.push(s.textContent);
    });
    return chunks;
  });

  await browser.close();

  const allText = [...inlineScripts, ...rscBodies].join('\n');
  console.log(`📦  RSC 数据: ${(allText.length / 1024 / 1024).toFixed(1)} MB`);
  return allText;
}

// ── 主流程 ─────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🚀  Seedance 视频抓取脚本');
  if (LIST_ONLY) console.log('   模式: --list-only (不下载/上传，使用 Cloudflare Stream URL)');
  if (LIMIT !== Infinity) console.log(`   限制: 前 ${LIMIT} 条`);
  console.log();

  if (!LIST_ONLY) mkdirSync(TEMP_DIR, { recursive: true });

  const allText = await scrape();
  let items = parseItemsFromRsc(allText);
  console.log(`✅  共发现 ${items.length} 个有效视频条目`);

  if (items.length === 0) {
    console.warn('⚠️  未发现任何条目，请检查页面结构');
    process.exit(0);
  }

  if (LIMIT !== Infinity) {
    items = items.slice(0, LIMIT);
    console.log(`   限制为前 ${items.length} 条\n`);
  } else {
    console.log();
  }

  // 预览前 3 条
  items.slice(0, 3).forEach((it, i) => {
    console.log(`[预览 ${i + 1}]`);
    console.log(`  streamId: ${it.streamId}`);
    console.log(`  标题:     ${it.title.slice(0, 60)}`);
    console.log(`  提示词:   ${it.prompt.slice(0, 80)}\n`);
  });

  const results = [];
  let successCount = 0;
  let failCount    = 0;

  for (let i = 0; i < items.length; i++) {
    const { streamId, title, prompt } = items[i];
    const num = String(i + 1).padStart(4, '0');

    if (LIST_ONLY) {
      // 直接使用 Cloudflare Stream URL
      const cfUrl = `${CF_BASE}/${streamId}/downloads/default.mp4`;
      results.push({ url: cfUrl, title, prompt });
      if (i < 5 || i % 100 === 0) console.log(`[${num}] ${title.slice(0, 50)}`);
      successCount++;
      continue;
    }

    // ── 完整模式：下载 + 上传 R2 ──────────────────────────────────────────
    const filename = `${num}_${streamId}.mp4`;
    console.log(`[${num}/${items.length}] ${streamId}`);
    if (title)  console.log(`         标题: ${title.slice(0, 60)}`);
    if (prompt) console.log(`         提示词: ${prompt.slice(0, 80)}`);

    let buffer;
    try {
      buffer = await downloadCfVideo(streamId);
      console.log(`         ⬇️  ${(buffer.length / 1024 / 1024).toFixed(1)} MB`);
    } catch (err) {
      console.warn(`         ⚠️  下载失败: ${err.message}\n`);
      failCount++;
      continue;
    }

    writeFileSync(join(TEMP_DIR, filename), buffer);

    const r2Key = `${R2_FOLDER}/${filename}`;
    try {
      await uploadToR2(buffer, r2Key);
    } catch (err) {
      console.warn(`         ⚠️  R2 上传失败: ${err.message}\n`);
      failCount++;
      continue;
    }

    const publicUrl = `${PUBLIC_BASE}/${filename}`;
    console.log(`         ✅  ${publicUrl}\n`);
    results.push({ url: publicUrl, title, prompt });
    successCount++;
  }

  // ── 写 seedance-data.json ─────────────────────────────────────────────────
  writeFileSync(OUTPUT_JSON, JSON.stringify(results, null, 2), 'utf8');
  console.log(`\n📄  ${OUTPUT_JSON} 写入完成 (${results.length} 条)`);
  console.log('\n' + '='.repeat(60));
  console.log(`🎉  完成！成功 ${successCount}，失败/跳过 ${failCount}`);
  console.log('='.repeat(60) + '\n');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});

import { chromium } from 'playwright';

const br = await chromium.launch({ headless: true });
const ctx = await br.newContext({
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  locale: 'zh-CN',
});
const pg = await ctx.newPage();

// Capture all RSC push calls
const rscChunks = [];
pg.on('response', async (r) => {
  const u = r.url();
  const ct = r.headers()['content-type'] || '';
  if (ct.includes('text/x-component') || u.includes('_rsc') || u.includes('__next_f')) {
    try { rscChunks.push(await r.text()); } catch {}
  }
});

await pg.goto('https://youmind.com/zh-CN/seedance-2-0-prompts', { waitUntil: 'networkidle', timeout: 90000 });

// Scroll to load all infinite-scroll content
console.log('scrolling...');
let prev = 0, stable = 0;
while (stable < 4) {
  await pg.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await pg.waitForTimeout(2500);
  const h = await pg.evaluate(() => document.body.scrollHeight);
  if (h > prev) { prev = h; stable = 0; } else { stable++; }
}
console.log('scroll done, body height:', prev);

// Extract all __next_f push data from inline scripts
const extracted = await pg.evaluate(() => {
  const raw = [];
  document.querySelectorAll('script:not([src])').forEach(s => {
    if (s.textContent.includes('__next_f')) raw.push(s.textContent);
  });

  // Collect all mp4 URLs
  const allMp4 = [];
  const allText = raw.join('\n');
  const mp4Re = /https?:\/\/[^\s"'\\]+\.mp4[^\s"'\\]*/gi;
  let m;
  while ((m = mp4Re.exec(allText)) !== null) allMp4.push(m[0]);

  // Find large JSON blobs that may contain video objects
  const jsonBlobs = [];
  raw.forEach(chunk => {
    // __next_f.push([1,"...JSON..."]) pattern
    const pushRe = /__next_f\.push\(\[.*?"(.*?)"\]\)/gs;
    const directRe = /\[\d+,"(\{.*?\})"\]/gs;
    // Try to find JSON arrays/objects with videoUrl or url fields
    const videoObjRe = /\{[^{}]*"(?:videoUrl|url|src|video_url)"[^{}]*\.(mp4|webm)[^{}]*\}/gi;
    let vm;
    while ((vm = videoObjRe.exec(chunk)) !== null) {
      jsonBlobs.push(vm[0].slice(0, 500));
    }
  });

  // Look for card-like structures in the DOM
  const domCards = [];
  // Try to find elements that contain both a video-like url and text
  document.querySelectorAll('[class*="card"], [class*="item"], [class*="prompt"], article, li').forEach(el => {
    const t = el.textContent.trim();
    const inner = el.innerHTML;
    if (inner.includes('.mp4') || inner.includes('twimg')) {
      domCards.push({
        tag: el.tagName,
        cls: (typeof el.className === 'string' ? el.className : '').slice(0, 60),
        text: t.slice(0, 200),
        mp4: (inner.match(/https?:\/\/[^\s"'<>]+\.mp4[^\s"'<>]*/i) || [''])[0].slice(0, 200),
      });
    }
  });

  // Show raw chunk sample with mp4 context
  const contextSamples = [];
  raw.forEach(chunk => {
    const idx = chunk.indexOf('.mp4');
    if (idx !== -1) {
      contextSamples.push(chunk.slice(Math.max(0, idx - 300), idx + 300));
    }
  });

  return {
    rawCount: raw.length,
    allMp4: [...new Set(allMp4)],
    jsonBlobs: jsonBlobs.slice(0, 10),
    domCards: domCards.slice(0, 10),
    contextSamples: contextSamples.slice(0, 3),
  };
});

console.log('\n=== RSC script chunks:', extracted.rawCount);
console.log('\n=== All mp4 URLs found:', extracted.allMp4.length);
extracted.allMp4.forEach((u, i) => console.log(`  [${i+1}] ${u}`));

console.log('\n=== JSON blob samples with video fields:');
extracted.jsonBlobs.forEach((b, i) => console.log(`  [${i+1}] ${b}\n`));

console.log('\n=== DOM cards with mp4 refs:');
extracted.domCards.forEach((c, i) => console.log(`  [${i+1}] <${c.tag}> ${c.cls}\n       text: ${c.text}\n       mp4:  ${c.mp4}\n`));

console.log('\n=== Context around first 3 mp4 occurrences in scripts:');
extracted.contextSamples.forEach((s, i) => {
  console.log(`\n--- sample ${i+1} ---`);
  console.log(s);
});

// Also dump network-captured RSC chunks
if (rscChunks.length) {
  console.log('\n=== Network RSC chunks:', rscChunks.length);
  const combined = rscChunks.join('\n');
  const mp4Re2 = /https?:\/\/[^\s"'\\]+\.mp4[^\s"'\\]*/gi;
  const netMp4 = [...new Set([...combined.matchAll(mp4Re2)].map(m => m[0]))];
  console.log('Network mp4 URLs:', netMp4.length);
  netMp4.forEach((u, i) => console.log(`  [${i+1}] ${u}`));

  // Show context in network RSC
  const idx = combined.indexOf('.mp4');
  if (idx !== -1) {
    console.log('\nNetwork RSC context around first mp4:');
    console.log(combined.slice(Math.max(0, idx - 400), idx + 400));
  }
}

await br.close();

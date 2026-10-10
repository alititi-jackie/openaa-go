/**
 * travel 栏目验证脚本
 * 用法: node travel/tools/validate.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let errors = 0;
const err = (m) => { errors++; console.error('❌', m); };

function walk(d, out = []) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (f.endsWith('.html')) out.push(p);
  }
  return out;
}

const files = walk(root).filter((f) => !f.includes('/data/') && !f.includes('/tools/'));
console.log(`检查 ${files.length} 个 HTML 文件…`);
const articles = JSON.parse(readFileSync(join(root, 'data/articles.json'), 'utf-8'));
const images = JSON.parse(readFileSync(join(root, 'data/images.json'), 'utf-8'));
const imgIds = new Set(images.map((i) => i.id));

// 图片授权完整性
for (const im of images) {
  for (const k of ['imageUrl', 'sourcePage', 'photographer', 'license', 'verifiedAt', 'alt']) {
    if (!im[k]) err(`图片 ${im.id} 缺字段 ${k}`);
  }
}
for (const a of articles) {
  if (a.imageId && !imgIds.has(a.imageId)) err(`文章 ${a.slug} 的图片 ${a.imageId} 未登记`);
  if (!a.lastUpdatedAt) err(`文章 ${a.slug} 缺内容更新时间`);
  if (!a.sources || !a.sources.length) err(`文章 ${a.slug} 缺来源`);
}

const titles = new Map(), canons = new Set();
const urlSet = new Set(files.map((f) => '/travel' + f.replace(root, '').replace(/\/index\.html$/, '/')));
for (const f of files) {
  const html = readFileSync(f, 'utf-8');
  const rel = f.replace(root, '');
  const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1];
  const desc = (html.match(/name="description" content="([^"]*)"/) || [])[1];
  const canon = (html.match(/rel="canonical" href="([^"]*)"/) || [])[1];
  const h1 = (html.match(/<h1[^>]*>/g) || []).length;
  if (!title) err(`${rel}: 缺 title`);
  else { if (titles.has(title)) err(`${rel}: title 重复`); titles.set(title, rel); }
  if (!desc) err(`${rel}: 缺 description`);
  if (!canon) err(`${rel}: 缺 canonical`);
  else { if (canons.has(canon)) err(`${rel}: canonical 重复`); canons.add(canon); }
  if (h1 !== 1) err(`${rel}: h1 数量=${h1}`);
  for (const m of html.matchAll(/href="(\/travel\/[^"]*)"/g)) {
    const p = m[1].split('?')[0];
    if (!urlSet.has(p) && !urlSet.has(p + '/')) err(`死链: ${rel} -> ${m[1]}`);
  }
  // 图片 alt
  for (const m of html.matchAll(/<img[^>]*>/g)) {
    if (!/alt="[^"]+"/.test(m[0])) err(`${rel}: img 缺 alt`);
  }
}
console.log(`\n完成: errors=${errors}`);
process.exit(errors ? 1 : 0);

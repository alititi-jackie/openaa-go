/**
 * places 栏目验证脚本
 * 用法: node places/tools/validate.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let errors = 0, warnings = 0;
const err = (m) => { errors++; console.error('❌', m); };
const warn = (m) => { warnings++; console.warn('⚠️', m); };

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

const titles = new Map(), canons = new Set(), links = [];
for (const f of files) {
  const html = readFileSync(f, 'utf-8');
  const rel = f.replace(root, '');
  const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1];
  const desc = (html.match(/name="description" content="([^"]*)"/) || [])[1];
  const canon = (html.match(/rel="canonical" href="([^"]*)"/) || [])[1];
  const h1 = (html.match(/<h1[^>]*>/g) || []).length;

  if (!title) err(`${rel}: 缺 title`);
  else { if (titles.has(title)) err(`${rel}: title 重复: ${title}`); titles.set(title, rel); }
  if (!desc) err(`${rel}: 缺 description`);
  if (!canon) err(`${rel}: 缺 canonical`);
  else { if (canons.has(canon)) err(`${rel}: canonical 重复`); canons.add(canon); }
  if (h1 !== 1) err(`${rel}: h1 数量=${h1}`);
  if (!canon.startsWith('https://go.openaa.com/places/')) err(`${rel}: canonical 域错误`);

  // 内链收集
  for (const m of html.matchAll(/href="(\/places\/[^"]*)"/g)) links.push([rel, m[1]]);
}

// 内链有效性
const urlSet = new Set(files.map((f) => {
  let r = '/places' + f.replace(root, '').replace(/\/index\.html$/, '/');
  return r;
}));
let dead = 0;
for (const [from, href] of links) {
  const path = href.split('?')[0];
  if (!urlSet.has(path) && !urlSet.has(path + '/')) { dead++; err(`死链: ${from} -> ${href}`); }
}

// sitemap（根目录）
const sm = readFileSync(join(root, '..', 'sitemap.xml'), 'utf-8');
const smUrls = [...sm.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]).filter((u) => u.includes('/places/'));
if (new Set(smUrls).size !== smUrls.length) err('sitemap 有重复 URL');
for (const u of smUrls) {
  const p = new URL(u).pathname;
  if (!urlSet.has(p) && !urlSet.has(p + '/')) err(`sitemap 指向不存在的页面: ${u}`);
}
// search 页不应进 sitemap
if (smUrls.some((u) => u.includes('/search/'))) warn('sitemap 包含搜索页');

// search-index
const idx = JSON.parse(readFileSync(join(root, 'search-index.json'), 'utf-8'));
const ids = new Set();
for (const it of idx) {
  if (!it.url) err('索引缺 url');
  const p = new URL('https://go.openaa.com' + it.url).pathname;
  if (!urlSet.has(p)) err(`索引指向不存在的页面: ${it.url}`);
}

console.log(`\n完成: errors=${errors}, warnings=${warnings}`);
process.exit(errors ? 1 : 0);

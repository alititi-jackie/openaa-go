/**
 * travel 栏目构建脚本
 * 用法: node travel/tools/build.mjs
 * 输出: travel/ 下全部静态 HTML
 *
 * 文章数据: travel/data/articles.json
 * 图片授权: travel/data/images.json
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = (p) => join(root, p);
const D = (p) => mkdirSync(join(root, p), { recursive: true });

const articles = JSON.parse(readFileSync(out('data/articles.json'), 'utf-8'));
const images = JSON.parse(readFileSync(out('data/images.json'), 'utf-8'));
const imgById = Object.fromEntries(images.map((i) => [i.id, i]));

/* 统一 HTML 转义 */
function escHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const CSS = `
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%;background:#e2e8f0}
body{margin:0 auto;max-width:1040px;min-height:100dvh;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei","Segoe UI",sans-serif;color:#111827;background:#fff;line-height:1.8;box-shadow:0 0 40px rgba(15,23,42,.12)}
@media(max-width:1040px){body{box-shadow:none}}
a{color:#2563eb}.wrap{max-width:960px;margin:0 auto;padding:0 16px}
.topbar{border-bottom:1px solid #e5e7eb;background:#fff}
.topbar-in{display:flex;align-items:center;gap:8px;padding:10px 0}
.brand{display:flex;align-items:center;gap:8px;text-decoration:none;color:#111827;font-weight:800;font-size:18px}
.brand img{width:30px;height:30px}.brand .open{color:#2563eb}
.subnav{display:flex;gap:4px;overflow-x:auto;padding:8px 0;border-top:1px solid #f3f4f6}
.subnav a{white-space:nowrap;padding:6px 12px;border-radius:999px;text-decoration:none;color:#4b5563;font-size:14px}
.subnav a:hover,.subnav a.on{background:#eff6ff;color:#1d4ed8}
.hero{padding:28px 0 16px}.hero h1{font-size:26px;margin:0 0 8px}.hero .lede{color:#4b5563;font-size:16px;margin:0}
.article h1{font-size:26px;margin:20px 0 8px}.article .meta{color:#6b7280;font-size:13px;margin-bottom:16px}
.article h2{font-size:20px;margin:28px 0 12px;padding-bottom:6px;border-bottom:2px solid #eff6ff}
.article h3{font-size:17px;margin:20px 0 8px}
.article img.hero-img{width:100%;border-radius:12px;margin:12px 0}
.article .img-credit{font-size:12px;color:#9ca3af;margin:-6px 0 12px}
.infobox{background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;padding:14px 16px;margin:16px 0;font-size:15px}
.infobox strong{color:#1d4ed8}
.tips{background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:14px 16px;margin:16px 0;font-size:15px}
.timeline{list-style:none;margin:16px 0;padding:0}
.timeline li{position:relative;padding:0 0 20px 28px;border-left:2px solid #bfdbfe;margin-left:8px}
.timeline li:last-child{border-left-color:transparent;padding-bottom:0}
.timeline li::before{content:"";position:absolute;left:-8px;top:4px;width:14px;height:14px;border-radius:50%;background:#2563eb}
.timeline .time{font-weight:700;color:#1d4ed8}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px;margin:16px 0}
.card{border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;text-decoration:none;color:inherit;display:block}
.card:hover{border-color:#2563eb}.card img{width:100%;height:150px;object-fit:cover;display:block}
.card .pad{padding:12px 14px}.card .zh{font-weight:700;font-size:16px}.card .en{color:#6b7280;font-size:13px}
.card .desc{font-size:13px;color:#4b5563;margin-top:6px}
.breadcrumb{font-size:13px;color:#6b7280;margin:12px 0}.breadcrumb a{color:#6b7280;text-decoration:none}
.sources{font-size:13px;color:#6b7280;border-top:1px solid #e5e7eb;margin-top:32px;padding-top:12px}
.sources a{color:#6b7280}
.footer{margin-top:48px;border-top:1px solid #e5e7eb;padding:24px 0;color:#6b7280;font-size:13px;text-align:center}
.footer a{color:#6b7280;margin:0 8px;text-decoration:none}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
@media(max-width:640px){.hero h1,.article h1{font-size:22px}}
`;

function layout({ title, desc, canon, nav, body, jsonld }) {
  const t = escHtml(title), d = escHtml(desc);
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${t}</title>
<meta name="description" content="${d}">
<link rel="canonical" href="${canon}">
<meta property="og:title" content="${t}">
<meta property="og:description" content="${d}">
<meta property="og:type" content="article">
<meta property="og:url" content="${canon}">
<meta name="twitter:card" content="summary">
<link rel="icon" href="/favicon.ico">
<style>${CSS}</style>
${jsonld ? `<script type="application/ld+json">${jsonld.replace(/</g, '\\u003c')}</script>` : ''}
</head>
<body>
<header class="topbar"><div class="wrap">
<div class="topbar-in">
<a class="brand" href="/travel/"><img src="/logo.png" alt="OpenAA"><span><span class="open">Open</span>AA · 美国旅游攻略</span></a>
</div>
<nav class="subnav" aria-label="旅游栏目导航">
<a href="/travel/" class="${nav === 'home' ? 'on' : ''}">首页</a>
<a href="/travel/new-york/" class="${nav === 'ny' ? 'on' : ''}">纽约攻略</a>
<a href="https://go.openaa.com/">返回 Go 首页</a>
</nav>
</div></header>
<main class="wrap">${body}</main>
<footer class="footer"><div class="wrap">
<a href="https://openaa.com/" target="_blank" rel="noopener">OpenAA 华人生活平台</a>
<a href="https://tools.openaa.com/" target="_blank" rel="noopener">工具库</a>
<a href="https://dmv.openaa.com/" target="_blank" rel="noopener">DMV</a>
<a href="https://go.openaa.com/" target="_blank" rel="noopener">Go 导航</a>
<p>OpenAA · 美国华人生活平台</p>
</div></footer>
</body>
</html>`;
}

const crumb = (items) =>
  `<nav class="breadcrumb" aria-label="面包屑">${items.map((x, i) =>
    i < items.length - 1 ? `<a href="${escHtml(x[1])}">${escHtml(x[0])}</a> &gt; ` : escHtml(x[0])).join('')}</nav>`;

function imgTag(id, cls) {
  const im = imgById[id];
  if (!im) return '';
  return `<img class="${cls || ''}" src="${escHtml(im.imageUrl)}" alt="${escHtml(im.alt)}" loading="lazy">\n<p class="img-credit">图片：${escHtml(im.photographer)} / ${escHtml(im.license)}${im.attribution ? ' · ' + escHtml(im.attribution) : ''}</p>`;
}

function renderArticle(a) {
  const img = imgById[a.imageId];
  const jsonld = JSON.stringify({
    '@context': 'https://schema.org', '@type': 'Article',
    headline: a.title, description: a.desc,
    image: img ? img.imageUrl : undefined,
    datePublished: a.datePublished, dateModified: a.lastUpdatedAt,
    author: { '@type': 'Organization', name: 'OpenAA' },
  });
  const body = `<article class="article">` +
    crumb([['旅游首页', '/travel/'], ['纽约旅游攻略', '/travel/new-york/'], [a.shortTitle, '']]) +
    `<h1>${escHtml(a.h1)}</h1>\n<p class="meta">内容更新：${escHtml(a.lastUpdatedAt)} · 阅读约 ${a.readMinutes} 分钟</p>\n` +
    (a.imageId ? imgTag(a.imageId, 'hero-img') : '') +
    `<p class="lede"><strong>${escHtml(a.lede)}</strong></p>\n` +
    a.sections.map((s) => {
      if (s.type === 'h2') return `<h2>${escHtml(s.text)}</h2>`;
      if (s.type === 'h3') return `<h3>${escHtml(s.text)}</h3>`;
      if (s.type === 'p') return `<p>${s.html}</p>`; // html 已在数据源转义核查
      if (s.type === 'infobox') return `<div class="infobox">${s.html}</div>`;
      if (s.type === 'tips') return `<div class="tips">💡 ${s.html}</div>`;
      if (s.type === 'timeline') return `<ol class="timeline">` + s.items.map((it) => typeof it === 'string' ? `<li>${it}</li>` : `<li>${it.time ? `<span class="time">${escHtml(it.time)}</span><br>` : ''}${it.html}</li>`).join('') + `</ol>`;
      if (s.type === 'list') return `<ul>` + s.items.map((it) => `<li>${typeof it === 'string' ? it : it.html}</li>`).join('') + `</ul>`;
      return '';
    }).join('\n') +
    (a.related && a.related.length ? `<h2>相关攻略</h2><ul>` + a.related.map((r) => {
      const ra = articles.find((x) => x.slug === r);
      return ra ? `<li><a href="/travel/new-york/${ra.slug}/">${escHtml(ra.shortTitle)}</a></li>` : '';
    }).join('') + `</ul>` : '') +
    `<div class="sources"><strong>官方资料与出行前查询</strong><br>` +
    a.sources.map((s) => `· <a href="${escHtml(s.url)}" target="_blank" rel="noopener">${escHtml(s.name)}</a>`).join('<br>') +
    `<br>出行前请以官方页面最新信息为准。</div>` +
    `</article>`;
  return layout({ title: a.seoTitle, desc: a.desc, canon: `https://go.openaa.com/travel/new-york/${a.slug}/`, nav: 'ny', body, jsonld });
}

/* ---------------- 构建 ---------------- */
D('new-york');
let sitemapUrls = ['https://go.openaa.com/travel/', 'https://go.openaa.com/travel/new-york/'];

// 旅游首页
{
  const cards = articles.map((a) => {
    const im = imgById[a.imageId];
    return `<a class="card" href="/travel/new-york/${a.slug}/">` +
      (im ? `<img src="${escHtml(im.imageUrl)}" alt="${escHtml(im.alt)}" loading="lazy">` : '') +
      `<div class="pad"><div class="zh">${escHtml(a.shortTitle)}</div><div class="desc">${escHtml(a.cardDesc)}</div></div></a>`;
  }).join('');
  const body = `<div class="hero"><h1>美国旅游攻略｜纽约一日游、景点路线与出行指南</h1>
<p class="lede">提供纽约及周边旅游路线、必去景点、交通方式、预算参考和实用旅行建议，帮助华人更轻松地安排美国旅行。</p>
<p style="margin-top:16px"><a href="/travel/new-york/" style="font-weight:700">浏览纽约旅游攻略 →</a> &nbsp; <a href="/travel/new-york/one-day-itinerary/">查看纽约一日游路线 →</a></p></div>
<h2 style="font-size:20px;margin:24px 0 12px">纽约精选攻略</h2>
<div class="cards">${cards}</div>`;
  writeFileSync(out('index.html'), layout({
    title: '美国旅游攻略｜纽约一日游、景点路线与出行指南 - OpenAA',
    desc: '纽约旅游攻略：经典一日游路线、必去景点、免费景点、亲子游、交通、预算、拍照打卡及周边一日游，为华人提供实用出行指南。',
    canon: 'https://go.openaa.com/travel/', nav: 'home', body,
  }));
}

// 纽约主页
{
  const cards = articles.map((a) =>
    `<a class="card" href="/travel/new-york/${a.slug}/"><div class="pad"><div class="zh">${escHtml(a.shortTitle)}</div><div class="desc">${escHtml(a.cardDesc)}</div></div></a>`
  ).join('');
  const body = crumb([['旅游首页', '/travel/'], ['纽约旅游攻略', '']]) +
    `<div class="hero"><h1>纽约旅游攻略</h1><p class="lede">第一次来纽约？从经典一日游路线开始，按主题找攻略：免费景点、亲子游、雨天室内、交通、预算、拍照和周边一日游。</p></div>
<div class="cards">${cards}</div>`;
  writeFileSync(out('new-york/index.html'), layout({
    title: '纽约旅游攻略｜一日游路线、景点、交通、预算全指南 - OpenAA',
    desc: '纽约旅游全指南：经典一日游、必去景点、免费景点、亲子游、雨天室内活动、地铁交通、旅游预算、拍照打卡和周边一日游。',
    canon: 'https://go.openaa.com/travel/new-york/', nav: 'ny', body,
  }));
}

// 文章页
for (const a of articles) {
  D(`new-york/${a.slug}`);
  writeFileSync(out(`new-york/${a.slug}/index.html`), renderArticle(a));
  sitemapUrls.push(`https://go.openaa.com/travel/new-york/${a.slug}/`);
}

// sitemap（只写根目录）
{
  const today = new Date().toISOString().slice(0, 10);
  const mainSmPath = join(root, '..', 'sitemap.xml');
  let mainSm = readFileSync(mainSmPath, 'utf-8');
  mainSm = mainSm.replace(/  <url>\n    <loc>https:\/\/go\.openaa\.com\/travel\/[^<]*<\/loc>\n    <lastmod>[^<]*<\/lastmod>\n  <\/url>\n?/g, '');
  const entries = sitemapUrls.map((u) => `  <url>\n    <loc>${u}</loc>\n    <lastmod>${today}</lastmod>\n  </url>`).join('\n');
  mainSm = mainSm.replace('</urlset>', entries + '\n</urlset>');
  writeFileSync(mainSmPath, mainSm);
  console.log(`根 sitemap 已同步，共 ${sitemapUrls.length} 个 travel URL`);
}
console.log('构建完成');

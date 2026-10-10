/**
 * places 栏目构建脚本
 * 用法: node places/tools/build.mjs
 * 输出: places/ 下全部静态 HTML + search-index.json
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { pinyin } = require('pinyin-pro');

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = (p) => join(root, p);
const D = (p) => mkdirSync(join(root, p), { recursive: true });

const states = JSON.parse(readFileSync(out('data/geo-states.json'), 'utf-8'));
const curated = JSON.parse(readFileSync(out('data/places-curated.json'), 'utf-8'));
const stateByUsps = Object.fromEntries(states.map((s) => [s.usps, s]));
const slugOf = (en) => en.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/* ---------------- 共享模板 ---------------- */
const CSS = `
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%;background:#e2e8f0}
body{margin:0 auto;max-width:1040px;min-height:100dvh;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei","Segoe UI",sans-serif;color:#111827;background:#fff;line-height:1.75;box-shadow:0 0 40px rgba(15,23,42,.12)}
@media(max-width:1040px){body{box-shadow:none}}
a{color:#2563eb}.wrap{max-width:960px;margin:0 auto;padding:0 16px}
.topbar{border-bottom:1px solid #e5e7eb;background:#fff}
.topbar-in{display:flex;align-items:center;gap:12px;padding:10px 0}
.brand{display:flex;align-items:center;gap:8px;text-decoration:none;color:#111827;font-weight:800;font-size:18px}
.brand img{width:30px;height:30px}.brand .open{color:#2563eb}
.subnav{display:flex;gap:4px;overflow-x:auto;padding:8px 0;border-top:1px solid #f3f4f6}
.subnav a{white-space:nowrap;padding:6px 12px;border-radius:999px;text-decoration:none;color:#4b5563;font-size:14px}
.subnav a:hover,.subnav a.on{background:#eff6ff;color:#1d4ed8}
.hero{text-align:center;padding:36px 0 24px}
.hero h1{font-size:28px;margin:0 0 8px}.hero p{color:#4b5563;margin:0}
.searchbox{max-width:640px;margin:20px auto;display:flex;gap:8px}
.searchbox input{flex:1;padding:12px 16px;font-size:16px;border:2px solid #e5e7eb;border-radius:12px}
.searchbox input:focus{outline:none;border-color:#2563eb}
.searchbox button{padding:12px 24px;font-size:16px;background:#2563eb;color:#fff;border:none;border-radius:12px;cursor:pointer}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;margin:16px 0}
.card{border:1px solid #e5e7eb;border-radius:12px;padding:14px;text-decoration:none;color:inherit;display:block}
.card:hover{border-color:#2563eb}.card .zh{font-weight:700;font-size:16px}.card .en{color:#6b7280;font-size:13px}
.card .tag{display:inline-block;font-size:12px;background:#eff6ff;color:#1d4ed8;border-radius:6px;padding:1px 8px;margin-top:6px}
h2.sec{font-size:20px;margin:32px 0 12px;padding-bottom:8px;border-bottom:2px solid #eff6ff}
.breadcrumb{font-size:13px;color:#6b7280;margin:12px 0}.breadcrumb a{color:#6b7280;text-decoration:none}
.info{display:grid;grid-template-columns:120px 1fr;gap:8px 12px;background:#f8fafc;border-radius:12px;padding:16px;margin:16px 0;font-size:15px}
.info dt{color:#6b7280}.info dd{margin:0}
.btnrow{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0}
.btn{display:inline-block;padding:8px 16px;border:1px solid #e5e7eb;border-radius:8px;background:#fff;color:#111827;text-decoration:none;font-size:14px;cursor:pointer}
.btn:hover{border-color:#2563eb;color:#1d4ed8}.btn.primary{background:#2563eb;border-color:#2563eb;color:#fff}
.faq{margin:16px 0}.faq details{border:1px solid #e5e7eb;border-radius:8px;margin-bottom:8px;padding:12px 16px}
.faq summary{font-weight:700;cursor:pointer}
.footer{margin-top:48px;border-top:1px solid #e5e7eb;padding:24px 0;color:#6b7280;font-size:13px;text-align:center}
.footer a{color:#6b7280;margin:0 8px;text-decoration:none}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
@media(max-width:640px){.hero h1{font-size:22px}.info{grid-template-columns:100px 1fr}}
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
<meta property="og:type" content="website">
<meta property="og:url" content="${canon}">
<meta name="twitter:card" content="summary">
<link rel="icon" href="/favicon.ico">
<style>${CSS}</style>
${jsonld ? `<script type="application/ld+json">${jsonld.replace(/</g, '\\u003c')}</script>` : ''}
</head>
<body>
<header class="topbar"><div class="wrap">
<div class="topbar-in">
<a class="brand" href="/places/"><img src="/logo.png" alt="OpenAA"><span><span class="open">Open</span>AA · 美国中文地名大全</span></a>
</div>
<nav class="subnav" aria-label="地名栏目导航">
<a href="/places/" class="${nav === 'home' ? 'on' : ''}">首页</a>
<a href="/places/states/" class="${nav === 'states' ? 'on' : ''}">美国州名</a>
<a href="/places/chinese-names/" class="${nav === 'cn' ? 'on' : ''}">华人常用地名</a>
<a href="/places/search/" class="${nav === 'search' ? 'on' : ''}">搜索</a>
<a href="https://go.openaa.com/">返回 Go 首页</a>
</nav>
</div></header>
<main class="wrap">${body}</main>
<footer class="footer"><div class="wrap">
<a href="https://openaa.com/" target="_blank" rel="noopener">OpenAA 华人生活平台</a>
<a href="https://openaa.com/jobs" target="_blank" rel="noopener">找工作</a>
<a href="https://openaa.com/housing" target="_blank" rel="noopener">租房</a>
<a href="https://dmv.openaa.com/" target="_blank" rel="noopener">DMV</a>
<a href="https://tools.openaa.com/" target="_blank" rel="noopener">工具库</a>
<p>OpenAA · 美国华人生活平台</p>
</div></footer>
</body>
</html>`;
}

const crumb = (items) =>
  `<nav class="breadcrumb" aria-label="面包屑">${items.map((x, i) =>
    i < items.length - 1 ? `<a href="${escHtml(x[1])}">${escHtml(x[0])}</a> &gt; ` : escHtml(x[0])).join('')}</nav>`;

/* 统一 HTML 转义：所有插入地名数据的地方都走这里 */
function escHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const placeCard = (p) => {
  const st = stateByUsps[p.stateCode];
  const typeLabel = { city: '城市', town: '镇', township: '镇区', borough: '区', neighborhood: '社区', nickname: '华人习惯称呼' }[p.geoType] || p.geoType;
  return `<a class="card" href="/places/us/${p.stateCode.toLowerCase()}/${escHtml(p.slug)}/">
<span class="zh">${escHtml(p.chineseName)}</span><br><span class="en">${escHtml(p.englishName)}</span><br>
<span class="tag">${escHtml(typeLabel)}</span> <span class="en">${escHtml(st ? st.chineseName : p.stateCode)}</span></a>`;
};

const mapLinks = (p) => {
  const q = encodeURIComponent(`${p.englishName}, ${p.stateCode}`);
  const ll = `${p.latitude},${p.longitude}`;
  return `<div class="btnrow">
<a class="btn" href="https://www.google.com/maps/search/?api=1&amp;query=${ll}" target="_blank" rel="noopener">Google Maps</a>
<a class="btn" href="https://maps.apple.com/?q=${q}&amp;ll=${ll}" target="_blank" rel="noopener">Apple Maps</a>
</div>`;
};

/* ---------------- 首页 ---------------- */
D('.');
{
  const hotStates = ['NY', 'CA', 'PA', 'NJ', 'MA', 'TX', 'FL', 'IL', 'WA', 'NV'];
  const hotPlaces = curated.filter((p) => ['custom-ny-flushing', 'custom-ny-brooklyn', 'custom-ny-manhattan', 'custom-ny-sunset-park'].includes(p.id)
    || ['New York', 'Philadelphia', 'Los Angeles', 'San Francisco', 'San Jose', 'Boston', 'Chicago', 'Seattle', 'Houston', 'Las Vegas'].includes(p.englishName));
  const body = `
<div class="hero">
<h1>美国中文地名大全</h1>
<p>查询美国州、城市和社区的中英文名称，支持中文、英文、拼音及相关 ZIP Code 搜索</p>
<form class="searchbox" action="/places/search/" method="get" role="search">
<label class="sr" for="q">搜索地名</label>
<input id="q" name="q" type="search" placeholder="输入中文、英文、拼音或 ZIP，例如：法拉盛、Flushing、纽约、11354" autocomplete="off">
<button type="submit">搜索</button>
</form>
</div>
<h2 class="sec">主要入口</h2>
<div class="cards">
<a class="card" href="/places/states/"><span class="zh">美国州名大全</span><br><span class="en">50 州 + 华盛顿特区中英文对照</span></a>
<a class="card" href="/places/chinese-names/"><span class="zh">华人常用地名</span><br><span class="en">唐人街、法拉盛、八大道…</span></a>
<a class="card" href="/places/search/"><span class="zh">中英文地名搜索</span><br><span class="en">中文 / 英文 / 拼音 / ZIP</span></a>
<a class="card" href="/places/faq/"><span class="zh">常见地名问题</span><br><span class="en">纽约州和纽约市有什么区别？</span></a>
</div>
<h2 class="sec">热门州</h2>
<div class="cards">${hotStates.map((c) => { const s = stateByUsps[c]; return `<a class="card" href="/places/states/${slugOf(s.englishName)}/"><span class="zh">${s.chineseName}</span><br><span class="en">${s.englishName} · ${s.usps}</span></a>`; }).join('')}</div>
<h2 class="sec">热门城市与社区</h2>
<div class="cards">${hotPlaces.map(placeCard).join('')}</div>
<h2 class="sec">常见中文问题</h2>
<div class="faq">
<details><summary>纽约州和纽约市有什么区别？</summary><p>纽约州（New York State）是美国的一个州，纽约市（New York City）是该州内的一座城市。州是上一级行政区，市在州之内，两者不是同一个概念。</p></details>
<details><summary>法拉盛英文怎么写？</summary><p>法拉盛的英文是 <b>Flushing</b>，位于纽约市皇后区，是华人聚居的社区。</p></details>
<details><summary>布鲁克林属于纽约哪个区？</summary><p>布鲁克林（Brooklyn）本身就是纽约市的五个区（Borough）之一，行政上称为 Kings County。</p></details>
<details><summary>ZIP Code 和城市是一一对应的吗？</summary><p>不是。一个城市可能有多个 ZIP Code，一个 ZIP Code 也可能覆盖多个城镇。邮编和行政边界不同，寄信请以 USPS 查询为准。</p></details>
</div>
<p style="text-align:center;margin-top:24px"><a class="btn" href="/places/faq/">查看全部常见问题</a></p>`;
  writeFileSync(out('index.html'), layout({
    title: '美国中文地名大全｜美国州名、城市、社区中英文查询 - OpenAA',
    desc: '免费查询美国州、城市、城镇和华人常用社区的中英文名称，支持中文、英文、拼音及相关邮编搜索，提供地点介绍和地图导航。',
    canon: 'https://go.openaa.com/places/',
    nav: 'home', body,
  }));
}

/* ---------------- 州列表 ---------------- */
D('states');
{
  const body = crumb([['地名首页', '/places/'], ['美国州名大全', '']]) + `
<h1>美国州名大全</h1>
<p>美国 50 个州 + 华盛顿特区的中英文名称、缩写对照。</p>
<div class="cards">${states.map((s) => `<a class="card" href="/places/states/${slugOf(s.englishName)}/"><span class="zh">${s.chineseName}</span><br><span class="en">${s.englishName} · ${s.usps}</span></a>`).join('')}</div>`;
  writeFileSync(out('states/index.html'), layout({
    title: '美国州名大全｜50州中英文名称、缩写对照 - OpenAA',
    desc: '美国50个州和华盛顿特区的中英文名称、USPS两位缩写、州首府对照表。',
    canon: 'https://go.openaa.com/places/states/',
    nav: 'states', body,
  }));
}

/* ---------------- 州详情 ---------------- */
let sitemapUrls = [
  'https://go.openaa.com/places/',
  'https://go.openaa.com/places/states/',
  'https://go.openaa.com/places/chinese-names/',
  'https://go.openaa.com/places/faq/',
];
for (const s of states) {
  const slug = s.usps === 'DC' ? 'district-of-columbia' : slugOf(s.englishName);
  D(`states/${slug}`);
  const inState = curated.filter((p) => p.stateCode === s.usps);
  const cities = inState.filter((p) => ['city', 'town', 'township'].includes(p.geoType));
  const hoods = inState.filter((p) => ['borough', 'neighborhood', 'nickname'].includes(p.geoType));
  const jsonld = JSON.stringify({
    '@context': 'https://schema.org', '@type': 'State',
    name: s.englishName, alternateName: s.chineseName,
    containedInPlace: { '@type': 'Country', name: 'United States' },
  });
  const body = crumb([['地名首页', '/places/'], ['美国州名大全', '/places/states/'], [s.chineseName, '']]) + `
<h1>${escHtml(s.chineseName)} ${escHtml(s.englishName)}</h1>
<dl class="info">
<dt>英文名称</dt><dd>${escHtml(s.englishName)}</dd>
<dt>USPS 缩写</dt><dd>${escHtml(s.usps)}</dd>
<dt>首府</dt><dd>${escHtml(s.capitalZh)} ${escHtml(s.capitalEn)}</dd>
<dt>中文别名</dt><dd>${s.aliases.length ? escHtml(s.aliases.join('、')) : '—'}</dd>
</dl>
${cities.length ? `<h2 class="sec">主要城市</h2><div class="cards">${cities.map(placeCard).join('')}</div>` : ''}
${hoods.length ? `<h2 class="sec">华人常用社区</h2><div class="cards">${hoods.map(placeCard).join('')}</div>` : ''}
${!inState.length ? `<p>本州的城市和社区内容正在陆续收录中，可先使用<a href="/places/search/">地名搜索</a>。</p>` : ''}
<p style="color:#6b7280;font-size:13px">数据来源：美国人口普查局 2026 Gazetteer；中文名为通用译法。</p>`;
  writeFileSync(out(`states/${slug}/index.html`), layout({
    title: `${s.chineseName} ${s.englishName}｜中文名称、州缩写及主要城市 - OpenAA`,
    desc: `${s.chineseName}（${s.englishName}，${s.usps}）中文名称、州缩写、首府${s.capitalZh}及主要城市中英文对照。`,
    canon: `https://go.openaa.com/places/states/${slug}/`,
    nav: 'states', body, jsonld,
  }));
  sitemapUrls.push(`https://go.openaa.com/places/states/${slug}/`);
}

/* ---------------- 地点详情 ---------------- */
const typeZh = { city: '城市', town: '镇', township: '镇区', borough: '区', neighborhood: '社区', nickname: '华人习惯称呼' };
for (const p of curated) {
  const st = stateByUsps[p.stateCode];
  D(`us/${p.stateCode.toLowerCase()}/${p.slug}`);
  const gq = `${p.latitude},${p.longitude}`;
  const jsonld = JSON.stringify({
    '@context': 'https://schema.org', '@type': 'Place',
    name: p.englishName, alternateName: p.chineseName,
    geo: { '@type': 'GeoCoordinates', latitude: p.latitude, longitude: p.longitude },
    containedInPlace: { '@type': 'State', name: st.englishName },
  });
  const siblings = curated.filter((x) => x.stateCode === p.stateCode && x.id !== p.id).slice(0, 8);
  const body = crumb([['地名首页', '/places/'], [st.chineseName, `/places/states/${st.usps === 'DC' ? 'district-of-columbia' : slugOf(st.englishName)}/`], [p.chineseName, '']]) + `
<h1>${escHtml(p.chineseName)} ${escHtml(p.englishName)}</h1>
<dl class="info">
<dt>中文名称</dt><dd>${escHtml(p.chineseName)}${p.chineseNameStatus === 'common' ? '（常用译法）' : ''}</dd>
<dt>英文名称</dt><dd>${escHtml(p.englishName)}</dd>
<dt>地理类型</dt><dd>${typeZh[p.geoType] || p.geoType}</dd>
<dt>所属州</dt><dd>${escHtml(st.chineseName)} ${escHtml(st.englishName)}</dd>
${p.aliases.length ? `<dt>其他名称</dt><dd>${escHtml(p.aliases.join('、'))}</dd>` : ''}
</dl>
<div class="btnrow">
<button class="btn" data-copy="${escHtml(p.englishName)}">复制英文名称</button>
<button class="btn" data-copy="${escHtml(p.chineseName + ' ' + p.englishName + ', ' + st.englishName)}">复制完整描述</button>
</div>
<script>
document.querySelectorAll('[data-copy]').forEach(function (b) {
  b.addEventListener('click', function () {
    navigator.clipboard.writeText(b.getAttribute('data-copy')).then(function () { alert('已复制'); });
  });
});
</script>
${mapLinks(p)}
<p style="color:#6b7280;font-size:13px">地图定位为地点代表坐标，不代表行政边界。</p>
${siblings.length ? `<h2 class="sec">同州相关地区</h2><div class="cards">${siblings.map(placeCard).join('')}</div>` : ''}
<p style="color:#6b7280;font-size:13px">数据来源：美国人口普查局 2026 Gazetteer（英文名、坐标）；中文名为华人常用译法。</p>`;
  writeFileSync(out(`us/${p.stateCode.toLowerCase()}/${p.slug}/index.html`), layout({
    title: `${p.chineseName} ${p.englishName}在哪里？中文英文名称及地图位置 - OpenAA`,
    desc: `${p.chineseName}（${p.englishName}）位于${st.chineseName}，${typeZh[p.geoType] || ''}中英文名称、地图位置查询。`,
    canon: `https://go.openaa.com/places/us/${p.stateCode.toLowerCase()}/${p.slug}/`,
    nav: '', body, jsonld,
  }));
  sitemapUrls.push(`https://go.openaa.com/places/us/${p.stateCode.toLowerCase()}/${p.slug}/`);
}

/* ---------------- 华人常用地名 ---------------- */
D('chinese-names');
{
  const groups = {};
  for (const p of curated) {
    const st = stateByUsps[p.stateCode].chineseName;
    (groups[st] = groups[st] || []).push(p);
  }
  const body = crumb([['地名首页', '/places/'], ['华人常用地名', '']]) + `
<h1>华人常用地名</h1>
<p>按地区浏览华人生活常用的中文地名：城市、社区与习惯称呼。</p>
${Object.entries(groups).map(([st, ps]) => `
<h2 class="sec">${st}</h2>
<div class="cards">${ps.map(placeCard).join('')}</div>`).join('')}`;
  writeFileSync(out('chinese-names/index.html'), layout({
    title: '华人常用美国地名｜唐人街、法拉盛、八大道中英文对照 - OpenAA',
    desc: '华人常用的美国地名中英文对照：纽约法拉盛、布鲁克林、曼哈顿唐人街、八大道及各州主要城市。',
    canon: 'https://go.openaa.com/places/chinese-names/',
    nav: 'cn', body,
  }));
}

/* ---------------- 搜索页 ---------------- */
D('search');
{
  const body = crumb([['地名首页', '/places/'], ['搜索', '']]) + `
<h1>中英文地名搜索</h1>
<form class="searchbox" id="psf" role="search" onsubmit="return false">
<label class="sr" for="pq">搜索地名</label>
<input id="pq" type="search" placeholder="中文 / 英文 / 拼音 / ZIP，例如：法拉盛" autocomplete="off">
<button type="submit">搜索</button>
</form>
<div id="pres"></div>
<script>
var INDEX=null;
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function norm(s){return String(s||'').toLowerCase().replace(/\\s+/g,'')}
function loadIdx(){return fetch('/places/search-index.json').then(function(r){return r.json()}).then(function(j){INDEX=j;return j})}
function search(q){
  q=norm(q);if(!q||!INDEX)return[];
  var out=[];
  INDEX.forEach(function(it){
    var score=0;
    if(norm(it.zh)===q||norm(it.en)===q)score=100;
    else if((it.alias||[]).some(function(a){return norm(a)===q}))score=90;
    else if(it.st===q.toUpperCase()||norm(it.py)===q)score=80;
    else if(norm(it.zh).indexOf(q)===0||norm(it.en).indexOf(q)===0)score=60;
    else if((it.zip||[]).some(function(z){return z.indexOf(q)===0}))score=55;
    else if(norm(it.zh).indexOf(q)>-1||norm(it.en).indexOf(q)>-1||norm(it.py).indexOf(q)>-1)score=40;
    if(score>0)out.push([score,it]);
  });
  out.sort(function(a,b){return b[0]-a[0]||(b[1].pop-a[1].pop)});
  return out.slice(0,30).map(function(x){return x[1]});
}
function render(q){
  var box=document.getElementById('pres');
  loadIdx().then(function(){
    var hits=search(q);
    if(!hits.length){box.innerHTML='<p>没有找到“'+esc(q)+'”，试试英文名称，或浏览<a href="/places/states/">州列表</a>。</p>';return}
    box.innerHTML='<p>找到 '+hits.length+' 条结果</p><div class="cards">'+hits.map(function(h){
      return '<a class="card" href="'+esc(h.url)+'"><span class="zh">'+esc(h.zh||h.en)+'</span><br><span class="en">'+esc(h.en)+'</span><br><span class="tag">'+esc(h.type)+'</span> <span class="en">'+esc(h.stZh)+'</span>'+(h.zh? '':'<br><span class="en" style="color:#b45309">中文名待收录</span>')+'</a>';
    }).join('')+'</div>';
  });
}
var initQ=new URLSearchParams(location.search).get('q');
if(initQ){document.getElementById('pq').value=initQ;render(initQ)}
document.getElementById('psf').addEventListener('submit',function(){var q=document.getElementById('pq').value.trim();if(q){history.replaceState(null,'','?q='+encodeURIComponent(q));render(q)}});
var t=null;
document.getElementById('pq').addEventListener('input',function(e){clearTimeout(t);var q=e.target.value.trim();if(q.length>1)t=setTimeout(function(){render(q)},250)});
</script>`;
  writeFileSync(out('search/index.html'), layout({
    title: '地名搜索 - OpenAA 美国中文地名大全',
    desc: '搜索美国地名：支持中文、英文、拼音、ZIP Code。',
    canon: 'https://go.openaa.com/places/search/',
    nav: 'search', body,
  }).replace('</head>', '<meta name="robots" content="noindex,follow">\n</head>'));
}

/* ---------------- FAQ ---------------- */
D('faq');
{
  const faqs = [
    ['纽约州和纽约市有什么区别？', '纽约州（New York State）是美国东北部的一个州，首府是奥尔巴尼；纽约市（New York City）是该州东南部的一座城市，由曼哈顿、布鲁克林、皇后区、布朗克斯、史坦顿岛五个区组成。州是上一级行政单位，市在州之内。'],
    ['法拉盛英文怎么写？', '法拉盛的英文是 Flushing，位于纽约市皇后区，是纽约华人最集中的社区之一。'],
    ['布鲁克林属于纽约哪个区？', '布鲁克林（Brooklyn）本身就是纽约市五个区之一，行政上对应 Kings County（国王县）。'],
    ['美国 PA 是哪个州？', 'PA 是宾夕法尼亚州（Pennsylvania）的 USPS 两位缩写，首府哈里斯堡，最大城市费城。'],
    ['NJ 是美国哪个州？', 'NJ 是新泽西州（New Jersey）的缩写，位于纽约市以西，华人聚居的爱迪生、泽西城、李堡都在该州。'],
    ['ZIP Code 和城市是一一对应的吗？', '不是。一个城市通常有多个 ZIP Code，一个 ZIP Code 也可能跨多个城镇。邮编是邮政投递分区，不等于行政边界，寄信请以 USPS 官网查询为准。'],
    ['美国地址中的 State、County、City 有什么区别？', 'State（州）是最高一级地方行政区；County（县）是州下面的行政区；City（市）是居民点。注意纽约市比较特殊，它横跨五个县（区）。'],
    ['八大道是正式地名吗？', '八大道是华人对布鲁克林日落公园（Sunset Park）一带华人商圈的习惯称呼，不是官方行政地名。正式场合建议使用 Sunset Park, Brooklyn, NY。'],
  ];
  const body = crumb([['地名首页', '/places/'], ['常见问题', '']]) + `
<h1>美国地名常见中文问题</h1>
<div class="faq">${faqs.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join('')}</div>
<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }).replace(/</g, '\\u003c')}</script>`;
  writeFileSync(out('faq/index.html'), layout({
    title: '美国地名常见问题｜纽约州和纽约市的区别、ZIP Code 说明 - OpenAA',
    desc: '解答华人常见的美国地名问题：纽约州和纽约市的区别、法拉盛英文、PA/NJ是哪个州、ZIP Code和城市的关系。',
    canon: 'https://go.openaa.com/places/faq/',
    nav: '', body,
  }));
  // FAQ 每个问题单独成页以丰富 SEO（8页）
  faqs.forEach(([q, a], i) => {
    const slug = 'q' + (i + 1);
    D(`faq/${slug}`);
    const b = crumb([['地名首页', '/places/'], ['常见问题', '/places/faq/'], [q, '']]) + `<h1>${escHtml(q)}</h1><p>${escHtml(a)}</p><p><a class="btn" href="/places/faq/">查看全部问题</a></p>`;
    writeFileSync(out(`faq/${slug}/index.html`), layout({
      title: `${q} - OpenAA`, desc: a.slice(0, 100),
      canon: `https://go.openaa.com/places/faq/${slug}/`,
      nav: '', body: b,
    }));
    sitemapUrls.push(`https://go.openaa.com/places/faq/${slug}/`);
  });
}

/* ---------------- 搜索索引 ---------------- */
{
  const pyOf = (zh) => zh ? pinyin(zh, { toneType: 'none' }).replace(/\s+/g, '') : '';
  const idx = [];
  // 精选地点
  for (const p of curated) {
    const st = stateByUsps[p.stateCode];
    idx.push({
      zh: p.chineseName, en: p.englishName, py: pyOf(p.chineseName),
      alias: p.aliases || [], st: p.stateCode, stZh: st.chineseName,
      type: typeZh[p.geoType] || p.geoType, zip: p.zipCodes || [],
      url: `/places/us/${p.stateCode.toLowerCase()}/${p.slug}/`,
      pop: 10,
    });
  }
  // 州
  for (const s of states) {
    idx.push({
      zh: s.chineseName, en: s.englishName, py: pyOf(s.chineseName),
      alias: s.aliases || [], st: s.usps, stZh: s.chineseName,
      type: '州', zip: [],
      url: `/places/states/${s.usps === 'DC' ? 'district-of-columbia' : slugOf(s.englishName)}/`,
      pop: 9,
    });
  }
  writeFileSync(out('search-index.json'), JSON.stringify(idx));
  console.log(`search-index: ${idx.length} 条`);
}

/* ---------------- sitemap：只写根目录 ---------------- */
{
  const today = new Date().toISOString().slice(0, 10);
  const mainSmPath = join(root, '..', 'sitemap.xml');
  try {
    let mainSm = readFileSync(mainSmPath, 'utf-8');
    // 移除旧的 places 条目
    mainSm = mainSm.replace(/  <url>\n    <loc>https:\/\/go\.openaa\.com\/places\/[^<]*<\/loc>\n    <lastmod>[^<]*<\/lastmod>\n  <\/url>\n?/g, '');
    const entries = sitemapUrls.map((u) => `  <url>\n    <loc>${u}</loc>\n    <lastmod>${today}</lastmod>\n  </url>`).join('\n');
    mainSm = mainSm.replace('</urlset>', entries + '\n</urlset>');
    writeFileSync(mainSmPath, mainSm);
    console.log(`根 sitemap 已同步，共 ${sitemapUrls.length} 个 places URL`);
  } catch (e) { console.warn('根 sitemap 同步跳过:', e.message); }
}
console.log('构建完成');

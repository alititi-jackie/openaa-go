/**
 * Census 2026 Gazetteer 导入脚本
 * 用法: node places/tools/import-census.mjs /tmp/census
 * 输出: places/data/geo-states.json, places/data/geo-places.json
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = join(root, 'data');
mkdirSync(dataDir, { recursive: true });

const srcDir = process.argv[2] || '/tmp/census';

function parsePipe(text) {
  const lines = text.trim().split('\n');
  const headers = lines[0].split('|');
  return lines.slice(1).map((l) => {
    const cols = l.split('|');
    const o = {};
    headers.forEach((h, i) => { o[h] = cols[i] ?? ''; });
    return o;
  });
}

/* ---------- states ---------- */
const stateRows = parsePipe(readFileSync(join(srcDir, '2026_Gaz_state_national.txt'), 'utf-8'));
const statesZh = JSON.parse(readFileSync(join(dataDir, 'states-zh.json'), 'utf-8'));
const zhByUsps = Object.fromEntries(statesZh.map((s) => [s.usps, s]));

const states = [];
for (const r of stateRows) {
  const usps = r.USPS;
  if (usps === 'PR') continue; // 属地单独处理
  const zh = zhByUsps[usps];
  if (!zh) { console.warn('缺中文名:', usps, r.NAME); continue; }
  states.push({
    id: `geo-${r.GEOID}`,
    usps,
    englishName: r.NAME,
    chineseName: zh.chineseName,
    chineseNameStatus: 'verified',
    aliases: zh.aliases || [],
    capitalEn: zh.capitalEn,
    capitalZh: zh.capitalZh,
    fips: r.GEOID,
    latitude: parseFloat(r.INTPTLAT),
    longitude: parseFloat(r.INTPTLONG),
    isState: usps !== 'DC',
  });
}

/* ---------- places（只保留需要的类型，清洗名称） ---------- */
const placeRows = parsePipe(readFileSync(join(srcDir, '2026_Gaz_place_national.txt'), 'utf-8'));

// LSAD 含义：57=CDP, 25=city, 43=town, 62=borough 等；FUNCSTAT A=active
const KEEP_LSAD = new Set(['25', '43', '57', '62', '55', '61']);
function cleanName(name, lsad) {
  // 去掉 " city", " town", " CDP", " borough" 等后缀，保留原名备查
  return name.replace(/\s+(city|town|CDP|borough|village|municipality)$/i, '').trim();
}

const places = [];
const seenId = new Set();
for (const r of placeRows) {
  if (!KEEP_LSAD.has(r.LSAD)) continue;
  if (r.FUNCSTAT !== 'A' && r.FUNCSTAT !== 'S') continue;
  const id = `geo-${r.GEOID}`;
  if (seenId.has(id)) continue;
  seenId.add(id);
  const lat = parseFloat(r.INTPTLAT), lng = parseFloat(r.INTPTLONG);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
  places.push({
    id,
    geoid: r.GEOID,
    usps: r.USPS,
    englishName: cleanName(r.NAME, r.LSAD),
    englishFull: r.NAME,
    lsad: r.LSAD,
    funcstat: r.FUNCSTAT,
    latitude: lat,
    longitude: lng,
    chineseName: null,
    chineseNameStatus: 'pending',
    hasPage: false,
  });
}

writeFileSync(join(dataDir, 'geo-states.json'), JSON.stringify(states, null, 2));
writeFileSync(join(dataDir, 'geo-places.json'), JSON.stringify(places));
console.log(`states: ${states.length}, places: ${places.length}`);

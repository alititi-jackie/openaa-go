#!/usr/bin/env node
/**
 * Validate local links and in-page fragments in every guides HTML file.
 * External URLs are intentionally not fetched; this checks repository-local targets.
 */
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const guidesRoot = path.join(repoRoot, "guides");
const baseHost = "go.openaa.com";
const ignoredSchemes = /^(?:mailto:|tel:|sms:|javascript:|data:|blob:|#)/i;
const errors = [];
let checkedPages = 0;
let checkedLinks = 0;

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.isFile() && entry.name.toLowerCase().endsWith(".html") ? [full] : [];
  });
}

function decodeEntities(value) {
  return value.replace(/&amp;/g, "&").replace(/&#0*39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

function getIds(html) {
  const ids = new Set();
  for (const match of html.matchAll(/\b(?:id|name)\s*=\s*(["'])(.*?)\1/gi)) ids.add(decodeEntities(match[2]));
  return ids;
}

function normalizeLocalTarget(raw, sourceFile) {
  let value = decodeEntities(raw.trim());
  if (!value || ignoredSchemes.test(value)) return null;
  let url;
  try {
    url = new URL(value, "https://" + baseHost + "/" + path.relative(repoRoot, sourceFile).split(path.sep).join("/"));
  } catch {
    errors.push(path.relative(repoRoot, sourceFile) + ": invalid URL " + raw);
    return null;
  }
  if (url.hostname !== baseHost) return null;
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); }
  catch { errors.push(path.relative(repoRoot, sourceFile) + ": invalid URL encoding " + raw); return null; }
  pathname = pathname.replace(/^\/+/, "");
  if (!pathname) pathname = "index.html";
  const candidates = [];
  const target = path.resolve(repoRoot, pathname);
  if (!target.startsWith(repoRoot + path.sep) && target !== repoRoot) {
    errors.push(path.relative(repoRoot, sourceFile) + ": path escapes repository in " + raw);
    return null;
  }
  candidates.push(target);
  if (!path.extname(target)) {
    candidates.push(path.join(target, "index.html"));
    candidates.push(target + ".html");
  }
  const found = candidates.find(candidate => {
    try { return fs.statSync(candidate).isFile(); } catch { return false; }
  });
  if (!found) {
    errors.push(path.relative(repoRoot, sourceFile) + ": missing local target " + raw + " (resolved to " + pathname + ")");
    return null;
  }
  return { file: found, fragment: url.hash ? decodeURIComponent(url.hash.slice(1)) : "" };
}

for (const file of walk(guidesRoot)) {
  checkedPages++;
  const html = fs.readFileSync(file, "utf8");
  const ids = getIds(html);
  const attrs = [...html.matchAll(/\b(href|src|poster)\s*=\s*(["'])(.*?)\2/gi)];
  for (const match of attrs) {
    checkedLinks++;
    const target = normalizeLocalTarget(match[3], file);
    if (!target) continue;
    if (target.fragment) {
      const targetHtml = target.file.toLowerCase().endsWith(".html") ? fs.readFileSync(target.file, "utf8") : null;
      if (target.file === file) {
        if (!ids.has(target.fragment)) errors.push(path.relative(repoRoot, file) + ": missing in-page fragment #" + target.fragment);
      } else if (targetHtml && !getIds(targetHtml).has(target.fragment)) {
        errors.push(path.relative(repoRoot, file) + ": target " + path.relative(repoRoot, target.file) + " has no fragment #" + target.fragment);
      }
    }
  }
}

console.log("Guide HTML pages checked: " + checkedPages);
console.log("Local href/src/poster links checked: " + checkedLinks);
console.log("Broken local links/fragments: " + errors.length);
for (const error of errors) console.error("ERROR " + error);
if (errors.length) process.exit(1);

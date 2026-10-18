#!/usr/bin/env node
/**
 * Generate both public sitemaps from the actual guide HTML and Git history.
 * The root sitemap keeps non-guide URLs already maintained by the repository.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const repoRoot = process.cwd();
const guidesRoot = path.join(repoRoot, "guides");
const baseUrl = "https://go.openaa.com";
const sitemapNamespace = "http://www.sitemaps.org/schemas/sitemap/0.9";

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.isFile() && entry.name.toLowerCase().endsWith(".html") ? [full] : [];
  });
}

function xmlEscape(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function lastModified(relativePath) {
  try {
    const value = execFileSync("git", ["log", "-1", "--format=%cs", "--", relativePath], { cwd: repoRoot, encoding: "utf8" }).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  } catch (error) {
    console.warn("WARN: Unable to read Git history for " + relativePath);
  }
  throw new Error("Missing Git last-modified date for " + relativePath + "; ensure checkout fetch-depth is 0.");
}

function readGuidePages() {
  return walk(guidesRoot).map(file => {
    const relativePath = path.relative(repoRoot, file).split(path.sep).join("/");
    const html = fs.readFileSync(file, "utf8");
    const canonicalMatches = [...html.matchAll(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/gi)];
    if (canonicalMatches.length !== 1) throw new Error(relativePath + " must have exactly one canonical URL.");
    const url = canonicalMatches[0][1];
    if (!url.startsWith(baseUrl + "/")) throw new Error(relativePath + " has an unexpected canonical URL: " + url);
    return { relativePath, url, lastmod: lastModified(relativePath), isIndex: relativePath === "guides/index.html" };
  }).sort((a, b) => a.url.localeCompare(b.url));
}

function urlEntry(page) {
  const priority = page.isIndex ? "1.0" : "0.8";
  return [
    "  <url>",
    "    <loc>" + xmlEscape(page.url) + "</loc>",
    "    <lastmod>" + page.lastmod + "</lastmod>",
    "    <changefreq>weekly</changefreq>",
    "    <priority>" + priority + "</priority>",
    "  </url>"
  ].join("\n");
}

function buildUrlset(entries) {
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="' + sitemapNamespace + '">\n' + entries.join("\n") + "\n</urlset>\n";
}

if (!fs.existsSync(guidesRoot)) throw new Error("guides directory not found.");
const pages = readGuidePages();
if (pages.length === 0) throw new Error("No guide HTML pages found.");
const urls = pages.map(page => page.url);
if (new Set(urls).size !== urls.length) throw new Error("Duplicate canonical URLs found in guides.");

const guideEntries = pages.map(urlEntry);
fs.writeFileSync(path.join(guidesRoot, "sitemap.xml"), buildUrlset(guideEntries), "utf8");

const rootSitemapPath = path.join(repoRoot, "sitemap.xml");
const rootSource = fs.readFileSync(rootSitemapPath, "utf8");
const existingEntries = [...rootSource.matchAll(/<url\b[^>]*>[\s\S]*?<\/url>/gi)].map(match => match[0]);
const nonGuideEntries = existingEntries.filter(entry => {
  const loc = entry.match(/<loc>([\s\S]*?)<\/loc>/i);
  return loc && !loc[1].trim().startsWith(baseUrl + "/guides/");
});
const nonGuideUrls = nonGuideEntries.map(entry => entry.match(/<loc>([\s\S]*?)<\/loc>/i)[1].trim());
const mergedUrls = [...nonGuideUrls, ...urls];
if (new Set(mergedUrls).size !== mergedUrls.length) throw new Error("Duplicate URLs found while merging the root sitemap.");
fs.writeFileSync(rootSitemapPath, buildUrlset([...nonGuideEntries, ...guideEntries]), "utf8");

console.log("Guide pages added to guides/sitemap.xml: " + pages.length);
console.log("Root sitemap URLs: " + mergedUrls.length + " (non-guide " + nonGuideUrls.length + ", guides " + pages.length + ")");

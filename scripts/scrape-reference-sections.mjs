#!/usr/bin/env node
/* biome-ignore-all lint/suspicious/noConsole: scraper progress output. */
/**
 * Fetches top-level Living Valley reference pages and generates HTML assets for
 * the /rules reference sections.
 *
 * Run: node scripts/scrape-reference-sections.mjs
 */

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "https://thelivingvalley.earthbornegames.com";
const OUTPUT_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "frontend",
  "src",
  "assets",
);

const SECTIONS = [
  {
    output: "campaign-guides.html",
    path: "/docs/category/campaign-guides/",
    title: "Campaign Guides",
  },
  {
    output: "one-day-missions.html",
    path: "/docs/one_day_missions/",
    title: "One-Day Missions",
  },
  {
    output: "updates.html",
    path: "/docs/category/updates/",
    title: "Updates",
  },
  {
    output: "faq.html",
    path: "/docs/faq/",
    title: "FAQ",
  },
];

function extractPage(html, section) {
  const title = extractTitle(html) ?? section.title;
  const main = extractTag(html, "main") ?? html;
  const headerIndex = main.indexOf("<header");
  const pageContent = headerIndex >= 0 ? main.slice(headerIndex) : main;
  const body = sanitize(pageContent, section.path);

  return {
    title,
    body: `<div class="longform rules" id="rules">
  <h2 id="${sectionId(section.output)}">${escapeHtml(title)}</h2>
${body}
</div>`,
    toc: `<nav class="toc" id="toc">
  <ul>
    <li><a href="#${sectionId(section.output)}">${escapeHtml(title)}</a></li>
  </ul>
</nav>`,
  };
}

function extractTag(html, tag) {
  const match = html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  return match?.[1] ?? null;
}

function extractTitle(html) {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
  return h1?.[1].replace(/<[^>]+>/g, "").trim() ?? null;
}

function sanitize(html, sourcePath) {
  let content = html;

  content = content.replace(/<!--\s*-->/g, " ");
  content = content.replace(/<footer[\s\S]*$/g, "");
  content = content.replace(
    /<nav[^>]*class="[^"]*breadcrumbs[^"]*"[\s\S]*?<\/nav>/g,
    "",
  );
  content = content.replace(
    /<nav[^>]*aria-label="Docs pages"[\s\S]*?<\/nav>/g,
    "",
  );
  content = content.replace(/<nav[\s\S]*?<\/nav>/g, "");
  content = content.replace(/<svg[\s\S]*?<\/svg>/g, "");
  content = content.replace(/<img[^>]*\/?>/g, "");
  content = content.replace(/<button[^>]*>[\s\S]*?<\/button>/g, "");
  content = content.replace(/<h1[^>]*>[\s\S]*?<\/h1>/g, "");
  content = content.replace(/<h6/g, "<h6").replace(/<\/h6>/g, "</h6>");
  content = content.replace(/<h5/g, "<h6").replace(/<\/h5>/g, "</h6>");
  content = content.replace(/<h4/g, "<h5").replace(/<\/h4>/g, "</h5>");
  content = content.replace(/<h3/g, "<h5").replace(/<\/h3>/g, "</h5>");
  content = content.replace(/<h2/g, "<h4").replace(/<\/h2>/g, "</h4>");
  content = content.replace(/\s+class="[^"]*"/g, "");
  content = content.replace(/\s+id="[^"]*"/g, "");
  content = content.replace(/\s+style="[^"]*"/g, "");
  content = content.replace(/\s+title="[^"]*"/g, "");
  content = content.replace(/\s+data-[a-z-]+=(?:"[^"]*"|'[^']*')/g, "");
  content = content.replace(/\s+aria-[a-z-]+=(?:"[^"]*"|'[^']*')/g, "");
  content = content.replace(/\s+item[a-zA-Z]+=(?:"[^"]*"|'[^']*')/g, "");
  content = content.replace(/\s+role=(?:"[^"]*"|'[^']*')/g, "");
  content = content.replace(/<meta[^>]*>/g, "");
  content = content.replace(/<span[^>]*>/g, "").replace(/<\/span>/g, "");
  content = content.replace(/<div[^>]*>/g, "").replace(/<\/div>/g, "");
  content = content.replace(/\u{1F5C3}\uFE0F|\u{1F4C4}\uFE0F/gu, "");
  content = content.replace(/<h4>\s+/g, "<h4>");
  content = content.replace(/<header>\s*<\/header>/g, "");
  content = absolutizeLinks(content, sourcePath);
  content = content.replace(/<a[^>]*>\s*<\/a>/g, "");
  content = content.replace(/\n{3,}/g, "\n\n").trim();

  return content;
}

function absolutizeLinks(html, sourcePath) {
  return html.replace(/href="([^"]+)"/g, (_, href) => {
    if (href.startsWith("http") || href.startsWith("#")) {
      return `href="${href}"`;
    }

    if (href.startsWith("/")) {
      return `href="${BASE}${href}"`;
    }

    const url = new URL(sourcePath, BASE);
    return `href="${new URL(href, url).toString()}"`;
  });
}

function sectionId(output) {
  return output.replace(".html", "");
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function fetchPage(path) {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "user-agent": "Mozilla/5.0 earthborne.build reference scraper",
    },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${path}`);
  }

  return res.text();
}

async function main() {
  for (const section of SECTIONS) {
    console.log(`Fetching ${section.title}...`);
    const html = await fetchPage(section.path);
    const page = extractPage(html, section);
    const output = `${page.toc}\n<!-- BEGIN RULES -->\n${page.body}\n`;
    const path = join(OUTPUT_DIR, section.output);
    writeFileSync(path, output, "utf8");
    console.log(`Wrote ${path}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

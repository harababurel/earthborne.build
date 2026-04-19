#!/usr/bin/env node
/* biome-ignore-all lint/suspicious/noConsole: scraper progress output. */
/**
 * Fetches Living Valley reference pages and generates HTML assets for /rules.
 *
 * Run: node scripts/scrape-reference-sections.mjs
 */

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseHtml } from "node-html-parser";
import {
  cachedFetchText,
  createCache,
  parseCacheArgs,
} from "./lib/scraper-cache.mjs";

const BASE = "https://thelivingvalley.earthbornegames.com";
const OUTPUT_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "frontend",
  "src",
  "assets",
);
const CONCURRENCY = 6;
const FETCH_TIMEOUT_MS = 15_000;

const SECTIONS = [
  {
    output: "campaign-guides.html",
    roots: ["/docs/category/campaign-guides/"],
    title: "Campaign Guides",
    include: [
      "/docs/category/campaign-guides",
      "/docs/category/lure-of-the-valley",
      "/docs/category/spire-in-bloom",
      "/docs/category/shadow-of-the-storm",
      "/docs/category/legacy-of-the-ancestors",
      "/docs/campaign_guides/",
    ],
  },
  {
    output: "one-day-missions.html",
    roots: ["/docs/one_day_missions/"],
    title: "One-Day Missions",
    include: ["/docs/one_day_missions/"],
  },
  {
    output: "updates.html",
    roots: ["/docs/category/updates/"],
    title: "Updates",
    include: [
      "/docs/category/updates",
      "/docs/category/card-errata",
      "/docs/category/campaign-guide-errata",
      "/docs/category/campaign-guide-errata---",
      "/docs/updates/",
      "/docs/errata/",
    ],
  },
  {
    output: "faq.html",
    roots: ["/docs/faq/"],
    title: "FAQ",
    include: ["/docs/faq"],
  },
];

async function crawlSection(section, cache) {
  const queue = section.roots.map(normalizePath);
  const queued = new Set(queue);
  const order = new Map(queue.map((path, index) => [path, index]));
  const pages = [];
  let navTree = null;
  let nextOrder = queue.length;

  async function worker() {
    while (queue.length) {
      const path = queue.shift();
      const { html, fromCache } = await fetchPage(path, cache);
      const root = parseHtml(html);
      const page = extractPage(root, path);
      const officialNavTree = extractOfficialNavTree(root, section.title);

      if (officialNavTree) {
        navTree = mergeNavTrees(navTree, officialNavTree);
      }

      pages.push(page);
      const prefix = fromCache
        ? "[H]"
        : cache.mode === "bypass"
          ? "[B]"
          : cache.mode === "refresh"
            ? "[R]"
            : "[M]";
      console.log(`  ${prefix} ${pages.length}. ${page.title}`);

      for (const href of extractDocLinks(root)) {
        const next = normalizePath(href);
        if (
          next &&
          isIncluded(next, section.include) &&
          !queued.has(next) &&
          !isSelfLink(next, path)
        ) {
          queued.add(next);
          order.set(next, nextOrder);
          nextOrder++;
          queue.push(next);
        }
      }
    }
  }

  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      await worker();
    }),
  );

  return {
    navTree,
    pages: pages.sort((a, b) => order.get(a.path) - order.get(b.path)),
  };
}

function extractPage(root, path) {
  const title = extractTitle(root) ?? pathTitle(path);
  const article = extractArticleNode(root);
  const body = article ? sanitize(article, path) : "";
  return { body, id: pathId(path), path: normalizePath(path), title };
}

function extractArticleNode(root) {
  const indexPage = root.querySelector(".generatedIndexPage_vN6x");
  if (indexPage) return indexPage;

  return (
    root.querySelector("main article") ??
    root.querySelector("article") ??
    root.querySelector("header") ??
    null
  );
}

function extractTitle(root) {
  const text = root.querySelector("h1")?.text?.trim();
  return text ? decodeHtml(text) : null;
}

function extractDocLinks(root) {
  return root
    .querySelectorAll("a[href]")
    .map((a) => normalizePath(a.getAttribute("href")))
    .filter((path) => path?.startsWith("/docs/"));
}

function sanitize(article, sourcePath) {
  // Remove UI chrome inside the article
  for (const el of article.querySelectorAll("footer, svg, button, h1")) {
    el.remove();
  }
  for (const el of article.querySelectorAll("nav")) {
    el.remove();
  }

  // Absolutize image src and keep only src + alt
  for (const img of article.querySelectorAll("img")) {
    const src = img.getAttribute("src") ?? "";
    const abs = toAbsoluteUrl(src, sourcePath);
    if (!abs) {
      img.remove();
      continue;
    }
    const alt = img.getAttribute("alt") ?? "";
    for (const key of Object.keys(img.attributes)) {
      img.removeAttribute(key);
    }
    img.setAttribute("src", abs);
    if (alt) img.setAttribute("alt", alt);
  }

  // Absolutize links
  for (const a of article.querySelectorAll("a[href]")) {
    const href = a.getAttribute("href") ?? "";
    if (
      !href.startsWith("http") &&
      !href.startsWith("#") &&
      !href.startsWith("mailto:")
    ) {
      const abs = toAbsoluteUrl(href, sourcePath);
      if (abs) a.setAttribute("href", abs);
    }
  }

  // Convert Docusaurus admonitions to blockquotes before stripping classes
  for (const adm of article.querySelectorAll('[class*="admonition"]')) {
    if (adm.tagName === "BLOCKQUOTE") continue;
    const contentEl = adm.querySelector('[class*="admonition-content"]') ?? adm;
    const bqNode = parseHtml(
      `<blockquote class="admonition">${contentEl.innerHTML}</blockquote>`,
    ).firstChild;
    if (bqNode) adm.replaceWith(bqNode);
  }

  for (const sec of article.querySelectorAll('section[class*="row"]')) {
    sec.setAttribute("class", "category-list");
  }

  for (const p of article.querySelectorAll("p")) {
    if (/^[A-Z]\)\s/.test(p.textContent.trim())) {
      p.setAttribute("class", "rules-option");
    }
  }

  for (const h of article.querySelectorAll("h5, h6")) {
    if (h.textContent.includes("READ THE ENTRY")) {
      h.setAttribute("class", "rules-conditional");
    }
  }

  // Strip attributes (preserve href on anchors, src/alt on images, class="admonition" on blockquotes)
  for (const el of article.querySelectorAll("*")) {
    if (el.tagName === "IMG") continue;

    if (el.tagName === "A") {
      const href = el.getAttribute("href");
      const id = el.getAttribute("id");
      for (const key of Object.keys(el.attributes)) {
        el.removeAttribute(key);
      }
      if (href) el.setAttribute("href", href);
      if (id) el.setAttribute("id", id);
      continue;
    }

    let keepClass = false;
    if (
      el.tagName === "BLOCKQUOTE" &&
      el.getAttribute("class") === "admonition"
    )
      keepClass = true;
    if (
      el.tagName === "SECTION" &&
      el.getAttribute("class") === "category-list"
    )
      keepClass = true;
    if (el.tagName === "P" && el.getAttribute("class") === "rules-option")
      keepClass = true;
    if (
      (el.tagName === "H5" || el.tagName === "H6") &&
      el.getAttribute("class") === "rules-conditional"
    )
      keepClass = true;

    for (const key of Object.keys(el.attributes)) {
      if (key === "id") continue;
      if (key === "class" && keepClass) continue;
      el.removeAttribute(key);
    }
  }

  // Remove empty anchors
  for (const a of article.querySelectorAll("a")) {
    if (!a.text.trim() && !a.querySelector("img")) a.remove();
  }

  // Unwrap spans, then divs (reverse = children before parents)
  for (const el of [...article.querySelectorAll("span")].reverse()) {
    el.replaceWith(...el.childNodes);
  }
  for (const el of [...article.querySelectorAll("div")].reverse()) {
    el.replaceWith(...el.childNodes);
  }

  let content = article.innerHTML;

  // Replace Living Valley PUA icon characters with core font spans.
  // Codepoints identified by cross-referencing the scraped text context with
  // the EBR game symbols and our icons-core.css definitions.
  content = content
    .replaceAll("\ue010", '<span class="core-reason"></span>')
    .replaceAll("\ue011", '<span class="core-conflict"></span>')
    .replaceAll("\ue012", '<span class="core-connection"></span>')
    .replaceAll("\ue013", '<span class="core-exploration"></span>')
    .replaceAll("\ue015", '<span class="core-harm"></span>')
    .replaceAll("\ue016", '<span class="core-progress"></span>')
    .replaceAll("\ue017", '<span class="core-crest"></span>')
    .replaceAll("\ue018", '<span class="core-mountain"></span>')
    .replaceAll("\ue019", '<span class="core-sun"></span>')
    .replaceAll("\ue01a", '<span class="core-reshuffle"></span>')
    .replaceAll("\ue01b", '<span class="core-conditional"></span>')
    .replaceAll("\ue01c", '<span class="core-guide"></span>')
    .replaceAll("\ue01d", '<span class="core-per_ranger"></span>');

  // Color EBR stat keywords using the same classes as card text.
  content = content
    .replace(/\bAwareness\b/g, '<b class="color-AWA">Awareness</b>')
    .replace(/\bFitness\b/g, '<b class="color-FIT">Fitness</b>')
    .replace(/\bFocus\b/g, '<b class="color-FOC">Focus</b>')
    .replace(/\bSpirit\b/g, '<b class="color-SPI">Spirit</b>');

  // Heading normalization (shift down 2 levels; h1 already removed, page title uses h3)
  content = content
    .replace(/<h5([^>]*)>/g, "<h6$1>")
    .replace(/<\/h5>/g, "</h6>");
  content = content
    .replace(/<h4([^>]*)>/g, "<h6$1>")
    .replace(/<\/h4>/g, "</h6>");
  content = content
    .replace(/<h3([^>]*)>/g, "<h5$1>")
    .replace(/<\/h3>/g, "</h5>");
  content = content
    .replace(/<h2([^>]*)>/g, "<h4$1>")
    .replace(/<\/h2>/g, "</h4>");

  // Fix malformed nesting (safety net for edge cases)
  content = content.replace(/<p><em><p>/g, "<p><em>");
  content = content.replace(/<\/p><\/em><\/p>/g, "</em></p>");
  content = content.replace(/<p><p><strong>/g, "<p><strong>");
  content = content.replace(/<strong><p>/g, "<p><strong>");
  content = content.replace(/<\/p><\/strong>/g, "</strong></p>");
  content = content.replace(/<\/p><\/strong><\/p>/g, "</strong></p>");

  // Trim leading whitespace in headings
  content = content.replace(/<h4>\s+/g, "<h4>");

  // Remove empty header elements
  content = content.replace(/<header>\s*<\/header>/g, "");

  // Collapse whitespace
  content = content.replace(/\n{3,}/g, "\n\n").trim();

  return content;
}

function toAbsoluteUrl(url, sourcePath) {
  if (!url) return null;
  if (url.startsWith("data:")) return url;
  if (url.startsWith("http")) return url;
  if (url.startsWith("/")) return `${BASE}${url}`;
  try {
    return new URL(url, `${BASE}${sourcePath}`).toString();
  } catch {
    return null;
  }
}

function rewriteInternalLinks(html, pageIds) {
  return html.replace(/href="([^"]+)"/g, (_, href) => {
    const path = normalizePath(href);
    if (path && pageIds.has(path)) return `href="#${pageIds.get(path)}"`;
    return `href="${href}"`;
  });
}

function buildToc(section, pages, navTree) {
  if (section.output === "campaign-guides.html" && navTree) {
    return buildOfficialToc(navTree, pages);
  }

  const items = groupTocPages(section, pages)
    .map((group) => {
      const links = group.pages
        .map(
          (page) =>
            `        <li><a href="#${page.id}">${replacePuaHtml(escapeHtml(page.title))}</a></li>`,
        )
        .join("\n");

      return `    <li>
      <details open>
        <summary><a href="#${group.id}">${replacePuaHtml(escapeHtml(group.title))}</a></summary>
        <ul>
${links}
        </ul>
      </details>
    </li>`;
    })
    .join("\n");

  return `<nav class="toc" id="toc">
  <ul>
${items}
  </ul>
</nav>`;
}

function buildOfficialToc(navTree, pages) {
  const pageIds = new Map(pages.map((page) => [page.path, page.id]));

  return `<nav class="toc" id="toc">
  <ul>
${renderOfficialTocNode(navTree, pageIds, 2)}
  </ul>
</nav>`;
}

function renderOfficialTocNode(node, pageIds, depth) {
  const indent = "  ".repeat(depth);
  const id = pageIds.get(node.path) ?? pathId(node.path);
  const children = node.children
    .filter((child) => child.path)
    .map((child) => renderOfficialTocNode(child, pageIds, depth + 2))
    .join("\n");

  if (!children) {
    return `${indent}<li><a href="#${id}">${replacePuaHtml(escapeHtml(node.title))}</a></li>`;
  }

  const open = depth === 2 ? " open" : "";

  return `${indent}<li>
${indent}  <details${open}>
${indent}    <summary><a href="#${id}">${replacePuaHtml(escapeHtml(node.title))}</a></summary>
${indent}    <ul>
${children}
${indent}    </ul>
${indent}  </details>
${indent}</li>`;
}

function extractOfficialNavTree(root, title) {
  const sidebar = root.querySelector('nav[aria-label="Docs sidebar"]');
  if (!sidebar) return null;
  const firstUl = sidebar.querySelector("ul");
  if (!firstUl) return null;
  const nodes = buildNavNodes(firstUl);
  return findNavNode(nodes, title);
}

function buildNavNodes(ul) {
  const nodes = [];
  for (const li of ul.childNodes.filter(
    (n) => n.nodeType === 1 && n.tagName === "LI",
  )) {
    const a = li.querySelector("a[href]");
    const childUl = li.childNodes.find(
      (n) => n.nodeType === 1 && n.tagName === "UL",
    );
    const path = normalizePath(a?.getAttribute("href"));
    const title = a ? stripTags(a.innerHTML) : "";
    if (path && title) {
      nodes.push({
        children: childUl ? buildNavNodes(childUl) : [],
        path,
        title,
      });
    }
  }
  return nodes;
}

function findNavNode(nodes, title) {
  for (const node of nodes) {
    if (node.title === title) return node;

    const child = findNavNode(node.children, title);
    if (child) return child;
  }

  return null;
}

function mergeNavTrees(left, right) {
  if (!left) return cloneNavTree(right);

  const merged = cloneNavTree(left);
  mergeNavTreeChildren(merged, right);
  return merged;
}

function mergeNavTreeChildren(target, source) {
  for (const sourceChild of source.children) {
    const targetChild = target.children.find(
      (child) =>
        child.path === sourceChild.path || child.title === sourceChild.title,
    );

    if (!targetChild) {
      target.children.push(cloneNavTree(sourceChild));
      continue;
    }

    mergeNavTreeChildren(targetChild, sourceChild);
  }
}

function cloneNavTree(node) {
  return {
    children: node.children.map(cloneNavTree),
    path: node.path,
    title: node.title,
  };
}

function groupTocPages(section, pages) {
  if (section.output === "campaign-guides.html") {
    return groupedBySegment(pages, "/docs/campaign_guides/", 3);
  }

  if (section.output === "one-day-missions.html") {
    return groupedBySegment(pages, "/docs/one_day_missions/", 3);
  }

  if (section.output === "updates.html") {
    return groupedBySegment(pages, "/docs/", 2);
  }

  return [
    {
      id: sectionId(section.output),
      pages,
      title: section.title,
    },
  ];
}

function groupedBySegment(pages, prefix, segmentIndex) {
  const groups = [];
  const groupMap = new Map();
  const introPages = [];

  for (const page of pages) {
    if (!page.path.startsWith(prefix)) {
      introPages.push(page);
      continue;
    }

    const parts = page.path.split("/");
    const slug = parts[segmentIndex];
    const id = `${prefix.replace(/^\/docs\/|\/$/g, "").replaceAll("/", "-")}-${slug}`;

    if (!groupMap.has(slug)) {
      const group = {
        id,
        pages: [],
        title: titleize(slug),
      };
      groupMap.set(slug, group);
      groups.push(group);
    }

    groupMap.get(slug).pages.push(page);
  }

  if (introPages.length) {
    groups.unshift({
      id: introPages[0].id,
      pages: introPages,
      title: "Overview",
    });
  }

  return groups;
}

function buildRules(section, pages) {
  const pageIds = new Map(pages.map((page) => [page.path, page.id]));
  const content = pages
    .map((page) => {
      const body = rewriteInternalLinks(page.body, pageIds);
      return `  <div class="rules-page" data-page-id="${page.id}">
    <h3 id="${page.id}">${replacePuaHtml(escapeHtml(page.title))}</h3>
${body}
  </div>`;
    })
    .join("\n\n");

  return `<div class="longform rules" id="rules">
  <h2 id="${sectionId(section.output)}">${escapeHtml(section.title)}</h2>

${content}
</div>`;
}

function normalizePath(href) {
  if (!href) return null;
  const url = new URL(href, BASE);
  if (!isLivingValleyHost(url.hostname)) return null;
  const path = url.pathname.replace(/\/$/, "");
  return path || "/";
}

function isLivingValleyHost(hostname) {
  return (
    hostname === "thelivingvalley.earthbornegames.com" ||
    hostname === "thelivingvalley.earthbornerangers.com"
  );
}

function isIncluded(path, prefixes) {
  return prefixes.some((prefix) => path.startsWith(prefix.replace(/\/$/, "")));
}

function isSelfLink(a, b) {
  return normalizePath(a) === normalizePath(b);
}

function pathId(path) {
  return `doc-${normalizePath(path)
    .replace(/^\/docs\//, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}`;
}

function pathTitle(path) {
  return normalizePath(path)
    .split("/")
    .at(-1)
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function decodeHtml(str) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'");
}

function stripTags(str) {
  const text = str
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text ? decodeHtml(text) : "";
}

function titleize(slug) {
  return slug
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
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

// Apply PUA → core-* span substitution to an already-HTML-escaped string.
// Called after escapeHtml() so the span tags are not double-escaped.
// Also replaces standard Unicode approximations the Living Valley nav sidebar
// uses in place of the custom-font PUA chars (▲ = progress, ✱ = harm).
function replacePuaHtml(str) {
  return str
    .replaceAll("\ue010", '<span class="core-reason"></span>')
    .replaceAll("\ue011", '<span class="core-conflict"></span>')
    .replaceAll("\ue012", '<span class="core-connection"></span>')
    .replaceAll("\ue013", '<span class="core-exploration"></span>')
    .replaceAll("\ue015", '<span class="core-harm"></span>')
    .replaceAll("\ue016", '<span class="core-progress"></span>')
    .replaceAll("\ue017", '<span class="core-crest"></span>')
    .replaceAll("\ue018", '<span class="core-mountain"></span>')
    .replaceAll("\ue019", '<span class="core-sun"></span>')
    .replaceAll("\ue01a", '<span class="core-reshuffle"></span>')
    .replaceAll("\ue01b", '<span class="core-conditional"></span>')
    .replaceAll("\ue01c", '<span class="core-guide"></span>')
    .replaceAll("\ue01d", '<span class="core-per_ranger"></span>')
    .replaceAll("\u25b2", '<span class="core-progress"></span>')
    .replaceAll("\u2731", '<span class="core-harm"></span>');
}

async function fetchPage(path, cache, retries = 3) {
  const { body, fromCache } = await cachedFetchText(`${BASE}${path}`, {
    cache,
    retries,
    timeoutMs: FETCH_TIMEOUT_MS,
    headers: {
      "user-agent": "Mozilla/5.0 earthborne.build reference scraper",
    },
  });
  return { html: body, fromCache };
}

async function main() {
  const cacheArgs = parseCacheArgs();
  const cache = createCache({ dir: cacheArgs.dir, mode: cacheArgs.mode });
  if (cacheArgs.clear) {
    await cache.clear();
    console.log(`Cleared cache at ${cache.dir}`);
  }
  console.log(`Cache mode: ${cache.mode}  ·  dir: ${cache.dir}\n`);

  for (const section of SECTIONS) {
    console.log(`Fetching ${section.title}...`);
    const { navTree, pages } = await crawlSection(section, cache);
    const toc = buildToc(section, pages, navTree);
    const rules = buildRules(section, pages);
    const output = `${toc}\n<!-- BEGIN RULES -->\n${rules}\n`;
    const path = join(OUTPUT_DIR, section.output);
    writeFileSync(path, output, "utf8");
    console.log(`Wrote ${pages.length} pages to ${path}`);
  }

  const s = cache.stats();
  console.log(
    `\nCache: ${s.hits} hits, ${s.misses} misses, ${s.errors} errors, ${s.refreshes} refreshes, ${s.bypasses} bypasses  ·  cache dir: ${cache.dir}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

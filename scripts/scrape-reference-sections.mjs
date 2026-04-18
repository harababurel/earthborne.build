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

async function crawlSection(section) {
  const queue = section.roots.map(normalizePath);
  const queued = new Set(queue);
  const order = new Map(queue.map((path, index) => [path, index]));
  const pages = [];
  let navTree = null;
  let nextOrder = queue.length;

  async function worker() {
    while (queue.length) {
      const path = queue.shift();
      const html = await fetchPage(path);
      const page = extractPage(html, path);
      const officialNavTree = extractOfficialNavTree(html, section.title);

      if (officialNavTree) {
        navTree = mergeNavTrees(navTree, officialNavTree);
      }

      pages.push(page);
      console.log(`  ${pages.length}. ${page.title}`);

      for (const href of extractDocLinks(html)) {
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

function extractPage(html, path) {
  const title = extractTitle(html) ?? pathTitle(path);
  const article = normalizePath(path).startsWith("/docs/category/")
    ? ""
    : extractArticle(html);
  const body = sanitize(article, path);

  return {
    body,
    id: pathId(path),
    path: normalizePath(path),
    title,
  };
}

function extractArticle(html) {
  const match = html.match(/<article[^>]*>([\s\S]*?)<\/article>/);
  if (match) return match[1];

  const header = html.match(/<header[^>]*>[\s\S]*?<\/header>/)?.[0] ?? "";
  return header;
}

function extractTitle(html) {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
  const title = h1?.[1].replace(/<[^>]+>/g, "").trim();
  return title ? decodeHtml(title) : null;
}

function extractDocLinks(html) {
  const links = [];
  for (const match of html.matchAll(/href="([^"]+)"/g)) {
    const path = normalizePath(match[1]);
    if (path?.startsWith("/docs/")) links.push(path);
  }
  return links;
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
  content = content.replace(/<h4/g, "<h6").replace(/<\/h4>/g, "</h6>");
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
  content = content.replace(/<p><em><p>/g, "<p><em>");
  content = content.replace(/<\/p><\/em><\/p>/g, "</em></p>");
  content = content.replace(/<p><p><strong>/g, "<p><strong>");
  content = content.replace(/<strong><p>/g, "<p><strong>");
  content = content.replace(/<\/p><\/strong>/g, "</strong></p>");
  content = content.replace(/<\/p><\/strong><\/p>/g, "</strong></p>");
  content = content.replace(/\u{1F5C3}\uFE0F|\u{1F4C4}\uFE0F/gu, "");
  content = content.replace(/<h4>\s+/g, "<h4>");
  content = content.replace(/<header>\s*<\/header>/g, "");
  content = absolutizeLinks(content, sourcePath);
  content = content.replace(/<a[^>]*>[\s\u200b​]*<\/a>/g, "");
  content = content.replace(/\n{3,}/g, "\n\n").trim();

  return content;
}

function rewriteInternalLinks(html, pageIds) {
  return html.replace(/href="([^"]+)"/g, (_, href) => {
    const path = normalizePath(href);
    if (path && pageIds.has(path)) return `href="#${pageIds.get(path)}"`;
    return `href="${href}"`;
  });
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

function buildToc(section, pages, navTree) {
  if (section.output === "campaign-guides.html" && navTree) {
    return buildOfficialToc(navTree, pages);
  }

  const items = groupTocPages(section, pages)
    .map((group) => {
      const links = group.pages
        .map(
          (page) =>
            `        <li><a href="#${page.id}">${escapeHtml(page.title)}</a></li>`,
        )
        .join("\n");

      return `    <li>
      <details open>
        <summary><a href="#${group.id}">${escapeHtml(group.title)}</a></summary>
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
    return `${indent}<li><a href="#${id}">${escapeHtml(node.title)}</a></li>`;
  }

  const open = depth === 2 ? " open" : "";

  return `${indent}<li>
${indent}  <details${open}>
${indent}    <summary><a href="#${id}">${escapeHtml(node.title)}</a></summary>
${indent}    <ul>
${children}
${indent}    </ul>
${indent}  </details>
${indent}</li>`;
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

function extractOfficialNavTree(html, title) {
  const sidebar = html.match(
    /<nav[^>]*aria-label="Docs sidebar"[^>]*>([\s\S]*?)<\/nav>/,
  )?.[1];

  if (!sidebar) return null;

  const nodes = parseSidebarNodes(sidebar);
  return findNavNode(nodes, title);
}

function parseSidebarNodes(html) {
  const root = [];
  const stack = [root];
  const tokenPattern =
    /<ul\b[^>]*>|<\/ul>|<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;

  for (const match of html.matchAll(tokenPattern)) {
    const token = match[0];

    if (token.startsWith("<ul")) {
      const current = stack.at(-1);
      const parent = current.at(-1);
      if (!parent && current.length === 0) continue;

      const children = parent?.children ?? [];
      if (parent) parent.children = children;
      stack.push(children);
      continue;
    }

    if (token === "</ul>") {
      if (stack.length > 1) stack.pop();
      continue;
    }

    const path = normalizePath(match[1]);
    const text = stripTags(match[2]);

    if (path && text) {
      stack.at(-1).push({
        children: [],
        path,
        title: text,
      });
    }
  }

  return root;
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
    <h3 id="${page.id}">${escapeHtml(page.title)}</h3>
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

async function fetchPage(path, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const res = await fetch(`${BASE}${path}`, {
        headers: {
          "user-agent": "Mozilla/5.0 earthborne.build reference scraper",
        },
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} for ${path}`);
      }

      return res.text();
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error(`Failed to fetch ${path}`);
}

async function main() {
  for (const section of SECTIONS) {
    console.log(`Fetching ${section.title}...`);
    const { navTree, pages } = await crawlSection(section);
    const toc = buildToc(section, pages, navTree);
    const rules = buildRules(section, pages);
    const output = `${toc}\n<!-- BEGIN RULES -->\n${rules}\n`;
    const path = join(OUTPUT_DIR, section.output);
    writeFileSync(path, output, "utf8");
    console.log(`Wrote ${pages.length} pages to ${path}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

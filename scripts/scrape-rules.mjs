#!/usr/bin/env node
/* biome-ignore-all lint/suspicious/noConsole: scraper progress output. */
/**
 * Fetches all EBR rules glossary entries from thelivingvalley.earthbornegames.com
 * and generates frontend/src/assets/rules.html.
 *
 * Run: node scripts/scrape-rules.mjs
 */

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "https://thelivingvalley.earthbornegames.com/docs/rules_glossary";
const BASE_ORIGIN = "https://thelivingvalley.earthbornegames.com";
const OUTPUT = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "frontend",
  "src",
  "assets",
  "rules.html",
);

const ENTRIES = {
  A: [
    "active",
    "along_the_way",
    "ambush",
    "approach_icons",
    "arcology_map",
    "area",
    "arrival",
    "artificer",
    "artisan",
    "aspects",
    "aspiration",
    "attach",
    "attachment",
    "attributes",
  ],
  B: ["backgrounds", "being"],
  C: [
    "camp",
    "campaign",
    "campaign_guide",
    "campaign_guide_icon",
    "campaign_tracker",
    "challenge_cards",
    "challenge_effects",
    "clear",
    "collection",
    "commit",
    "common_tests",
    "conciliator",
    "conduit",
    "creating_ranger_decks",
    "customizing_ranger_decks",
  ],
  D: [
    "dangerous",
    "day_track",
    "delightful_rule",
    "deployed",
    "difficulty",
    "disabled_thresholds",
    "discard",
    "disconnected",
    "dodge",
  ],
  E: [
    "effort",
    "end_the_day",
    "energy",
    "equip_value",
    "equipped",
    "exhaust",
    "expansions",
    "explorer",
  ],
  F: [
    "facedown_cards",
    "fatigue",
    "fatiguing",
    "features",
    "forager",
    "friendly",
  ],
  G: ["gear", "general_tokens", "golden_rule", "group_tests"],
  H: ["harm", "harm_threshold"],
  I: ["illumination", "in_play", "injury", "interact"],
  K: ["keywords"],
  L: [
    "lead_ranger",
    "legacy_of_the_ancestors",
    "localized_weather",
    "locations",
  ],
  M: [
    "maladies",
    "manifestation",
    "missions",
    "moments",
    "moments_in_the_valley",
    "moments_on_the_path",
    "move",
    "mulligan",
    "mycelial",
  ],
  N: ["nearby"],
  O: ["obstacle", "once_per_day"],
  P: [
    "path_attachments",
    "path_cards",
    "path_moments",
    "per_ranger",
    "persistent",
    "personalities",
    "phase_1_path_cards",
    "phase_2_ranger_turns",
    "phase_3_travel",
    "phase_4_refresh",
    "pivotal",
    "play",
    "play_area",
    "player_area",
    "powered",
    "presence",
    "progress",
    "progress_threshold",
    "prologue",
  ],
  R: [
    "ranger_cards",
    "ranger_token",
    "ready",
    "refresh",
    "reshuffle_icon",
    "resolve",
    "response",
    "rest",
    "rewards",
    "role",
    "round",
    "rules_step",
  ],
  S: [
    "scout",
    "search",
    "set_aside",
    "sets",
    "setup",
    "setup_keyword",
    "shadow_of_the_storm",
    "shaper",
    "shepherd",
    "soothe",
    "specialties",
    "spire_in_bloom",
    "spirit",
    "spirit_speaker",
    "spiritspeaking",
    "start_of_day",
    "starting_cards",
    "stewards_of_the_valley",
    "surroundings",
  ],
  T: [
    "talespinner",
    "terms",
    "terrain",
    "tests",
    "timing",
    "tokens",
    "traits",
    "travel",
    "traveler",
    "turns",
  ],
  U: ["unique", "untraversable", "use"],
  V: ["valley_map"],
  W: ["weather", "within_reach"],
  Y: ["you"],
};

function extractContent(html, letter, slug) {
  // Docusaurus puts content inside <article>
  const articleMatch = html.match(/<article[^>]*>([\s\S]*)<\/article>/);
  if (!articleMatch) {
    console.warn(`  No <article> found for ${letter}/${slug}`);
    return null;
  }

  let content = articleMatch[1];

  // Extract title from h1 (may have nested spans/anchors)
  const h1Match = content.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
  const title = h1Match
    ? h1Match[1].replace(/<[^>]+>/g, "").trim()
    : slug.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  // Remove <header> element (wraps the h1)
  content = content.replace(/<header[^>]*>[\s\S]*?<\/header>/g, "");

  // Remove pagination nav at bottom
  content = content.replace(/<nav[^>]*aria-label[^>]*>[\s\S]*?<\/nav>/g, "");
  // Docusaurus pagination wrapper
  content = content.replace(
    /<div[^>]*class="[^"]*pagination[^"]*"[^>]*>[\s\S]*$/,
    "",
  );

  // Convert internal glossary links to anchor links: /docs/rules_glossary/X/slug -> #slug
  content = content.replace(
    /href="\/docs\/rules_glossary\/[A-Z]\/([^"#?]+)(?:[#?][^"]*)?">/g,
    'href="#$1">',
  );

  // Remove all h1 tags (we supply our own h3 heading)
  content = content.replace(/<h1[^>]*>[\s\S]*?<\/h1>/g, "");

  // Remove <button> elements (Docusaurus "On this page" buttons)
  content = content.replace(/<button[^>]*>[\s\S]*?<\/button>/g, "");

  // Downgrade sub-section headings so they don't collide with letter h2s
  content = content.replace(/<h6/g, "<h6").replace(/<\/h6>/g, "</h6>");
  content = content.replace(/<h5/g, "<h6").replace(/<\/h5>/g, "</h6>");
  content = content.replace(/<h4/g, "<h5").replace(/<\/h4>/g, "</h5>");
  content = content.replace(/<h3/g, "<h5").replace(/<\/h3>/g, "</h5>");
  content = content.replace(/<h2/g, "<h4").replace(/<\/h2>/g, "</h4>");

  // Strip class, id, style attributes from all tags
  content = content.replace(/\s+class="[^"]*"/g, "");
  content = content.replace(/\s+id="[^"]*"/g, "");
  content = content.replace(/\s+style="[^"]*"/g, "");
  // Strip data-* attributes
  content = content.replace(/\s+data-[a-z-]+=(?:"[^"]*"|'[^']*')/g, "");
  // Strip aria-* attributes
  content = content.replace(/\s+aria-[a-z-]+=(?:"[^"]*"|'[^']*')/g, "");
  // Strip title attributes (heading "Direct link to" anchors)
  content = content.replace(/\s+title="[^"]*"/g, "");

  // Remove SVGs (icons/images)
  content = content.replace(/<svg[\s\S]*?<\/svg>/g, "");

  // Absolutize image src and keep only src + alt (same pattern as scrape-reference-sections.mjs)
  content = content.replace(/<img([^>]*)>/g, (_match, attrs) => {
    const srcMatch = attrs.match(/\bsrc="([^"]*)"/);
    const altMatch = attrs.match(/\balt="([^"]*)"/);
    if (!srcMatch) return "";
    const src = srcMatch[1];
    const abs = src.startsWith("http")
      ? src
      : src.startsWith("/")
        ? `${BASE_ORIGIN}${src}`
        : null;
    if (!abs) return "";
    const alt = altMatch ? ` alt="${altMatch[1]}"` : "";
    return `<img src="${abs}"${alt}>`;
  });

  // Unwrap <div> tags (strip tags, keep content) — Docusaurus wraps content in divs
  content = content.replace(/<div[^>]*>/g, "");
  content = content.replace(/<\/div>/g, "");

  // Remove <span> wrappers that are just for styling (but preserve their text)
  content = content.replace(/<span[^>]*>/g, "");
  content = content.replace(/<\/span>/g, "");

  // Remove anchor tags that contain only whitespace or zero-width chars (heading anchors)
  content = content.replace(/<a[^>]*>[\s\u200b​]*<\/a>/g, "");

  // Clean up excessive whitespace / blank lines
  content = content.replace(/\n{3,}/g, "\n\n").trim();

  // Replace Living Valley PUA icon characters with core font spans.
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

  return { title, body: content };
}

async function fetchEntry(letter, slug, retries = 3) {
  const url = `${BASE}/${letter}/${slug}`;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`  HTTP ${res.status} for ${url}`);
        return null;
      }
      const html = await res.text();
      return extractContent(html, letter, slug);
    } catch (err) {
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      } else {
        console.warn(`  Error fetching ${url}: ${err.message}`);
        return null;
      }
    }
  }
  return null;
}

function buildToc(letterResults) {
  const items = Object.entries(letterResults)
    .map(([letter, entries]) => {
      const subItems = entries
        .filter(Boolean)
        .map(
          ({ slug, title }) =>
            `        <li><a href="#${slug}">${escapeHtml(title)}</a></li>`,
        )
        .join("\n");
      return `    <li>
      <a href="#letter_${letter}">${letter}</a>
      <ul>
${subItems}
      </ul>
    </li>`;
    })
    .join("\n");

  return `<nav class="toc" id="toc">
  <ul>
${items}
  </ul>
</nav>`;
}

function buildRules(letterResults) {
  const sections = Object.entries(letterResults)
    .map(([letter, entries]) => {
      const entryHtml = entries
        .filter(Boolean)
        .map(({ slug, title, body }) => {
          return `  <h3 id="${slug}">${escapeHtml(title)}</h3>\n${body}`;
        })
        .join("\n\n");
      return `  <h2 id="letter_${letter}">${letter}</h2>\n\n${entryHtml}`;
    })
    .join("\n\n");

  return `<div class="longform rules" id="rules">\n${sections}\n</div>`;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function main() {
  console.log("Fetching EBR rules glossary entries...\n");

  const letterResults = {};
  let total = 0;
  let failed = 0;

  for (const [letter, slugs] of Object.entries(ENTRIES)) {
    console.log(`Letter ${letter} (${slugs.length} entries)`);
    const results = [];

    for (const slug of slugs) {
      process.stdout.write(`  Fetching ${slug}... `);
      const entry = await fetchEntry(letter, slug);
      if (entry) {
        results.push({ slug, ...entry });
        console.log(`OK: "${entry.title}"`);
        total++;
      } else {
        results.push(null);
        console.log("FAILED");
        failed++;
      }
      // Small delay to be polite to the server
      await new Promise((r) => setTimeout(r, 150));
    }

    letterResults[letter] = results.filter(Boolean);
  }

  console.log(`\nFetched ${total} entries, ${failed} failed.`);

  const toc = buildToc(letterResults);
  const rules = buildRules(letterResults);
  const output = `${toc}\n<!-- BEGIN RULES -->\n${rules}\n`;

  writeFileSync(OUTPUT, output, "utf8");
  console.log(`\nWrote ${output.length} bytes to ${OUTPUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

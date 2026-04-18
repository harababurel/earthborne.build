# Rules Reference Retrospective

This document summarizes the `/rules` work completed in the latest session so a future agent can pick it up without re-discovering the same context.

## Goal

The user wanted the `/rules` page to become a self-contained Earthborne Rangers reference, matching the official Living Valley documentation navigation while keeping the content hosted inside `earthborne.build`.

The final desired shape was:

- Top-level horizontal tabs for Campaign Guides, Rules Glossary, One-Day Missions, Updates, and FAQ.
- Campaign Guides navigation matching the official Living Valley sidebar.
- Official documentation content embedded locally, not linked out.
- A maintenance scraper that can regenerate the embedded reference assets.
- Campaign guide entries rendered as individual internal pages, not one very long document.
- Non-leaf navigation items collapsible because Campaign Guides has many entries.

## Commits

Two commits were created and pushed to `main`:

- `79f41f2f Embed Living Valley reference docs`
- `6c2dd4ac Render reference docs as individual pages`

## Main Files

- `scripts/scrape-reference-sections.mjs`
- `frontend/src/pages/rules-reference/rules-reference.tsx`
- `frontend/src/pages/rules-reference/rules-reference.css`
- `frontend/src/assets/campaign-guides.html`
- `frontend/src/assets/one-day-missions.html`
- `frontend/src/assets/updates.html`
- `frontend/src/assets/faq.html`
- `frontend/src/assets/rules.html`
- `frontend/src/locales/en.json`
- `frontend/README.md`
- `docs/adaptation-plan.md`

## What Changed

The scraper now crawls Living Valley docs and generates local HTML assets for the `/rules` tabs. Campaign Guides is the largest generated asset, with roughly 983 scraped pages at the time of this work.

The Campaign Guides table of contents is not inferred from URL segments anymore. The scraper parses and merges the official Docusaurus sidebar from crawled pages, which preserves the official structure:

- Campaign Guides
- Lure of the Valley
- Spire in Bloom
- Shadow of the Storm
- Legacy of the Ancestors

Nested campaign entries are kept under their official parent nodes.

The generated TOC now uses native `<details>` and `<summary>` for non-leaf nodes. The top Campaign Guides root starts open, while deeper branches start collapsed.

The generated content now wraps each scraped page in:

```html
<div class="rules-page" data-page-id="...">
  <h3 id="...">...</h3>
  ...
</div>
```

The React page parses these generated wrappers into a map and renders only the selected page based on the current hash. This avoids rendering the full campaign guide text at once.

## Important Bug Found

An earlier version used `<article class="rules-page">` as the generated page wrapper. Some official category pages include card grids that also use `<article>` elements. Nested `<article>` markup is invalid and caused the browser parser to fold later pages into earlier page wrappers.

The symptom was that selecting a small entry like `2. Lone Tree Station` still displayed a huge amount of Campaign Guides text.

The fix was:

- Use `<div class="rules-page">` for generated page wrappers.
- Make category pages title-only in generated content, because category landing pages were mostly navigation/card grids and could introduce more invalid or noisy markup.

After the fix, the generated `2. Lone Tree Station` block contains only its heading and the one official paragraph.

## UI Behavior

The `/rules` route still uses top tabs. Each tab lazy-loads its corresponding generated HTML asset using dynamic raw imports.

The left navigation is injected from the generated TOC. Clicking a nav link updates the hash. The React view reads the hash and renders the matching `.rules-page` only.

Search now filters the navigation tree rather than trying to hide/show sections inside one huge document.

On hash changes, the page clears search, closes the mobile TOC, and scrolls to the top.

## Verification Run

These commands passed before the final commit:

```sh
npx biome check scripts/scrape-reference-sections.mjs frontend/src/pages/rules-reference/rules-reference.tsx frontend/src/pages/rules-reference/rules-reference.css
npm run check -w frontend
npm run build -w frontend
```

The Vite build still warns that `campaign-guides` is a large lazy-loaded chunk. That is expected because the embedded Campaign Guides content is large. The main `rules-reference` route chunk remains small.

## Maintenance Workflow

To refresh embedded Living Valley docs:

```sh
node scripts/scrape-reference-sections.mjs
```

Then verify:

```sh
npx biome check scripts/scrape-reference-sections.mjs frontend/src/pages/rules-reference/rules-reference.tsx frontend/src/pages/rules-reference/rules-reference.css
npm run check -w frontend
npm run build -w frontend
```

If generated HTML changes significantly, spot-check:

- `frontend/src/assets/campaign-guides.html`
- The `2. Lone Tree Station` generated block
- The Campaign Guides TOC root and first-level campaign sections
- Category pages, to ensure they remain title-only

## Known Caveats

The scraper still uses regex-oriented HTML extraction and cleanup. This has worked for the current Living Valley output, but a structured HTML parser would be more robust if the official site changes markup substantially.

The generated HTML assets are intentionally committed. This makes the app self-contained but creates large diffs when the official documentation changes.

Campaign Guides is embedded as one lazy-loaded asset and parsed client-side into individual pages. This solves the user experience issue, but it does not split each guide entry into a separate network chunk.

The official source content includes some specialized symbols and occasionally malformed markup. The current sanitizer handles the known cases needed for build/runtime behavior, but avoid running broad HTML formatters across generated assets unless you are prepared to fix source-site markup issues.


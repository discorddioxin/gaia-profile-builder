# Gaia-First Code Generation & Profile Scraping

This document describes how the builder now honours `docs/GAIA_PROFILE_HTML_SPEC.md`
when it generates HTML/CSS, when it lists editor components, and when it scrapes
an existing GaiaOnline V2 profile.

## 1. Code generation is Gaia-first

`src/utils/gaiaSpec.ts` is the single source of truth for every supported V2
section. `transpileProfile()` (`src/utils/bbcodeTranspiler.ts`) produces:

| Output | What it contains |
| --- | --- |
| `columnsHtml` | A real `<div id="columns">` with `#column_1`, `#column_2`, `#column_3` (`class="column focus_column"`) and one `.panel` per component, in the column it belongs to. |
| `css` | Rules authored against Gaia selectors only: `#columns`, `#columns .column`, `.panel`, per-kind panel CSS (`.comments_panel dt`, `.equipped_list_panel .item`, `.details_panel img.details_avatar`, …) and per-instance overrides keyed on `#id_comments`, `#id_details`, and so on. |
| `fullDocument` | `<!doctype html>` shell with `<meta charset>`, `<meta name="viewport" content="width=1000, initial-scale=1">`, the `<style>` block and the `#columns` markup. |
| `bbcode` | Emitted **only when needed** (see below). |

Key rules enforced by the generator:

- `#columns` owns layout — panels are never absolutely positioned at body level.
- Panels keep the spec's shared contract: `.panel COMPONENT_CLASS` + `id` + `h2`
  title + `.clear`.
- Freeform canvas elements are still supported, but they are wrapped in a real
  `.panel.custom_panel` (`#id_custom_####` / `#custom_####_content`) so the
  exported profile always remains inside the V2 column layout.
- Panel width is never hard-coded; the column controls reflow.
- `data-bb-*` editor attributes are never exported.

## 2. BBCode is sparse by design

BBCode is treated as a fallback for content Gaia only accepts through a BBCode
field:

- `Signature` and `Comments` payloads (`bbcodeRequired` on the component def).
- Freeform content made of quote / code / image / link / YouTube / `[clear ]`
  elements when the profile has **no** Gaia panels at all.

Everywhere else the BBCode tab states *"BBCode not needed for this profile"* and
explains why. When BBCode *is* needed and panels exist, only the payloads are
emitted (the CSS travels in the CSS tab); when the profile is freeform-only the
`[style] … [/style]` block is included because it is the only channel left.

## 3. Every category is a first-class editor component

`GAIA_COMPONENT_LIST` drives the Dock panel palette for **all** profiles:

| Category | Components |
| --- | --- |
| Identity | Details, Equipped List |
| Social | Contact, Comments, Recent Visitors, Friends |
| Activity | Forums, House, Store, Badges, Wish List |
| Content | Signature, About, Journal |
| Layout | Custom Panel |

- Imported (editable canvas) profiles insert the real panel DOM.
- Freeform profiles create a `gaia-panel` element that carries the same
  structure, renders the component preview on canvas, exposes category / column
  / title controls in the properties panel, and generates the same V2 markup.

## 4. Scraping: stylesheets, components and the background

`importProfileFromUrl()` / `importProfileFromHtml()` now:

1. Fetch every `<link rel="stylesheet">` in `<head>` order through the proxy
   chain (also for pasted HTML when a source URL is provided).
2. Parse all `<style>` blocks in `<head>` **and** `<body>`.
3. Detect the profile surface — the background is usually a *style*, not an
   `<img>`:
   - `background` / `background-image` / `background-color` / `-repeat` /
     `-size` / `-position` / `-attachment` in CSS rules that target
     `html`, `body`, `#viewer`, `html body`, `body#viewer`, `*`;
   - inline `style="…"` on `<html>`, `<body>`, `#viewer`;
   - the legacy `background="…"` attribute.
   Relative `url(...)` values are resolved against the profile URL.
4. Append a clearly marked rescue block to the imported CSS
   (`/* Profile surface detected by BBStudio import */ html, body, body#viewer { … }`)
   so the background renders even when the original selector cannot match inside
   the editor's shadow root, or when a linked stylesheet was blocked.
5. Store the surface on `settings` (`backgroundColor`, `backgroundImage`,
   `backgroundRepeat`, `backgroundSize`, `backgroundPosition`,
   `backgroundAttachment`) so the canvas frame, the host wrapper and the shadow
   DOM all paint it.
6. Translate every detected panel into a `gaia-panel` element
   (`detectGaiaComponentKind`) and report a scrape summary:
   stylesheets found/fetched, background source, component counts per column and
   warnings. The Import dialog renders this report before you open the profile.

### Debugging the editable view

- Linked stylesheets are kept inside the shadow root, and root-level selectors
  (`body`, `body#viewer`, `html body`, …) are aliased onto `:host` /
  `body[data-bb-import-body]` when they carry background declarations.
- A `data-bb-surface-style` fallback layer is injected **before** the imported
  styles, so authored CSS always wins when it defines its own background.
- The fallback layer, editor chrome and `data-bb-*` attributes are stripped
  again during serialization, so exports stay clean.

## 5. View Code

The Code dialog has separate tabs:

- **Columns HTML** — the `#columns` structure (for imports: extracted from the
  scraped document with `data-bb-id` removed).
- **CSS (copy/paste)** — the generated or imported stylesheet.
- **BBCode** — badge shows `needed` / `not needed`.
- **Full Document** (imports only) — the untouched raw imported HTML.

Each tab has its own Copy and Download action.

## 6. Dev server & editor performance

### Preview resilience
`node_modules/` is not part of the repository snapshot, so a sandbox restart used
to leave `npm run dev` exiting immediately with `vite: not found` — which closed
the live preview. `npm run dev` now runs `scripts/ensure-deps.mjs` first, which
reinstalls dependencies only when they are missing or incomplete.

### Resource fixes (imported canvas)
The editable imported canvas used to re-render the whole app every animation
frame while a node was selected:

- `recomputeSelectionRect()` allocated a new rect object per frame, so React
  could never bail out of the update. Rects are now compared before being
  committed (`sameRect` / `sameMultiRects`), so idle frames produce no renders
  while a CSS-animated panel still keeps its outline in sync. Verified: 0 renders
  over 120 idle frames (previously ~120), and the outline still updates per frame
  for a genuinely moving element.
- The polling loop pauses while the document is actually hidden.
- `emitTree()` is fingerprinted (`treeSignature`) so ResizeObserver bursts no
  longer re-set the hierarchy tree into the parent on every layout tick.
- Layout resync listeners (linked stylesheets, images, `ResizeObserver`) are now
  attached in a dedicated effect with full teardown, instead of being added
  inside the shadow rebuild where a rebuild could leave them attached.
- Deferred resync timers are tracked, debounced in steady state, and cleared on
  unmount, so nothing fires after the canvas goes away.
- `App` passes stable `onCommit` / `onSelectNode` / `onSwitchToRaw` callbacks:
  inline lambdas changed identity every render and re-ran the canvas' listener
  effects (and its DOM observers) constantly.

## 7. View Code tree, imported-node effects and the absolute plane

### HTML tree view (View Code)
The HTML tab is a collapsible tree by default (`src/components/HtmlTreeView.tsx`),
built with `DOMParser` from the generated document: the `#columns` /
`#column_1..3` layout is expanded first (depth 3), children page in groups of
200, and rendering stops at 3000 nodes so a scraped Gaia page cannot lock the
modal. Row click highlights the matching `#id_*` selector; "structure only"
hides text nodes, and a Tree / Source toggle keeps the raw markup one click
away. The tree is presentation only — it never rewrites the generated code.

### Clip / mask / animation on imported components
Imported nodes are real scraped DOM, not builder elements, so their effects are
written as CSS instead of config:

- **Clip / Mask** — the selected imported node is adapted into the same
  `ClipConfig` / `MaskConfig` shapes the builder already uses, then
  `clip-path`, `mask-image` and `-webkit-mask-image` are written as inline
  styles through `applyEffects` (undefined patch keys are left untouched, `null`
  clears). Values are re-parsed back from the live node, so re-opening the panel
  shows the current state.
- **Animation** — `animation` is applied inline; on the `hover` trigger the rule
  is emitted into the exported `<style id="bb-effects">` block as
  `/* fx:<selector> */ #id .panel:hover { … } /* /fx */`, because a hover state
  cannot be expressed inline. Missing `@keyframes` are pulled from
  `getAnimationKeyframes()` in `src/utils/bbcodeTranspiler.ts`, so the exported
  document is self-contained.
- The effects stylesheet is marked as a head node (`HEAD_NODE_MARK`), so the
  normal export path keeps it inside `<head>` and the raw-HTML document stays
  copy/paste ready.

### Absolute plane
`makeAbsolute(bbId)` detaches a component from the column flow: it measures the
node against its nearest positioned ancestor (`findContainingBlock`), writes
`position: absolute`, `left`, `top`, `width`, `height`, `box-sizing` and a
`z-index`, and tags the node with the editor-only `data-bb-absolute` attribute
(green dashed outline). Dragging an absolute node moves it by updating its
inline `left` / `top` instead of re-parenting it into a column, so it can sit
anywhere over the profile while staying inside its Gaia column. `makeFlow(bbId)`
reverses this and re-inserts the node into the column nearest its horizontal
center. Both the `data-bb-absolute` marker and every other editor attribute are
stripped by the export path — only the positioning declarations survive.

### Where the controls live
- **Mask & Clip** tab (`shape`): imported node → clipping, masking, generated
  CSS and the positioning plane (Make Absolute / Return to Flow); authored
  element → absolute-plane coordinates (X / Y / z-index / rotate), clipping and
  masking.
- **Animation Studio** tab: imported node → the full clip/mask/animation editors
  run against the live node, with the exported rule + `@keyframes` previewed;
  authored element → the normal animation editor.
- **Props** tab: an *Effects & Plane* card jumps straight to either editor and
  toggles the absolute plane, and a right-click on the node offers
  *Make Absolute / Return to Flow* and *Clear Clip / Mask / Animation*.

**Verification** (jsdom harnesses in `.tmp/`, built with
`./node_modules/.bin/esbuild <file> --bundle --platform=node --format=esm --jsx=automatic --external:jsdom`,
then run with `node`):
- `effects-smoke` — clip/mask/animation round-tripping, hover-rule + keyframe
  emission, absolute/flow transitions, editor-marker stripping on export and the
  render of every new panel: **26/26**.
- `tree-smoke` — tree parsing, initial expansion, structure-only mode, expand
  all, row selection: **14/14**.
- `dock-smoke` — imported-node shape / animation / properties tab wiring:
  **6/6**.
- `app-smoke` — full app boots in StrictMode with no React errors and the Gaia
  palette offers all 15 component kinds: **7/7**.

## 8. Startup, sidebar and the Profile Tools section

### No default profile
The builder boots with an empty `profiles` array — nothing is generated until
the user acts. `WelcomeScreen` takes over the workspace and leads with two
primary actions (**New Profile**, **Import Profile**), the three starter layouts
and a shortcut into Profile Tools. Closing the last profile tab returns to that
screen instead of leaving an empty tab behind. Because `App` now has no
guaranteed active profile, `activeProfile` is nullable and every profile-bound
surface renders inside an `activeProfile &&` region; undo/redo, settings updates
and the global shortcuts no-op while the welcome screen is up.

### Sidebar behaviour
The properties sidebar (`DockPanel`) starts collapsed on every screen size.
Selecting something is what opens it: `focusSelectedElementPane()` switches to
the Props tab **and** expands the dock, and it is called from canvas element
selection, imported-node selection and every add/replace action. The rail's
*Add* / *Props* buttons still open the panel manually, and pressing `Tab`
toggles it.

### Profile Tools (second top-level section)
The header carries a Builder ⇄ Tools switcher; the two sections are independent
and the Profile Tools workspace never mutates the active profile by itself.
`ToolsStudio` is a two-column workbench: the tool options take the left **30%**
of the width, while the right **70%** belongs to the whole-profile live preview
(with zoom / fit / reset) and, underneath it, the CSS read-out at **30%** of the
column height (CSS/Tree toggle, filter, *Copy CSS*). Both labs stay mounted while
the tab bar switches between them, so a tab switch only reveals the other set of
options — the preview, the CSS pane and any half-finished work stay put.

- **Component Lab** — pick any of the 15 Gaia content types (grouped by
  `GAIA_CATEGORIES`), then stack tooling from **checkbox dropdowns**: clip
  presets, mask presets, any number of motion layers (animations / morphs / 3D —
  all first-class in the builder's own animation library) and any number of
  surface tokens (`SURFACE_TOKENS`: neon glow, glass blur, gradient edge,
  scanlines, 3D plane, inner frame). Every selected motion layer gets its own
  editable row under the dropdown — duration, delay, easing, iteration count,
  direction, fill, play state and stagger — while the element-scoped 3D context
  (`--tool-perspective`, `--tool-rotate-x/y`, `--tool-depth`, `--tool-origin`)
  comes from the first layer. The result is assembled as a real `gaia-panel`
  `ProfileElement` and run through `transpileProfile`, so the sandboxed preview
  and the copy buttons show exactly what Gaia will receive. *Add to builder*
  appends it to the open profile (or opens a `Toolkit Profile` when none exists
  yet) and switches back with the element selected.
- **Background Studio** — builds the `body#viewer { … }` surface rule
  (colour, linear/radial gradient, vignette, image, repeat, size, attachment)
  used for backgrounds that only exist as CSS.

The column strip above the preview is the visible placement control (Left /
Middle / Right) and reports the column width the preview is laid out with —
230 / **500** / 230 px on Gaia's stock shell (margins 25 / 0 10 / 0), or the
imported profile's own numbers. `src/utils/gaiaSpec.ts` owns that geometry:
`measureColumnShell(css)` reads every `#column_N` rule (widths, `margin` /
`margin-left` / `margin-right`, later rules winning) out of a stylesheet and
returns a `ColumnShell` (`widths`, `margins`, `total`, `stock`);
`GAIA_COLUMN_SHELL` / `GAIA_SHELL_WIDTH = 1005` are the stock values, and
`columnBand` / `xForColumn` scale the shell onto the editor canvas so panels land
where Gaia puts them.

New presets live in `src/utils/toolPresets.ts`; the morph and 3D motion presets
are also part of the shared animation library (`ANIMATION_PRESETS`,
`getAnimationKeyframes()`), so they are available in the normal Animation Studio
and export as self-contained keyframes there too.

**Verification**: `npm run verify:ui` (see 9.5) is the current harness; the older
`.tmp/studio-smoke.tsx` (same jsdom/esbuild recipe as above)
walks the whole session — empty start, New Profile, collapsed sidebar, select to
re-open, Import modal, Tools section, all 15 content types, clip + morph + 3D +
surface tooling landing in the exported document, *Add to builder* in both
directions, and closing the last tab: **39/39**. The earlier `effects-smoke`,
`tree-smoke` and `dock-smoke` harnesses (section 7) were removed by a sandbox
restart and can be regenerated from that section's notes.

---

## 9. Imported CSS fidelity (backgrounds, libraries, shadow-canvas rendering)

Goal: the CSS the builder uses for an imported profile is **the same CSS the
profile ships**, in the same order, and it renders the same surface — including
CSS-defined backgrounds, gradients, third-party libraries and `@import` chains.
Nothing in this pipeline rewrites declarations; the only edits are URL
absolutization and `@import` inlining.

### 9.1 `src/utils/cssFidelity.ts`

| Export | Purpose |
| --- | --- |
| `classifyStylesheet(url)` | Labels a sheet (`kind: 'gaia' \| 'library' \| 'external'`) plus a human label — Gaia theme CSS, Google Fonts, Font Awesome, Animate.css, Bootstrap, Normalize, Hover.css, AOS, jQuery UI, cdnjs/jsDelivr/unpkg/BootstrapCDN. Used by the report. |
| `rewriteCssAssetUrls(css, base)` | Absolutizes `url(...)` (and `@import` targets) against the owning sheet, so relative background images resolve after inlining. |
| `findCssImports(css)` | Comment/string-aware scan for `@import` with exact statement + URL offsets. |
| `resolveCssImports(css, base, fetchCss, { depth })` | Replaces each `@import` **in place** with the fetched sheet text (recursively, depth 3), keeping cascade order. Falls back to an absolutized `@import` when a sheet is blocked. Returns the records for the report. |
| `probeRenderedBackground(html, { timeoutMs, settleMs })` | Loads the serialized import in a hidden `sandbox="allow-same-origin"` iframe, waits for `link.sheet` + `rAF` settle, and reads the **computed** surface of `html`, `body` and `#viewer`. |
| `snapshotDeclarations(snapshot)` | Turns a computed snapshot into `background-*` declarations. |

### 9.2 Import pipeline (`src/utils/profileImporter.ts`)

1. `fetchProfileHtml` (direct fetch, then 5 CORS proxies) → `sanitizeHtml`
   (scripts/`on*`/`javascript:` stripped) → DOMParser.
2. `extractCss` walks **every** stylesheet in document order:
   `<link rel="stylesheet">` in `<head>` (fetched, classified, `@import`s
   resolved recursively), `<style>` in `<head>`, and `<style>` in `<body>`.
   Each `<style>` block's `@import`s are inlined too — Chrome ignores `@import`
   inside a shadow-root stylesheet, so inlining is what makes the CSS work on
   *both* render surfaces. Every sheet (link, import, style) becomes a
   `StylesheetRecord { url, from, kind, label, bytes, ok }`.
3. `detectProfileBackground` reads the parsed CSS as before, then
   `probeRenderedBackground(serializeDoc(doc, importedCss))` renders the
   document once and `mergeProbedBackground` overwrites the detection with the
   **exact computed values** (`color`, all `image` layers incl. gradients,
   `repeat`, `size`, `position`, `attachment`). The result is marked
   `verified: true` (and reported as "verified in rendered page"), and
   `CanvasSettings.backgroundImageLayers` keeps the multi-layer value so exports
   and the editor surface are token-identical.
4. `augmentCssWithBackground` appends **zero-specificity** rules
   (`:where(html)`, `:where(body)`) carrying that snapshot, so the surface also
   paints on surfaces where the original selector cannot match. Imported rules
   always win — the appended block never uses `revert-layer` or `!important`.

### 9.3 Render surfaces

* **Editable canvas** (`EditableImportedCanvas`) builds a real
  `<html data-bb-import-html> → <head> + <body data-bb-import-body>` inside the
  shadow root, so `html`, `body`, `body#viewer`, `html body …` and background
  propagation behave exactly like a document. Imported text is verbatim; the
  only preparation is `prepareImportedCssForShadow` (a comment/string-aware
  scanner) rewriting a **compound-initial `:root` to `html`, because `:root` addresses the
  shadow root, which paints nothing). Editor-only markers are stripped on
  commit/export by `stripEditorCruft`.
* The canvas viewport keeps the canvas height (`settings.height`) instead of
  shrinking to the measured content height: a browser paints the page surface
  across the whole viewport, and squeezing the box made CSS backgrounds vanish
  for profiles whose body box is shorter than the page.
* **Faithful HTML mode** (`ImportedCanvas`) uses
  `sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-pointer-lock allow-modals"`
  (never `allow-top-navigation`) so third-party CSS, fonts and images load.
  Scripts are already stripped by `sanitizeHtml`, so nothing executes.
* `ImportModal`'s Scrape Report lists the whole CSS chain (from / label / kind /
  bytes / fetched-vs-blocked), the inlined byte count, and whether the
  background was verified in the rendered page.

### 9.4 Importing profiles that need a session (Gaia itself)

Public CORS proxies only see the logged-out page, so `gaiaonline.com` profiles
come back as 401/403. The import modal therefore supports the user's own
browser as the source:

* **Load saved page** — a file picker plus drag-and-drop on the markup box
  accepts the page saved with Ctrl/⌘+S (or View Source → save). `.html`, `.htm`,
  `.xhtml` and `.txt` are accepted; no clipboard round-trip, no truncation.
* **`src/utils/importFile.ts`** — `readTextFile` (FileReader fallback) and
  `extractCanonicalUrl`, which reads `<link rel="canonical">` / `og:url` from the
  saved markup. `importProfileFromHtml` uses that URL as its base when no source
  URL was typed, so a dropped file resolves its whole CSS chain and relative
  images by itself. `formatBytes` feeds the status line.
* The URL tab explains the three steps when a fetch fails (open logged in → save
  → load the file) and carries the attempted URL over to the HTML tab as the
  base URL.

### 9.5 Verification

* `npm run verify:ui` (`scripts/verify/ui-smoke.tsx` + `run-ui-smoke.mjs`) — jsdom
  walk of the session: welcome screen, blank New Profile, dock collapsed/rail
  open/close/**select-to-open**, Profile Tools + *Add to builder*, the 30/70
  tools split, checkbox dropdowns, one motion row per selected tooling, the
  Gaia column widths (230/500/230 + 15px panel padding) in the preview document,
  comment-free generated CSS, tab switches that only swap the left pane, HTML
  import with a stubbed CSS chain (report lists the chain, shadow canvas keeps a
  real `<html>/<body>`, imported CSS is verbatim except `:root` → `html`,
  multi-layer background preserved, `url()` absolutized), canonical-URL/file
  loading, a cancelled hanging fetch, closing every tab. The harness boots the
  app inside `<StrictMode>` exactly like `main.tsx`, so dev-only double-effect
  ordering is exercised too — the Tools import regression (an inactive lab's
  unmount cleanup nulling the freshly republished preview; fixed by the
  ownership guard in `useToolsPreview`) is covered by the tools-import checks.
  **85/85.**
  Needs the check-only deps: `npm i --no-save --no-audit --no-fund esbuild jsdom`.
* `npm run verify:fidelity` (`scripts/verify/background-fidelity.mjs`) — real-Chromium, end-to-end: serves
  `scripts/verify/fixture-server.mjs` (a Gaia-like profile with a linked theme
  sheet, an `animate.css`-style library, an `@import`-ed profile sheet, a
  CSS-defined `html` background image, an opaque `body` box and a second
  gradient profile), imports it through the built app, then diffs the served
  page against both render surfaces: computed `background-*` per element,
  `#columns`/column widths, library keyframes, `@import` results, and decoded
  screenshot pixels at matched points. **34/34.**
  Requires `npm i --no-save puppeteer-core @sparticuz/chromium`, a Chromium
  binary (`/tmp/chromium` + `LD_LIBRARY_PATH=/tmp/gchromium/lib`) and a font
  config that resolves to real fonts — the script writes
  `/tmp/gchromium/fonts/local.conf` and sets `FONTCONFIG_FILE`, otherwise Skia
  aborts the renderer (`SkFontMgr_FontConfigInterface … Not implemented`) the
  moment it measures text.

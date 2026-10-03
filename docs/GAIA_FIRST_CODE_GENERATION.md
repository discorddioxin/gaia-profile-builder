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

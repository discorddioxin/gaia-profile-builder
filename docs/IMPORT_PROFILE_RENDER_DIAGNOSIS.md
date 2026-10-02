# Imported Profile Rendering Diagnosis

## Summary

Imported Gaia V2 profiles render correctly in the faithful/raw view for many cases, but degrade in the editable profile editor when the profile depends on:

- linked stylesheets from `<head>`
- async-loading images/assets
- custom panels/windows with profile-specific ids/classes
- narrow fallback editor widths that compress authored layouts
- body/html-level background rules

The screenshots show the core symptom:

- **Expected**: floating desktop-window layout with dark panel interiors and correct panel widths/positions
- **Actual in editor**: white/unstyled panel bodies, compressed columns, overlap between windows, and partial loss of authored chrome

## Primary Root Cause

The editable profile editor does **not** render the imported document the same way as the faithful/raw iframe.

### Faithful view
Uses:
- `iframe srcDoc={rawHtml}`

That means:
- original `<head>` is preserved
- linked `<link rel="stylesheet">` stylesheets can load normally
- original body/html relationship exists
- authored CSS cascade remains intact

### Editable view
Uses:
- Shadow DOM host
- cloned `<body>` content only
- a synthesized `<style>` from `rawCss`

Historically, the editable view **dropped the original linked stylesheets** from `<head>` and only used the extracted CSS string. That works for simple profiles but breaks more complex ones because:

1. some linked CSS could not be fetched during import
2. some structural Gaia CSS lives only in external stylesheets
3. some layout assumptions depend on the browser loading the stylesheet naturally, not via partial fetch/merge

This creates the exact mismatch seen in the screenshots.

## Secondary Root Causes

### 1. Layout width mismatch
The editor previously defaulted imported profiles to ~1000px or narrower widths, while authored profiles may assume a wider desktop surface.

Effects:
- columns collapse too early
- panels overlap
- absolute/fixed decorative pieces drift
- complex layout density increases and becomes unreadable

### 2. Async asset timing
Panel heights and column bottoms were measured before:
- linked stylesheets finished loading
- images finished loading

Effects:
- content height clamp can be wrong
- editor can miscompute bottom of `#columns`
- overlap and cropping can appear until reflow happens

### 3. Custom panel semantics were incomplete
Profiles using:
```html
<div id="id_custom_####" class="panel custom_panel postcontent">
  <h2 id="custom_####_title">Custom</h2>
  <div id="custom_####_content"></div>
  <div class="clear"></div>
</div>
```
were not originally treated as first-class component roots.

Effects:
- component-mode selection can target the wrong child
- drag/reorder behavior becomes inconsistent
- style tooling becomes unreliable for custom windows

### 4. Shadow DOM adaptation gap
Body/html rules need adaptation inside shadow DOM.
Even with adaptation, some selectors and stylesheet-order assumptions still behave differently than a normal document.

## What Has Been Fixed

### Fixed in current implementation

1. **Imported editor now preserves linked `<link rel="stylesheet">` tags from `<head>`**
   - they are cloned into the shadow root
   - this restores structural Gaia CSS for complex profiles

2. **Editor still injects adapted combined CSS**
   - preserves custom inline styles
   - preserves body/html background behavior in shadow DOM

3. **Layout resync now happens after async assets load**
   - after stylesheet load/error
   - after image load/error
   - plus delayed re-measure passes

4. **Imported default desktop width raised to 1380**
   - closer to authored desktop layouts
   - reduces panel compression/overlap

5. **Custom panel support added**
   - `custom-panel`
   - `custom-title`
   - `custom-content`

6. **Bottom-of-content measurement now uses `#columns` content bottom**
   - avoids endless scrolling into repeated background

## Why Some Complex Profiles Still Remain Fragile

Even after linked stylesheet preservation, the editable editor still differs from a true document because it uses Shadow DOM rather than an iframe as the editable surface.

### Remaining architectural risks

- CSS selectors that rely on exact document/root relationships may still differ inside shadow DOM
- browser default stylesheet ordering may differ slightly
- scripts are removed by design, so profiles that rely on JS-driven post-layout mutation cannot fully match source
- Gaia-specific runtime-generated DOM may be missing if the user imports only static HTML

## Recommended Long-Term Architecture

### Best solution
Move the editable imported profile surface from Shadow DOM to an **iframe-based editable document**.

#### Why
This would make editable mode and faithful mode share the same rendering model:
- same document root
- same stylesheet loading behavior
- same body/html cascade
- same layout engine behavior

#### Required additions
To keep iframe editable:
- inject editor overlay/highlight CSS into iframe document
- inject selection hooks into iframe DOM
- communicate selection/edit actions via postMessage or direct same-origin `srcDoc` DOM access
- maintain a mirrored `data-bb-id` identity system

This is the highest-confidence way to eliminate the discrepancy for complex imports.

## Current Tactical Mitigation Strategy

Until iframe-editable mode is implemented, the current tactical strategy is:

1. preserve original `<link rel="stylesheet">` tags in editable mode
2. preserve adapted custom CSS in editable mode
3. remeasure after CSS/image load
4. keep authored desktop width large by default
5. treat custom panels as dedicated components

## Regression Checklist

When testing imported complex profiles, verify:

- panel interiors match faithful view (no white fallback bodies)
- panel widths match faithful view
- columns do not overlap unexpectedly
- custom panels are selectable as full components
- body background repeats correctly
- editor height stops at bottom of `#columns`
- faithful/raw view and editable view are visually close
- styles from external `<link>` stylesheets affect editable mode

## Files Most Relevant

- `src/components/EditableImportedCanvas.tsx`
- `src/utils/profileImporter.ts`
- `src/components/ImportedCanvas.tsx`
- `src/components/ForumPreview.tsx`
- `src/components/DockPanel.tsx`

## Immediate Next Step

If another complex imported profile still fails after the current linked-stylesheet fix, the next implementation step should be:

> Replace Shadow-DOM editable rendering with iframe-based editable rendering.

That is the cleanest architectural resolution for high-fidelity complex-profile editing.

# Complex Imported Profile Rendering – Design / Troubleshooting Document

## Problem Statement

Basic imported Gaia V2 profiles render acceptably in the editor, but complex profiles break in the editable renderer:

- panel bodies lose expected CSS
- windows overlap vertically / horizontally
- authored spacing collapses
- backgrounds can appear to obscure foreground panels
- editor output diverges from faithful/raw rendering

## Confirmed Root Causes

### 1. Stylesheet cascade/order mismatch
A complex Gaia profile can depend on the exact order of:
- `<link rel="stylesheet">`
- `<style>` blocks
- inline element styles

If the editor reorders or merges those incorrectly, panels can become:
- white instead of dark
- missing window chrome
- compressed or expanded unpredictably
- mispositioned

### 2. Incomplete `<head>` fidelity in editable mode
The faithful view renders the imported document as a normal HTML document inside an iframe.
The editable view uses a synthetic rendering model.

This means the editor historically risked losing:
- original head-node ordering
- stylesheet load timing
- html/body selector behavior
- asset-dependent reflow timing

### 3. Async reflow not accounted for early enough
Complex profiles can settle layout only after:
- linked CSS finishes loading
- images finish loading
- browser computes final column sizes

Measuring the profile before that causes overlap and incorrect canvas height.

### 4. V2 column layout assumptions
Gaia V2 profiles rely on:
- `#columns`
- `#column_1`
- `#column_2`
- `#column_3`

If imported components are reinserted outside those columns or measured before those columns settle, the layout diverges quickly.

## Current Mitigation Implemented

### Editable renderer
- preserves original head-node order more closely
- keeps linked stylesheet nodes
- adapts body/html CSS for shadow rendering
- remeasures after stylesheet/image load
- remeasures using `ResizeObserver` on `#columns`
- clamps height to the actual content bottom

### Import pipeline
- rewrites relative CSS URLs
- preserves fetched CSS for troubleshooting
- enforces Gaia V2 column layout

### Code view
- shows the full HTML used
- shows the full CSS used
- removes BBCode-only troubleshooting noise

## Remaining Architectural Risk

Even with head-order preservation, the editable mode still does **not** run in a true document environment identical to the faithful iframe.

That means some advanced selectors / cascade interactions may still differ.

### Most likely remaining breakpoints
- stylesheet rules that depend on document/root semantics
- CSS relying on browser-managed normal document order rather than synthetic recreation
- profiles that depend on Gaia runtime post-processing (JS removed by design)
- absolute/fixed-position windows whose layout depends on late style calculations

## Recommended Long-Term Fix

### Replace Shadow-DOM editable rendering with iframe-based editable rendering
This is the cleanest solution.

Benefits:
- exact document semantics
- exact stylesheet loading order
- exact html/body behavior
- fewer cascade mismatches
- faithful and editable views share the same rendering environment

Implementation approach:
1. render imported editable profile inside iframe `srcDoc`
2. inject editor-only overlay styles/scripts via same-origin access
3. keep `data-bb-id` markers for selection
4. communicate selection + mutations through iframe DOM access
5. serialize full HTML back out after edits

## Short-Term Test Plan

For every complex imported profile, compare:

1. faithful/raw view
2. editable view
3. preview view
4. code view HTML/CSS

Check for:
- same panel background colors
- same panel widths
- same vertical stacking
- same custom panel positions
- same body background behavior
- same total content height

## Files Involved

- `src/utils/profileImporter.ts`
- `src/components/EditableImportedCanvas.tsx`
- `src/components/ImportedCanvas.tsx`
- `src/components/ForumPreview.tsx`
- `src/components/TranspilerModal.tsx`
- `src/components/DockPanel.tsx`

## Status

The current fixes improve fidelity substantially by accounting for:
- `<link>` stylesheets
- `<style>` blocks
- inline styles
- CSS URL rewriting
- layout remeasurement

If complex profiles still fail after this, the remaining issue is no longer simple CSS omission — it is the rendering architecture itself.

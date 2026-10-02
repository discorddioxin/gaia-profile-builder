# BBStudio Codebase Decomposition Strategy

This document provides a comprehensive, production-grade architectural guide for decomposing large monolithic files into highly-cohesive, loosely-coupled modules without risking regressions in runtime functionality, visual styling, or user experience (UI/UX).

---

## 1. Core Principles of Safe Decomposition

Decomposing a live application requires a disciplined approach to prevent breaking complex visual interactions (such as drag-and-drop bounding boxes, Shadow DOM CSS containment, and selection synchronizations). 

### A. The "Do No Harm" Refactoring Loop
1. **Establish a Baseline**: Run a full production build (`npm run build`) to ensure the codebase has zero static TypeScript or bundling errors before making any structural changes.
2. **One Dependency at a Time**: Never refactor both the state-provider and the consumer simultaneously. Separate the extraction of business logic (functions/hooks) from the extraction of visual presentation (components).
3. **Verify Pure Refactoring**: A pure refactoring change must not alter existing CSS classes, HTML nesting hierarchies, or public API signatures.
4. **Automated & Manual Smokes**: Test highly reactive workflows—such as dragging custom V2 panels or resizing the mobile canvas—immediately after extraction.

### B. Pure Function Extraction (Zero-Dependency Utilities)
- Locate helper functions that do not read or write component state (e.g., color conversions, CSS unit parsers, URL rewriters).
- Move them to stateless utility files (e.g., `src/utils/cssHelpers.ts`). 
- Since these functions are pure, they can be imported and unit-tested in isolation without loading React lifecycle scopes.

### C. State Extraction via Custom Hooks (`use` Hooks)
- For components bloated by multiple `useState`, `useRef`, and `useEffect` hooks, extract the state machine into a cohesive **Custom Hook** (e.g., `src/hooks/useCanvasInteractions.ts`).
- The UI component becomes a pure presenter, receiving event callbacks and UI state directly from the hook, minimizing component complexity.

---

## 2. Codebase Inventory: The Largest Monoliths

Based on an audit of the current codebase, the following four files present the highest cognitive load, coupling risk, and refactoring urgency:

| Monolith Path | Current Size | Core Responsibilities |
| :--- | :--- | :--- |
| `src/components/EditableImportedCanvas.tsx` | ~2,400+ lines | Shadow DOM setup, event delegation, mouse/pointer move drag-and-drop, bounding box overlay rendering, contextual microbar, right-click context menu, and round-trip HTML serialization. |
| `src/components/DockPanel.tsx` | ~1,100+ lines | Container for all sidebar and bottom-sheet tabs (Add Elements, Properties, Clip/Mask, Animations, Saved, Layers), sidebar collapsible rail, and dynamic child target computations. |
| `src/utils/profileImporter.ts` | ~900+ lines | CORS proxy fallback pipeline, HTML/CSS sanitization, relative URL rewrites, CSS cascade rules parser, and DOM tree element/panel reconstruction. |
| `src/components/ImportedNodePropertiesPanel.tsx` | ~600+ lines | Twin-column property inspectors for primary (blue) and sub-selected (orange) nodes, text size/spacing sliders, child-style targeting engines, and attribute managers. |

---

## 3. Targeted Decomposition Strategy for BBStudio

To clean up these monolithic files safely, we will execute a staged, multi-phase decoupling strategy.

```
                  [ App.tsx (Main Coordinator) ]
                             │
       ┌─────────────────────┴──────────────────────┐
       ▼                                            ▼
[ State Manager Context ]                [ Core Features / Views ]
  - History Manager Hook                   - Canvas Features Folder
  - Active Tab State Hook                  - Properties Panel Folder
  - Selector Context                       - CORS Importer Utils
```

### Phase 1: Split `EditableImportedCanvas.tsx` (Visual Overlays & Drag-and-Drop)
The canvas file is bloated because it handles both DOM rendering inside a Shadow Root and the mathematical overhead of selection box bounding overlays and custom context menus.

#### Action Plan:
1. **Introduce `src/components/canvas/SelectionOverlay.tsx`**:
   - Extract the elements rendering the primary selection `selectionRect`, inspected selection `inspectRect`, and multi-selection `multiSelectionRects`.
   - Pass in `zoom` and coordinates as props. This removes a large chunk of absolute-positioned CSS container code from the canvas.
2. **Introduce `src/components/canvas/CanvasContextMenu.tsx`**:
   - Move the custom right-click context menu JSX and state from the canvas into this dedicated component.
   - It will accept an `x`, `y`, `semanticRole`, and action callbacks (`onAddComment`, `onGroupSelected`, `onDelete`) as simple props.
3. **Introduce `src/components/canvas/useDOMRelocator.ts`**:
   - Move the V2 column tracking, nearest column checks, and DOM node insertion functions (`insertElementByPointer`, `relocateComponentByPointer`) into a clean interaction hook.

### Phase 2: Refactor `profileImporter.ts` (Sanitizer, Parsers, and CSS Scrapers)
The importer currently mixes asynchronous network requests (CORS proxy fetchers), HTML sanitizers, and deep CSS parse engines.

#### Action Plan:
1. **Introduce `src/utils/importer/corsFetcher.ts`**:
   - Isolate the `CORS_PROXIES` list and the `fetchProfileHtml` / `fetchWithTimeout` async retry loop.
2. **Introduce `src/utils/importer/htmlSanitizer.ts`**:
   - Extract the security-critical `sanitizeHtml` regex parser. Keeping the sanitizer in a separate file makes it easier to audite for security compliance (scripts/event handlers stripping).
3. **Introduce `src/utils/importer/cssParser.ts`**:
   - Isolate `extractCss`, `parseCssRules`, `rewriteCssUrls`, and the selector-matching routines.

### Phase 3: Decompose the Properties Column System
`ImportedNodePropertiesPanel.tsx` currently contains the heavy `NodeStyleColumn` presenter and multiple smaller control fields.

#### Action Plan:
1. **Introduce `src/components/properties/NodeStyleColumn.tsx`**:
   - Isolate this massive component into its own file under a dedicated properties directory.
2. **Introduce `src/components/properties/controls/`**:
   - Extract small, atomic controls into individual files:
     - `ColorControl.tsx`
     - `RangeControl.tsx`
     - `ModeSwitch.tsx`
3. **Introduce `src/components/properties/DedicatedActionCluster.tsx`**:
   - Group the contextual Gaia panel controls (e.g., adding comment, equipment item, or contact link) into a separate, clean action-dispatcher block.

### Phase 4: Consolidate UI State into a Unified Context Provider
`App.tsx` acts as a monolithic coordinator, passing dozen-long prop blocks down through the hierarchy. This creates high coupling.

#### Action Plan:
1. **Introduce `src/context/ProfileEditorContext.tsx`**:
   - Create a unified React context that holds the active profile tab, element selections, history index, and zoom level.
2. **Provide Selective Consumption**:
   - Wrap the main application. Canvas and properties panels can directly subscribe to the context, removing prop-drilling entirely from the components.

---

## 4. Quality Assurance & Regression Avoidance

To guarantee that this decomposition never compromises the user experience or app functionality:

- **Check Stylesheet Cascades**: Visual styles inside the Shadow DOM are fragile. When moving stylesheets, always verify that the editor's `:host` and `body[data-bb-import-body]` aliases load in the correct sequence.
- **Maintain Drag-and-Drop Integrity**: Pointer events (`onPointerDown`, `pointermove`) rely on active document captures. Ensure that extracting functions to hooks doesn't interrupt target capture boundaries.
- **Retain DOM Structure**: Changing HTML layouts during component decomposition can alter selector specificity. Make sure component extraction never adds wrapper `div`s that aren't styled by the imported Gaia CSS.

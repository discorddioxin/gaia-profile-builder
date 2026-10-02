# BBStudio Decomposition Implementation Plan (Micro-Stepping)

## Document Status
**Status: Completed** — this document was reviewed and corrected. No application code was changed during this review.

## Objective
Decompose the largest files without changing behavior, layout, rendering, or interaction patterns.

## Non-Negotiable Safety Rules
- **Every phase and step has a status.** Allowed values are `Incompleted` and `Completed`.
- **Each step changes 10-60 lines total.** Count additions, deletions, and replacements across all files.
- **One file changed per turn.** A move is split into separate add, import, and remove steps; never edit source and destination in one step.
- **One logical extraction per step.** Do not combine types, UI, state, and behavior in one step.
- **Build after every step.** Use `build_project` immediately after each code change.
- **Abort on repetition.** If the same operation fails twice, stop. Do not retry the same edit pattern again.
- **Abort on scope growth.** If a planned extraction exceeds 60 changed lines, split it into another step before editing.
- **No behavior changes during extraction.** Preserve public props, DOM attributes, CSS class names, event order, and exported APIs.
- **Do not delete the old implementation until the replacement import compiles.** For larger moves, use two separate steps: add/import first, delete second.
- **Keep rollback points.** Each step must leave the project buildable before continuing.

### Move Protocol
Some rows list both a destination and source file because they describe one logical extraction. They are **not** permission to edit both files in one turn. Execute those rows as this sequence:

1. `Incompleted`: create/add the destination code only; build.
2. `Incompleted`: update imports in the source file only; build.
3. `Incompleted`: remove the old source block only; build.
4. Mark the logical row `Completed` only after all three single-file turns pass.

If any subturn would exceed 60 changed lines, split it again. Never paste or delete an entire large component in one operation.

## Current Codebase Risk Map

| File | Risk | Decomposition Strategy |
|---|---:|---|
| `src/components/EditableImportedCanvas.tsx` | Very high | Extract types, constants, factories, and stateless render blocks first. Touch hooks last. |
| `src/App.tsx` | High | Extract pure callbacks and profile operations before introducing Context. |
| `src/components/DockPanel.tsx` | High | Extract config arrays and small render sections before changing dock state. |
| `src/components/ImportedNodePropertiesPanel.tsx` | Medium | Extract controls and style columns one component at a time. |
| `src/utils/profileImporter.ts` | Medium | Extract pure network, sanitizer, CSS, and DOM helpers independently. |

## Phase 1: Shared Types & Constants
**Phase Status: Incompleted**

| Step | Status | Files | Change Budget | Action |
|---|---|---|---:|---|
| 1.1 | Incompleted | `src/types/imported.ts`, `EditableImportedCanvas.tsx` | 10-40 lines | Move `ImportedSemanticRole`. Add imports only after the new type exists. |
| 1.2 | Incompleted | `src/types/imported.ts`, `EditableImportedCanvas.tsx` | 10-50 lines | Move `ImportedNodeInfo` and `ImportedTreeNode`. |
| 1.3 | Incompleted | `src/types/imported.ts`, `EditableImportedCanvas.tsx` | 10-50 lines | Move `ImportedDedicatedComponentKind` and `EditableImportedCanvasApi`. |
| 1.4 | Incompleted | `src/constants/editorCss.ts`, `EditableImportedCanvas.tsx` | 10-50 lines | Move only the editor CSS constant. |
| 1.5 | Incompleted | `src/config/dockConfig.tsx`, `DockPanel.tsx` | 10-60 lines | Move only the element template definitions. |
| 1.6 | Incompleted | `src/config/dockConfig.tsx`, `DockPanel.tsx` | 10-40 lines | Move dedicated component definitions. |
| 1.7 | Incompleted | `src/config/dockConfig.tsx`, `DockPanel.tsx` | 10-40 lines | Move visible dock tab definitions only. |

## Phase 2: Pure Utility Extraction
**Phase Status: Incompleted**

| Step | Status | Files | Change Budget | Action |
|---|---|---|---:|---|
| 2.1 | Incompleted | `src/utils/styleUtils.ts`, `ImportedNodePropertiesPanel.tsx` | 10-40 lines | Move `parseStyle` and `stringifyStyle`. |
| 2.2 | Incompleted | `src/utils/styleUtils.ts`, `ImportedNodePropertiesPanel.tsx` | 10-30 lines | Move `stripImportant` and `toHexColor`. |
| 2.3 | Incompleted | `src/utils/importer/network.ts`, `profileImporter.ts` | 10-30 lines | Move proxy constants and `sleep`. |
| 2.4 | Incompleted | `src/utils/importer/network.ts`, `profileImporter.ts` | 10-30 lines | Move `fetchWithTimeout`. |
| 2.5 | Incompleted | `src/utils/importer/cssAdapter.ts`, `profileImporter.ts` | 10-30 lines | Move CSS URL rewriting. |
| 2.6 | Incompleted | `src/utils/importer/sanitizer.ts`, `profileImporter.ts` | 10-40 lines | Move HTML sanitization only. |

## Phase 3: Properties Controls
**Phase Status: Incompleted**

| Step | Status | Files | Change Budget | Action |
|---|---|---|---:|---|
| 3.1 | Incompleted | `src/components/properties/Label.tsx`, `ImportedNodePropertiesPanel.tsx` | 10-25 lines | Extract `Label`. |
| 3.2 | Incompleted | `src/components/properties/IconButton.tsx`, `ImportedNodePropertiesPanel.tsx` | 10-35 lines | Extract `IconButton`. |
| 3.3 | Incompleted | `src/components/properties/ColorControl.tsx`, `ImportedNodePropertiesPanel.tsx` | 10-45 lines | Extract `ColorControl`. |
| 3.4 | Incompleted | `src/components/properties/RangeControl.tsx`, `ImportedNodePropertiesPanel.tsx` | 10-50 lines | Extract `RangeControl`. |
| 3.5 | Incompleted | `src/components/properties/NodeStyleColumn.tsx`, `ImportedNodePropertiesPanel.tsx` | 10-60 lines | Extract one style column only. Do not move both columns in one step. |

## Phase 4: DOM Factory Decomposition
**Phase Status: Incompleted**

| Step | Status | Files | Change Budget | Action |
|---|---|---|---:|---|
| 4.1 | Incompleted | `src/utils/dom/componentFactories.ts` | 10-40 lines | Create file and copy comment factory only. Do not remove source yet. |
| 4.2 | Incompleted | `EditableImportedCanvas.tsx`, `componentFactories.ts` | 10-40 lines | Import comment factory and remove only its original definition. |
| 4.3 | Incompleted | `componentFactories.ts` | 10-40 lines | Copy wishlist/equipment factory pair. |
| 4.4 | Incompleted | `EditableImportedCanvas.tsx`, `componentFactories.ts` | 10-40 lines | Import and remove only the copied pair. |
| 4.5 | Incompleted | `componentFactories.ts` | 10-40 lines | Copy journal/friend/visitor factories. |
| 4.6 | Incompleted | `EditableImportedCanvas.tsx`, `componentFactories.ts` | 10-40 lines | Import and remove only those definitions. |
| 4.7 | Incompleted | `componentFactories.ts` | 10-60 lines | Extract one dedicated panel branch. Repeat as separate future steps for remaining branches. |

## Phase 5: Stateless Canvas UI
**Phase Status: Incompleted**

| Step | Status | Files | Change Budget | Action |
|---|---|---|---:|---|
| 5.1 | Incompleted | `src/components/canvas/SelectionOverlays.tsx`, `EditableImportedCanvas.tsx` | 10-60 lines | Extract only one overlay branch. |
| 5.2 | Incompleted | `SelectionOverlays.tsx`, `EditableImportedCanvas.tsx` | 10-60 lines | Add remaining selection rectangles without changing coordinate calculations. |
| 5.3 | Incompleted | `src/components/canvas/CanvasContextMenu.tsx`, `EditableImportedCanvas.tsx` | 10-60 lines | Extract menu header and one action group only. |
| 5.4 | Incompleted | `CanvasContextMenu.tsx`, `EditableImportedCanvas.tsx` | 10-60 lines | Extract remaining menu actions one group at a time. |

## Phase 6: App State Decomposition
**Phase Status: Incompleted**

| Step | Status | Files | Change Budget | Action |
|---|---|---|---:|---|
| 6.1 | Incompleted | `src/hooks/useProfileHistory.ts`, `App.tsx` | 10-60 lines | Extract one history operation and its types. |
| 6.2 | Incompleted | `useProfileHistory.ts`, `App.tsx` | 10-60 lines | Extract undo/redo wiring. |
| 6.3 | Incompleted | `src/hooks/useProfileTabs.ts`, `App.tsx` | 10-60 lines | Extract profile tab creation/closing only. |
| 6.4 | Incompleted | `src/context/ProfileEditorContext.tsx`, `App.tsx` | 10-60 lines | Add context shell without moving state yet. |
| 6.5 | Incompleted | `ProfileEditorContext.tsx`, `App.tsx` | 10-60 lines | Move one shared UI state field at a time. |

## Phase 7: Shadow DOM Lifecycle
**Phase Status: Incompleted**

| Step | Status | Files | Change Budget | Action |
|---|---|---|---:|---|
| 7.1 | Incompleted | `src/hooks/useImportedDocument.ts`, `EditableImportedCanvas.tsx` | 10-60 lines | Extract shadow root creation and body mounting only. |
| 7.2 | Incompleted | `useImportedDocument.ts`, `EditableImportedCanvas.tsx` | 10-60 lines | Extract head/style/link preservation. |
| 7.3 | Incompleted | `useImportedDocument.ts`, `EditableImportedCanvas.tsx` | 10-60 lines | Extract resize/load observers. |
| 7.4 | Incompleted | `useImportedDocument.ts`, `EditableImportedCanvas.tsx` | 10-60 lines | Extract serialization only after previous steps build. |

## Validation Protocol Per Step

1. Inspect only the target file and exact symbol range.
2. Make one change of 10-60 lines maximum.
3. Run `build_project`.
4. If build fails, make one correction of 10-60 lines maximum.
5. If the same edit fails twice, **abort the current step** and document the blocker.
6. Do not start the next step until the current step is build-clean.
7. A phase may be marked `Completed` only when every step in that phase is `Completed`.
8. `Incompleted` is the only valid status for planned work; do not use `In progress` while this document is being followed.

## Known Risks

- Moving types can create circular imports. Types must move before implementation modules.
- Shadow DOM APIs are imperative. Keep `useImperativeHandle` in the component until the hook extraction phase.
- CSS/HTML order is behavior, not formatting. Never reorder imported head nodes during decomposition.
- UI behavior must remain unchanged. Decomposition steps must not redesign controls or alter default selections.
- A file operation that exceeds the 60-line budget is an invalid step and must be split.

## Current Status
**All decomposition phases and steps: Incompleted.**

This document is planning-only. No decomposition implementation should begin until a step is explicitly marked `In progress`, and only one step may be active at a time.
## Summary

PRD-V1 is the first execution-focused PRD for v2: it ties EPICs, user stories, and features to a git workflow (development branch, feature branches), design principles recap, and feature-branch/commit/subtask mapping. It is the initial "single source of execution" for v2 and shows how high-level scope was first turned into a concrete workflow.

---

# CollabBoard v2 — Initial PRD (V1)

**Scope:** 20 features across 8 EPICs; modular, SOLID-aligned design; git workflow with `development` branch and feature branches. This document is the single source for execution: **EPICs → User Stories → Features → Feature Branches → Commits → Subtasks.**

## References

- **Repository:** [https://github.com/MichaelHabermas/CollabBoard](https://github.com/MichaelHabermas/CollabBoard)
- [DESIGN-DOCUMENT.md](./DESIGN-DOCUMENT.md) — EPICs and user stories
- [FEATURES.md](./FEATURES.md) — Feature descriptions, acceptance criteria, technical notes
- [INITIAL-RESEARCH.md](./INITIAL-RESEARCH.md) — Build order and rationale
- [PRD](../../product/PRD.md) — Existing scope, tech stack, SOLID, project structure

---

## Git workflow (branching and merge strategy)

- **Development branch:** All development happens on `development`. Do **not** push directly to `main`.
- **Feature flow:** Create a feature branch from `development` → implement over several commits → write tests → run tests → fix until all pass → merge the feature branch into `development` → move to the next feature.
- **Checklist:** Branch from `development` only; implement; test; ensure tests pass; merge into `development` only (never into `main`).

```mermaid
flowchart LR
  subgraph workflow [Feature workflow]
    dev[development]
    fb[feature/xxx]
    commits[Commits]
    tests[Run tests]
    merge[Merge to development]
    dev --> fb
    fb --> commits
    commits --> tests
    tests -->|pass| merge
    merge --> dev
  end
```

---

## Design principles (recap)

### Modular design

v2 work is organized by existing modules: `auth`, `sync`, `canvas`, `ai`, and `ui`. New behavior is added via new components, hooks, or services within these modules. v2 introduces: **Property inspector** (UI sidebar; depends on canvas selection and object update API), **Viewport / zoom** (canvas layer; shared by zoom-to-selection, zoom-to-fit-all, zoom presets), **User preferences** (sync or dedicated service; recent boards and favorites per user). Each area has single ownership for testability and maintainability.

### SOLID principles

- **SRP:** One concern per module and component (e.g. property inspector only edits object properties; viewport only handles pan/zoom).
- **OCP:** Extend via interfaces and new components without changing core logic (new connector styles, AI prompts, inspector controls).
- **LSP:** Board objects remain substitutable; new fields (e.g. `opacity`, connector `arrowheads`) are optional and backward-compatible.
- **ISP:** Focused interfaces (e.g. `ITransformable`, `ISelectable`) so inspector, align toolbar, and export depend on a narrow surface.
- **DIP:** Depend on abstractions (sync service, AI service interfaces); inject implementations for testability and future backends.

---

## Epic → User Story → Feature mapping

```mermaid
flowchart TB
  subgraph Epic1 [Epic 1: Input and navigation UX]
    E1F1[Feature 1: Keyboard shortcuts]
    E1F2[Feature 2: Escape to deselect]
    E1F3[Feature 3: Zoom to selection]
    E1F4[Feature 4: Zoom to fit all]
    E1F5[Feature 5: Zoom presets]
  end
  subgraph Epic2 [Epic 2: Property inspector and styling]
    E2F6[Feature 6: Font size]
    E2F7[Feature 7: Property inspector]
    E2F8[Feature 8: Stroke and fill]
    E2F9[Feature 9: Opacity slider]
  end
  subgraph Epic3 [Epic 3: Layout and canvas tools]
    E3F10[Feature 10: Align toolbar]
    E3F11[Feature 11: Snap to grid]
    E3F12[Feature 12: Alignment guides]
    E3F14[Feature 14: Export as image]
  end
  subgraph Epic4 [Epic 4: Board discovery]
    E4F13[Feature 13: Board dashboard]
  end
  subgraph Epic5 [Epic 5: Connectors]
    E5F15[Feature 15: Connector arrowheads]
    E5F16[Feature 16: Connector stroke style]
  end
  subgraph Epic6 [Epic 6: Collaboration]
    E6F17[Feature 17: Comments on objects]
  end
  subgraph Epic7 [Epic 7: AI board intelligence]
    E7F18[Feature 18: Explain board]
    E7F19[Feature 19: Summarize selection]
  end
  subgraph Epic8 [Epic 8: History]
    E8F20[Feature 20: Undo and redo]
  end
```

| Epic ID | Epic name | User story IDs | Feature numbers | Feature branch pattern |
|---------|-----------|----------------|-----------------|------------------------|
| 1 | Input and navigation UX | US 1.1–1.5 | 1–5 | `feature/keyboard-shortcuts`, `feature/escape-to-deselect`, `feature/zoom-to-selection`, `feature/zoom-to-fit-all`, `feature/zoom-presets` |
| 2 | Property inspector and styling | US 2.1–2.4 | 6–9 | `feature/font-size-control`, `feature/property-inspector`, `feature/stroke-and-fill-inspector`, `feature/opacity-slider` |
| 3 | Layout and canvas tools | US 3.1–3.4 | 10, 11, 12, 14 | `feature/align-toolbar`, `feature/snap-to-grid`, `feature/alignment-guides`, `feature/export-as-image` |
| 4 | Board discovery and preferences | US 4.1–4.3 | 13 | `feature/board-dashboard` |
| 5 | Connectors and diagramming | US 5.1–5.2 | 15–16 | `feature/connector-arrowheads`, `feature/connector-stroke-style` |
| 6 | Collaboration and comments | US 6.1–6.3 | 17 | `feature/comments-on-objects` |
| 7 | AI board intelligence | US 7.1–7.2 | 18–19 | `feature/ai-explain-board`, `feature/ai-summarize-selection` |
| 8 | History and consistency | US 8.1–8.2 | 20 | `feature/undo-redo` |

---

## Epic 1: Input and navigation UX

**Objective:** Improve daily input and navigation with keyboard shortcuts, consistent Escape behavior, and zoom actions so users can work quickly and navigate large boards without relying only on the toolbar.

### User stories

| ID | User story | Done |
|----|------------|------|
| US 1.1 | As a user, I want to use keyboard shortcuts (Copy, Paste, Delete, Duplicate, Escape) so that I can work quickly without the toolbar. | [ ] |
| US 1.2 | As a user, I want Escape to clear selection and exit text-edit mode so that I am not stuck in edit state. | [ ] |
| US 1.3 | As a user, I want to zoom to the current selection so that I can focus on part of a large board. | [ ] |
| US 1.4 | As a user, I want to zoom to fit all board content so that I can see the full canvas at once. | [ ] |
| US 1.5 | As a user, I want zoom presets (e.g. 50%, 100%, 200%) so that I can jump to a known zoom level. | [ ] |

### Feature 1: Keyboard shortcuts

- **Branch:** `feature/keyboard-shortcuts`
- **PR title:** `feat: keyboard shortcuts (Copy, Paste, Delete, Duplicate, Escape)`
- **Module:** canvas / board container

**Acceptance criteria**

- [ ] Ctrl/Cmd+C copies the current selection to an internal clipboard.
- [ ] Ctrl/Cmd+V pastes from clipboard onto the board (with a small offset to avoid overlap).
- [ ] Delete or Backspace deletes the selected object(s).
- [ ] Ctrl/Cmd+D duplicates the selected object(s).
- [ ] Escape clears selection and exits text-edit mode (see feature 2).
- [ ] Shortcuts are disabled when focus is in an input or text-edit field.
- [ ] A shortcuts reference is documented (e.g. in-app help or README).

**Commits and subtasks**

1. **Commit:** `feat: add keyboard shortcut hook and keydown listener`
   - [ ] Add `useKeyboardShortcuts` hook (or equivalent) in canvas/board layer.
   - [ ] Attach global keydown listener with `useEffect`; use `metaKey`/`ctrlKey` for cross-platform.
   - [ ] Guard: do not fire when focus is in input/textarea (check `document.activeElement`).
2. **Commit:** `feat: wire Copy and Paste to keyboard shortcuts`
   - [ ] Wire Ctrl/Cmd+C to existing copy selection to clipboard logic.
   - [ ] Wire Ctrl/Cmd+V to paste from clipboard with small offset; reuse existing paste handler.
3. **Commit:** `feat: wire Delete and Duplicate to keyboard shortcuts`
   - [ ] Wire Delete/Backspace to existing delete selected objects handler.
   - [ ] Wire Ctrl/Cmd+D to existing duplicate selected objects handler.
4. **Commit:** `docs: add keyboard shortcuts reference`
   - [ ] Document shortcuts in README or in-app help (e.g. tooltip or menu).

**Test plan**

- [ ] Unit or component test: keydown triggers copy/paste/delete/duplicate when selection exists and focus not in input.
- [ ] Test that shortcuts are ignored when focus is in an input or text-edit field.
- [ ] Run tests; fix until pass.

**Merge**

- [ ] Merge `feature/keyboard-shortcuts` into `development`.

---

### Feature 2: Escape to deselect

- **Branch:** `feature/escape-to-deselect`
- **PR title:** `feat: Escape clears selection and exits text-edit mode`
- **Module:** canvas / board container

**Acceptance criteria**

- [ ] Pressing Escape when one or more objects are selected clears the selection.
- [ ] Pressing Escape when editing text inside a sticky or text element commits or cancels the edit and exits text-edit mode, then clears selection if appropriate.
- [ ] Escape does not trigger other actions when selection/edit is active (document modal behavior separately if needed).

**Commits and subtasks**

1. **Commit:** `feat: add Escape handler to clear selection`
   - [ ] Add Escape keydown handler that calls deselect (clear selection).
   - [ ] Ensure handler runs in same layer as keyboard shortcuts (e.g. in `useKeyboardShortcuts` or board container).
2. **Commit:** `feat: Escape exits text-edit mode`
   - [ ] When editing text (sticky or text element), Escape calls endTextEdit (commit or cancel per product).
   - [ ] After exiting text-edit, clear selection if appropriate.
3. **Commit:** `test: Escape deselect and exit text-edit`
   - [ ] Test Escape clears selection when objects selected.
   - [ ] Test Escape exits text-edit when editing sticky/text.

**Test plan**

- [ ] Run tests; fix until pass.

**Merge**

- [ ] Merge `feature/escape-to-deselect` into `development`.

---

### Feature 3: Zoom to selection

- **Branch:** `feature/zoom-to-selection`
- **PR title:** `feat: zoom to selection`
- **Module:** canvas (viewport/zoom)

**Acceptance criteria**

- [ ] When one or more objects are selected, "Zoom to selection" action adjusts viewport so selection bounding box is visible and centered (or nearly so).
- [ ] Zoom level set so selection fills a reasonable portion of viewport (e.g. with padding).
- [ ] When nothing is selected, action is disabled or does nothing.
- [ ] Pan and zoom state updated; viewport is local (other users not affected).

**Commits and subtasks**

1. **Commit:** `feat: compute selection bounding box helper`
   - [ ] Add helper to compute bounding box from selected object positions/sizes.
   - [ ] Use existing selection state from canvas/board context.
2. **Commit:** `feat: zoom viewport to selection`
   - [ ] Add action that sets scale and position so selection box fits in view with padding.
   - [ ] Update Konva stage scale and position; use existing viewport/zoom state.
3. **Commit:** `feat: expose Zoom to selection in toolbar or shortcut`
   - [ ] Add toolbar button or shortcut for "Zoom to selection"; disable when no selection.
4. **Commit:** `test: zoom to selection`
   - [ ] Test that with selection, action fits selection in view; with no selection, disabled or no-op.

**Test plan**

- [ ] Run tests; fix until pass.

**Merge**

- [ ] Merge `feature/zoom-to-selection` into `development`.

---

### Feature 4: Zoom to fit all

- **Branch:** `feature/zoom-to-fit-all`
- **PR title:** `feat: zoom to fit all board content`
- **Module:** canvas (viewport/zoom)

**Acceptance criteria**

- [ ] "Zoom to fit all" (or "Fit board") computes bounding box of all board objects and sets zoom/pan so it fits in viewport with optional padding.
- [ ] If board is empty, action does nothing or resets to default zoom (e.g. 100%) and center.
- [ ] Works from toolbar or shortcut; viewport is local.

**Commits and subtasks**

1. **Commit:** `feat: compute full board bounding box`
   - [ ] Add helper to compute global bounds from all board objects (or cached bounds).
   - [ ] Handle empty board (return default or no-op).
2. **Commit:** `feat: zoom viewport to fit all`
   - [ ] Add action that sets scale and position so full board fits in view with padding.
   - [ ] Reuse same viewport/zoom layer as feature 3.
3. **Commit:** `feat: expose Zoom to fit all in toolbar or shortcut`
   - [ ] Add toolbar button or shortcut for "Zoom to fit all" / "Fit board".
4. **Commit:** `test: zoom to fit all`
   - [ ] Test fit-all with content and empty board.

**Test plan**

- [ ] Run tests; fix until pass.

**Merge**

- [ ] Merge `feature/zoom-to-fit-all` into `development`.

---

### Feature 5: Zoom presets

- **Branch:** `feature/zoom-presets`
- **PR title:** `feat: zoom presets (50%, 100%, 200%)`
- **Module:** canvas (viewport/zoom)

**Acceptance criteria**

- [ ] At least three preset zoom levels (e.g. 50%, 100%, 200%).
- [ ] Presets accessible via toolbar buttons and/or keyboard shortcuts.
- [ ] Selecting a preset sets viewport scale to that value; center or anchor product-defined.
- [ ] Current zoom level indicated in UI (e.g. percentage label near zoom controls).

**Commits and subtasks**

1. **Commit:** `feat: add zoom preset constants and setScale action`
   - [ ] Define preset scale values (e.g. 0.5, 1, 2); add action to set viewport scale to a value.
   - [ ] Use existing viewport scale state; map Konva stage scale to percentage.
2. **Commit:** `feat: zoom preset toolbar buttons`
   - [ ] Add toolbar buttons for 50%, 100%, 200% (or product-defined presets).
   - [ ] Each button sets scale to corresponding value.
3. **Commit:** `feat: show current zoom level in UI`
   - [ ] Add percentage label or control near zoom controls showing current zoom.
4. **Commit:** `test: zoom presets`
   - [ ] Test selecting each preset updates scale and UI.

**Test plan**

- [ ] Run tests; fix until pass.

**Merge**

- [ ] Merge `feature/zoom-presets` into `development`.

---

**Epic 1 completion:** [ ] Epic 1: Input and navigation UX — Done

---

## Epic 2: Property inspector and styling

**Objective:** Provide a single place to edit object properties (fill, stroke, stroke width, font size, opacity) when one or more objects are selected, meeting expectations from tools like Figma and Miro.

### User stories

| ID | User story | Done |
|----|------------|------|
| US 2.1 | As a user, I want to change font size for selected text and sticky elements so that I can control readability. | [ ] |
| US 2.2 | As a user, I want a property inspector when objects are selected so that I can edit fill, stroke, and stroke width in one place. | [ ] |
| US 2.3 | As a user, I want to edit stroke color, stroke width, and fill color in the inspector so that I can style shapes and stickies. | [ ] |
| US 2.4 | As a user, I want to set opacity for selected objects in the inspector so that I can create layered visuals. | [ ] |

### Feature 6: Font size control

- **Branch:** `feature/font-size-control`
- **PR title:** `feat: font size control for sticky notes and text`
- **Module:** ui (toolbar or property inspector)

**Acceptance criteria**

- [ ] When a sticky note or text object is selected, user can change font size via a control (slider or dropdown) in toolbar or property inspector.
- [ ] Chosen size persisted in object's `fontSize` field and synced; other users see updated size.
- [ ] Control shows current font size; range or presets product-defined (e.g. 10–24 px or Small/Medium/Large).
- [ ] Changing font size applies to selected object(s) that support text; multi-selection can apply same size to all.

**Commits and subtasks**

1. **Commit:** `feat: add font size control component`
   - [ ] Create font size control (slider or dropdown) that reads/writes numeric or preset value.
   - [ ] Bind to existing `fontSize` on `IBoardObject` via existing update path.
2. **Commit:** `feat: wire font size control to selection`
   - [ ] Show control when sticky or text object is selected; hide or disable when not applicable.
   - [ ] For multi-selection, apply same size to all or show "mixed" when values differ.
3. **Commit:** `feat: persist and sync fontSize`
   - [ ] Ensure update path syncs `fontSize` to backend; Konva text reflects fontSize on render.
4. **Commit:** `test: font size control`
   - [ ] Test changing font size updates object and syncs; test multi-selection.

**Test plan**

- [ ] Run tests; fix until pass.

**Merge**

- [ ] Merge `feature/font-size-control` into `development`.

---

### Feature 7: Property inspector

- **Branch:** `feature/property-inspector`
- **PR title:** `feat: property inspector panel for selected objects`
- **Module:** ui (sidebar/panel); depends on canvas selection and object update API

**Acceptance criteria**

- [ ] When at least one object is selected, property inspector panel is visible (e.g. right or left side); when nothing selected, panel hidden or neutral state.
- [ ] Inspector shows controls for fill color, stroke color, stroke width; for text/sticky, font size (see feature 6).
- [ ] Opacity shown when data model supports it (feature 9).
- [ ] Changes in inspector update selected object(s) immediately and sync to backend.
- [ ] Multi-selection: controls apply to all where applicable, or show "mixed" when values differ.

**Commits and subtasks**

1. **Commit:** `feat: add PropertyInspector sidebar component`
   - [ ] Create sidebar/panel component that subscribes to selection state.
   - [ ] Show panel when selection length >= 1; hide or show placeholder when selection empty.
2. **Commit:** `feat: bind inspector visibility to selection`
   - [ ] Connect to canvas/board selection context; re-render when selection changes.
   - [ ] Position panel (right or left) per layout.
3. **Commit:** `feat: add inspector layout and placeholder controls`
   - [ ] Add sections for fill, stroke, stroke width; reserve space for font size and opacity.
   - [ ] Wire to existing `updateObject` (or equivalent) with partial updates.
4. **Commit:** `test: property inspector visibility and updates`
   - [ ] Test panel shows when object selected, hides when none; test updates sync.

**Test plan**

- [ ] Run tests; fix until pass.

**Merge**

- [ ] Merge `feature/property-inspector` into `development`.

---

### Feature 8: Stroke and fill in inspector

- **Branch:** `feature/stroke-and-fill-inspector`
- **PR title:** `feat: stroke and fill controls in property inspector`
- **Module:** ui (property inspector)

**Acceptance criteria**

- [ ] Fill color control (e.g. color picker) updates `fill` for selected object(s).
- [ ] Stroke color control updates `stroke`; stroke width control (number input or slider) updates `strokeWidth`.
- [ ] Controls visible for object types that support stroke/fill (shapes, stickies, text as applicable).
- [ ] Values persisted and synced; Konva reflects on next render.

**Commits and subtasks**

1. **Commit:** `feat: add fill color picker to inspector`
   - [ ] Add color picker control bound to `fill`; call updateObject with partial `{ fill }`.
   - [ ] Show for shapes, stickies; hide for types that do not support fill.
2. **Commit:** `feat: add stroke color and stroke width to inspector`
   - [ ] Add stroke color picker bound to `stroke`; add stroke width input/slider bound to `strokeWidth`.
   - [ ] Visibility by object type; multi-selection apply to all or show mixed.
3. **Commit:** `test: stroke and fill inspector`
   - [ ] Test changing fill/stroke/strokeWidth updates object and syncs.

**Test plan**

- [ ] Run tests; fix until pass.

**Merge**

- [ ] Merge `feature/stroke-and-fill-inspector` into `development`.

---

### Feature 9: Opacity slider

- **Branch:** `feature/opacity-slider`
- **PR title:** `feat: opacity control in property inspector`
- **Module:** ui (property inspector); schema change in types/sync

**Acceptance criteria**

- [ ] Each board object has an opacity value (default e.g. 1 or 100%).
- [ ] Property inspector shows opacity control (slider or number) when one or more objects selected; changing it updates selected object(s).
- [ ] Opacity persisted and synced; all clients render same opacity.
- [ ] Opacity applied in canvas (Konva) so object is visually transparent per value.

**Commits and subtasks**

1. **Commit:** `feat: add opacity to IBoardObject and sync`
   - [ ] Add optional `opacity?: number` (0–1) to `IBoardObject`; default 1 if undefined for backward compatibility.
   - [ ] Include `opacity` in Firestore object documents when present; read in sync layer.
2. **Commit:** `feat: apply opacity in Konva rendering`
   - [ ] Apply `opacity` on Konva shape/node for each object type (shape, sticky, text, etc.).
3. **Commit:** `feat: add opacity slider to property inspector`
   - [ ] Add opacity slider (0–100% or 0–1) in inspector when object(s) selected.
   - [ ] Update selected object(s) via existing update path; persist and sync.
4. **Commit:** `test: opacity slider and sync`
   - [ ] Test opacity value persists, syncs, and renders correctly in Konva.

**Test plan**

- [ ] Run tests; fix until pass.

**Merge**

- [ ] Merge `feature/opacity-slider` into `development`.

---

**Epic 2 completion:** [ ] Epic 2: Property inspector and styling — Done

---

## Epic 3: Layout and canvas tools

**Objective:** Enable precise layout via align/distribute toolbar, snap-to-grid, and alignment guides, and allow exporting the board or viewport as an image for sharing.

### User stories

| ID | User story | Done |
|----|------------|------|
| US 3.1 | As a user, I want to align and distribute selected objects via toolbar buttons so that I can arrange layout without using AI. | [ ] |
| US 3.2 | As a user, I want to enable snap-to-grid when moving and resizing so that objects line up neatly. | [ ] |
| US 3.3 | As a user, I want to see alignment guides while dragging so that I can align to other objects. | [ ] |
| US 3.4 | As a user, I want to export the board or viewport as an image so that I can share or document the board. | [ ] |

### Feature 10: Align toolbar

- **Branch:** `feature/align-toolbar`
- **PR title:** `feat: align and distribute toolbar`
- **Module:** canvas or ui (toolbar); reuses ai layout tools

**Acceptance criteria**

- [ ] When two or more objects selected, align/distribute toolbar or button group available (toolbar or context menu).
- [ ] Align options: align left, center, right; align top, middle, bottom; each moves selected objects to align on specified edge or center.
- [ ] Distribute options: distribute horizontally, distribute vertically; spacing between objects equal along chosen axis.
- [ ] Actions update object positions and sync to backend; call same logic as AI tools (`alignObjects`, `distributeObjects` with current selection IDs).

**Commits and subtasks**

1. **Commit:** `feat: add align toolbar button group`
   - [ ] Add toolbar or button group with align left, center, right, top, middle, bottom.
   - [ ] Show only when two or more objects selected; disable otherwise.
2. **Commit:** `feat: wire align buttons to alignObjects`
   - [ ] Call existing `alignObjects` (or internal logic) with selected object IDs and chosen alignment (left/center/right/top/middle/bottom).
   - [ ] Ensure positions sync to backend via existing update path.
3. **Commit:** `feat: add distribute buttons and wire to distributeObjects`
   - [ ] Add distribute horizontally and distribute vertically buttons.
   - [ ] Call existing `distributeObjects` with selected IDs and axis; sync results.
4. **Commit:** `test: align and distribute toolbar`
   - [ ] Test each align and distribute option updates positions and syncs.

**Test plan**

- [ ] Run tests; fix until pass.

**Merge**

- [ ] Merge `feature/align-toolbar` into `development`.

---

### Feature 11: Snap to grid

- **Branch:** `feature/snap-to-grid`
- **PR title:** `feat: snap to grid when moving and resizing`
- **Module:** canvas

**Acceptance criteria**

- [ ] User can enable/disable grid overlay on canvas (dot or line grid); grid spacing configurable or fixed (e.g. 20 px).
- [ ] When grid snap enabled, moving an object snaps position (e.g. top-left or center) to grid; resizing may snap width/height to grid increments.
- [ ] Grid and snap state local (user preference) or per-board; no requirement to sync snap state.
- [ ] Snapping does not break multi-user sync (final positions written to backend).

**Commits and subtasks**

1. **Commit:** `feat: add grid overlay layer`
   - [ ] Add Konva layer or pattern for grid (dot or line); grid spacing constant (e.g. 20 px).
   - [ ] Store grid visibility in local state or user preference; toggle on/off.
2. **Commit:** `feat: snap position to grid on move`
   - [ ] When grid snap enabled, during drag round position (e.g. top-left or center) to grid before committing.
   - [ ] Apply in same layer that handles transform updates; commit final position to backend.
3. **Commit:** `feat: snap size to grid on resize`
   - [ ] When grid snap enabled, round width/height to grid increments on resize where applicable.
4. **Commit:** `test: snap to grid`
   - [ ] Test move and resize snap to grid when enabled; final state syncs.

**Test plan**

- [ ] Run tests; fix until pass.

**Merge**

- [ ] Merge `feature/snap-to-grid` into `development`.

---

### Feature 12: Alignment guides (smart guides)

- **Branch:** `feature/alignment-guides`
- **PR title:** `feat: alignment guides while dragging`
- **Module:** canvas

**Acceptance criteria**

- [ ] During drag, system computes alignment of dragged object edges and center with other objects' edges and centers.
- [ ] When alignment detected, temporary guide lines drawn (horizontal/vertical dashed lines); dragged object can optionally snap to that alignment.
- [ ] Guides disappear when drag ends; not persisted.
- [ ] Performance acceptable with many objects (e.g. limit checks to visible or nearby objects if needed).

**Commits and subtasks**

1. **Commit:** `feat: compute alignment with other objects during drag`
   - [ ] On drag, compute bounding boxes of dragged object and other objects (visible or nearby).
   - [ ] Detect coincident edges and centers within small threshold; return alignment lines (position and orientation).
2. **Commit:** `feat: draw temporary guide lines on canvas`
   - [ ] Add temporary Konva layer for guides; draw horizontal/vertical dashed lines when alignment detected.
   - [ ] Remove guides when drag ends.
3. **Commit:** `feat: optional snap to alignment`
   - [ ] When alignment detected, optionally adjust drag position to snap to guide (product-defined).
4. **Commit:** `test: alignment guides`
   - [ ] Test guides appear during drag when aligned; disappear on drop; performance with many objects.

**Test plan**

- [ ] Run tests; fix until pass.

**Merge**

- [ ] Merge `feature/alignment-guides` into `development`.

---

### Feature 14: Export as image

- **Branch:** `feature/export-as-image`
- **PR title:** `feat: export board or viewport as image`
- **Module:** canvas (Konva stage)

**Acceptance criteria**

- [ ] User can trigger "Export as image" from menu or toolbar (e.g. File or board actions).
- [ ] Option to export current viewport or full board (entire content); product may choose one or both.
- [ ] Output format PNG or JPEG; file downloaded with sensible name (e.g. board name + timestamp).
- [ ] Export includes visible board content (objects, connectors) at reasonable resolution; no sensitive UI (e.g. cursors).

**Commits and subtasks**

1. **Commit:** `feat: export current viewport to data URL`
   - [ ] Use Konva `stage.toDataURL()` for current viewport area; trigger download via blob URL.
   - [ ] Filename: board name + timestamp; format PNG or JPEG.
2. **Commit:** `feat: export full board option`
   - [ ] Compute bounding box of all objects; export that region via stage export API (expand export area).
   - [ ] Optionally scale for resolution (e.g. pixel ratio 2 for retina).
3. **Commit:** `feat: add Export menu or toolbar action`
   - [ ] Add "Export as image" to File menu or board actions; offer viewport vs full board if both supported.
4. **Commit:** `test: export as image`
   - [ ] Test viewport and full board export produce valid image file download.

**Test plan**

- [ ] Run tests; fix until pass.

**Merge**

- [ ] Merge `feature/export-as-image` into `development`.

---

**Epic 3 completion:** [ ] Epic 3: Layout and canvas tools — Done

---

## Epic 4: Board discovery and preferences

**Objective:** Help users find and return to boards quickly by adding Recent and Favorites to the board list (or dashboard).

### User stories

| ID | User story | Done |
|----|------------|------|
| US 4.1 | As a user, I want to see recently opened boards so that I can return to recent work quickly. | [ ] |
| US 4.2 | As a user, I want to star boards as favorites and see them in a Favorites section so that I can access important boards easily. | [ ] |
| US 4.3 | As a user, I want the board list to show All boards, Recent, and Favorites so that I can navigate boards by context. | [ ] |

### Feature 13: Board dashboard (Recent + Favorites)

- **Branch:** `feature/board-dashboard`
- **PR title:** `feat: board dashboard with Recent and Favorites`
- **Module:** sync (user preferences); ui (board list)

**Acceptance criteria**

- [ ] Recent: section shows recently opened boards (e.g. last 5–10), ordered by last opened time; opening a board updates "last opened" for current user.
- [ ] Favorites: users can star/unstar a board; favorited boards appear in "Favorites" section (or pinned at top); star state per user and persisted.
- [ ] Board list or dashboard shows at least "All boards", "Recent", and "Favorites" sections; navigation to board works from any section.
- [ ] Data stored in user preferences (e.g. Firestore `users/{uid}/preferences`); no change to board document schema.

**Commits and subtasks**

1. **Commit:** `feat: user preferences schema and service`
   - [ ] Define Firestore structure e.g. `users/{uid}/preferences` with `recentBoardIds: string[]` and `favoriteBoardIds: string[]`.
   - [ ] Add service or sync layer to read/write preferences; update recent on board open (append and trim to max e.g. 10).
2. **Commit:** `feat: update recent boards on board open`
   - [ ] When user opens a board, append board id to recent and trim to last 5–10; persist to user preferences.
3. **Commit:** `feat: star/unstar board and favorites list`
   - [ ] Add star toggle (per board) that updates `favoriteBoardIds` in user preferences.
   - [ ] Load favorites for current user; display in Favorites section.
4. **Commit:** `feat: board list sections All, Recent, Favorites`
   - [ ] Extend existing board list UI with sections: All boards (or equivalent), Recent, Favorites.
   - [ ] Recent shows boards from `recentBoardIds` in last-opened order; Favorites from `favoriteBoardIds`; navigation from any section.
5. **Commit:** `test: board dashboard and preferences`
   - [ ] Test opening board updates recent; star/unstar updates favorites; sections display and navigate correctly.

**Test plan**

- [ ] Run tests; fix until pass.

**Merge**

- [ ] Merge `feature/board-dashboard` into `development`.

---

**Epic 4 completion:** [ ] Epic 4: Board discovery and preferences — Done

---

## Epic 5: Connectors and diagramming

**Objective:** Improve diagram clarity by supporting connector arrowheads and dashed (or dotted) stroke style, persisted and synced like other object properties.

### User stories

| ID | User story | Done |
|----|------------|------|
| US 5.1 | As a user, I want connectors to show arrowheads (none, start, end, or both) so that I can indicate direction in diagrams. | [ ] |
| US 5.2 | As a user, I want to set connector stroke style (e.g. solid, dashed, dotted) so that I can distinguish diagram elements. | [ ] |

### Feature 15: Connector arrowheads

- **Branch:** `feature/connector-arrowheads`
- **PR title:** `feat: connector arrowheads (none, start, end, both)`
- **Module:** canvas (Connector component); types/sync

**Acceptance criteria**

- [ ] Connectors support arrowhead style: none, end only, start only, or both; default "end" or "none" per product.
- [ ] Style persisted in connector object and synced; all clients render the same.
- [ ] Arrowheads render correctly at connector endpoints; arrow size/style consistent and readable.

**Commits and subtasks**

1. **Commit:** `feat: add arrowheads field to connector type and schema`
   - [ ] Add optional `arrowheads?: 'none' | 'start' | 'end' | 'both'` to connector object type.
   - [ ] Include in Firestore connector documents; read in sync.
2. **Commit:** `feat: render arrowheads in Connector component`
   - [ ] In Connector (Konva), use Line/Arrow or pointerLength/pointerWidth per `arrowheads` value.
   - [ ] Render at start and/or end as specified; default when undefined.
3. **Commit:** `feat: arrowheads control in property inspector`
   - [ ] When connector selected, show arrowheads control (dropdown or buttons) in property inspector; update and sync.
4. **Commit:** `test: connector arrowheads`
   - [ ] Test each arrowhead option persists, syncs, and renders correctly.

**Test plan**

- [ ] Run tests; fix until pass.

**Merge**

- [ ] Merge `feature/connector-arrowheads` into `development`.

---

### Feature 16: Connector stroke style (dashed)

- **Branch:** `feature/connector-stroke-style`
- **PR title:** `feat: connector stroke style (solid, dashed, dotted)`
- **Module:** canvas (Connector component); types/sync

**Acceptance criteria**

- [ ] Connectors support stroke dash option (e.g. solid, dashed, dotted); value persisted and synced.
- [ ] Dashed/dotted connectors render correctly in canvas; dash pattern visible and consistent across clients.
- [ ] UI to set style (e.g. property inspector when connector selected, or connector creation options).

**Commits and subtasks**

1. **Commit:** `feat: add strokeDash/strokeStyle to connector type and schema`
   - [ ] Add optional field e.g. `strokeDash?: number[]` (Konva-style) or `strokeStyle?: 'solid' | 'dashed' | 'dotted'`.
   - [ ] Persist in Firestore for connector objects; read in sync.
2. **Commit:** `feat: apply stroke dash in Connector component`
   - [ ] Konva Line supports `dash` array; map strokeStyle or strokeDash to Konva dash; apply in Connector component.
3. **Commit:** `feat: stroke style control in property inspector`
   - [ ] When connector selected, add stroke style control (dropdown or buttons) in inspector; update and sync.
4. **Commit:** `test: connector stroke style`
   - [ ] Test solid, dashed, dotted persist, sync, and render correctly.

**Test plan**

- [ ] Run tests; fix until pass.

**Merge**

- [ ] Merge `feature/connector-stroke-style` into `development`.

---

**Epic 5 completion:** [ ] Epic 5: Connectors and diagramming — Done

---

## Epic 6: Collaboration and comments

**Objective:** Enable threaded comments on board objects so that collaborators can discuss specific content in context, with real-time sync and clear indicators.

### User stories

| ID | User story | Done |
|----|------------|------|
| US 6.1 | As a user, I want to add comments to a board object so that I can discuss specific content with collaborators. | [ ] |
| US 6.2 | As a user, I want to see comment threads in a sidebar or popover and add replies so that I can have threaded discussions. | [ ] |
| US 6.3 | As a user, I want to see an indicator on objects that have comments so that I can find and open discussions quickly. | [ ] |

### Feature 17: Comments on objects

- **Branch:** `feature/comments-on-objects`
- **PR title:** `feat: comments on board objects with real-time sync`
- **Module:** sync (comments collection); ui (comment panel, indicator); auth (permissions)

**Acceptance criteria**

- [ ] User can add a comment to a board object (e.g. right-click or comment button when object selected); thread created for that object.
- [ ] Comments displayed in sidebar or popover; thread identified by object id; new replies can be added and sync in real time.
- [ ] Indicator on or near object (e.g. icon or count) shows that comments exist; clicking opens thread.
- [ ] Comments stored in structure that associates them with object (e.g. subcollection or collection with `objectId`); real-time listeners keep UI in sync.
- [ ] Only authenticated users with board access can read/write comments (align with existing RBAC).

**Commits and subtasks**

1. **Commit:** `feat: comments schema and Firestore structure`
   - [ ] Define collection/subcollection e.g. `boards/{boardId}/comments` with `objectId`, `authorId`, `text`, `createdAt`, optional `parentId` for replies.
   - [ ] Security rules: read/write only for authenticated users with board access.
2. **Commit:** `feat: comment service and real-time listeners`
   - [ ] Add service to create comment, add reply; subscribe to comments for board or per-object; real-time updates.
3. **Commit:** `feat: comment panel UI and thread view`
   - [ ] Add sidebar or popover component for comment thread; list comments for selected object; form to add comment/reply.
   - [ ] Wire to comment service; show thread identified by object id.
4. **Commit:** `feat: add comment action and object comment indicator`
   - [ ] Add "Add comment" (e.g. right-click or comment button when object selected); create thread and open panel.
   - [ ] Render indicator (icon or count) on or near objects that have comments; click opens thread.
5. **Commit:** `test: comments on objects`
   - [ ] Test add comment, add reply, real-time sync, indicator, permissions.

**Test plan**

- [ ] Run tests; fix until pass.

**Merge**

- [ ] Merge `feature/comments-on-objects` into `development`.

---

**Epic 6 completion:** [ ] Epic 6: Collaboration and comments — Done

---

## Epic 7: AI board intelligence

**Objective:** Add two AI commands that use existing tools and the LLM: "Explain this board" (board-level summary) and "Summarize selection" (selection-based summary), both shown in the AI chat.

### User stories

| ID | User story | Done |
|----|------------|------|
| US 7.1 | As a user, I want an AI command to explain the board so that I can get a short summary of the board content. | [ ] |
| US 7.2 | As a user, I want an AI command to summarize the current selection so that I can get a concise summary of selected text and stickies. | [ ] |

### Feature 18: AI "Explain this board"

- **Branch:** `feature/ai-explain-board`
- **PR title:** `feat: AI command Explain this board`
- **Module:** ai

**Acceptance criteria**

- [ ] User can invoke "Explain this board" (e.g. via AI chat prompt or dedicated button).
- [ ] System retrieves board state (and optionally object details) via existing `getBoardState`; result passed to LLM with prompt asking for concise summary.
- [ ] LLM response displayed in AI chat; no new AI tools or parameters required.
- [ ] Summary reflects current board content (object types, counts, text snippets if included) in readable form.

**Commits and subtasks**

1. **Commit:** `feat: Explain this board command handler`
   - [ ] Add handler or prompt path for "Explain this board"; call `getBoardState` (and optionally `findObjects`).
   - [ ] Include board state in user or system message; prompt model for concise summary.
2. **Commit:** `feat: expose Explain this board in AI chat`
   - [ ] Add dedicated button or suggested prompt in AI chat to invoke "Explain this board".
   - [ ] Stream or return response in existing chat UI.
3. **Commit:** `test: Explain this board`
   - [ ] Test command returns summary reflecting board content; response shown in chat.

**Test plan**

- [ ] Run tests; fix until pass.

**Merge**

- [ ] Merge `feature/ai-explain-board` into `development`.

---

### Feature 19: AI "Summarize selection"

- **Branch:** `feature/ai-summarize-selection`
- **PR title:** `feat: AI command Summarize selection`
- **Module:** ai

**Acceptance criteria**

- [ ] User can invoke "Summarize selection" (e.g. from AI chat or context menu) when at least one object selected.
- [ ] System collects selected objects (IDs and content, e.g. text) and sends to LLM with prompt for short summary.
- [ ] Summary shown in AI chat; reflects only selected objects' content.
- [ ] When nothing selected, command disabled or UI prompts user to select something.

**Commits and subtasks**

1. **Commit:** `feat: Summarize selection command handler`
   - [ ] Add handler that reads selection state; get selected object IDs and their content (e.g. text) via `getBoardState` filtered by IDs or local state.
   - [ ] Pass to LLM with prompt for short summary; stream or return as in existing chat.
2. **Commit:** `feat: expose Summarize selection in AI chat`
   - [ ] Add button or prompt in AI chat for "Summarize selection"; disable or prompt when no selection.
   - [ ] Show summary in chat.
3. **Commit:** `test: Summarize selection`
   - [ ] Test with selection returns summary of selected content; test disabled or prompt when no selection.

**Test plan**

- [ ] Run tests; fix until pass.

**Merge**

- [ ] Merge `feature/ai-summarize-selection` into `development`.

---

**Epic 7 completion:** [ ] Epic 7: AI board intelligence — Done

---

## Epic 8: History and consistency

**Objective:** Provide global undo and redo for object operations (create, delete, move, resize, property changes) so users can correct mistakes and experiment safely, with a defined sync strategy.

### User stories

| ID | User story | Done |
|----|------------|------|
| US 8.1 | As a user, I want to undo and redo object operations so that I can correct mistakes and experiment safely. | [ ] |
| US 8.2 | As a user, I want undo and redo to work for create, delete, move, resize, and property changes so that my workflow is consistent. | [ ] |

### Feature 20: Undo / redo

- **Branch:** `feature/undo-redo`
- **PR title:** `feat: global undo and redo for object operations`
- **Module:** new history service or command stack; consumed by canvas/sync

**Acceptance criteria**

- [ ] Undo reverts the last local operation(s) that affected board objects; Redo reapplies the most recently undone operation.
- [ ] Operations undoable: create object, delete object, move object, resize object, change properties (fill, stroke, opacity, text); connector endpoints and comments scoped separately if needed.
- [ ] Shortcuts: Ctrl/Cmd+Z undo, Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y redo; optional toolbar buttons.
- [ ] After undo/redo, board state consistent and synced to backend; other users eventually see same state (e.g. last-write-wins with inverse update).
- [ ] History bounded (e.g. last 50 operations) to avoid unbounded memory.

**Commits and subtasks**

1. **Commit:** `feat: history service and command pattern`
   - [ ] Add history service or command stack (operation type + params + inverse); push on create, delete, move, resize, property change.
   - [ ] Bounded stack (e.g. last 50); undo pops and applies inverse; redo stack for reapplying.
2. **Commit:** `feat: record create and delete in history`
   - [ ] On create object, push command with inverse (delete with id); on delete, push command with inverse (recreate object).
   - [ ] Undo/redo apply inverse via existing updateObject/delete/create APIs and sync.
3. **Commit:** `feat: record move and resize in history`
   - [ ] On move/resize end, push command with previous and new position/size; inverse restores previous.
   - [ ] Undo/redo apply via updateObject and sync.
4. **Commit:** `feat: record property changes in history`
   - [ ] On property change (fill, stroke, opacity, text, etc.), push command with previous and new values; inverse restores previous.
   - [ ] Undo/redo apply via updateObject and sync.
5. **Commit:** `feat: undo/redo shortcuts and toolbar`
   - [ ] Wire Ctrl/Cmd+Z to undo and Ctrl/Cmd+Shift+Z (or Ctrl/Cmd+Y) to redo; optional toolbar buttons.
   - [ ] Integrate with same keydown layer as other shortcuts; respect focus in input.
6. **Commit:** `test: undo and redo`
   - [ ] Test undo/redo for create, delete, move, resize, property change; test history bound; test sync after undo/redo.

**Test plan**

- [ ] Run tests; fix until pass.

**Merge**

- [ ] Merge `feature/undo-redo` into `development`.

---

**Epic 8 completion:** [ ] Epic 8: History and consistency — Done

---

## Dependency and build order

Key dependencies between features (build in order where one feature depends on another):

```mermaid
flowchart LR
  subgraph viewport [Viewport shared]
    F3[Feature 3: Zoom to selection]
    F4[Feature 4: Zoom to fit all]
    F5[Feature 5: Zoom presets]
  end
  F7[Feature 7: Property inspector]
  F7 --> F6[Feature 6: Font size]
  F7 --> F8[Feature 8: Stroke and fill]
  F7 --> F9[Feature 9: Opacity]
  F10[Feature 10: Align toolbar]
  F13[Feature 13: Board dashboard]
  F15[Feature 15: Connector arrowheads]
  F16[Feature 16: Connector stroke style]
  F17[Feature 17: Comments]
  F18[Feature 18: Explain board]
  F19[Feature 19: Summarize selection]
  F20[Feature 20: Undo and redo]
```

- **Features 3, 4, 5** share the same viewport/zoom state; can be built in any order after viewport layer is in place.
- **Feature 7 (Property inspector)** is the natural home for features **6, 8, 9**; build inspector first, then add font size, stroke/fill, and opacity controls (or in parallel once panel exists).
- **Feature 10 (Align toolbar)** reuses existing AI layout tools (`alignObjects`, `distributeObjects`); no dependency on other v2 features.
- **Feature 13** extends board list and user preferences (sync + auth).
- **Features 15 and 16** both extend the connector model; can be implemented together or in sequence.
- **Feature 20 (Undo/redo)** depends on all object mutation paths; build last.

---

## Summary and checklist

### Epic completion

- [ ] **Epic 1:** Input and navigation UX — Done
- [ ] **Epic 2:** Property inspector and styling — Done
- [ ] **Epic 3:** Layout and canvas tools — Done
- [ ] **Epic 4:** Board discovery and preferences — Done
- [ ] **Epic 5:** Connectors and diagramming — Done
- [ ] **Epic 6:** Collaboration and comments — Done
- [ ] **Epic 7:** AI board intelligence — Done
- [ ] **Epic 8:** History and consistency — Done

### Feature completion

- [ ] Feature 1: Keyboard shortcuts
- [ ] Feature 2: Escape to deselect
- [ ] Feature 3: Zoom to selection
- [ ] Feature 4: Zoom to fit all
- [ ] Feature 5: Zoom presets
- [ ] Feature 6: Font size control
- [ ] Feature 7: Property inspector
- [ ] Feature 8: Stroke and fill in inspector
- [ ] Feature 9: Opacity slider
- [ ] Feature 10: Align toolbar
- [ ] Feature 11: Snap to grid
- [ ] Feature 12: Alignment guides
- [ ] Feature 13: Board dashboard (Recent + Favorites)
- [ ] Feature 14: Export as image
- [ ] Feature 15: Connector arrowheads
- [ ] Feature 16: Connector stroke style
- [ ] Feature 17: Comments on objects
- [ ] Feature 18: AI "Explain this board"
- [ ] Feature 19: AI "Summarize selection"
- [ ] Feature 20: Undo / redo

### Quality gates (reference)

- Tests pass before merging each feature branch into `development`.
- Never merge to `main`; merge only to `development`.
- Preserve SOLID and modular design: one concern per feature branch/module; extend via new components/hooks; depend on abstractions.

### LBI alignment

When starting implementation for a feature, use **`/lbi.request`** (or lite **`/lbi.lite.request`**) with this PRD as context. The PRD-V1 is the planning artifact that feeds LBI specs (e.g. one request per feature). Optionally run **`/lbi.pm.prd`** or **`/lbi.pm.stories`** to align LBI artifacts with this PRD.

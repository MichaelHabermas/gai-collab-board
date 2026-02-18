# CollabBoard v2: Chosen Features (Elaborated)

This document elaborates the **Top 20** features chosen for version 2 from [INITIAL-RESEARCH.md](./INITIAL-RESEARCH.md). The main [PRD](../PRD.md) remains the source of truth for existing scope (infinite canvas, stickies, shapes, connectors, frames, text, selection, transforms, multiplayer, RBAC, toolbar, board list, AI chat, dark mode, and existing AI tools). Here we describe only **improvements or additions** for v2, ordered by **build priority**.

---

## 1. Keyboard shortcuts

### Description

Document and implement keyboard shortcuts for the most common actions: select, pan, duplicate, delete, copy, paste, zoom, and escape. Wire existing UI/Canvas actions to global keydown handlers so power users and daily users can work without reaching for the toolbar.

### Rationale

Users expect Copy/Paste/Delete/Duplicate/Escape in every design or whiteboard tool (Miro, Figma, Excalidraw). Implementation is low effort (attach existing actions to keydown) with high expectation and daily use.

### Acceptance criteria

- **Ctrl/Cmd+C** copies the current selection to an internal clipboard.
- **Ctrl/Cmd+V** pastes from clipboard onto the board (with a small offset to avoid overlap).
- **Delete** or **Backspace** deletes the selected object(s).
- **Ctrl/Cmd+D** duplicates the selected object(s).
- **Escape** clears selection and exits text-edit mode (see feature 2).
- Shortcuts are disabled when focus is in an input or text-edit field (e.g. sticky note text).
- A shortcuts reference is documented (e.g. in-app help or README).

### Technical notes

- No schema changes. Wire existing handlers (copy, paste, delete, duplicate, deselect) in canvas/board layer to `keydown` (with `useEffect` or global listener). Use `metaKey`/`ctrlKey` for cross-platform (Mac/Windows).
- UI placement: logic lives in the same layer as selection and clipboard; optional tooltip or menu item showing shortcut text.

### Dependencies

- Depends on existing selection and clipboard (or minimal clipboard state). Escape behavior is detailed in feature 2.

---

## 2. Escape to deselect

### Description

Ensure the Escape key consistently clears the current selection and exits text-edit mode (e.g. when editing a sticky note or text element). Prevents users from being "stuck" in selection or edit state.

### Rationale

Trivial to implement (single handler), reduces frustration, and is expected in every design tool.

### Acceptance criteria

- Pressing **Escape** when one or more objects are selected clears the selection (no object selected).
- Pressing **Escape** when editing text inside a sticky or text element commits or cancels the edit and exits text-edit mode, then clears selection if appropriate.
- Escape does not trigger any other action (e.g. close modals only if no selection/edit is active, or document modal behavior separately).

### Technical notes

- No data/schema changes. Single keydown handler for `Escape` that calls deselect and/or endTextEdit. Ensure it runs after other escape handlers (e.g. close AI panel) where product specifies.

### Dependencies

- Works with feature 1 (keyboard shortcuts); can be implemented in the same keydown wiring.

---

## 3. Zoom to selection

### Description

Provide an action (toolbar button or shortcut) that fits the current selection in the viewport and optionally zooms to a comfortable level. Essential for large boards where users need to focus on a subset of objects.

### Rationale

Very common in Miro/Figma; implementable with existing viewport/zoom state and selection bounds; clear value for large boards.

### Acceptance criteria

- When one or more objects are selected, a "Zoom to selection" action (button or shortcut) adjusts the viewport so the selection’s bounding box is visible and centered (or nearly so).
- Zoom level is set so the selection fills a reasonable portion of the viewport (e.g. with padding), not necessarily 100%.
- When nothing is selected, the action is disabled or does nothing (or alternatively fits entire board—see feature 4).
- Pan and zoom state are updated; other users’ viewports are not affected (viewport is local).

### Technical notes

- No backend or schema changes. Use existing viewport/zoom state (e.g. in canvas or board context). Compute selection bounding box from selected object positions/sizes; set scale and position so that box fits in view with padding. Konva stage scale and position can be updated accordingly.

### Dependencies

- Requires selection (existing) and viewport/zoom state. Shares viewport logic with features 4 and 5.

---

## 4. Zoom to fit all

### Description

Provide a single action that fits the entire board content in the current viewport so users can see the full canvas at once. Valuable for onboarding and navigation on large boards.

### Rationale

Same viewport layer as zoom-to-selection; often implemented together; high usefulness for onboarding and navigation.

### Acceptance criteria

- A "Zoom to fit all" (or "Fit board") action computes the bounding box of all board objects (or visible content) and sets zoom and pan so that box fits inside the viewport with optional padding.
- If the board is empty, the action either does nothing or resets to a default zoom (e.g. 100%) and center.
- Works from toolbar or shortcut; viewport is local (no sync of viewport to other users).

### Technical notes

- Reuse the same viewport/zoom layer as feature 3. Compute global bounds from all objects (or from a cached bounds if available); set scale and position. No schema change.

### Dependencies

- Shares viewport logic with features 3 and 5.

---

## 5. Zoom presets

### Description

Provide quick zoom levels (e.g. 50%, 100%, 200%) via toolbar buttons or keyboard shortcuts so users can jump to a known zoom without repeated zoom in/out.

### Rationale

Extends current zoom with simple buttons/shortcuts; low complexity; matches user expectation from other tools.

### Acceptance criteria

- At least three preset zoom levels are available (e.g. 50%, 100%, 200%); exact values can be product-defined.
- Presets are accessible via toolbar buttons and/or keyboard shortcuts.
- Selecting a preset sets the viewport scale to that value; center or anchor can be product-defined (e.g. center of viewport).
- Current zoom level is indicated in the UI (e.g. percentage label near zoom controls).

### Technical notes

- No schema change. Use existing viewport scale state; add buttons/shortcuts that set scale to fixed values. Konva stage scale maps directly to zoom percentage.

### Dependencies

- Shares viewport/zoom state with features 3 and 4.

---

## 6. Font size control

### Description

Expose an explicit font size control in the UI (slider or dropdown) for sticky notes and text elements. The value is synced with the existing `fontSize` field in the board object data model so that all clients render text at the chosen size.

### Rationale

Data model already has `fontSize`; adding a control is low effort with high user expectation for text and stickies.

### Acceptance criteria

- When a sticky note or text object is selected, the user can change its font size via a control (slider or dropdown) in the toolbar or property inspector.
- The chosen size is persisted in the object’s `fontSize` field and synced; other users see the updated size.
- The control shows the current font size (e.g. numeric value or preset label); range or presets are product-defined (e.g. 10–24 px or Small/Medium/Large).
- Changing font size applies to the selected object(s) that support text (stickies, text); multi-selection can apply the same size to all.

### Technical notes

- No schema change; `fontSize` already exists on `IBoardObject`. Add UI control that reads/writes `fontSize` via existing update path. Konva text elements already support fontSize. Prefer property inspector (feature 7) as the primary place for this control once available.

### Dependencies

- Fits naturally inside the property inspector (feature 7); can be implemented in toolbar first, then moved or duplicated in inspector.

---

## 7. Property inspector

### Description

When one or more objects are selected, show a side panel (property inspector) that allows editing common properties: fill, stroke, stroke width, and opacity. For text and sticky notes, it also exposes font size (and later font family). This panel is the central place for object-level styling and will host stroke/fill, opacity, and font controls.

### Rationale

Core expectation from Figma/Miro; starting with fill, stroke, stroke width, and opacity enables many later refinements (font family, lock, etc.) without redesigning the UI.

### Acceptance criteria

- When at least one object is selected, a property inspector panel is visible (e.g. right or left side); when nothing is selected, the panel is hidden or shows a neutral state.
- The inspector shows controls for: fill color, stroke color, stroke width. For text/sticky, font size is also available (see feature 6).
- Opacity is shown when the data model supports it (see feature 9).
- Changes in the inspector update the selected object(s) immediately and sync to the backend.
- Multi-selection: controls apply to all selected objects where applicable (e.g. set fill for all, or show "mixed" when values differ).

### Technical notes

- No new schema required for the initial set; reuse `fill`, `stroke`, `strokeWidth` from `IBoardObject`. Opacity requires adding `opacity` (feature 9). UI: new sidebar component that subscribes to selection; form controls bound to object props via existing update API. Konva applies these properties to shapes/text.

### Dependencies

- Features 6, 8, and 9 (font size, stroke/fill, opacity) are logically part of or tightly integrated with the property inspector; they can be built as the inspector is built or added into it afterward.

---

## 8. Stroke and fill in inspector

### Description

In the property inspector, provide separate controls for stroke color, stroke width, and fill color for shapes and stickies. This makes the existing `fill`, `stroke`, and `strokeWidth` fields editable from the UI.

### Rationale

Part of the property inspector; reuses existing schema; no backend change.

### Acceptance criteria

- Fill color control (e.g. color picker) updates `fill` for the selected object(s).
- Stroke color control updates `stroke`; stroke width control (e.g. number input or slider) updates `strokeWidth`.
- Controls are visible for object types that support stroke/fill (shapes, stickies, text as applicable). Connectors may have separate stroke styling (see features 15–16).
- Values are persisted and synced; Konva reflects them on the next render.

### Technical notes

- No schema change; `IBoardObject` already has `fill`, `stroke`, `strokeWidth`. Inspector binds to these fields and calls existing `updateObject` (or equivalent) with partial updates.

### Dependencies

- Implemented as part of or immediately after the property inspector (feature 7).

---

## 9. Opacity slider

### Description

Add a global opacity control per object in the property inspector. Each board object can have an opacity value (0–100% or 0–1) that is applied when rendering (e.g. via Konva’s opacity property).

### Rationale

Adds `opacity` to `IBoardObject` and one control in the property inspector; straightforward in Konva; expected for professional boards.

### Acceptance criteria

- Each board object has an opacity value (default e.g. 1 or 100%).
- The property inspector shows an opacity control (slider or number) when one or more objects are selected; changing it updates the selected object(s).
- Opacity is persisted and synced; all clients render the object with the same opacity.
- Opacity is applied in the canvas (Konva) so that the object (and its content) is visually transparent according to the value.

### Technical notes

- **Schema**: Add optional `opacity?: number` to `IBoardObject` (e.g. 0–1). Default to 1 if undefined for backward compatibility. Apply in Konva via `opacity` on the shape/node. Firestore: include `opacity` in object documents when present.

### Dependencies

- Depends on property inspector (feature 7); the opacity control lives in that panel.

---

## 10. Align toolbar

### Description

Provide quick toolbar buttons for aligning and distributing the current selection: align left, center, right, top, middle, bottom, and distribute horizontally/vertically. Implementation reuses the existing AI layout tools (`alignObjects`, `distributeObjects`) so the same logic drives both UI and AI.

### Rationale

Reuse AI `alignObjects`/`distributeObjects` from the UI; high usefulness; layout logic already exists in the backend/AI layer.

### Acceptance criteria

- When two or more objects are selected, an align/distribute toolbar or button group is available (e.g. in the toolbar or context menu).
- Align options: align left, center, right; align top, middle, bottom. Each option moves the selected objects so they align on the specified edge or center.
- Distribute options: distribute horizontally, distribute vertically. Spacing between objects is made equal along the chosen axis.
- Actions update object positions and sync to the backend; no new backend API is required—call the same logic as the AI tools (e.g. `alignObjects`, `distributeObjects` with the current selection IDs).

### Technical notes

- No new schema. Call existing `alignObjects` and `distributeObjects` (or their internal logic) with the list of selected object IDs and the chosen alignment/direction. UI: buttons that trigger these with the appropriate parameters. Can live in toolbar or in property inspector area.

### Dependencies

- Depends on selection; reuses existing AI layout implementation (align/distribute).

---

## 11. Snap to grid

### Description

Offer an optional grid (visible overlay) and snap-to-grid behavior when moving and resizing objects. Users can turn the grid on/off and objects will snap to grid lines or intersections for cleaner layouts.

### Rationale

Well-understood pattern; moderate effort; high user expectation from design tools.

### Acceptance criteria

- User can enable/disable a grid overlay on the canvas (e.g. dot or line grid); grid spacing is configurable or fixed (e.g. 20 px).
- When grid snap is enabled, moving an object snaps its position (e.g. top-left corner or center) to the grid; resizing may snap width/height to grid increments where applicable.
- Grid and snap state are local (user preference) or per-board as product specifies; no strict requirement to sync snap state.
- Snapping does not break multi-user sync (final positions are still written to the backend).

### Technical notes

- No backend schema change. Client-only: store grid visibility and snap-on-move/resize flags; during drag/resize, round position/size to grid before committing. Konva can draw a grid layer or use a pattern; snapping is applied in the same layer that handles transform updates.

### Dependencies

- Independent; can optionally share "grid visibility" with alignment guides (feature 12) if both use the same overlay or canvas layer.

---

## 12. Alignment guides (smart guides)

### Description

While the user is dragging an object, show temporary alignment lines (smart guides) that indicate when the selection aligns with edges or centers of other objects (Figma-style). This improves layout quality without changing the backend.

### Rationale

Improves layout quality; more logic (detect edges/centers, draw lines) but no backend change; users expect it from Figma/Miro.

### Acceptance criteria

- During drag, the system computes alignment of the dragged object’s edges and center with other objects’ edges and centers.
- When alignment is detected, temporary guide lines are drawn (e.g. horizontal/vertical dashed lines) and the dragged object can optionally snap to that alignment.
- Guides disappear when the drag ends; they are not persisted.
- Performance remains acceptable with many objects (e.g. limit checks to visible or nearby objects if needed).

### Technical notes

- No schema change; client-only. On drag, compute bounding boxes of the dragged object and other objects; detect coincident edges/centers (within a small threshold); draw Konva lines on a temporary layer; optionally adjust drag position to snap. No sync impact.

### Dependencies

- None; can share canvas/selection infrastructure with snap to grid (feature 11) for consistency.

---

## 13. Board dashboard (Recent + Favorites)

### Description

Enhance the board list with a dashboard-style experience: "Recent" (recently opened boards, e.g. last 5–10 ordered by last opened) and "Favorites" (boards the user has starred). This extends the current board list rather than replacing it.

### Rationale

Board list already exists; adding Recent and Favorites requires minimal schema (e.g. user preferences in Firestore); high daily-use value.

### Acceptance criteria

- **Recent**: A section shows recently opened boards (e.g. last 5–10), ordered by last opened time. Opening a board updates "last opened" for the current user.
- **Favorites**: Users can star/unstar a board; favorited boards appear in a "Favorites" section (or pinned at top). Star state is per user and persisted.
- The board list or dashboard shows at least "All boards" (or equivalent), "Recent", and "Favorites" sections; navigation to a board works from any section.
- Data is stored in user preferences (e.g. Firestore `users/{uid}/preferences` or similar); no change to board document schema.

### Technical notes

- **Schema**: Minimal—e.g. `users/{uid}/preferences` with `recentBoardIds: string[]` and `favoriteBoardIds: string[]`. Update recent on board open (append and trim); update favorites on star toggle. UI: extend existing board list component with sections and star icons.

### Dependencies

- Extends current board list and any existing "my boards" or navigation; may depend on auth (current user id) for preferences.

---

## 14. Export as image

### Description

Allow users to export the visible viewport or the full board as a PNG or JPEG image for sharing or documentation. Implementation uses the Konva stage’s export API (e.g. `toDataURL`).

### Rationale

Expected for sharing; low risk; high user ask.

### Acceptance criteria

- User can trigger "Export as image" from a menu or toolbar (e.g. File or board actions).
- Option to export either the **current viewport** or the **full board** (entire content); product may choose one or both.
- Output format is PNG or JPEG; file is downloaded with a sensible name (e.g. board name + timestamp).
- Export includes the visible board content (objects, connectors, etc.) at a reasonable resolution; no sensitive UI (e.g. cursors) need be included.

### Technical notes

- No schema change. Use Konva `stage.toDataURL()` (or equivalent) for the area to export; for "full board", expand the export region to the bounding box of all objects. Trigger download via a blob URL or similar. Optionally scale for resolution (e.g. pixel ratio 2 for retina).

### Dependencies

- None beyond existing canvas and Konva stage.

---

## 15. Connector arrowheads

### Description

Allow connectors to display optional arrowhead(s) at one or both ends. A style field (e.g. none, end, start, both) is added to the connector model and rendered in the Connector component (Konva).

### Rationale

Single style field and Konva arrow rendering; small schema/UI change; expected for diagrams.

### Acceptance criteria

- Connectors support an arrowhead style: none, end only, start only, or both. Default can be "end" or "none" per product.
- The style is persisted in the connector object and synced; all clients render the same.
- Arrowheads render correctly at the connector endpoints (and at start if selected); arrow size/style is consistent and readable.

### Technical notes

- **Schema**: Add optional field to connector object, e.g. `arrowheads?: 'none' | 'start' | 'end' | 'both'`. Konva Line can use `pointerLength` and `pointerWidth`, or use Arrow shape; ensure the connector component reads the field and configures Konva accordingly. Firestore: add field to connector documents.

### Dependencies

- None; may be combined with connector stroke style (feature 16) in the same connector model/component.

---

## 16. Connector stroke style (dashed)

### Description

Support dashed or dotted stroke for connectors. A field (e.g. `strokeDash` or `dash`) is added to the connector model and applied in Konva so diagram styles can be distinguished.

### Rationale

Small addition to connector model and Konva; improves diagram clarity.

### Acceptance criteria

- Connectors support a stroke dash option (e.g. solid, dashed, dotted). The value is persisted and synced.
- Dashed/dotted connectors render correctly in the canvas; dash pattern is visible and consistent across clients.
- UI to set the style (e.g. in property inspector when a connector is selected, or in connector creation options).

### Technical notes

- **Schema**: Add optional field, e.g. `strokeDash?: number[]` (Konva-style dash array) or `strokeStyle?: 'solid' | 'dashed' | 'dotted'`. Konva Line supports `dash` array. Apply in Connector component; persist in Firestore for connector objects.

### Dependencies

- Can be implemented alongside connector arrowheads (feature 15); both extend the connector model and the same inspector/tool UI.

---

## 17. Comments on objects

### Description

Add comment threads attached to specific board objects. Users can open a thread from an indicator on the object (e.g. comment icon or count) and view/add replies in a sidebar or popover; comments sync in real time.

### Rationale

New subcollection or structure and real-time sync; higher complexity and product surface but strong collaboration value.

### Acceptance criteria

- User can add a comment to a board object (e.g. right-click or comment button when object is selected); a thread is created for that object.
- Comments are displayed in a sidebar or popover; thread is identified by object id. New replies can be added and are synced in real time.
- An indicator on or near the object (e.g. icon or count) shows that comments exist; clicking it opens the thread.
- Comments are stored in a structure that associates them with the object (e.g. subcollection `objects/{objectId}/comments` or a comments collection with `objectId`); real-time listeners keep the UI in sync.
- Permissions: only authenticated users with access to the board can read/write comments (align with existing RBAC).

### Technical notes

- **Schema**: New collection or subcollection for comments, e.g. `boards/{boardId}/comments` with `objectId`, `authorId`, `text`, `createdAt`, and optionally `parentId` for replies. Or `boards/{boardId}/objects/{objectId}/comments`. Real-time: use Firestore listeners; UI: comment panel + indicator component. Consider batch reads if many objects have comments.

### Dependencies

- Depends on auth and board membership; extends existing board/object model with a comment surface.

---

## 18. AI: "Explain this board"

### Description

An AI command that returns a short, natural-language summary of the board’s content. The implementation uses the existing `getBoardState` (and optionally `findObjects`) to gather context and sends it to the LLM to generate the summary, which is shown in the AI chat panel.

### Rationale

Uses existing getBoardState + LLM; no new tools; improves AI usefulness with low implementation cost.

### Acceptance criteria

- User can invoke "Explain this board" (e.g. via AI chat prompt or a dedicated button).
- The system retrieves board state (and optionally object details) via existing `getBoardState`; the result is passed to the LLM with a prompt asking for a concise summary.
- The LLM response is displayed in the AI chat; no new AI tools or parameters are required.
- Summary reflects the current board content (object types, counts, text snippets if included, etc.) in a readable form.

### Technical notes

- No new AI tools. In the AI flow: call `getBoardState` (and optionally `findObjects` for structure), include the result in the user or system message, and ask the model to summarize. Response is streamed or returned as in existing chat. No schema change for board objects.

### Dependencies

- Depends on existing AI chat panel and `getBoardState` (and optionally `findObjects`).

---

## 19. AI: "Summarize selection"

### Description

When the user has one or more objects selected, an AI command returns a concise summary of the selection (e.g. text from stickies and text elements). This connects selection to the AI: the system sends selected object IDs and their content to the LLM and shows the summary in chat.

### Rationale

Uses existing findObjects/board state + LLM for selected IDs; connects selection to AI; medium effort, high perceived value.

### Acceptance criteria

- User can invoke "Summarize selection" (e.g. from AI chat or context menu) when at least one object is selected.
- The system collects the selected objects (IDs and content, e.g. text) and sends them to the LLM with a prompt asking for a short summary.
- The summary is shown in the AI chat; it reflects only the selected objects’ content.
- When nothing is selected, the command is disabled or the UI prompts the user to select something.

### Technical notes

- No new tools; use existing board state and selection. Pass selected object IDs and their `text` (or relevant fields) to the LLM; optionally use `getBoardState` filtered by IDs or local state. Same chat/streaming as feature 18.

### Dependencies

- Depends on selection state and AI chat; reuses `getBoardState` or in-memory board state filtered by selection.

---

## 20. Undo / redo

### Description

Global undo and redo for object operations on the board. The client maintains a history stack of reversible operations (create, move, resize, delete, style changes, etc.) and supports undo/redo via keyboard or toolbar. Sync strategy (e.g. last-write-wins vs. operational transform) must be defined so that local undo/redo and multi-user updates behave correctly.

### Rationale

High expectation and usefulness; requires history stack and sync strategy; higher complexity and risk, so placed after foundational UX and AI wins.

### Acceptance criteria

- **Undo** reverts the last local operation (or the last N operations) that affected board objects; **Redo** reapplies the most recently undone operation.
- Operations that are undoable include at least: create object, delete object, move object, resize object, change properties (fill, stroke, opacity, text). Connector endpoint changes and comment edits can be included or scoped separately.
- Shortcuts: **Ctrl/Cmd+Z** for undo, **Ctrl/Cmd+Shift+Z** (or **Ctrl/Cmd+Y**) for redo; optional toolbar buttons.
- After undo/redo, the board state is consistent and synced to the backend; other users eventually see the same state (sync strategy to be defined—e.g. undo pushes an inverse update, with last-write-wins).
- History is bounded (e.g. last 50 operations) to avoid unbounded memory use.

### Technical notes

- **Schema**: No change to `IBoardObject`; history is client-side. Design: command pattern or action log (operation type + params + inverse). On undo, compute inverse update and apply locally and to backend (e.g. `updateObject` or delete). Sync: clarify whether undo is "just another update" (last-write-wins) or requires OT/CRDT; for v2, last-write-wins with clear semantics may be acceptable. Persisting history for refresh/reload is optional and increases complexity.

### Dependencies

- Depends on all object mutation paths (create, update, delete) so that they can be recorded and reversed; no dependency on other v2 features.

---

## Summary

The 20 features above are ordered by build priority and grouped roughly as follows:

1. **Quick wins (1–5)**: Keyboard shortcuts, Escape to deselect, Zoom to selection, Zoom to fit all, Zoom presets—low effort, high expectation, viewport logic shared.
2. **Property and typography (6–9)**: Font size control, Property inspector, Stroke and fill in inspector, Opacity slider—property inspector is the home for styling; font size and opacity may extend the data model slightly.
3. **Layout and navigation (10–14)**: Align toolbar, Snap to grid, Alignment guides, Board dashboard (Recent + Favorites), Export as image—reuse existing layout tools and board list; export uses Konva.
4. **Connectors and collaboration (15–17)**: Connector arrowheads, Connector stroke style (dashed), Comments on objects—connector model extended; comments add new storage and UI.
5. **AI and history (18–20)**: AI "Explain this board", AI "Summarize selection", Undo/redo—AI features use existing tools and LLM; undo/redo is last due to sync and complexity.

**Dependencies**: The property inspector (7) is the natural place for font size (6), stroke/fill (8), and opacity (9). Zoom features (3–5) share viewport/zoom state. The align toolbar (10) reuses existing AI layout tools. The board dashboard (13) extends the current board list and user preferences.

---

## Deferred (out of scope for this v2 list)

The following are **not** in the Top 20 for v2 but were in the full brainstorm (Section A of INITIAL-RESEARCH). They are deferred to a later phase or backlog:

- **Font family picker** (3), **Tool panel** (6), **Connector waypoints** (9), **Shape stroke dash** (10), **Richer text styling** (11), **Snap to objects** (14), **Board search** (22), **Board thumbnails** (23), **Comments on board** (25), **Export as PDF** (27), **Copy selection as image** (28), **Paste in place** (30), **Group/ungroup** (31), **Lock object** (32), **Bring forward/send backward** (33), **Distribute spacing** (35) as a separate control, **AI: Suggest layout** (37), **AI: Generate from prompt** (38), **AI: Change style** (40), **AI: Create template** (41), **AI: connector from description** (42), **AI: bulk edit** (43), **Contextual AI suggestions** (44), **Minimap** (45), **Ruler/coordinate display** (46), **Grid overlay toggle** (47), **Frame collapse/expand** (48), **Sticky note size presets** (49).

Undo/redo (20) is **in** scope but last due to complexity; items such as **Export as PDF**, **Group/ungroup**, and **Paste in place** are high value but explicitly deferred to keep v2 scope focused.

# CollabBoard v2: Initial Research — Candidate Features and Priority List

**Source of truth**: [docs/PRD.md](../PRD.md). Version-2 PRD at `docs/phases/version-2/PRD.md` is empty. The main PRD already specifies: infinite canvas, sticky notes, shapes (rect/circle/line), connectors, frames, text, selection, transforms, multiplayer cursors/presence, RBAC, toolbar with tools + color picker, board list sidebar, AI chat panel, dark mode, and AI tools (create/move/resize/changeColor/delete, getBoardState, findObjects, arrangeInGrid, alignObjects, distributeObjects). The list below only proposes **improvements or additions** not fully specified or shipped.

---

## Section A: Full Brainstorm (30–50 Items)

Each item: **short name** + **one-line description**.

1. **Property inspector** — When one or more objects are selected, show a side panel to edit fill, stroke, stroke width, opacity, and (for text/sticky) font size and font family.
2. **Font size control** — Explicit font size control in UI (slider or dropdown) for sticky notes and text elements, synced with existing `fontSize` in data model.
3. **Font family picker** — Allow choosing font family for text and sticky notes (e.g. Inter, Roboto, system fonts) and persist in `IBoardObject`.
4. **Stroke and fill in inspector** — In property inspector, separate controls for stroke color, stroke width, and fill color for shapes and stickies.
5. **Opacity slider** — Global opacity control per object in property inspector; add `opacity` to `IBoardObject` and apply in Konva.
6. **Tool panel (left/right)** — Docked panel with tool categories (shapes, text, connectors, frames) and sub-options instead of only a compact toolbar.
7. **Connector arrowheads** — Option to show arrowhead(s) at connector end(s); add style field and render in `Connector`.
8. **Connector stroke style** — Dashed or dotted line option for connectors; add `strokeDash` (or similar) to connector model and Konva.
9. **Connector waypoints** — Allow users to add intermediate points on connectors for bent paths (or simple orthogonal routing).
10. **Shape stroke dash** — Dashed/dotted stroke for rectangles and circles.
11. **Richer text styling** — Bold/italic/underline for text and sticky note content (inline or block-level).
12. **Alignment guides (smart guides)** — When dragging, show temporary alignment lines to other objects' edges/centers (Figma-style).
13. **Snap to grid** — Optional grid with snap-to-grid when moving/resizing.
14. **Snap to objects** — Snap selection to edges or centers of nearby objects while dragging.
15. **Zoom to selection** — Action (button or shortcut) to fit current selection in viewport and optionally zoom in.
16. **Zoom to fit all** — Fit entire board content in viewport in one action.
17. **Zoom presets** — Quick buttons or shortcuts for 50%, 100%, 200% zoom.
18. **Keyboard shortcuts** — Document and implement shortcuts for select, pan, duplicate, delete, copy, paste, zoom, escape.
19. **Board dashboard** — Dedicated landing page with "All boards", "Recent", and "Favorites" sections (enhance current board list).
20. **Recent boards** — Section in board list or dashboard showing recently opened boards (e.g. last 5–10), ordered by last opened.
21. **Favorites / star boards** — Let users mark boards as favorites and filter or pin them in board list/dashboard.
22. **Board search** — Search boards by name (and optionally by content) in board list/dashboard.
23. **Board thumbnails** — Show a small preview thumbnail per board in list/dashboard (e.g. canvas snapshot or placeholder).
24. **Comments on objects** — Add comment threads attached to a board object; show indicator and open thread in sidebar or popover.
25. **Comments on board** — Global board-level comments (e.g. one thread per board) for feedback.
26. **Export as image** — Export visible viewport or full board as PNG/JPEG (e.g. via Konva stage.toDataURL).
27. **Export as PDF** — Export board (or selection) as PDF for sharing/printing.
28. **Copy selection as image** — Copy current selection to clipboard as image for pasting elsewhere.
29. **Undo / redo** — Global undo and redo for object operations (add history stack and sync strategy).
30. **Paste in place** — Paste copied objects at same relative position as original (or with offset).
31. **Group / ungroup** — Group selected objects into a single logical unit; move/delete as one; ungroup to break apart.
32. **Lock object** — Lock selected object(s) to prevent accidental move/resize (visibility in inspector).
33. **Bring forward / send backward** — Layer order controls (z-index) for overlapping objects.
34. **Align toolbar** — Quick buttons for align left/center/right/top/middle/bottom and distribute horizontally/vertically on selection (reuse AI layout logic in UI).
35. **Distribute spacing** — Evenly distribute spacing between 3+ selected objects (horizontal or vertical).
36. **AI: "Explain this board"** — AI command that returns a short summary of board content (from getBoardState/findObjects + LLM).
37. **AI: "Suggest layout"** — AI suggests and applies arrangement (grid/align) based on selection or full board.
38. **AI: "Generate from prompt"** — Create a set of stickies/shapes from a prompt (e.g. "5 brainstorm topics for product X").
39. **AI: "Summarize selection"** — For selected text/stickies, AI returns a concise summary in chat.
40. **AI: "Change style"** — Natural language to change color, opacity, or style of selected objects (wire to changeColor and future style tools).
41. **AI: "Create template"** — AI creates a template (e.g. SWOT, journey map) from a short description; reuse existing create tools.
42. **AI: connector from description** — "Connect A to B" / "Draw arrows from topic to subtopics" using createConnector and findObjects.
43. **AI: bulk edit** — "Make all yellow stickies blue" or "Resize all frames to 200x150" via findObjects + existing tools.
44. **Contextual AI suggestions** — After selection, show 1–3 suggested AI actions in chat or toolbar (e.g. "Arrange in grid", "Summarize").
45. **Minimap** — Small overview map of board in corner for navigation and panning (read-only thumbnail of canvas).
46. **Ruler or coordinate display** — Optional ruler on edges or cursor position (x, y) for precision.
47. **Grid overlay toggle** — Toggle visible grid overlay on canvas (dot or line grid) without necessarily snapping.
48. **Frame collapse/expand** — Collapse frame to title bar and expand to full content for large boards.
49. **Sticky note size presets** — Small / medium / large presets for new sticky notes (or in property inspector).
50. **Escape to deselect** — Ensure Escape key clears selection and exits text-edit mode consistently.

---

## Section B: Top 20 Ordered List (Build Order)

Same items as above, ordered by implementation priority. Criteria: **maximize** usefulness, user expectation (Miro/Figma/Excalidraw), ease of implementation; **minimize** risk and complexity.

| # | Short name | Justification |
|---|------------|---------------|
| 1 | **Keyboard shortcuts** | Users expect Copy/Paste/Delete/Duplicate/Escape; low effort (wire existing actions to keydown), high expectation and daily use. |
| 2 | **Escape to deselect** | Trivial (single handler), reduces frustration; expected in every design tool. |
| 3 | **Zoom to selection** | Very common in Miro/Figma; implement with existing viewport/zoom state and selection bounds; clear value for large boards. |
| 4 | **Zoom to fit all** | Same viewport layer as zoom-to-selection; often implemented together; high usefulness for onboarding and navigation. |
| 5 | **Zoom presets** | Quick 50%/100%/200% (or similar); extends current zoom with simple buttons/shortcuts; low complexity. |
| 6 | **Font size control** | Data model already has `fontSize`; add slider or dropdown in toolbar or a minimal inspector; high expectation for text/stickies. |
| 7 | **Property inspector** | Core expectation from Figma/Miro; start with fill, stroke, stroke width, opacity for selection; enables many later refinements (font family, lock, etc.). |
| 8 | **Stroke and fill in inspector** | Part of property inspector; reuse existing `fill`/`stroke`/`strokeWidth`; no schema change. |
| 9 | **Opacity slider** | Add `opacity` to `IBoardObject` and one control in property inspector; straightforward in Konva; expected for professional boards. |
| 10 | **Align toolbar** | Reuse AI `alignObjects`/`distributeObjects` from UI; quick buttons for align and distribute; high usefulness, implementation already in backend. |
| 11 | **Snap to grid** | Optional grid overlay + snap on move/resize; well-understood pattern; moderate effort, high expectation. |
| 12 | **Alignment guides (smart guides)** | Improves layout quality; more logic (detect edges/centers, draw lines) but no backend change; users expect it from Figma/Miro. |
| 13 | **Board dashboard (Recent + Favorites)** | Board list already exists; add "Recent" (last-opened) and "Favorites" (star) sections; requires minimal schema (e.g. user preferences in Firestore); high daily-use value. |
| 14 | **Export as image** | Expected for sharing; Konva `stage.toDataURL()`; viewport or full board; low risk, high ask from users. |
| 15 | **Connector arrowheads** | Single style field and Konva arrow rendering; small schema/UI change; expected for diagrams. |
| 16 | **Connector stroke style (dashed)** | Dashed/dotted option for connectors; small addition to connector model and Konva; improves diagram clarity. |
| 17 | **Comments on objects** | New subcollection or structure for comments, real-time sync; higher complexity and product surface but strong collaboration value. |
| 18 | **AI: "Explain this board"** | Uses existing getBoardState + LLM; no new tools; improves AI usefulness with low implementation cost. |
| 19 | **AI: "Summarize selection"** | Uses existing findObjects/board state + LLM for selected IDs; connects selection to AI; medium effort, high perceived value. |
| 20 | **Undo / redo** | High expectation and usefulness; requires history stack and sync strategy (e.g. last-write-wins vs. operational transform); higher complexity and risk, so placed after foundational UX and AI wins. |

---

## Summary

- **Section A** gives 50 concrete, buildable, end-user-facing ideas that fit the stated scope (no new auth, backend, or mobile).
- **Section B** picks the best 20 and orders them so that **quick wins** (shortcuts, zoom, font size, property inspector, align toolbar, snap, dashboard enhancements, export, connector polish) come first, **comments** and **AI expansions** next, and **undo/redo** last due to complexity and sync implications.
- **Dependencies**: Property inspector (7) is a natural home for font size (6), stroke/fill (8), and opacity (9); zoom features (3–5) share viewport logic; align toolbar (10) reuses existing AI layout tools; board dashboard (13) extends current board list and services.

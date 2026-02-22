## Summary

This design document translates the v2 feature set into principles and structure. It states modular design and SOLID alignment, maps v2 work to existing modules (auth, sync, canvas, ai, ui), and breaks scope into EPICs and user stories. It does not specify implementation steps; it establishes the "why" and "where" so that feature work stays consistent and traceable to a single design source.

---

# CollabBoard v2: Design Document

## Purpose

This document defines design principles, architecture alignment, and an agile breakdown (EPICs and user stories) for CollabBoard v2 scope. The 20 chosen features come from [INITIAL-RESEARCH.md](./INITIAL-RESEARCH.md) and are elaborated in [FEATURES.md](./FEATURES.md). The main [PRD](../product/PRD.md) remains the source of truth for existing product scope, tech stack, and module layout. This design is modular, SOLID-aligned, and broken down only to the user story level; features will be extracted from these user stories in a later step.

---

## References

- **[INITIAL-RESEARCH.md](./INITIAL-RESEARCH.md)** — Candidate feature list (Section A) and Top 20 ordered by build priority (Section B).
- **[FEATURES.md](./FEATURES.md)** — Elaborated features with descriptions, acceptance criteria, technical notes, and dependencies.
- **[PRD](../product/PRD.md)** — Existing scope, tech stack, SOLID application, and project structure.

---

## Design Principles

### Modular design

v2 work is organized by existing modules where possible: `auth`, `sync`, `canvas`, `ai`, and `ui` (or `lib`/components) as defined in the PRD. New behavior is added via new components, hooks, or services within or beside these modules rather than in a monolithic way. New areas introduced in v2 include:

- **Property inspector** — UI layer (sidebar/panel); depends on canvas selection and object update API.
- **Viewport / zoom** — Canvas layer; shared by zoom-to-selection, zoom-to-fit-all, and zoom presets.
- **User preferences** — Sync (or dedicated preferences service); stores recent boards and favorites per user.

Each of these has a single ownership (one module or layer) so that implementation stays testable and maintainable.

### SOLID principles

- **SRP (Single Responsibility)**: One concern per module and component. For example, the property inspector only edits object properties; the viewport only handles pan and zoom; the comments UI only displays and submits comments.
- **OCP (Open/Closed)**: Extend via interfaces and new components without changing core logic. New connector styles (arrowheads, stroke dash), new AI prompts ("Explain board", "Summarize selection"), and new inspector controls are added by extending existing interfaces or adding new components rather than modifying core canvas or sync logic.
- **LSP (Liskov Substitution)**: Board objects and shapes remain substitutable wherever interfaces (e.g. `IBoardObject`, selection) are used. New fields (e.g. `opacity`, connector `arrowheads`) are optional and backward-compatible.
- **ISP (Interface Segregation)**: Components depend only on what they need. Focused interfaces (e.g. `ITransformable`, `ISelectable`) keep dependencies minimal so that the property inspector, align toolbar, and export each depend on a narrow surface.
- **DIP (Dependency Inversion)**: Depend on abstractions (e.g. sync service, AI service interfaces); inject concrete implementations so that tests and future backends can swap implementations.

The EPIC and user story breakdown below is aligned with these principles so that implementation can remain modular and testable.

---

## Architecture context

### Existing modules

- **auth** — Authentication (sign-in, sign-up, session); role and permissions.
- **sync** — Real-time object sync (Firestore), cursor/presence (Realtime DB), board list and object CRUD.
- **canvas** — Board rendering (Konva), shapes, selection, transforms, toolbar, viewport/pan/zoom.
- **ai** — AI chat, tool executor, tools (create, move, resize, changeColor, getBoardState, findObjects, alignObjects, distributeObjects, etc.).
- **ui** — Shared UI components, theming (e.g. dark mode).

### Where v2 touches them

- **Property inspector and styling** — New UI component (sidebar/panel); canvas layer provides selection and object updates; types may add `opacity` to `IBoardObject`.
- **Zoom / viewport** — Canvas (e.g. `useCanvasViewport` or equivalent); zoom-to-selection, zoom-to-fit-all, zoom presets share the same state and APIs.
- **Keyboard shortcuts** — Canvas or board container; wire existing copy/paste/delete/duplicate/deselect and viewport actions to keydown.
- **Board dashboard (Recent + Favorites)** — Sync (user preferences document or collection); board list UI extended with sections and star toggle.
- **Connector styling** — Canvas (Connector component); types extended with optional `arrowheads` and `strokeDash` (or equivalent) on connector objects.
- **Comments on objects** — New sync surface (comments collection/subcollection) and new UI (comment panel, object indicator); auth for permissions.
- **AI "Explain this board" and "Summarize selection"** — AI module; use existing `getBoardState` and selection/board state; no new tools.
- **Undo / redo** — New abstraction (e.g. history service or command stack) consumed by canvas/sync; all object mutation paths record reversible operations.

---

## Agile breakdown: EPICs and user stories

Scope is the 20 features from [FEATURES.md](./FEATURES.md), grouped into 8 EPICs. User stories are written in the form: **As a [role], I want [goal] so that [benefit].** No feature-level or task-level breakdown beneath the story.

---

### Epic 1: Input and navigation UX

**Objective:** Improve daily input and navigation with keyboard shortcuts, consistent Escape behavior, and zoom actions so users can work quickly and navigate large boards without relying only on the toolbar.

| ID | User story |
|----|------------|
| US 1.1 | As a user, I want to use keyboard shortcuts (Copy, Paste, Delete, Duplicate, Escape) so that I can work quickly without the toolbar. |
| US 1.2 | As a user, I want Escape to clear selection and exit text-edit mode so that I am not stuck in edit state. |
| US 1.3 | As a user, I want to zoom to the current selection so that I can focus on part of a large board. |
| US 1.4 | As a user, I want to zoom to fit all board content so that I can see the full canvas at once. |
| US 1.5 | As a user, I want zoom presets (e.g. 50%, 100%, 200%) so that I can jump to a known zoom level. |

**Features (reference):** 1 Keyboard shortcuts, 2 Escape to deselect, 3 Zoom to selection, 4 Zoom to fit all, 5 Zoom presets.

---

### Epic 2: Property inspector and styling

**Objective:** Provide a single place to edit object properties (fill, stroke, stroke width, font size, opacity) when one or more objects are selected, meeting expectations from tools like Figma and Miro.

| ID | User story |
|----|------------|
| US 2.1 | As a user, I want to change font size for selected text and sticky elements so that I can control readability. |
| US 2.2 | As a user, I want a property inspector when objects are selected so that I can edit fill, stroke, and stroke width in one place. |
| US 2.3 | As a user, I want to edit stroke color, stroke width, and fill color in the inspector so that I can style shapes and stickies. |
| US 2.4 | As a user, I want to set opacity for selected objects in the inspector so that I can create layered visuals. |

**Features (reference):** 6 Font size control, 7 Property inspector, 8 Stroke and fill in inspector, 9 Opacity slider.

---

### Epic 3: Layout and canvas tools

**Objective:** Enable precise layout via align/distribute toolbar, snap-to-grid, and alignment guides, and allow exporting the board or viewport as an image for sharing.

| ID | User story |
|----|------------|
| US 3.1 | As a user, I want to align and distribute selected objects via toolbar buttons so that I can arrange layout without using AI. |
| US 3.2 | As a user, I want to enable snap-to-grid when moving and resizing so that objects line up neatly. |
| US 3.3 | As a user, I want to see alignment guides while dragging so that I can align to other objects. |
| US 3.4 | As a user, I want to export the board or viewport as an image so that I can share or document the board. |

**Features (reference):** 10 Align toolbar, 11 Snap to grid, 12 Alignment guides (smart guides), 14 Export as image.

---

### Epic 4: Board discovery and preferences

**Objective:** Help users find and return to boards quickly by adding Recent and Favorites to the board list (or dashboard).

| ID | User story |
|----|------------|
| US 4.1 | As a user, I want to see recently opened boards so that I can return to recent work quickly. |
| US 4.2 | As a user, I want to star boards as favorites and see them in a Favorites section so that I can access important boards easily. |
| US 4.3 | As a user, I want the board list to show All boards, Recent, and Favorites so that I can navigate boards by context. |

**Features (reference):** 13 Board dashboard (Recent + Favorites).

---

### Epic 5: Connectors and diagramming

**Objective:** Improve diagram clarity by supporting connector arrowheads and dashed (or dotted) stroke style, persisted and synced like other object properties.

| ID | User story |
|----|------------|
| US 5.1 | As a user, I want connectors to show arrowheads (none, start, end, or both) so that I can indicate direction in diagrams. |
| US 5.2 | As a user, I want to set connector stroke style (e.g. solid, dashed, dotted) so that I can distinguish diagram elements. |

**Features (reference):** 15 Connector arrowheads, 16 Connector stroke style (dashed).

---

### Epic 6: Collaboration and comments

**Objective:** Enable threaded comments on board objects so that collaborators can discuss specific content in context, with real-time sync and clear indicators.

| ID | User story |
|----|------------|
| US 6.1 | As a user, I want to add comments to a board object so that I can discuss specific content with collaborators. |
| US 6.2 | As a user, I want to see comment threads in a sidebar or popover and add replies so that I can have threaded discussions. |
| US 6.3 | As a user, I want to see an indicator on objects that have comments so that I can find and open discussions quickly. |

**Features (reference):** 17 Comments on objects.

---

### Epic 7: AI board intelligence

**Objective:** Add two AI commands that use existing tools and the LLM: "Explain this board" (board-level summary) and "Summarize selection" (selection-based summary), both shown in the AI chat.

| ID | User story |
|----|------------|
| US 7.1 | As a user, I want an AI command to explain the board so that I can get a short summary of the board content. |
| US 7.2 | As a user, I want an AI command to summarize the current selection so that I can get a concise summary of selected text and stickies. |

**Features (reference):** 18 AI "Explain this board", 19 AI "Summarize selection".

---

### Epic 8: History and consistency

**Objective:** Provide global undo and redo for object operations (create, delete, move, resize, property changes) so users can correct mistakes and experiment safely, with a defined sync strategy.

| ID | User story |
|----|------------|
| US 8.1 | As a user, I want to undo and redo object operations so that I can correct mistakes and experiment safely. |
| US 8.2 | As a user, I want undo and redo to work for create, delete, move, resize, and property changes so that my workflow is consistent. |

**Features (reference):** 20 Undo / redo.

---

## Out of scope / deferred

v2 scope is limited to the 20 features listed above. Items that were considered in the initial brainstorm but are **not** in the Top 20 are deferred; the full list is in [FEATURES.md](./FEATURES.md) under **Deferred**. This design document does not define EPICs or user stories for those items. Undo/redo (feature 20) is in scope and is the last epic due to complexity and sync implications.

---

## Summary

This design document defines a **modular, SOLID-aligned** approach to CollabBoard v2 and an **agile breakdown** into **8 EPICs** and **user stories** only. The 20 chosen features from INITIAL-RESEARCH and FEATURES are mapped into these EPICs; user stories are written at a level that allows features to be extracted and implemented in a later step. No implementation tasks, sprint breakdowns, or feature-level subtasks are included here—only EPICs and user stories as specified.

# CollabBoard State Improvement Constitution

This document is the **inviolable** rule set for the state improvement plan (Epics 1–3). Violations block merge. All agents and developers must read it before starting any task under this plan.

**Precedence:** This constitution overrides any conflicting rule in CLAUDE.md or `.cursor/rules/`. When in conflict, the constitution wins.

---

## Article I — State Sovereignty

1. All board element state lives in a **single canonical JSON-serializable store**: `IBoardObject` records keyed by `id`.
2. The Konva layer is a **pure rendering projection** of this state. Konva nodes must never be the source of truth.
3. No Konva-specific types (`Konva.Node`, `Konva.Rect`, etc.) may appear in state interfaces, store definitions, or repository contracts.

---

## Article II — World Coordinate Invariant

1. All persisted and stored positions (`x`, `y`, `points`) are in **world coordinates**.
2. Screen-to-world and world-to-screen conversions happen exclusively at the **boundary** (input handlers and rendering), never inside state mutations or persistence.
3. Any new coordinate conversion logic must go through a **single utility module** (currently inline in BoardCanvas; to be extracted in Epic 1).

---

## Article III — Repository Abstraction Contract

1. All persistence operations (create, read, update, delete, subscribe) must go through an interface (`IBoardRepository` or equivalent).
2. No component, hook, or AI module may import Firebase SDK functions directly for board object CRUD. They use the repository.
3. The repository interface must remain **provider-agnostic** (no Firestore/RTDB types in the interface signature).
4. Existing direct imports (`objectService`, `boardService`) are **grandfathered** until Epic 2 migrates them behind the interface.

---

## Article IV — AI Interface Stability

1. The AI-facing JSON schema for board state is a **public contract**. Breaking changes require a version bump and migration path.
2. AI commands use a typed discriminated union: `{ action: 'CREATE' | 'UPDATE' | 'DELETE', payload: ... }`. Payloads are validated before execution.
3. AI must never receive or return Konva-specific, Firebase-specific, or internal implementation details.

---

## Article V — Migration Safety

1. No epic may break existing functionality. All changes are additive or behind feature flags until stable.
2. The existing **write queue pattern** (`queueWrite` for high-frequency, direct `onObjectUpdate` for structural) remains the persistence strategy unless explicitly replaced.
3. Existing Zustand stores (`objectsStore`, `selectionStore`, `viewportActionsStore`, `historyStore`, `dragOffsetStore`) may be extended but **not deleted or merged** without a documented ADR.

---

## Article VI — Performance Budgets

1. **Real-time sync:** Changes propagate to all clients in **&lt; 500 ms** (from the plan success metrics).
2. **Scale:** Handle **1,000+ elements** without perceptible lag on standard hardware.
3. **Write queue:** Coalescing window stays at **500 ms** unless a measured benchmark justifies change.
4. **Rendering:** No O(n) work on every frame. **Spatial index for viewport culling is mandatory.**

---

## Article VII — Testing Gate

1. Every new module introduced by Epics 1–3 must have **unit tests** before merge.
2. **Integration tests** against Firebase emulators are required for any persistence changes.
3. **`bun run validate`** must pass. No exceptions, no `--skip` flags.

---

## Article VIII — Backward Compatibility

1. **IBoardObject:** Existing fields are frozen. New fields are additive and optional.
2. **Firestore:** Existing document schema (`boards/{boardId}/objects`) is **append-only**. Field removals require a migration script.
3. **AI tools:** Existing tool names and parameter shapes in `src/modules/ai/tools.ts` must not have breaking signature changes.

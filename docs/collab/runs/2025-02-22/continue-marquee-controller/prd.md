# PRD — MarqueeController (Epic 3)

## One-Sentence Objective

Add MarqueeController (start/move/end, AABB hit-test, no React state) and its unit test so one more Epic 3 controller exists and StageEventRouter can be wired to it.

## In Scope

- **src/canvas/events/MarqueeController.ts**: factory returning `{ onMarqueeStart(pos), onMarqueeMove(pos), onMarqueeEnd(e) }`; internal state (start/current rect); injected `IMarqueeOverlay` (showMarquee(rect), updateMarquee(rect), hideMarquee()); on end: AABB hit-test vs visible objects, call setSelectedIds, then hide marquee. No useState/useRef.
- **tests/unit/MarqueeController.test.ts**: start/move/end calls overlay and selection; AABB behavior; min size / empty marquee.

## Out of Scope

- DrawingController, ConnectorController, TextEditController, OverlayManager; StageEventRouter wiring to MarqueeController (future step); E2E.

## Binary Acceptance Criteria

- [ ] MarqueeController.ts exists, exports factory and overlay interface; no React imports.
- [ ] MarqueeController.test.ts exists; all tests pass.
- [ ] bun run validate passes.
- [ ] At most 2 files added; no changes to existing production files other than optional type re-export if needed.

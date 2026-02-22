# PRD — Reconcile + DrawingController

## One-sentence objective

Reconcile migration docs and task ledger to reflect MarqueeController as present, then implement DrawingController (and its unit test) as the next Epic 3 controller.

## In scope

- .claude/tasks.md: IK17 note and status.
- docs/IMPERATIVE-KONVA-MIGRATION-V5.md: Actual status E3 row, Epic 3 sub-task 9 checkbox, Definition of Done text.
- src/canvas/events/DrawingController.ts: new file, ~100 LOC, IDrawingController + createDrawingController(config).
- tests/unit/DrawingController.test.ts: new file, state transitions and min-size behavior.

## Out of scope

- ConnectorController, TextEditController, OverlayManager, BoardCanvas wiring, Epic 5.

## Binary acceptance criteria

- [x] Reconciliation: V5 Actual status and §9 show MarqueeController done; tasks.md IK17 note matches repo.
- [x] DrawingController: createDrawingController(config) returns onDrawStart, onDrawMove, onDrawEnd; no React; min 5px on end; overlay show/update/hide called.
- [x] Unit test: start → move → end creates shape when ≥5px; end &lt;5px does not call onCreate; overlay methods invoked in order.
- [x] bun run validate passes; only reconciled files + DrawingController + test touched (4 files total).

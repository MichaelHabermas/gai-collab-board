# Research — Continue dblclick wire IK18

## Done vs pending (Wave 4 / Epic 3)

| Item | Doc/ledger | Code | Status |
|------|------------|------|--------|
| T16 StageEventRouter + ShapeEventWiring | Done | Present + tests | Done |
| T17 Drawing, Marquee, Connector | Done | Present + tests | Done |
| T18 TextEditController | Pending (tasks) / Done (V5) | **Present** (TextEditController.ts + tests) | **Drift** |
| T19 OverlayManager | Pending | Missing | Pending |

## Contradictions / drift

1. **tasks.md IK18** says "reject — TextEditController.ts not present" but **TextEditController.ts exists** and has `open(objectId)` and unit tests (see docs/collab/runs/2025-02-22/continue-text-edit-controller).
2. **ShapeEventWiring** already wires dblclick to `config.openTextEdit(objectId)`; there is **no production call site** that passes a config with `openTextEdit` bound to `TextEditController.open`. The only caller is the unit test (mock `openTextEdit`).
3. V5 §0 Actual status says E3 "11/11" including TextEditController; orchestration Wave 4 says "T17, T18 done; pending T19". tasks.md IK18 is the only source that still says reject.

## Recommended next smallest action

- **In ShapeEventWiring:** Support an optional direct dependency so dblclick can call `TextEditController.open`: add optional `textEditController?: ITextEditController` to `IShapeEventConfig` and in the dblclick handler call `config.textEditController?.open(objectId) ?? config.openTextEdit(objectId)`.
- **In tasks.md:** Set IK18 status to **done** and update notes (TextEditController implemented; dblclick wired via config; reconciliation note).
- **Scope cap:** Max 2 files: ShapeEventWiring.ts, .claude/tasks.md. Optionally extend ShapeEventWiring.test.ts with one test for textEditController path.

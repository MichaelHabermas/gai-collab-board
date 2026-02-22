# PRD — Wire dblclick to TextEditController.open, set IK18 done

## One-sentence objective

Wire dblclick in ShapeEventWiring to TextEditController.open via optional `config.textEditController`, then set IK18 to done in `.claude/tasks.md` after review/merge.

## In scope

1. `IShapeEventConfig` gains optional `textEditController?: ITextEditController`.
2. dblclick handler calls `config.textEditController?.open(objectId) ?? config.openTextEdit(objectId)`.
3. `.claude/tasks.md` IK18 status → done and notes updated.

## Out of scope

- OverlayManager (T19), Epic 5 orchestration (useCanvasSetup, BoardCanvas replacement).
- New files beyond the 1–2 (or 3 with test) changed.
- Any change to TextEditController or canvas overlay libs.

## Binary acceptance criteria

- [x] When `wireEvents` is called with `config.textEditController` set, triggering dblclick on the node calls `textEditController.open(objectId)`.
- [x] When only `config.openTextEdit` is set, behavior unchanged (existing test passes).
- [x] IK18 in `.claude/tasks.md` is **done** with a short reconciliation note (artifact + validate).

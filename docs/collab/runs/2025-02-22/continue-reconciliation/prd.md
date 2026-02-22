# PRD — Reconciliation Step

## One-sentence objective

Reconcile the task ledger and orchestration doc with current code so IK17/T17 controller status is accurate and the chain can proceed without source-of-truth conflict.

## In scope

- Edits to .claude/tasks.md (IK17 status + note).
- Edits to docs/IMPERATIVE-KONVA-ORCHESTRATION.md (Wave 4 status text only).
- No code changes, no new tests.

## Out of scope

- Implementing TextEditController, OverlayManager.
- Wiring ConnectorController into BoardCanvas/CanvasHost.
- Changing V5 checkboxes beyond the 2-file scope (optional MarqueeController checkbox deferred).

## Binary acceptance criteria

- [x] After edits, a reader can infer from tasks.md + orchestration that T17 (Drawing, Marquee, Connector controllers) is complete and IK17 is in review.
- [x] Wave 4 status line explicitly states T17 controllers done and T18/T19 pending.
- [x] No new or modified production or test code.

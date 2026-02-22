# PRD — IK17 closeout

**Run:** continue-ik17-closeout  
**Chain:** research → prd → implement → review

## Objective

Close IK17 by reviewing DrawingController, MarqueeController, and ConnectorController and their unit tests, then marking IK17 done in the task ledger with review evidence.

## In scope

- Review of `DrawingController.ts`, `MarqueeController.ts`, `ConnectorController.ts` and their unit tests
- Update `.claude/tasks.md`: IK17 status → done, review note/evidence
- Optionally update [docs/IMPERATIVE-KONVA-MIGRATION-V5.md](../../../IMPERATIVE-KONVA-MIGRATION-V5.md) §9 "MarqueeController uses no React state" to `[x]` if verified

## Out of scope

- T18/T19, RL4/RL5/RL6
- Any new code or wiring
- BoardCanvas/CanvasHost, other waves

## Binary acceptance criteria

- [x] Review stage produced severity-ordered findings and a go/no-go; go decision documented (review-report.md)
- [x] IK17 status in `.claude/tasks.md` is `done` with a note that includes review evidence (e.g. "Review approved; validate passed; no React state in controllers")
- [x] At most 2 files changed (tasks.md + optionally V5)

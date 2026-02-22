# Research — IK17 closeout

**Run:** continue-ik17-closeout  
**Date:** 2025-02-22  
**Chain:** research → prd → implement → review

## Canonical sources

- **V5:** [docs/IMPERATIVE-KONVA-MIGRATION-V5.md](../../../IMPERATIVE-KONVA-MIGRATION-V5.md) — §Actual status, §9 Epic 3, Definition of Done
- **Orchestration:** [docs/IMPERATIVE-KONVA-ORCHESTRATION.md](../../../IMPERATIVE-KONVA-ORCHESTRATION.md) — Wave 4, T17/T18/T19
- **Tasks:** [.claude/tasks.md](../../../.claude/tasks.md) — IK17, IK18
- **Code:** `src/canvas/events/` — DrawingController, MarqueeController, ConnectorController, StageEventRouter, ShapeEventWiring

---

## Done vs pending — active wave / epic

**Wave 4 (Epic 3 remaining + Epic 4 start):**

| Item | Doc/tasks | Code | Status |
|------|-----------|------|--------|
| T15 DragCoordinator | Done | Present + test | Done |
| T16 StageEventRouter + ShapeEventWiring | Done | Present + tests | Done |
| T17 DrawingController | Done | Present + test | Done |
| T17 MarqueeController | Done | Present + test | Done |
| T17 ConnectorController | Done | Present + test | Done (uncommitted in git) |
| T18 TextEditController | Pending | Missing | Pending |
| T19 OverlayManager | Pending | Missing | Pending |
| IK17 (controllers) | review | All 3 + tests exist | **Ready for closeout** |
| IK18 (TextEditController) | reject | Missing | Pending |

**Epic 3 (V5 §9):** 10/11 sub-tasks done; only TextEditController missing.

---

## Contradictions (docs / tasks / code drift)

- **None blocking.** Orchestration Wave 4 states "T17 done; T18/T19 pending." tasks.md IK17 = `review` with reconciliation note. V5 §Actual status lists ConnectorController. Git shows ConnectorController.ts (A) and ConnectorController.test.ts (AM) — new but present on branch; no conflict with "T17 done."
- **Minor:** V5 §9 Definition of Done has "[ ] MarqueeController uses no React state" — to be verified in review and checked if satisfied.

---

## Recommended next smallest action

**Close out IK17:** Run a formal **review** of the three controllers (Drawing, Marquee, Connector) and their tests; if **go**, update the task ledger to mark IK17 **done** and record review evidence (1 file: `.claude/tasks.md`). Optionally update V5 §9 "MarqueeController uses no React state" to `[x]` if verified. No new code; 1–2 file edits only; satisfies "one smallest verified step."

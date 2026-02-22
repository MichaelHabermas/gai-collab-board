# Research — Continue Reconciliation

## Canonical sources

- **Migration status:** docs/IMPERATIVE-KONVA-MIGRATION-V5.md — §Actual status (table), §9 Epic 3 checkboxes and Definition of Done.
- **Orchestration:** docs/IMPERATIVE-KONVA-ORCHESTRATION.md — Wave 4 status and T17 text.
- **Task ledger:** .claude/tasks.md — IK17, RL6.
- **Touched code:** src/canvas/events/ConnectorController.ts, MarqueeController.ts, DrawingController.ts and their unit tests; docs/collab/runs/2025-02-22/continue-connector-controller/implementation-log.md.

## Done vs pending (active wave / Epic 3)

| Item | Doc/tasks | Code/reality |
|------|-----------|--------------|
| T17 DrawingController | Pending (orchestration) | Done — file + tests exist |
| T17 MarqueeController | Pending (orchestration) | Done — file + tests exist |
| T17 ConnectorController | Pending (orchestration) | Done — file + tests exist (added this run) |
| IK17 status | in-progress | All three controllers + tests present |
| Wave 4 status line | "Pending: T17 (Drawing, Marquee, Connector)" | T17 controllers implemented |
| V5 "MarqueeController uses no React state" | [ ] | MarqueeController is closure-based, no useState/useRef |

## Contradictions (docs / tasks / code drift)

1. **Orchestration vs code:** Wave 4 said "Pending: T17 (Drawing, Marquee, Connector controllers)". Code and V5 Actual status say all three controllers exist with unit tests.
2. **Tasks ledger vs code:** IK17 was "in-progress" with note "ConnectorController added this run"; all three controllers are present — status should be "review" (or "done" after review).
3. **V5 DoD checkbox:** Line 979 "MarqueeController uses no React state (plain object)" is unchecked; MarqueeController.ts uses only closure state (`let start`), no React — checkbox can be verified and checked (deferred to separate step to keep 2-file cap).

No conflict between source-of-truth files on *what* exists; only status text and checkboxes were behind.

## Recommended next smallest action

**Reconciliation-only step (no new code):** Update the task ledger and orchestration doc so they match docs + code. Limit to **2 files**.

- **File 1:** .claude/tasks.md — Set IK17 status to `review`; add reconciliation note.
- **File 2:** docs/IMPERATIVE-KONVA-ORCHESTRATION.md — In Wave 4 status, state that T17 controllers are done and T18/T19 pending.

Optional follow-up (separate step): Verify and check V5 §9 "MarqueeController uses no React state" in docs/IMPERATIVE-KONVA-MIGRATION-V5.md (1 file).

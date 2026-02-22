# Research Result

## Metadata

- Date: 2025-02-22
- Initiative: Imperative Konva Migration V5 — Collab chain continue step
- Objective: Re-acquire current state; identify contradictions; recommend one next smallest verified step.
- Owner: Agent
- Status: Complete

## Scope

- Included: V5 doc Actual status, Orchestration W4, .claude/tasks.md IK15/IK16; src/canvas/drag and src/canvas/events.
- Excluded: Epic 4/5/6, controllers, OverlayManager, E2E.

## Findings

### High confidence

- DragCoordinator.ts, StageEventRouter.ts, ShapeEventWiring.ts exist under src/canvas. No unit tests for DragCoordinator, StageEventRouter, or ShapeEventWiring in tests/ before this run.
- V5 § Actual status (E3 row) and Orchestration W4 and tasks.md IK15/IK16 stated these files "missing" or "not present" — doc/code drift.

### Medium confidence

- T15 AC: each method dispatches to correct sub-module, config injected, under 50 LOC. DragCoordinator is ~57 LOC; delegation is correct.

### Low confidence

- None.

## Options and Tradeoffs

1. **Option A: Doc-only** — Update V5 and tasks to reflect existing files.
   - Pros: Resolves contradiction; zero code risk.
   - Cons: No new verification evidence.
2. **Option B: Add DragCoordinator unit test** — One new test file; optional doc update.
   - Pros: T15 verification; satisfies "verified step."
   - Cons: Requires stubbing two delegations that use Konva nodes in unit test.
3. **Option C: Add tests for StageEventRouter + ShapeEventWiring** — Larger scope.
   - Pros: Closes more test gaps.
   - Cons: Exceeds 1–2 file cap.

## Recommendation

- Option B: Add DragCoordinator unit test (1 file); update V5 Actual status (1 file). Total 2 files. Run validate.

## Done Criteria

- [x] Done vs pending table for active wave/Epic produced.
- [x] Contradictions list (docs/tasks/code drift) produced.
- [x] One recommended next smallest action produced.

## Evidence

- Plan §1.1–1.3; implementation-log.md; review-report.md.

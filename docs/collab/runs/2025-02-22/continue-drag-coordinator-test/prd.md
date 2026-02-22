# PRD

## Metadata

- Date: 2025-02-22
- Initiative: Imperative Konva Migration V5 — Collab chain continue step
- Objective: Add a DragCoordinator unit test so T15 has verification evidence and bun run validate passes.
- Owner: Agent
- Status: Complete

## Problem

- T15 (DragCoordinator) has no unit test; doc/code state contradicted (docs said "missing" while files exist).

## Desired Outcome

- T15 acceptance criteria evidenced by test; source-of-truth doc aligned with repo; validate passes.

## Scope

### In scope

- New file tests/unit/DragCoordinator.test.ts.
- Optional: update docs/IMPERATIVE-KONVA-MIGRATION-V5.md § Actual status E3 row.

### Out of scope

- StageEventRouter/ShapeEventWiring tests, new production code, changes to DragCoordinator behavior or LOC.

## Requirements

1. Test file exists and asserts delegation from coordinator to dragCommit, alignmentEngine, dragBounds.
2. bun run validate (format, lint, typecheck) passes.
3. At most 2 files changed.

## Constraints

- Max 1 implementation objective, max 1–2 files. No scope expansion.

## Acceptance Criteria (Binary)

- [x] tests/unit/DragCoordinator.test.ts exists and tests that createDragCoordinator(config) returns an object whose methods call the correct sub-modules (spy on dragCommit, alignmentEngine, dragBounds).
- [x] bun run validate passes.
- [x] At most 2 files changed.

## Test Plan

- Unit: DragCoordinator.test.ts — 8 tests for method presence and delegation.
- Integration: N/A.
- E2E: N/A.
- Manual: N/A.

## Rollout and Rollback

- Rollout: Merge to spike/react-konva-1 per branch policy.
- Rollback: Revert commit; no Epic 5 cutover involved.

## Evidence

- implementation-log.md; review-report.md; vitest run for DragCoordinator.test.ts (8 passed).

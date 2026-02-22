# PRD — ShapeEventWiring Typecheck Fix

## Metadata

- Date: 2025-02-22
- Initiative: Imperative Konva Migration V5 — Collab chain (one smallest step)
- Objective: Fix typecheck for ShapeEventWiring.test.ts so Epic 3 event-wiring tests pass typecheck and validate, with no production code changes.
- Status: Complete

## Problem

- ShapeEventWiring.test.ts uses a mock for IDragCoordinator; the mock’s createDragBoundFunc must satisfy the interface so `bun run typecheck` passes. Any type mismatch blocks full validate.

## Desired Outcome

- `bun run typecheck` passes (including ShapeEventWiring.test.ts).
- `bun run validate` passes (or any remaining failure is pre-existing and documented).
- At most 2 files changed; single concern (typecheck fix + optional doc).

## Scope

### In scope

- tests/unit/ShapeEventWiring.test.ts (mock typing for IDragCoordinator).
- Optionally docs/IMPERATIVE-KONVA-MIGRATION-V5.md (E3 Actual status cell) if adding a note that typecheck passes.

### Out of scope

- Production code; other test files; new features; IK17/IK18/IK19 implementation.

## Requirements

1. createDragMock() return value must satisfy IDragCoordinator (explicit return type or type-safe mock).
2. createDragBoundFunc mock must be typed as `(objectId: string) => (pos: Konva.Vector2d) => Konva.Vector2d`.

## Constraints

- Max 2 files changed. No production code changes. No scope expansion.

## Acceptance Criteria (Binary)

- [x] `bun run typecheck` passes (including ShapeEventWiring.test.ts).
- [x] `bun run validate` passes (or any remaining failure is pre-existing and documented).
- [x] Files changed ≤ 2; single concern (typecheck fix + optional doc).

## Test Plan

- Unit: Existing ShapeEventWiring tests unchanged in behavior; run `bun run typecheck` and `bun run validate`.
- Integration: N/A
- E2E: N/A
- Manual: N/A

## Rollout and Rollback

- Rollout: Merge to spike/react-konva-1.
- Rollback: Revert test (and optional doc) change.

## Evidence

- Implementation log and review report in this run.

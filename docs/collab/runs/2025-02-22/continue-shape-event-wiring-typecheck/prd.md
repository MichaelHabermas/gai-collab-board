# PRD — ShapeEventWiring Typecheck Fix + V5 E3 Reconciliation

## Metadata

- Date: 2025-02-22
- Initiative: Imperative Konva Migration V5 — Collab chain (one smallest step)
- Objective: Fix the pre-existing typecheck failure in ShapeEventWiring.test.ts and align the V5 doc E3 status with repo state so bun run validate passes and docs are reconciled.
- Owner: Agent
- Status: Complete

## Problem

- ShapeEventWiring.test.ts has a pre-existing typecheck failure (mock type for createDragBoundFunc), so bun run validate does not pass.
- V5 Actual status table says E3 unit tests for StageEventRouter/ShapeEventWiring are "pending" although tests exist; doc is out of sync.

## Desired Outcome

- bun run validate passes (format, lint, typecheck, test).
- V5 doc E3 cell reflects that unit tests for StageEventRouter/ShapeEventWiring are present.

## Scope

### In scope

- tests/unit/ShapeEventWiring.test.ts — type fix for createDragBoundFunc mock (return type `(pos: Konva.Vector2d) => Konva.Vector2d` per IDragCoordinator).
- docs/IMPERATIVE-KONVA-MIGRATION-V5.md — single cell in Actual status table (E3 row): replace "unit tests for StageEventRouter/ShapeEventWiring pending" with "unit tests for StageEventRouter/ShapeEventWiring present".

### Out of scope

- Any other files, new tests, other doc sections, RL4/RL5/RL6, controller or OverlayManager work.

## Requirements

1. Typecheck passes for ShapeEventWiring.test.ts (mock satisfies IDragCoordinator.createDragBoundFunc signature).
2. V5 Actual status E3 cell updated so it no longer says those unit tests are "pending".

## Constraints

- Changed files ≤ 2; single concern (typecheck + doc reconciliation).
- No scope expansion.

## Acceptance Criteria (Binary)

- [ ] bun run validate passes (format, lint, typecheck, test).
- [ ] V5 Actual status E3 cell no longer says unit tests for StageEventRouter/ShapeEventWiring are "pending".
- [ ] Changed files ≤ 2; single concern.

## Test Plan

- Unit: Existing ShapeEventWiring tests must still pass after type fix.
- Integration: N/A
- E2E: N/A
- Manual: Run bun run validate.

## Evidence

- To be filled in implementation-log.md (validate output, file list).

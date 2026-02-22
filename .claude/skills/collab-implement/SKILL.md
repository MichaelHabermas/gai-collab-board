---
name: collab-implement
description: Execute scoped implementation in small verified batches with strict stop conditions.
---

# Collab Implement

Implement approved work with minimal blast radius and explicit verification at each step.

## Use When

- PRD/acceptance criteria are already approved.
- You need disciplined execution and low regression risk.
- You want small, reviewable changes.

## Enforced Contract

Follow `.claude/skills/COLLAB-CONTRACT.md`.

## Procedure

1. Confirm approved objective and done criteria.
2. Produce a 3-step execution plan.
3. Execute one small step at a time.
4. Validate each step before continuing.
5. If a step fails twice, stop and shrink scope.
6. Record final evidence against each done criterion.

## Stop Conditions

- Conflicting requirements discovered mid-execution.
- More than two unrelated concerns appear in one change set.
- Verification cannot prove correctness of the current step.

## Output Format

1. Objective
2. Plan
3. Step Log (PASS/FAIL)
4. Evidence
5. Next Smallest Action

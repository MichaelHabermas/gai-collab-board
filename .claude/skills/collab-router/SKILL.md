---
name: collab-router
description: Route work to atomic collaborator skills or chain them with strict conflict-halting rules.
---

# Collab Router

Use one command surface for research, PRD, implementation, review, or chained execution.

## Use When

- You want one entrypoint (`/collab`) for multiple workflows.
- You need automatic mode selection or explicit chaining.
- You want strict consistency checks before execution.

## Enforced Contract

Follow `.claude/skills/COLLAB-CONTRACT.md`.

## Modes

- `research`
- `prd`
- `implement`
- `review`
- `chain`

## Chain Mode

Supported examples:

- `research->prd`
- `research->prd->implement`
- `research->prd->implement->review`
- `prd->implement->review`

Each stage must complete with evidence before the next stage begins.

## Conflict-Halting Logic

Before starting any stage:

1. Validate objective and scope are present.
2. Check source-of-truth precedence is explicit.
3. Check done criteria are binary and testable.

If a conflict is found:

- Stop immediately.
- Output a conflict table with:
  - conflicting sources
  - why it blocks execution
  - smallest decision needed from user
- Do not continue until resolved.

## Router Procedure

1. Parse requested mode and depth (`quick`, `standard`, `deep`).
2. Run preflight checks and stop on conflicts.
3. Invoke the matching atomic skill or chain stages.
4. Return consolidated evidence and next smallest action.

## Output Format

1. Selected Mode
2. Preflight Result
3. Stage Output(s)
4. Evidence
5. Next Smallest Action

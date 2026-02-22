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

## Reconciliation Preflight (mandatory before PRD/implement)

Before allowing any PRD or implement stage, run a **ReconciliationCheck**:

1. **canonical_sources:** Identify the project docs and code area that define current status (e.g. migration plan doc, orchestration doc, touched modules).
2. **tasks_drift:** Compare the tasks ledger (e.g. `.claude/tasks.md`) to canonical sources. List any mismatches (e.g. task marked pending but code exists; doc says done but tasks say in-progress).
3. **resolution_actions:** If drift exists, list exact updates required (e.g. "Update task IK16 status to done and note ShapeEventWiring.ts + StageEventRouter.ts present").
4. **proceed_decision:** Set to `blocked` if drift exists and has not been resolved; set to `clear` if no drift or resolution was applied.

If **proceed_decision** is `blocked`:

- Halt at research. Do not run PRD or implement.
- Output a conflict table: conflicting sources, why it blocks execution, smallest reconciliation mini-step required.
- Do not continue the chain until the user (or a dedicated reconciliation step) has applied the resolution actions and re-run.

## Conflict-Halting Logic

Before starting any stage:

1. Validate objective and scope are present.
2. Check source-of-truth precedence is explicit (see COLLAB-CONTRACT: docs + code canonical; tasks ledger reconciled).
3. Check done criteria are binary and testable.
4. If chain includes PRD or implement, run Reconciliation Preflight first; if blocked, halt at research.

If a conflict is found:

- Stop immediately.
- Output a conflict table with:
  - conflicting sources
  - why it blocks execution
  - smallest decision needed from user
- Do not continue until resolved.

## Router Procedure

1. Parse requested mode and depth (`quick`, `standard`, `deep`).
2. When creating output dirs under `docs/collab/runs/`, obtain the current timestamp by running a shell command (PowerShell: `Get-Date -Format "yyyy-MM-dd_HH-mm-ss"`; Unix: `date +%Y-%m-%d_%H-%M-%S`) and use it for `<YYYY-MM-DD_HH-mm-ss>`. Do not hardcode the time (see COLLAB-CONTRACT).
3. If mode is `chain` and chain includes `prd` or `implement`, run Reconciliation Preflight. If proceed_decision is `blocked`, output conflict table and halt; do not proceed to PRD/implement.
4. Run remaining preflight checks; stop on conflicts.
5. Invoke the matching atomic skill or chain stages.
6. Return consolidated evidence and next smallest action.

## Output Format

1. Selected Mode
2. ReconciliationCheck (canonical_sources, tasks_drift, resolution_actions, proceed_decision) — required when chain includes PRD or implement
3. Preflight Result
4. Stage Output(s)
5. Evidence
6. Next Smallest Action

# Collaborator Command Contract

All collaborator commands and skills must enforce this structure before execution:

1. `Objective` — one sentence.
2. `Scope` — explicit boundaries (files, modules, or systems).
3. `Constraints` — policies, rules, and non-negotiables.
4. `Done Criteria` — binary pass/fail checks.
5. `Evidence` — what proves completion.

## Global Stop Conditions

Stop and ask for clarification when any of the following is true:

- Two sources of truth conflict and no canonical precedence is declared.
- Success criteria are subjective and cannot be measured.
- Requested scope spans multiple independent concerns without explicit sequencing.
- Required environment details (branch, service, dependency, data shape) are missing.
- A requested action violates repository governance rules.

## Canonical Precedence (Tasks vs Docs vs Code)

When the tasks ledger (e.g. `.claude/tasks.md`) conflicts with project docs (e.g. migration/plan docs) or repository code:

1. **Canonical for execution:** project docs + repository code. Use them to determine actual status and next action.
2. **Tasks ledger:** must be reconciled to match canonical sources before implementation proceeds. Update task statuses and notes as part of the run; do not treat the ledger as blocking truth.
3. **Strict block:** do not proceed to PRD or implement until a reconciliation check has been run and either (a) no drift was found, or (b) drift was found and resolution actions were applied (e.g. tasks ledger updated). If drift remains unresolved, halt at research and output a conflict table plus required reconciliation mini-step.

## Default Output Sections

Unless a command defines stricter formatting, return:

1. Objective
2. Assumptions
3. Risks
4. Plan
5. Done Criteria
6. Evidence
7. Next Smallest Action

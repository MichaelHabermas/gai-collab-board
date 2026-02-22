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

## Default Output Sections

Unless a command defines stricter formatting, return:

1. Objective
2. Assumptions
3. Risks
4. Plan
5. Done Criteria
6. Evidence
7. Next Smallest Action

# /implement

Use `collab-implement` to execute approved scope in small verified steps.

## Required Inputs

- Approved objective
- Explicit scope cap
- Done criteria (binary)
- Verification commands/checks

## Invocation Prompt Template

```text
Mode: implement
Objective: <one sentence>
Scope Cap: <max files/areas>
Constraints: <rules and non-negotiables>
Done Criteria: <binary checks>
Verification: <tests/commands/manual checks>
Output Doc: docs/collab/runs/<YYYY-MM-DD_HH-mm-ss>/<slug>/implementation-log.md
```

## Skill Mapping

- `.claude/skills/collab-implement/SKILL.md`
- Contract: `.claude/skills/COLLAB-CONTRACT.md`

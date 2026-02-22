# /prd

Use `collab-prd` to generate a concise, implementation-ready PRD.

## Required Inputs

- Objective (1 sentence)
- Intended users/outcome
- Scope and non-goals
- Constraints and compliance needs

## Invocation Prompt Template

```text
Mode: prd
Objective: <one sentence>
Problem: <what is broken or missing>
Outcome: <what success looks like>
Scope: <in scope / out of scope>
Constraints: <technical/process constraints>
Done Criteria: <binary checks>
Output Doc: docs/collab/runs/<YYYY-MM-DD>/<slug>/prd.md
```

## Skill Mapping

- `.claude/skills/collab-prd/SKILL.md`
- Contract: `.claude/skills/COLLAB-CONTRACT.md`

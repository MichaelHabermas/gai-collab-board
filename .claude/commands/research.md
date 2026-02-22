# /research

Use `collab-research` to produce a decision-ready brief before PRD or implementation.

## Required Inputs

- Objective (1 sentence)
- Scope boundaries
- Constraints
- Done criteria

## Invocation Prompt Template

```text
Mode: research
Objective: <one sentence>
Scope: <files/modules/systems included and excluded>
Constraints: <policies, constraints, non-negotiables>
Done Criteria: <binary checks>
Depth: <quick|standard|deep>
Output Doc: docs/collab/runs/<YYYY-MM-DD>/<slug>/research.md
```

## Skill Mapping

- `.claude/skills/collab-research/SKILL.md`
- Contract: `.claude/skills/COLLAB-CONTRACT.md`

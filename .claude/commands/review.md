# /review

Use `collab-review` for severity-first review focused on regressions and missing tests.

## Required Inputs

- Claimed objective
- Acceptance criteria
- Target diff, files, or plan

## Invocation Prompt Template

```text
Mode: review
Objective: <what this change claims to do>
Scope: <files/diff/plan being reviewed>
Constraints: <must-not-break invariants>
Done Criteria: <binary checks to validate>
Review Strictness: <standard|harsh>
Output Doc: docs/collab/runs/<YYYY-MM-DD>/<slug>/review.md
```

## Skill Mapping

- `.claude/skills/collab-review/SKILL.md`
- Contract: `.claude/skills/COLLAB-CONTRACT.md`

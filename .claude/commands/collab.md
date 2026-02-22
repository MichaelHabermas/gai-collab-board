# /collab

Router command for atomic or chained collaborator workflows.

## Modes

- `research`
- `prd`
- `implement`
- `review`
- `chain`

## Chain Examples

- `research->prd`
- `research->prd->implement`
- `research->prd->implement->review`
- `prd->implement->review`

## Conflict-Halting Rule

If objectives, source-of-truth documents, or done criteria conflict, stop and return a conflict table before any execution.

## Invocation Prompt Template

```text
Mode: <research|prd|implement|review|chain>
Chain: <optional pipeline, e.g. research->prd->implement->review>
Objective: <one sentence>
Scope: <explicit boundaries>
Constraints: <rules, policy, non-negotiables>
Done Criteria: <binary checks>
Depth: <quick|standard|deep>
Strict: <true|false>
Timebox: <minutes>
Output Dir: docs/collab/runs/<YYYY-MM-DD>/<slug>/
```

## Skill Mapping

- `.claude/skills/collab-router/SKILL.md`
- Contract: `.claude/skills/COLLAB-CONTRACT.md`

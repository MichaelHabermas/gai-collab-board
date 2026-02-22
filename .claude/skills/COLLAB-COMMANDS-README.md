# Collaborator Commands (V1)

Reusable command pack for research, PRD, implementation, and review workflows.

## What You Get

- Atomic commands: `/research`, `/prd`, `/implement`, `/review`
- Router command: `/collab`
- Shared execution contract and stop conditions
- Compatible surfaces:
  - `.claude/commands/*`
  - `.cursor/commands/*`
- Documentation output structure under `docs/collab/` for reusable artifacts

## Command Map

- `/research` -> `.claude/skills/collab-research/SKILL.md`
- `/prd` -> `.claude/skills/collab-prd/SKILL.md`
- `/implement` -> `.claude/skills/collab-implement/SKILL.md`
- `/review` -> `.claude/skills/collab-review/SKILL.md`
- `/collab` -> `.claude/skills/collab-router/SKILL.md`

Shared rules:

- `.claude/skills/COLLAB-CONTRACT.md`

## Documentation Output Structure

Use this structure for command outputs so artifacts are easy to find and extend:

- `docs/collab/README.md` — overview and conventions
- `docs/collab/templates/` — reusable markdown templates
- `docs/collab/runs/` — dated execution outputs

Recommended run layout:

- `docs/collab/runs/<YYYY-MM-DD>/<slug>/research.md`
- `docs/collab/runs/<YYYY-MM-DD>/<slug>/prd.md`
- `docs/collab/runs/<YYYY-MM-DD>/<slug>/implementation-log.md`
- `docs/collab/runs/<YYYY-MM-DD>/<slug>/review.md`

## Quick Invocation Examples

### Research only

```text
/research
Objective: Map current auth flow and identify migration risks.
Scope: backend/auth/* and docs/auth/*
Constraints: No implementation changes.
Done Criteria: 3 viable options with tradeoffs and recommendation.
Depth: standard
```

### PRD only

```text
/prd
Objective: Define a PRD for connector endpoint dedup validation.
Problem: Connector lag and duplicate updates during multi-select drag.
Scope: canvas manager and related tests only.
Constraints: Preserve existing store APIs.
Done Criteria: Testable requirements and binary acceptance criteria.
```

### Full chain

```text
/collab
Mode: chain
Chain: research->prd->implement->review
Objective: Add feature X with regression-safe rollout.
Scope: max 3 modules + tests.
Constraints: Follow repo rules and existing architecture invariants.
Done Criteria: All acceptance criteria pass and review has no critical findings.
Depth: standard
Strict: true
Timebox: 60
```

## Router Notes

- Chain mode runs stages sequentially with evidence at each stage.
- If source-of-truth or done criteria conflict, router halts and returns a conflict table.
- Use `Strict: true` when you want fail-fast behavior.

## V1 Boundaries

- Additive scaffolding only (no installer automation).
- No MCP-specific integrations.
- No changes to existing orchestrate behavior.

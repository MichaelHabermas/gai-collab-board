# Collaborator Commands (V1)

Reusable command pack for research, PRD, implementation, and review workflows.

## What You Get

- Atomic commands: `/research`, `/prd`, `/implement`, `/review`
- Router command: `/collab`
- Meta-advisor command: `/Tarpey`
- Cleanup command: `/cleanup-daily-logs`
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
- `/Tarpey` -> `.claude/skills/tarpey-advisor/SKILL.md`
- `/cleanup-daily-logs` -> `.claude/skills/cleanup-daily-logs/SKILL.md` (run `bun run cleanup:daily-logs <YYYY-MM-DD> --dry-run` then `--confirm`)

Shared rules:

- `.claude/skills/COLLAB-CONTRACT.md`
- `.claude/skills/TARPEY-CONTRACT.md`

## Documentation Output Structure

Use this structure for command outputs so artifacts are easy to find and extend:

- `docs/collab/README.md` — overview and conventions
- `docs/collab/templates/` — reusable markdown templates
- `docs/collab/runs/` — dated execution outputs

Recommended run layout:

- `docs/collab/runs/<YYYY-MM-DD_HH-mm-ss>/<slug>/research.md`
- `docs/collab/runs/<YYYY-MM-DD_HH-mm-ss>/<slug>/prd.md`
- `docs/collab/runs/<YYYY-MM-DD_HH-mm-ss>/<slug>/implementation-log.md`
- `docs/collab/runs/<YYYY-MM-DD_HH-mm-ss>/<slug>/review.md`

**Timestamp:** Obtain `<YYYY-MM-DD_HH-mm-ss>` by running a shell command (e.g. PowerShell: `Get-Date -Format "yyyy-MM-dd_HH-mm-ss"`; Unix: `date +%Y-%m-%d_%H-%M-%S`). Do not hardcode the time.

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

### Meta advisor

```text
/Tarpey
Mode: audit
Preset: strict
Objective: Verify claimed progress against code and docs, and identify drift.
Scope: source-of-truth docs, task ledger, and touched modules.
Constraints: Findings first; block closeout if evidence is missing.
Done Criteria: Every claimed completed item is verified or explicitly marked partial/unverified with corrective action.
Evidence Targets: file paths, test outputs, and merge commits.
Depth: standard
Strict: true
Output Dir: docs/collab/runs/<YYYY-MM-DD_HH-mm-ss>/<slug>/
```

Quick shorthand:

```text
/Tarpey strict audit scope="source docs + touched code"
/Tarpey light retro scope="last 3 sessions"
```

### Cleanup daily logs

Consolidate one day's run dirs into a single set of markdown files per type; then delete the original run dirs. Always run `--dry-run` first, then `--confirm` after reviewing.

```text
bun run cleanup:daily-logs 2025-02-22 --dry-run
bun run cleanup:daily-logs 2025-02-22 --confirm
```

Output: `docs/collab/runs/<YYYY-MM-DD>/research.md`, `prd.md`, `implementation-log.md`, `review.md`, `reconciliation-check.md`. Re-running for the same day appends new run dirs and deletes them.

## Fresh Context / Reconciliation-First (recommended for new chat)

When starting in a new context window, run reconciliation before any chain that includes PRD or implement. Use this prompt so tasks and docs are coordinated before proceeding:

```text
/collab
Mode: chain
Chain: research->prd->implement->review
Objective: Re-establish current state and complete one smallest verified step. Treat docs + code as canonical; reconcile tasks ledger to match before PRD/implement.
Scope: Source-of-truth docs (e.g. migration/orchestration) + task ledger + touched code area only.
Constraints: Run ReconciliationCheck first. If tasks_drift exists, output conflict table and resolution_actions; if proceed_decision is blocked, halt at research and do not run PRD or implement until tasks ledger is updated.
Done Criteria: ReconciliationCheck shows proceed_decision clear; then research output includes done/pending table and one next smallest action; then one implementation step with evidence.
Depth: standard
Strict: true
Timebox: 45
Output Dir: docs/collab/runs/<YYYY-MM-DD_HH-mm-ss>/continue-<slug>/
```

Reconciliation mini-step: when blocked, apply the listed resolution_actions (e.g. update `.claude/tasks.md` status/notes to match docs and code), then re-run the same chain or run research only to confirm clear. Record the check using `docs/collab/templates/reconciliation-check-template.md` when saving run artifacts.

## Router Notes

- Chain mode runs stages sequentially with evidence at each stage.
- When chain includes PRD or implement, Reconciliation Preflight runs first; if proceed_decision is blocked, the router halts at research and does not run PRD or implement until drift is resolved.
- If source-of-truth or done criteria conflict, router halts and returns a conflict table.
- Use `Strict: true` when you want fail-fast behavior.

## V1 Boundaries

- Additive scaffolding only (no installer automation).
- No MCP-specific integrations.
- No changes to existing orchestrate behavior.

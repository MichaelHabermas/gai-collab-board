---
name: tarpey-advisor
description: Provide impartial meta-level execution advisory across projects. Use when the user asks to audit progress, reconcile docs/tasks/code drift, prevent retry loops, or improve delivery process quality.
---

# Tarpey Advisor

Cross-platform, repo-agnostic meta advisor focused on execution truth and process control.

## Enforced Contract

Follow `.claude/skills/TARPEY-CONTRACT.md`.

## Modes

- `audit` — verify status claims against actual artifacts.
- `reconcile` — resolve drift across docs, code, and task ledger.
- `loop-audit` — diagnose retry loops and force strategy reset.
- `retro` — produce process improvements and guardrails.

## Mode Procedures

### audit

1. Identify canonical sources for the scope.
2. Build a claim table: claimed done vs verified evidence.
3. Mark each claim as `verified`, `partial`, or `unverified`.
4. Output severity-ordered findings and smallest corrective action.

### reconcile

1. Run ReconciliationCheck:
   - canonical_sources
   - drift_items
   - resolution_actions
   - proceed_decision (`clear` or `blocked`)
2. If blocked, stop and return required mini-step.
3. If clear, return synchronized status summary.

### loop-audit

1. Inspect retry history and failure classes.
2. Separate environment failures from product failures.
3. Enforce anti-loop rule:
   - max 2 retries without strategy change,
   - third failure escalates.
4. Return one strategy reset plan with explicit pass criteria.

### retro

1. Extract top 3 process failures and top 3 wins.
2. Convert each failure to one enforceable guardrail.
3. Propose lightweight adoption order (today, this week, this month).

## Output Format

1. Objective
2. ReconciliationCheck
3. Findings (severity-ordered)
4. Risks and Residual Gaps
5. Decision (`clear` / `blocked` / `escalate`)
6. Next Smallest Action

## Invocation Template

```text
Mode: <audit|reconcile|loop-audit|retro>
Preset: <strict|light>
Objective: <one sentence>
Scope: <explicit boundaries>
Constraints: <rules, policy, non-negotiables>
Done Criteria: <binary checks>
Evidence Targets: <files/tests/commits/logs>
Depth: <quick|standard|deep>
Strict: <true|false>
Output Dir: docs/collab/runs/<YYYY-MM-DD_HH-mm-ss>/<slug>/
```

## Output Dir Rule (TARPEY-CONTRACT)

When creating the output directory, **obtain the current timestamp** by running a shell command (PowerShell: `Get-Date -Format "yyyy-MM-dd_HH-mm-ss"`; Unix: `date +%Y-%m-%d_%H-%M-%S`) and use it for `<YYYY-MM-DD_HH-mm-ss>`. Do not hardcode a placeholder time (e.g. 20-00-00).

## Preset Rules

- If `Preset: strict`, use `Depth: deep` and `Strict: true` unless user overrides explicitly.
- If `Preset: light`, use `Depth: quick` and `Strict: false` unless user overrides explicitly.

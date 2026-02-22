# /Tarpey

Impartial meta-advisor command for progress audits, reconciliation, loop prevention, and process improvement.

## Modes

- `audit`
- `reconcile`
- `loop-audit`
- `retro`

## Core Behavior

- Findings first, severity ordered.
- Reconciliation before closeout.
- Evidence-linked status updates only.
- Anti-doom-loop escalation after repeated retries.

## Presets

- `strict` (default for risky work): `Depth: deep`, `Strict: true`, requires explicit evidence and clear/blocked/escalate decision.
- `light` (quick sanity checks): `Depth: quick`, `Strict: false`, concise output with one next action.

Use either:

- `Preset: strict|light` (preferred), or
- explicit `Depth` + `Strict`.

## Invocation Prompt Template

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

## Minimal Invocations

```text
/Tarpey strict audit scope="migration docs + touched code"
/Tarpey light loop-audit scope="current task retries"
```

## Continue-From-Anywhere (new chat reset)

```text
/Tarpey
Mode: reconcile
Preset: strict
Objective: Re-establish current project truth and continue with the next smallest verified step.
Scope: source-of-truth docs + task ledger + changed code paths only.
Constraints: Treat docs + code as canonical; if drift exists, block implementation and list exact reconciliation actions first.
Done Criteria: ReconciliationCheck returns proceed_decision=clear and includes one next action with evidence targets.
Evidence Targets: concrete file paths, test results, and current branch/merge target status.
Output Dir: docs/collab/runs/<YYYY-MM-DD_HH-mm-ss>/continue-<slug>/
```

## Skill Mapping

- `.claude/skills/tarpey-advisor/SKILL.md`
- Contract: `.claude/skills/TARPEY-CONTRACT.md`

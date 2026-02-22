---
name: collab-review
description: Perform severity-first code and plan reviews focused on regressions, risks, and missing tests.
---

# Collab Review

Run harsh, high-signal reviews that prioritize correctness and risk over style.

## Use When

- Reviewing proposed or completed changes.
- Validating migration gates or release readiness.
- Auditing a plan for ambiguity and missing verification.

## Enforced Contract

Follow `.claude/skills/COLLAB-CONTRACT.md`.

## Review Priorities

1. Behavioral regressions
2. Data integrity and state correctness
3. Security and authorization risks
4. Performance regressions
5. Missing or weak tests
6. Documentation and process drift

## Procedure

1. Identify claimed objective and acceptance criteria.
2. Compare changes against requirements and invariants.
3. List findings by severity: critical/high/medium/low.
4. Include file-path evidence for each finding.
5. State residual risks and test gaps, even if no findings.

## Output Format

1. Findings (severity-ordered)
2. Open Questions and Assumptions
3. Risk Summary
4. Suggested Next Actions

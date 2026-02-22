# Reconciliation Check Template

Use before PRD or implement when running `/collab` chain. Docs + code are canonical; tasks ledger must be reconciled to match.

## Metadata

- Date:
- Run slug:
- Canonical docs (e.g. migration/orchestration):

## ReconciliationCheck Output

### canonical_sources

- Project docs used:
- Code area inspected:

### tasks_drift

- Mismatches between tasks ledger and canonical sources:
  - TBD

### resolution_actions

- Exact updates required (e.g. task status, notes):
  - TBD

### proceed_decision

- [ ] blocked
- [ ] clear

## Conflict Table (if blocked)

- Conflicting sources:
- Why it blocks execution:
- Smallest reconciliation mini-step:

## After Resolution

- [ ] Tasks ledger updated (or no drift found)
- [ ] Re-run preflight or research to confirm proceed_decision clear

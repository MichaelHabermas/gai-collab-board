# /cleanup-daily-logs

Consolidate collab run dirs for a single day into one set of markdown files per type, then delete the original run dirs.

## Usage

- `bun run cleanup:daily-logs <YYYY-MM-DD> --dry-run` — show plan only.
- `bun run cleanup:daily-logs <YYYY-MM-DD> --confirm` — write consolidated files and delete run dirs.

Always run `--dry-run` first, then `--confirm` after reviewing.

## Behavior

- **Run dirs for date D:** all `docs/collab/runs/<D>/<slug>/` and `docs/collab/runs/<D>_HH-mm-ss>/<slug>/`.
- **Output:** `docs/collab/runs/<D>/research.md`, `prd.md`, `implementation-log.md`, `review.md`, `reconciliation-check.md` (full content per run under `## <timestamp> <slug>`).
- **Re-run:** If you run cleanup again for the same day after new runs exist, new run dirs are appended to existing day files, then those run dirs are deleted.

## Skill Mapping

- `.claude/skills/cleanup-daily-logs/SKILL.md`

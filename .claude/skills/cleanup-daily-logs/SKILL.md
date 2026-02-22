---
name: cleanup-daily-logs
description: Consolidate docs/collab/runs for a given day into one set of markdown files per type and delete original run dirs. Use when the user runs /cleanup-daily-logs or asks to clean up daily collab logs.
---

# Cleanup Daily Logs

## Use When

- User invokes `/cleanup-daily-logs <YYYY-MM-DD>` or asks to consolidate or clean up that day's collab run output.

## Procedure

1. Run the script with `--dry-run` first: `bun run cleanup:daily-logs <date> --dry-run`.
2. Show the user the plan (run dirs to merge, files to write, dirs to delete).
3. If the user confirms, run again with `--confirm`: `bun run cleanup:daily-logs <date> --confirm`.
4. Do not perform file writes or deletes yourself; use the script only.

## Rules

- Always require dry-run before confirm.
- Do not delete or write run files manually; the script is the single implementation.

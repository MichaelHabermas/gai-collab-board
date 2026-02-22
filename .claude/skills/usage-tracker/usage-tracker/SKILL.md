---
name: usage-tracker
description: >
  Install automatic Claude Code token and cost tracking into any project.
  Use this skill whenever the user asks to "add usage tracking", "track tokens",
  "track spending", "add the usage hook", "set up cost tracking", or any variation
  of wanting per-project Claude usage monitoring. Also trigger this when setting up
  a new project for the user if they've indicated they want usage tracking on all
  projects. This copies a Stop hook that automatically logs every session's token
  usage and estimated cost to a USAGE.md file at the project root.
---

# Usage Tracker

Installs a Claude Code / Cursor Stop hook into a project that automatically tracks
token usage and estimated cost after every agent response. Zero configuration
needed after install — it just works silently in the background.

## Prerequisites

For the **full pipeline** (unified ledger and server-generated `USAGE.md`), the
target project must have `scripts/record-usage-event.ts` and the server
`ai-usage-tracker` + usageLedger module. Without them, the hook still writes
`.claude/usage/usage-data.json` and generates `USAGE.md` itself when the unified
record call fails (fallback).

## What gets installed

Two files under `.claude/` in the project root:

1. `.claude/hooks/track-usage.mjs` — the hook script (Node.js, zero dependencies; cross-platform stdin via fd 0, works on Windows)
2. `.claude/settings.local.json` — wires the hook to the Stop event

**Outputs:** When the unified pipeline is available, the hook sends a batch to
`record-usage-event.ts` and updates `.claude/usage/unified-usage-data.json`;
`USAGE.md` is then produced from that ledger (or by the server). If the script
fails or is missing, the hook writes legacy `usage-data.json` and generates
`USAGE.md` as fallback. The hook deduplicates by `session_id` / `conversation_id`
and uses `workspace_roots` when `cwd` is absent (Cursor).

- `USAGE.md` at project root — human-readable report (totals, daily summary, Mermaid charts, recent sessions)
- `.claude/usage/usage-data.json` — legacy per-session store (used for fallback and in-memory state)
- `.claude/usage/unified-usage-data.json` — source-tagged cumulative ledger (when pipeline is present)

## Installation procedure

### Step 1: Identify the project root

The project root is where `.claude/` lives (or should live). Typically the
directory the user has open. If ambiguous, ask.

### Step 2: Create directories

```bash
mkdir -p <project-root>/.claude/hooks
mkdir -p <project-root>/.claude/usage
```

### Step 3: Copy the hook script

The hook script is bundled as an asset in this skill's directory. Copy it:

```bash
cp <this-skill-dir>/assets/track-usage.mjs <project-root>/.claude/hooks/track-usage.mjs
chmod +x <project-root>/.claude/hooks/track-usage.mjs
```

Where `<this-skill-dir>` is the directory containing this SKILL.md file.

### Step 4: Configure the hook

Check if `.claude/settings.local.json` already exists in the project root.

**If it does NOT exist**, create it with this content:

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/hooks/track-usage.mjs",
            "timeout": 15
          }
        ]
      }
    ]
  }
}
```

**If it DOES exist**, read it and merge the Stop hook into the existing hooks
object. Append to an existing Stop array rather than replacing it — unless it
already contains a track-usage entry. Never overwrite other hooks.

Use `settings.local.json` (not `settings.json`) so this stays local and
doesn't get committed to version control.

**Cursor:** For Cursor IDE, ensure `.cursor/hooks.json` has a stop hook that
runs the same script (e.g. `node .claude/hooks/track-usage.mjs`). The hook
detects Cursor via `conversation_id` or `workspace_roots` when `cwd` is absent
and deduplicates by conversation ID.

### Step 5: Suggest .gitignore additions

If the project uses git, suggest adding `.claude/usage/` to `.gitignore`.
Ask the user whether they also want to ignore `USAGE.md` — some people like
committing it as a spend log, others don't.

### Step 6: Confirm to the user

Let them know:

- Tracking starts on their next Claude Code session in this project
- `USAGE.md` appears at project root after the first session
- Raw data is in `.claude/usage/usage-data.json` and `.claude/usage/unified-usage-data.json`
- The hook is silent and won't interrupt workflow
- Pricing can be updated by editing the PRICING object in track-usage.mjs

## Updating pricing

The hook has a `PRICING` constant near the top of track-usage.mjs with
per-model rates in USD per 1M tokens. If the user says pricing changed,
update those values. Unknown models fall back to Sonnet-tier pricing.

## Debugging

- The hook writes `.claude/usage/last-hook-payload.json` with the raw payload it
  received (for Cursor vs Claude detection). That file is typically gitignored.

## Troubleshooting

- **Hook not firing**: Verify settings.local.json (and for Cursor,
  .cursor/hooks.json) is valid JSON and the command path is relative to the
  project root.
- **USAGE.md not appearing**: The hook only writes when it finds token usage in
  the transcript — a session with no assistant messages produces nothing.
- **Duplicate sessions**: The hook deduplicates by session_id / conversation_id,
  updating in place if the same session fires Stop multiple times.
- **Windows**: The script reads stdin via Node fd 0 (cross-platform). It does not
  use `/dev/stdin`, so it works on Windows.

## Assets

- `assets/track-usage.mjs` — the hook script to copy into projects

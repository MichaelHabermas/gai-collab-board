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

Installs a Claude Code Stop hook into a project that automatically tracks token
usage and estimated cost after every Claude response. Zero configuration needed
after install — it just works silently in the background.

## What gets installed

Two files under `.claude/` in the project root:

1. `.claude/hooks/track-usage.mjs` — the hook script (Node.js, zero dependencies)
2. `.claude/settings.local.json` — wires the hook to the Stop event

These produce three output files that accumulate over time:

- `USAGE.md` at project root — unified cumulative report (segmented by source + grand total) with Mermaid charts
- `.claude/usage/usage-data.json` — legacy per-session dev usage store (backward compatibility)
- `.claude/usage/unified-usage-data.json` — source-tagged cumulative ledger across dev/runtime/scripts/MCP

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

## Troubleshooting

- **Hook not firing**: Verify settings.local.json is valid JSON and the command
  path is relative to the project root
- **USAGE.md not appearing**: The hook only writes when it finds token usage in
  the transcript — a session with no assistant messages produces nothing
- **Duplicate sessions**: The hook deduplicates by session_id, updating in place
  if the same session fires Stop multiple times

## Assets

- `assets/track-usage.mjs` — the hook script to copy into projects

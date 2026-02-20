# Unified AI Usage Tracker

> Auto-updated cumulative usage from Claude, Cursor, runtime proxy, scripts, and MCP signals.

## Grand Total

| Metric | Value |
|--------|-------|
| Events | 2 |
| Requests | 6 |
| Total tokens | 517.8k |
| Input tokens | 12 |
| Output tokens | 34 |
| Cache read | 481.7k |
| Cache create | 36.0k |
| Estimated cost | $1.4035 |

## Segmented Totals by Source

| Source | Events | Requests | Total tokens | Input | Output | Cost |
|--------|--------|----------|--------------|-------|--------|------|
| Claude | 1 | 1 | 517.8k | 12 | 34 | $1.4010 |
| MCP tools | 1 | 5 | 0 | 0 | 0 | $0.0025 |

## Estimation Quality

| Source | Exact | Best effort | Unavailable |
|--------|-------|-------------|-------------|
| Claude | 0 | 1 | 0 |
| MCP tools | 0 | 1 | 0 |

## Daily Summary

| Date | Events | Tokens | Cost |
|------|--------|--------|------|
| 2026-02-20 | 2 | 517.8k | $1.4035 |

## Usage over time

```mermaid
xychart-beta
    title "Token usage over time (all sources)"
    x-axis ["02-19 20:16", "02-19 20:16"]
    y-axis "Tokens" 0 --> 38
    line "Input" [12, 0]
    line "Output" [34, 0]
```

```mermaid
xychart-beta
    title "Cost over time (all sources, USD)"
    x-axis ["02-19 20:16", "02-19 20:16"]
    y-axis "USD" 0 --> 2
    line "Cost" [1.40096775, 0.0025]
    line "Cumulative" [1.401, 1.4035]
```

```mermaid
xychart-beta
    title "Cost by source over time (USD)"
    x-axis ["02-19 20:16", "02-19 20:16"]
    y-axis "USD" 0 --> 2
    line "Claude" [1.40096775, 0]
    line "Cursor" [0, 0]
    line "Runtime proxy" [0, 0]
    line "Scripts" [0, 0]
    line "MCP" [0, 0.0025]
```

## Recent Events

| Time | Source | Provider | Model | In | Out | Cost | Method |
|------|--------|----------|-------|----|-----|------|--------|
| 2026-02-20 01:16 | MCP tools | claude | mcp-tooling | 0 | 0 | $0.0025 | best_effort |
| 2026-02-20 01:16 | Claude | anthropic | claude-opus-4-6 | 12 | 34 | $1.4010 | best_effort |

---
*Last updated: 2026-02-20 01:16:55 UTC*

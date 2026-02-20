# Unified AI Usage Tracker

> Auto-updated cumulative usage from Claude, Cursor, runtime proxy, scripts, and MCP signals.

## Grand Total

| Metric | Value |
|--------|-------|
| Events | 4 |
| Requests | 20 |
| Total tokens | 2.21M |
| Input tokens | 20.0k |
| Output tokens | 146 |
| Cache read | 1.78M |
| Cache create | 411.1k |
| Estimated cost | $10.6958 |

## Segmented Totals by Source

| Source | Events | Requests | Total tokens | Input | Output | Cost |
|--------|--------|----------|--------------|-------|--------|------|
| Claude | 2 | 2 | 2.21M | 20.0k | 146 | $10.6868 |
| MCP tools | 2 | 18 | 0 | 0 | 0 | $0.0090 |

## Estimation Quality

| Source | Exact | Best effort | Unavailable |
|--------|-------|-------------|-------------|
| Claude | 0 | 2 | 0 |
| MCP tools | 0 | 2 | 0 |

## Daily Summary

| Date | Events | Tokens | Cost |
|------|--------|--------|------|
| 2026-02-20 | 4 | 2.21M | $10.6958 |

## Usage over time

```mermaid
xychart-beta
    title "Token usage over time (all sources)"
    x-axis ["02-19 20:16", "02-19 20:16", "02-19 20:51", "02-19 20:51"]
    y-axis "Tokens" 0 --> 21960
    line "Input" [12, 0, 19963, 0]
    line "Output" [34, 0, 112, 0]
```

```mermaid
xychart-beta
    title "Cost over time (all sources, USD)"
    x-axis ["02-19 20:16", "02-19 20:16", "02-19 20:51", "02-19 20:51"]
    y-axis "USD" 0 --> 12
    line "Cost" [1.40096775, 0.0025, 9.285807, 0.006500000000000001]
    line "Cumulative" [1.401, 1.4035, 10.6893, 10.6958]
```

```mermaid
xychart-beta
    title "Cost by source over time (USD)"
    x-axis ["02-19 20:16", "02-19 20:16", "02-19 20:51", "02-19 20:51"]
    y-axis "USD" 0 --> 11
    line "Claude" [1.40096775, 0, 9.285807, 0]
    line "Cursor" [0, 0, 0, 0]
    line "Runtime proxy" [0, 0, 0, 0]
    line "Scripts" [0, 0, 0, 0]
    line "MCP" [0, 0.0025, 0, 0.006500000000000001]
```

## Recent Events

| Time | Source | Provider | Model | In | Out | Cost | Method |
|------|--------|----------|-------|----|-----|------|--------|
| 2026-02-20 01:51 | MCP tools | claude | mcp-tooling | 0 | 0 | $0.0065 | best_effort |
| 2026-02-20 01:51 | Claude | anthropic | claude-opus-4-6 | 20.0k | 112 | $9.2858 | best_effort |
| 2026-02-20 01:16 | MCP tools | claude | mcp-tooling | 0 | 0 | $0.0025 | best_effort |
| 2026-02-20 01:16 | Claude | anthropic | claude-opus-4-6 | 12 | 34 | $1.4010 | best_effort |

---
*Last updated: 2026-02-20 01:51:55 UTC*

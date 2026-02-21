# Unified AI Usage Tracker

> Auto-updated cumulative usage from Claude, Cursor, runtime proxy, scripts, and MCP signals.

## Grand Total

| Metric | Value |
|--------|-------|
| Events | 82 |
| Requests | 3090 |
| Total tokens | 596.65M |
| Input tokens | 183.9k |
| Output tokens | 61.1k |
| Cache read | 574.76M |
| Cache create | 21.65M |
| Estimated cost | $1233.4641 |

## Segmented Totals by Source

| Source | Events | Requests | Total tokens | Input | Output | Cost |
|--------|--------|----------|--------------|-------|--------|------|
| Claude | 41 | 41 | 596.65M | 183.9k | 61.1k | $1231.9396 |
| MCP tools | 41 | 3049 | 0 | 0 | 0 | $1.5245 |

## Estimation Quality

| Source | Exact | Best effort | Unavailable |
|--------|-------|-------------|-------------|
| Claude | 0 | 41 | 0 |
| MCP tools | 0 | 41 | 0 |

## Daily Summary

| Date | Events | Tokens | Cost |
|------|--------|--------|------|
| 2026-02-21 | 24 | 144.21M | $316.4058 |
| 2026-02-20 | 58 | 452.44M | $917.0583 |

## Usage over time

```mermaid
xychart-beta
    title "Token usage over time (all sources)"
    x-axis ["02-20 23:34", "02-21 00:42", "02-21 00:42", "02-21 01:17", "02-21 01:17", "02-21 08:35", "02-21 08:35", "02-21 08:43", "02-21 08:43", "02-21 09:59", "02-21 09:59", "02-21 10:45", "02-21 10:45", "02-21 15:44", "02-21 15:44"]
    y-axis "Tokens" 0 --> 25302
    line "Input" [0, 58, 0, 213, 0, 128, 0, 238, 0, 73, 0, 23001, 0, 49, 0]
    line "Output" [0, 378, 0, 1624, 0, 599, 0, 1570, 0, 407, 0, 496, 0, 231, 0]
```

```mermaid
xychart-beta
    title "Cost over time (all sources, USD)"
    x-axis ["02-20 23:34", "02-21 00:42", "02-21 00:42", "02-21 01:17", "02-21 01:17", "02-21 08:35", "02-21 08:35", "02-21 08:43", "02-21 08:43", "02-21 09:59", "02-21 09:59", "02-21 10:45", "02-21 10:45", "02-21 15:44", "02-21 15:44"]
    y-axis "USD" 0 --> 188
    line "Cost" [0.1145, 7.664612999999999, 0.011, 40.793046749999995, 0.054, 26.10212775, 0.0275, 51.90656625, 0.059500000000000004, 13.722154249999999, 0.01, 17.360798250000002, 0.014, 12.526970250000002, 0.007]
    line "Cumulative" [0.1145, 7.7791, 7.7901, 48.5832, 48.6372, 74.7393, 74.7668, 126.6734, 126.7329, 140.455, 140.465, 157.8258, 157.8398, 170.3668, 170.3738]
```

```mermaid
xychart-beta
    title "Cost by source over time (USD)"
    x-axis ["02-20 23:34", "02-21 00:42", "02-21 00:42", "02-21 01:17", "02-21 01:17", "02-21 08:35", "02-21 08:35", "02-21 08:43", "02-21 08:43", "02-21 09:59", "02-21 09:59", "02-21 10:45", "02-21 10:45", "02-21 15:44", "02-21 15:44"]
    y-axis "USD" 0 --> 58
    line "Claude" [0, 7.664612999999999, 0, 40.793046749999995, 0, 26.10212775, 0, 51.90656625, 0, 13.722154249999999, 0, 17.360798250000002, 0, 12.526970250000002, 0]
    line "Cursor" [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    line "Runtime proxy" [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    line "Scripts" [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    line "MCP" [0.1145, 0, 0.011, 0, 0.054, 0, 0.0275, 0, 0.059500000000000004, 0, 0.01, 0, 0.014, 0, 0.007]
```

## Recent Events

| Time | Source | Provider | Model | In | Out | Cost | Method |
|------|--------|----------|-------|----|-----|------|--------|
| 2026-02-21 20:44 | MCP tools | claude | mcp-tooling | 0 | 0 | $0.0070 | best_effort |
| 2026-02-21 20:44 | Claude | anthropic | claude-opus-4-6,<synthetic> | 49 | 231 | $12.5270 | best_effort |
| 2026-02-21 15:45 | MCP tools | claude | mcp-tooling | 0 | 0 | $0.0140 | best_effort |
| 2026-02-21 15:45 | Claude | anthropic | claude-opus-4-6 | 23.0k | 496 | $17.3608 | best_effort |
| 2026-02-21 14:59 | MCP tools | claude | mcp-tooling | 0 | 0 | $0.0100 | best_effort |
| 2026-02-21 14:59 | Claude | anthropic | claude-opus-4-6,claude-haiku-4-5-20251001,<synthetic> | 73 | 407 | $13.7222 | best_effort |
| 2026-02-21 13:43 | MCP tools | claude | mcp-tooling | 0 | 0 | $0.0595 | best_effort |
| 2026-02-21 13:43 | Claude | anthropic | claude-opus-4-6 | 238 | 1.6k | $51.9066 | best_effort |
| 2026-02-21 13:35 | MCP tools | claude | mcp-tooling | 0 | 0 | $0.0275 | best_effort |
| 2026-02-21 13:35 | Claude | anthropic | claude-opus-4-6,<synthetic> | 128 | 599 | $26.1021 | best_effort |
| 2026-02-21 06:17 | MCP tools | claude | mcp-tooling | 0 | 0 | $0.0540 | best_effort |
| 2026-02-21 06:17 | Claude | anthropic | claude-opus-4-6 | 213 | 1.6k | $40.7930 | best_effort |
| 2026-02-21 05:42 | MCP tools | claude | mcp-tooling | 0 | 0 | $0.0110 | best_effort |
| 2026-02-21 05:42 | Claude | anthropic | claude-opus-4-6 | 58 | 378 | $7.6646 | best_effort |
| 2026-02-21 04:34 | MCP tools | claude | mcp-tooling | 0 | 0 | $0.1145 | best_effort |
| 2026-02-21 04:34 | Claude | anthropic | claude-haiku-4-5-20251001,claude-opus-4-6,<synthetic> | 11.3k | 2.3k | $74.7590 | best_effort |
| 2026-02-21 03:40 | MCP tools | claude | mcp-tooling | 0 | 0 | $0.0565 | best_effort |
| 2026-02-21 03:40 | Claude | anthropic | claude-opus-4-6 | 20.9k | 1.9k | $60.6375 | best_effort |
| 2026-02-21 01:38 | MCP tools | claude | mcp-tooling | 0 | 0 | $0.0045 | best_effort |
| 2026-02-21 01:38 | Claude | anthropic | claude-opus-4-6,claude-haiku-4-5-20251001 | 76 | 195 | $2.9062 | best_effort |

---
*Last updated: 2026-02-21 20:44:24 UTC*

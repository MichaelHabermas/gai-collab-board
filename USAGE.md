# Unified AI Usage Tracker

> Auto-updated cumulative usage from Claude, Cursor, runtime proxy, scripts, and MCP signals.

## Grand Total

| Metric | Value |
|--------|-------|
| Events | 52 |
| Requests | 2156 |
| Total tokens | 417.15M |
| Input tokens | 70.0k |
| Output tokens | 48.3k |
| Cache read | 404.81M |
| Cache create | 12.23M |
| Estimated cost | $834.0276 |

## Segmented Totals by Source

| Source | Events | Requests | Total tokens | Input | Output | Cost |
|--------|--------|----------|--------------|-------|--------|------|
| Claude | 26 | 26 | 417.15M | 70.0k | 48.3k | $832.9626 |
| MCP tools | 26 | 2130 | 0 | 0 | 0 | $1.0650 |

## Estimation Quality

| Source | Exact | Best effort | Unavailable |
|--------|-------|-------------|-------------|
| Claude | 0 | 26 | 0 |
| MCP tools | 0 | 26 | 0 |

## Daily Summary

| Date | Events | Tokens | Cost |
|------|--------|--------|------|
| 2026-02-20 | 52 | 417.15M | $834.0276 |

## Usage over time

```mermaid
xychart-beta
    title "Token usage over time (all sources)"
    x-axis ["02-20 13:20", "02-20 13:22", "02-20 13:22", "02-20 13:29", "02-20 13:29", "02-20 14:44", "02-20 14:44", "02-20 15:20", "02-20 15:20", "02-20 15:35", "02-20 15:35", "02-20 15:37", "02-20 15:37", "02-20 16:26", "02-20 16:26"]
    y-axis "Tokens" 0 --> 9843
    line "Input" [0, 8130, 0, 10, 0, 476, 0, 194, 0, 8948, 0, 34, 0, 2534, 0]
    line "Output" [0, 5442, 0, 40, 0, 2177, 0, 1270, 0, 1528, 0, 158, 0, 2011, 0]
```

```mermaid
xychart-beta
    title "Cost over time (all sources, USD)"
    x-axis ["02-20 13:20", "02-20 13:22", "02-20 13:22", "02-20 13:29", "02-20 13:29", "02-20 14:44", "02-20 14:44", "02-20 15:20", "02-20 15:20", "02-20 15:35", "02-20 15:35", "02-20 15:37", "02-20 15:37", "02-20 16:26", "02-20 16:26"]
    y-axis "USD" 0 --> 395
    line "Cost" [0.017, 168.20375775, 0.2005, 0.676962, 0.0005, 48.303068249999995, 0.056, 39.179916000000006, 0.043000000000000003, 52.24645875, 0.054, 4.876151999999999, 0.003, 45.140001, 0.058]
    line "Cumulative" [0.017, 168.2208, 168.4213, 169.0982, 169.0987, 217.4018, 217.4578, 256.6377, 256.6807, 308.9272, 308.9812, 313.8573, 313.8603, 359.0003, 359.0583]
```

```mermaid
xychart-beta
    title "Cost by source over time (USD)"
    x-axis ["02-20 13:20", "02-20 13:22", "02-20 13:22", "02-20 13:29", "02-20 13:29", "02-20 14:44", "02-20 14:44", "02-20 15:20", "02-20 15:20", "02-20 15:35", "02-20 15:35", "02-20 15:37", "02-20 15:37", "02-20 16:26", "02-20 16:26"]
    y-axis "USD" 0 --> 186
    line "Claude" [0, 168.20375775, 0, 0.676962, 0, 48.303068249999995, 0, 39.179916000000006, 0, 52.24645875, 0, 4.876151999999999, 0, 45.140001, 0]
    line "Cursor" [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    line "Runtime proxy" [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    line "Scripts" [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    line "MCP" [0.017, 0, 0.2005, 0, 0.0005, 0, 0.056, 0, 0.043000000000000003, 0, 0.054, 0, 0.003, 0, 0.058]
```

## Recent Events

| Time | Source | Provider | Model | In | Out | Cost | Method |
|------|--------|----------|-------|----|-----|------|--------|
| 2026-02-20 21:26 | MCP tools | claude | mcp-tooling | 0 | 0 | $0.0580 | best_effort |
| 2026-02-20 21:26 | Claude | anthropic | claude-opus-4-6 | 2.5k | 2.0k | $45.1400 | best_effort |
| 2026-02-20 20:37 | MCP tools | claude | mcp-tooling | 0 | 0 | $0.0030 | best_effort |
| 2026-02-20 20:37 | Claude | anthropic | claude-opus-4-6 | 34 | 158 | $4.8762 | best_effort |
| 2026-02-20 20:35 | MCP tools | claude | mcp-tooling | 0 | 0 | $0.0540 | best_effort |
| 2026-02-20 20:35 | Claude | anthropic | claude-opus-4-6 | 8.9k | 1.5k | $52.2465 | best_effort |
| 2026-02-20 20:20 | MCP tools | claude | mcp-tooling | 0 | 0 | $0.0430 | best_effort |
| 2026-02-20 20:20 | Claude | anthropic | claude-opus-4-6 | 194 | 1.3k | $39.1799 | best_effort |
| 2026-02-20 19:44 | MCP tools | claude | mcp-tooling | 0 | 0 | $0.0560 | best_effort |
| 2026-02-20 19:44 | Claude | anthropic | claude-opus-4-6,<synthetic> | 476 | 2.2k | $48.3031 | best_effort |
| 2026-02-20 18:29 | MCP tools | claude | mcp-tooling | 0 | 0 | $0.0005 | best_effort |
| 2026-02-20 18:29 | Claude | anthropic | claude-opus-4-6 | 10 | 40 | $0.6770 | best_effort |
| 2026-02-20 18:22 | MCP tools | claude | mcp-tooling | 0 | 0 | $0.2005 | best_effort |
| 2026-02-20 18:22 | Claude | anthropic | claude-opus-4-6 | 8.1k | 5.4k | $168.2038 | best_effort |
| 2026-02-20 18:20 | MCP tools | claude | mcp-tooling | 0 | 0 | $0.0170 | best_effort |
| 2026-02-20 18:20 | Claude | anthropic | claude-sonnet-4-6 | 93 | 18.4k | $1.9080 | best_effort |
| 2026-02-20 18:03 | MCP tools | claude | mcp-tooling | 0 | 0 | $0.0040 | best_effort |
| 2026-02-20 18:03 | Claude | anthropic | claude-opus-4-6 | 22 | 204 | $1.9817 | best_effort |
| 2026-02-20 18:02 | MCP tools | claude | mcp-tooling | 0 | 0 | $0.0010 | best_effort |
| 2026-02-20 18:02 | Claude | anthropic | claude-sonnet-4-6 | 25 | 594 | $0.1351 | best_effort |

---
*Last updated: 2026-02-20 21:26:23 UTC*

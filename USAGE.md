# Unified AI Usage Tracker

> Auto-updated cumulative usage from Claude, Cursor, runtime proxy, scripts, and MCP signals.

## Grand Total

| Metric | Value |
|--------|-------|
| Events | 54 |
| Requests | 2241 |
| Total tokens | 433.98M |
| Input tokens | 120.6k |
| Output tokens | 49.6k |
| Cache read | 421.05M |
| Cache create | 12.77M |
| Estimated cost | $869.3832 |

## Segmented Totals by Source

| Source | Events | Requests | Total tokens | Input | Output | Cost |
|--------|--------|----------|--------------|-------|--------|------|
| Claude | 27 | 27 | 433.98M | 120.6k | 49.6k | $868.2762 |
| MCP tools | 27 | 2214 | 0 | 0 | 0 | $1.1070 |

## Estimation Quality

| Source | Exact | Best effort | Unavailable |
|--------|-------|-------------|-------------|
| Claude | 0 | 27 | 0 |
| MCP tools | 0 | 27 | 0 |

## Daily Summary

| Date | Events | Tokens | Cost |
|------|--------|--------|------|
| 2026-02-20 | 54 | 433.98M | $869.3832 |

## Usage over time

```mermaid
xychart-beta
    title "Token usage over time (all sources)"
    x-axis ["02-20 13:22", "02-20 13:29", "02-20 13:29", "02-20 14:44", "02-20 14:44", "02-20 15:20", "02-20 15:20", "02-20 15:35", "02-20 15:35", "02-20 16:35", "02-20 16:35", "02-20 16:49", "02-20 16:49", "02-20 17:01", "02-20 17:01"]
    y-axis "Tokens" 0 --> 55514
    line "Input" [0, 10, 0, 476, 0, 194, 0, 8948, 0, 2552, 0, 50467, 0, 173, 0]
    line "Output" [0, 40, 0, 2177, 0, 1270, 0, 1528, 0, 2065, 0, 235, 0, 1161, 0]
```

```mermaid
xychart-beta
    title "Cost over time (all sources, USD)"
    x-axis ["02-20 13:22", "02-20 13:29", "02-20 13:29", "02-20 14:44", "02-20 14:44", "02-20 15:20", "02-20 15:20", "02-20 15:35", "02-20 15:35", "02-20 16:35", "02-20 16:35", "02-20 16:49", "02-20 16:49", "02-20 17:01", "02-20 17:01"]
    y-axis "USD" 0 --> 249
    line "Cost" [0.2005, 0.676962, 0.0005, 48.303068249999995, 0.056, 39.179916000000006, 0.043000000000000003, 52.24645875, 0.054, 46.72079925, 0.058, 8.40828525, 0.0095, 30.200649000000006, 0.035500000000000004]
    line "Cumulative" [0.2005, 0.8775, 0.878, 49.181, 49.237, 88.4169, 88.4599, 140.7064, 140.7604, 187.4812, 187.5392, 195.9475, 195.957, 226.1576, 226.1931]
```

```mermaid
xychart-beta
    title "Cost by source over time (USD)"
    x-axis ["02-20 13:22", "02-20 13:29", "02-20 13:29", "02-20 14:44", "02-20 14:44", "02-20 15:20", "02-20 15:20", "02-20 15:35", "02-20 15:35", "02-20 16:35", "02-20 16:35", "02-20 16:49", "02-20 16:49", "02-20 17:01", "02-20 17:01"]
    y-axis "USD" 0 --> 58
    line "Claude" [0, 0.676962, 0, 48.303068249999995, 0, 39.179916000000006, 0, 52.24645875, 0, 46.72079925, 0, 8.40828525, 0, 30.200649000000006, 0]
    line "Cursor" [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    line "Runtime proxy" [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    line "Scripts" [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    line "MCP" [0.2005, 0, 0.0005, 0, 0.056, 0, 0.043000000000000003, 0, 0.054, 0, 0.058, 0, 0.0095, 0, 0.035500000000000004]
```

## Recent Events

| Time | Source | Provider | Model | In | Out | Cost | Method |
|------|--------|----------|-------|----|-----|------|--------|
| 2026-02-20 22:01 | MCP tools | claude | mcp-tooling | 0 | 0 | $0.0355 | best_effort |
| 2026-02-20 22:01 | Claude | anthropic | claude-opus-4-6 | 173 | 1.2k | $30.2006 | best_effort |
| 2026-02-20 21:49 | MCP tools | claude | mcp-tooling | 0 | 0 | $0.0095 | best_effort |
| 2026-02-20 21:49 | Claude | anthropic | claude-opus-4-6 | 50.5k | 235 | $8.4083 | best_effort |
| 2026-02-20 21:35 | MCP tools | claude | mcp-tooling | 0 | 0 | $0.0580 | best_effort |
| 2026-02-20 21:35 | Claude | anthropic | claude-opus-4-6 | 2.6k | 2.1k | $46.7208 | best_effort |
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

---
*Last updated: 2026-02-20 22:01:38 UTC*

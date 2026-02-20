# Unified AI Usage Tracker

> Auto-updated cumulative usage from Claude, Cursor, runtime proxy, scripts, and MCP signals.

## Grand Total

| Metric | Value |
|--------|-------|
| Events | 58 |
| Requests | 2339 |
| Total tokens | 451.44M |
| Input tokens | 134.1k |
| Output tokens | 51.0k |
| Cache read | 437.89M |
| Cache create | 13.37M |
| Estimated cost | $906.3419 |

## Segmented Totals by Source

| Source | Events | Requests | Total tokens | Input | Output | Cost |
|--------|--------|----------|--------------|-------|--------|------|
| Claude | 29 | 29 | 451.44M | 134.1k | 51.0k | $905.1869 |
| MCP tools | 29 | 2310 | 0 | 0 | 0 | $1.1550 |

## Estimation Quality

| Source | Exact | Best effort | Unavailable |
|--------|-------|-------------|-------------|
| Claude | 0 | 29 | 0 |
| MCP tools | 0 | 29 | 0 |

## Daily Summary

| Date | Events | Tokens | Cost |
|------|--------|--------|------|
| 2026-02-20 | 58 | 451.44M | $906.3419 |

## Usage over time

```mermaid
xychart-beta
    title "Token usage over time (all sources)"
    x-axis ["02-20 14:44", "02-20 15:20", "02-20 15:20", "02-20 15:35", "02-20 15:35", "02-20 16:35", "02-20 16:35", "02-20 17:15", "02-20 17:15", "02-20 17:19", "02-20 17:19", "02-20 17:29", "02-20 17:29", "02-20 17:55", "02-20 17:55"]
    y-axis "Tokens" 0 --> 55668
    line "Input" [0, 194, 0, 8948, 0, 2552, 0, 179, 0, 28, 0, 50607, 0, 13264, 0]
    line "Output" [0, 1270, 0, 1528, 0, 2065, 0, 1163, 0, 114, 0, 1231, 0, 243, 0]
```

```mermaid
xychart-beta
    title "Cost over time (all sources, USD)"
    x-axis ["02-20 14:44", "02-20 15:20", "02-20 15:20", "02-20 15:35", "02-20 15:35", "02-20 16:35", "02-20 16:35", "02-20 17:15", "02-20 17:15", "02-20 17:19", "02-20 17:19", "02-20 17:29", "02-20 17:29", "02-20 17:55", "02-20 17:55"]
    y-axis "USD" 0 --> 236
    line "Cost" [0.056, 39.179916000000006, 0.043000000000000003, 52.24645875, 0.054, 46.72079925, 0.058, 30.7421055, 0.035500000000000004, 2.8003875000000003, 0.005, 34.05879975, 0.046, 7.91834925, 0.006500000000000001]
    line "Cumulative" [0.056, 39.2359, 39.2789, 91.5254, 91.5794, 138.3002, 138.3582, 169.1003, 169.1358, 171.9362, 171.9412, 206, 206.046, 213.9643, 213.9708]
```

```mermaid
xychart-beta
    title "Cost by source over time (USD)"
    x-axis ["02-20 14:44", "02-20 15:20", "02-20 15:20", "02-20 15:35", "02-20 15:35", "02-20 16:35", "02-20 16:35", "02-20 17:15", "02-20 17:15", "02-20 17:19", "02-20 17:19", "02-20 17:29", "02-20 17:29", "02-20 17:55", "02-20 17:55"]
    y-axis "USD" 0 --> 58
    line "Claude" [0, 39.179916000000006, 0, 52.24645875, 0, 46.72079925, 0, 30.7421055, 0, 2.8003875000000003, 0, 34.05879975, 0, 7.91834925, 0]
    line "Cursor" [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    line "Runtime proxy" [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    line "Scripts" [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    line "MCP" [0.056, 0, 0.043000000000000003, 0, 0.054, 0, 0.058, 0, 0.035500000000000004, 0, 0.005, 0, 0.046, 0, 0.006500000000000001]
```

## Recent Events

| Time | Source | Provider | Model | In | Out | Cost | Method |
|------|--------|----------|-------|----|-----|------|--------|
| 2026-02-20 22:55 | MCP tools | claude | mcp-tooling | 0 | 0 | $0.0065 | best_effort |
| 2026-02-20 22:55 | Claude | anthropic | claude-opus-4-6 | 13.3k | 243 | $7.9183 | best_effort |
| 2026-02-20 22:29 | MCP tools | claude | mcp-tooling | 0 | 0 | $0.0460 | best_effort |
| 2026-02-20 22:29 | Claude | anthropic | claude-opus-4-6,<synthetic> | 50.6k | 1.2k | $34.0588 | best_effort |
| 2026-02-20 22:19 | MCP tools | claude | mcp-tooling | 0 | 0 | $0.0050 | best_effort |
| 2026-02-20 22:19 | Claude | anthropic | claude-opus-4-6 | 28 | 114 | $2.8004 | best_effort |
| 2026-02-20 22:15 | MCP tools | claude | mcp-tooling | 0 | 0 | $0.0355 | best_effort |
| 2026-02-20 22:15 | Claude | anthropic | claude-opus-4-6 | 179 | 1.2k | $30.7421 | best_effort |
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

---
*Last updated: 2026-02-20 22:55:18 UTC*

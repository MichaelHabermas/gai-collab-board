# Unified AI Usage Tracker

> Auto-updated cumulative usage from Claude, Cursor, runtime proxy, scripts, and MCP signals.

## Grand Total

| Metric | Value |
|--------|-------|
| Events | 78 |
| Requests | 3028 |
| Total tokens | 586.74M |
| Input tokens | 160.8k |
| Output tokens | 60.0k |
| Cache read | 566.36M |
| Cache create | 20.15M |
| Estimated cost | $1192.3113 |

## Segmented Totals by Source

| Source | Events | Requests | Total tokens | Input | Output | Cost |
|--------|--------|----------|--------------|-------|--------|------|
| Claude | 39 | 39 | 586.74M | 160.8k | 60.0k | $1190.8168 |
| MCP tools | 39 | 2989 | 0 | 0 | 0 | $1.4945 |

## Estimation Quality

| Source | Exact | Best effort | Unavailable |
|--------|-------|-------------|-------------|
| Claude | 0 | 39 | 0 |
| MCP tools | 0 | 39 | 0 |

## Daily Summary

| Date | Events | Tokens | Cost |
|------|--------|--------|------|
| 2026-02-21 | 20 | 134.30M | $275.2531 |
| 2026-02-20 | 58 | 452.44M | $917.0583 |

## Usage over time

```mermaid
xychart-beta
    title "Token usage over time (all sources)"
    x-axis ["02-20 20:38", "02-20 22:40", "02-20 22:40", "02-20 23:34", "02-20 23:34", "02-21 00:42", "02-21 00:42", "02-21 01:17", "02-21 01:17", "02-21 08:35", "02-21 08:35", "02-21 08:43", "02-21 08:43", "02-21 08:58", "02-21 08:58"]
    y-axis "Tokens" 0 --> 23041
    line "Input" [0, 20946, 0, 11287, 0, 58, 0, 213, 0, 128, 0, 238, 0, 32, 0]
    line "Output" [0, 1894, 0, 2318, 0, 378, 0, 1624, 0, 599, 0, 1570, 0, 90, 0]
```

```mermaid
xychart-beta
    title "Cost over time (all sources, USD)"
    x-axis ["02-20 20:38", "02-20 22:40", "02-20 22:40", "02-20 23:34", "02-20 23:34", "02-21 00:42", "02-21 00:42", "02-21 01:17", "02-21 01:17", "02-21 08:35", "02-21 08:35", "02-21 08:43", "02-21 08:43", "02-21 08:58", "02-21 08:58"]
    y-axis "USD" 0 --> 292
    line "Cost" [0.0045000000000000005, 60.637539000000004, 0.0565, 74.7590402, 0.1145, 7.664612999999999, 0.011, 40.793046749999995, 0.054, 26.10212775, 0.0275, 51.90656625, 0.059500000000000004, 2.4871647500000003, 0.001]
    line "Cumulative" [0.0045, 60.642, 60.6985, 135.4576, 135.5721, 143.2367, 143.2477, 184.0407, 184.0947, 210.1969, 210.2244, 262.1309, 262.1904, 264.6776, 264.6786]
```

```mermaid
xychart-beta
    title "Cost by source over time (USD)"
    x-axis ["02-20 20:38", "02-20 22:40", "02-20 22:40", "02-20 23:34", "02-20 23:34", "02-21 00:42", "02-21 00:42", "02-21 01:17", "02-21 01:17", "02-21 08:35", "02-21 08:35", "02-21 08:43", "02-21 08:43", "02-21 08:58", "02-21 08:58"]
    y-axis "USD" 0 --> 83
    line "Claude" [0, 60.637539000000004, 0, 74.7590402, 0, 7.664612999999999, 0, 40.793046749999995, 0, 26.10212775, 0, 51.90656625, 0, 2.4871647500000003, 0]
    line "Cursor" [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    line "Runtime proxy" [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    line "Scripts" [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    line "MCP" [0.0045000000000000005, 0, 0.0565, 0, 0.1145, 0, 0.011, 0, 0.054, 0, 0.0275, 0, 0.059500000000000004, 0, 0.001]
```

## Recent Events

| Time | Source | Provider | Model | In | Out | Cost | Method |
|------|--------|----------|-------|----|-----|------|--------|
| 2026-02-21 13:58 | MCP tools | claude | mcp-tooling | 0 | 0 | $0.0010 | best_effort |
| 2026-02-21 13:58 | Claude | anthropic | claude-opus-4-6,claude-haiku-4-5-20251001 | 32 | 90 | $2.4872 | best_effort |
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
| 2026-02-21 01:01 | MCP tools | claude | mcp-tooling | 0 | 0 | $0.0060 | best_effort |
| 2026-02-21 01:01 | Claude | anthropic | claude-opus-4-6 | 36 | 235 | $4.2616 | best_effort |
| 2026-02-21 00:50 | MCP tools | claude | mcp-tooling | 0 | 0 | $0.0005 | best_effort |
| 2026-02-21 00:50 | Claude | anthropic | claude-opus-4-6,claude-haiku-4-5-20251001 | 31 | 45 | $3.4002 | best_effort |

---
*Last updated: 2026-02-21 13:58:07 UTC*

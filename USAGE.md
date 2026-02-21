# Unified AI Usage Tracker

> Auto-updated cumulative usage from Claude, Cursor, runtime proxy, scripts, and MCP signals.

## Grand Total

| Metric | Value |
|--------|-------|
| Events | 72 |
| Requests | 2849 |
| Total tokens | 549.08M |
| Input tokens | 160.4k |
| Output tokens | 57.8k |
| Cache read | 530.24M |
| Cache create | 18.62M |
| Estimated cost | $1111.7275 |

## Segmented Totals by Source

| Source | Events | Requests | Total tokens | Input | Output | Cost |
|--------|--------|----------|--------------|-------|--------|------|
| Claude | 36 | 36 | 549.08M | 160.4k | 57.8k | $1110.3210 |
| MCP tools | 36 | 2813 | 0 | 0 | 0 | $1.4065 |

## Estimation Quality

| Source | Exact | Best effort | Unavailable |
|--------|-------|-------------|-------------|
| Claude | 0 | 36 | 0 |
| MCP tools | 0 | 36 | 0 |

## Daily Summary

| Date | Events | Tokens | Cost |
|------|--------|--------|------|
| 2026-02-21 | 14 | 96.64M | $194.6692 |
| 2026-02-20 | 58 | 452.44M | $917.0583 |

## Usage over time

```mermaid
xychart-beta
    title "Token usage over time (all sources)"
    x-axis ["02-20 18:53", "02-20 19:50", "02-20 19:50", "02-20 20:01", "02-20 20:01", "02-20 20:38", "02-20 20:38", "02-20 22:40", "02-20 22:40", "02-20 23:34", "02-20 23:34", "02-21 00:42", "02-21 00:42", "02-21 01:17", "02-21 01:17"]
    y-axis "Tokens" 0 --> 23041
    line "Input" [0, 31, 0, 36, 0, 76, 0, 20946, 0, 11287, 0, 58, 0, 213, 0]
    line "Output" [0, 45, 0, 235, 0, 195, 0, 1894, 0, 2318, 0, 378, 0, 1624, 0]
```

```mermaid
xychart-beta
    title "Cost over time (all sources, USD)"
    x-axis ["02-20 18:53", "02-20 19:50", "02-20 19:50", "02-20 20:01", "02-20 20:01", "02-20 20:38", "02-20 20:38", "02-20 22:40", "02-20 22:40", "02-20 23:34", "02-20 23:34", "02-21 00:42", "02-21 00:42", "02-21 01:17", "02-21 01:17"]
    y-axis "USD" 0 --> 215
    line "Cost" [0.011, 3.4002099999999995, 0.0005, 4.26157575, 0.006, 2.90617066, 0.0045000000000000005, 60.637539000000004, 0.0565, 74.7590402, 0.1145, 7.664612999999999, 0.011, 40.793046749999995, 0.054]
    line "Cumulative" [0.011, 3.4112, 3.4117, 7.6733, 7.6793, 10.5855, 10.59, 71.2275, 71.284, 146.043, 146.1575, 153.8221, 153.8331, 194.6262, 194.6802]
```

```mermaid
xychart-beta
    title "Cost by source over time (USD)"
    x-axis ["02-20 18:53", "02-20 19:50", "02-20 19:50", "02-20 20:01", "02-20 20:01", "02-20 20:38", "02-20 20:38", "02-20 22:40", "02-20 22:40", "02-20 23:34", "02-20 23:34", "02-21 00:42", "02-21 00:42", "02-21 01:17", "02-21 01:17"]
    y-axis "USD" 0 --> 83
    line "Claude" [0, 3.4002099999999995, 0, 4.26157575, 0, 2.90617066, 0, 60.637539000000004, 0, 74.7590402, 0, 7.664612999999999, 0, 40.793046749999995, 0]
    line "Cursor" [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    line "Runtime proxy" [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    line "Scripts" [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    line "MCP" [0.011, 0, 0.0005, 0, 0.006, 0, 0.0045000000000000005, 0, 0.0565, 0, 0.1145, 0, 0.011, 0, 0.054]
```

## Recent Events

| Time | Source | Provider | Model | In | Out | Cost | Method |
|------|--------|----------|-------|----|-----|------|--------|
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
| 2026-02-20 23:53 | MCP tools | claude | mcp-tooling | 0 | 0 | $0.0110 | best_effort |
| 2026-02-20 23:53 | Claude | anthropic | claude-opus-4-6 | 7.0k | 363 | $18.6302 | best_effort |
| 2026-02-20 22:29 | MCP tools | claude | mcp-tooling | 0 | 0 | $0.0460 | best_effort |
| 2026-02-20 22:29 | Claude | anthropic | claude-opus-4-6,<synthetic> | 50.6k | 1.2k | $34.0588 | best_effort |
| 2026-02-20 22:19 | MCP tools | claude | mcp-tooling | 0 | 0 | $0.0050 | best_effort |
| 2026-02-20 22:19 | Claude | anthropic | claude-opus-4-6 | 28 | 114 | $2.8004 | best_effort |

---
*Last updated: 2026-02-21 06:17:09 UTC*

# Unified AI Usage Tracker

> Auto-updated cumulative usage from Claude, Cursor, runtime proxy, scripts, and MCP signals.

## Grand Total

| Metric | Value |
|--------|-------|
| Events | 22 |
| Requests | 997 |
| Total tokens | 189.27M |
| Input tokens | 36.5k |
| Output tokens | 12.1k |
| Cache read | 184.12M |
| Cache create | 5.10M |
| Estimated cost | $373.6760 |

## Segmented Totals by Source

| Source | Events | Requests | Total tokens | Input | Output | Cost |
|--------|--------|----------|--------------|-------|--------|------|
| Claude | 11 | 11 | 189.27M | 36.5k | 12.1k | $373.1830 |
| MCP tools | 11 | 986 | 0 | 0 | 0 | $0.4930 |

## Estimation Quality

| Source | Exact | Best effort | Unavailable |
|--------|-------|-------------|-------------|
| Claude | 0 | 11 | 0 |
| MCP tools | 0 | 11 | 0 |

## Daily Summary

| Date | Events | Tokens | Cost |
|------|--------|--------|------|
| 2026-02-20 | 22 | 189.27M | $373.6760 |

## Usage over time

```mermaid
xychart-beta
    title "Token usage over time (all sources)"
    x-axis ["02-20 00:03", "02-20 00:12", "02-20 00:12", "02-20 00:42", "02-20 00:42", "02-20 02:10", "02-20 02:10", "02-20 08:22", "02-20 08:22", "02-20 08:45", "02-20 08:45", "02-20 09:50", "02-20 09:50", "02-20 09:59", "02-20 09:59"]
    y-axis "Tokens" 0 --> 12038
    line "Input" [0, 302, 0, 38, 0, 526, 0, 50, 0, 20, 0, 10943, 0, 4471, 0]
    line "Output" [0, 1766, 0, 106, 0, 3326, 0, 558, 0, 111, 0, 4530, 0, 1128, 0]
```

```mermaid
xychart-beta
    title "Cost over time (all sources, USD)"
    x-axis ["02-20 00:03", "02-20 00:12", "02-20 00:12", "02-20 00:42", "02-20 00:42", "02-20 02:10", "02-20 02:10", "02-20 08:22", "02-20 08:22", "02-20 08:45", "02-20 08:45", "02-20 09:50", "02-20 09:50", "02-20 09:59", "02-20 09:59"]
    y-axis "USD" 0 --> 378
    line "Cost" [0.0015, 59.945744250000004, 0.08750000000000001, 5.441724, 0.0085, 93.4174245, 0.1205, 6.139039500000001, 0.011, 1.37979225, 0.002, 142.348095, 0.179, 34.197531, 0.0505]
    line "Cumulative" [0.0015, 59.9472, 60.0347, 65.4765, 65.485, 158.9024, 159.0229, 165.1619, 165.1729, 166.5527, 166.5547, 308.9028, 309.0818, 343.2794, 343.3299]
```

```mermaid
xychart-beta
    title "Cost by source over time (USD)"
    x-axis ["02-20 00:03", "02-20 00:12", "02-20 00:12", "02-20 00:42", "02-20 00:42", "02-20 02:10", "02-20 02:10", "02-20 08:22", "02-20 08:22", "02-20 08:45", "02-20 08:45", "02-20 09:50", "02-20 09:50", "02-20 09:59", "02-20 09:59"]
    y-axis "USD" 0 --> 157
    line "Claude" [0, 59.945744250000004, 0, 5.441724, 0, 93.4174245, 0, 6.139039500000001, 0, 1.37979225, 0, 142.348095, 0, 34.197531, 0]
    line "Cursor" [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    line "Runtime proxy" [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    line "Scripts" [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    line "MCP" [0.0015, 0, 0.08750000000000001, 0, 0.0085, 0, 0.1205, 0, 0.011, 0, 0.002, 0, 0.179, 0, 0.0505]
```

## Recent Events

| Time | Source | Provider | Model | In | Out | Cost | Method |
|------|--------|----------|-------|----|-----|------|--------|
| 2026-02-20 14:59 | MCP tools | claude | mcp-tooling | 0 | 0 | $0.0505 | best_effort |
| 2026-02-20 14:59 | Claude | anthropic | claude-opus-4-6 | 4.5k | 1.1k | $34.1975 | best_effort |
| 2026-02-20 14:50 | MCP tools | claude | mcp-tooling | 0 | 0 | $0.1790 | best_effort |
| 2026-02-20 14:50 | Claude | anthropic | claude-opus-4-6 | 10.9k | 4.5k | $142.3481 | best_effort |
| 2026-02-20 13:45 | MCP tools | claude | mcp-tooling | 0 | 0 | $0.0020 | best_effort |
| 2026-02-20 13:45 | Claude | anthropic | claude-opus-4-6 | 20 | 111 | $1.3798 | best_effort |
| 2026-02-20 13:22 | MCP tools | claude | mcp-tooling | 0 | 0 | $0.0110 | best_effort |
| 2026-02-20 13:22 | Claude | anthropic | claude-opus-4-6 | 50 | 558 | $6.1390 | best_effort |
| 2026-02-20 07:10 | MCP tools | claude | mcp-tooling | 0 | 0 | $0.1205 | best_effort |
| 2026-02-20 07:10 | Claude | anthropic | claude-opus-4-6 | 526 | 3.3k | $93.4174 | best_effort |
| 2026-02-20 05:42 | MCP tools | claude | mcp-tooling | 0 | 0 | $0.0085 | best_effort |
| 2026-02-20 05:42 | Claude | anthropic | claude-opus-4-6 | 38 | 106 | $5.4417 | best_effort |
| 2026-02-20 05:12 | MCP tools | claude | mcp-tooling | 0 | 0 | $0.0875 | best_effort |
| 2026-02-20 05:12 | Claude | anthropic | claude-opus-4-6 | 302 | 1.8k | $59.9457 | best_effort |
| 2026-02-20 05:03 | MCP tools | claude | mcp-tooling | 0 | 0 | $0.0015 | best_effort |
| 2026-02-20 05:03 | Claude | anthropic | claude-opus-4-6 | 15 | 36 | $1.9398 | best_effort |
| 2026-02-20 04:38 | MCP tools | claude | mcp-tooling | 0 | 0 | $0.0225 | best_effort |
| 2026-02-20 04:38 | Claude | anthropic | claude-opus-4-6 | 107 | 328 | $16.9902 | best_effort |
| 2026-02-20 02:26 | MCP tools | claude | mcp-tooling | 0 | 0 | $0.0075 | best_effort |
| 2026-02-20 02:26 | Claude | anthropic | claude-opus-4-6 | 20.0k | 146 | $9.9826 | best_effort |

---
*Last updated: 2026-02-20 14:59:07 UTC*

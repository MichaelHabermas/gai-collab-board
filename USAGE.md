# Unified AI Usage Tracker

> Auto-updated cumulative usage from Claude, Cursor, runtime proxy, scripts, and MCP signals.

## Grand Total

| Metric | Value |
|--------|-------|
| Events | 24 |
| Requests | 1223 |
| Total tokens | 230.09M |
| Input tokens | 56.6k |
| Output tokens | 15.3k |
| Cache read | 224.22M |
| Cache create | 5.81M |
| Estimated cost | $447.8060 |

## Segmented Totals by Source

| Source | Events | Requests | Total tokens | Input | Output | Cost |
|--------|--------|----------|--------------|-------|--------|------|
| Claude | 12 | 12 | 230.09M | 56.6k | 15.3k | $447.2005 |
| MCP tools | 12 | 1211 | 0 | 0 | 0 | $0.6055 |

## Estimation Quality

| Source | Exact | Best effort | Unavailable |
|--------|-------|-------------|-------------|
| Claude | 0 | 12 | 0 |
| MCP tools | 0 | 12 | 0 |

## Daily Summary

| Date | Events | Tokens | Cost |
|------|--------|--------|------|
| 2026-02-20 | 24 | 230.09M | $447.8060 |

## Usage over time

```mermaid
xychart-beta
    title "Token usage over time (all sources)"
    x-axis ["02-20 00:12", "02-20 00:42", "02-20 00:42", "02-20 02:10", "02-20 02:10", "02-20 08:22", "02-20 08:22", "02-20 08:45", "02-20 08:45", "02-20 09:59", "02-20 09:59", "02-20 10:45", "02-20 10:45", "02-20 10:46", "02-20 10:46"]
    y-axis "Tokens" 0 --> 26164
    line "Input" [0, 38, 0, 526, 0, 50, 0, 20, 0, 4471, 0, 23785, 0, 7295, 0]
    line "Output" [0, 106, 0, 3326, 0, 558, 0, 111, 0, 1128, 0, 7703, 0, 71, 0]
```

```mermaid
xychart-beta
    title "Cost over time (all sources, USD)"
    x-axis ["02-20 00:12", "02-20 00:42", "02-20 00:42", "02-20 02:10", "02-20 02:10", "02-20 08:22", "02-20 08:22", "02-20 08:45", "02-20 08:45", "02-20 09:59", "02-20 09:59", "02-20 10:45", "02-20 10:45", "02-20 10:46", "02-20 10:46"]
    y-axis "USD" 0 --> 394
    line "Cost" [0.08750000000000001, 5.441724, 0.0085, 93.4174245, 0.1205, 6.139039500000001, 0.011, 1.37979225, 0.002, 34.197531, 0.0505, 213.96553949999998, 0.2895, 2.40003825, 0.002]
    line "Cumulative" [0.0875, 5.5292, 5.5377, 98.9551, 99.0756, 105.2147, 105.2257, 106.6055, 106.6075, 140.805, 140.8555, 354.8211, 355.1106, 357.5106, 357.5126]
```

```mermaid
xychart-beta
    title "Cost by source over time (USD)"
    x-axis ["02-20 00:12", "02-20 00:42", "02-20 00:42", "02-20 02:10", "02-20 02:10", "02-20 08:22", "02-20 08:22", "02-20 08:45", "02-20 08:45", "02-20 09:59", "02-20 09:59", "02-20 10:45", "02-20 10:45", "02-20 10:46", "02-20 10:46"]
    y-axis "USD" 0 --> 236
    line "Claude" [0, 5.441724, 0, 93.4174245, 0, 6.139039500000001, 0, 1.37979225, 0, 34.197531, 0, 213.96553949999998, 0, 2.40003825, 0]
    line "Cursor" [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    line "Runtime proxy" [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    line "Scripts" [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    line "MCP" [0.08750000000000001, 0, 0.0085, 0, 0.1205, 0, 0.011, 0, 0.002, 0, 0.0505, 0, 0.2895, 0, 0.002]
```

## Recent Events

| Time | Source | Provider | Model | In | Out | Cost | Method |
|------|--------|----------|-------|----|-----|------|--------|
| 2026-02-20 15:46 | MCP tools | claude | mcp-tooling | 0 | 0 | $0.0020 | best_effort |
| 2026-02-20 15:46 | Claude | anthropic | claude-opus-4-6 | 7.3k | 71 | $2.4000 | best_effort |
| 2026-02-20 15:45 | MCP tools | claude | mcp-tooling | 0 | 0 | $0.2895 | best_effort |
| 2026-02-20 15:45 | Claude | anthropic | claude-opus-4-6 | 23.8k | 7.7k | $213.9655 | best_effort |
| 2026-02-20 14:59 | MCP tools | claude | mcp-tooling | 0 | 0 | $0.0505 | best_effort |
| 2026-02-20 14:59 | Claude | anthropic | claude-opus-4-6 | 4.5k | 1.1k | $34.1975 | best_effort |
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

---
*Last updated: 2026-02-20 15:46:33 UTC*

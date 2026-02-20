# Unified AI Usage Tracker

> Auto-updated cumulative usage from Claude, Cursor, runtime proxy, scripts, and MCP signals.

## Grand Total

| Metric | Value |
|--------|-------|
| Events | 26 |
| Requests | 1327 |
| Total tokens | 250.25M |
| Input tokens | 56.8k |
| Output tokens | 16.9k |
| Cache read | 243.16M |
| Cache create | 7.01M |
| Estimated cost | $498.9840 |

## Segmented Totals by Source

| Source | Events | Requests | Total tokens | Input | Output | Cost |
|--------|--------|----------|--------------|-------|--------|------|
| Claude | 13 | 13 | 250.25M | 56.8k | 16.9k | $498.3270 |
| MCP tools | 13 | 1314 | 0 | 0 | 0 | $0.6570 |

## Estimation Quality

| Source | Exact | Best effort | Unavailable |
|--------|-------|-------------|-------------|
| Claude | 0 | 13 | 0 |
| MCP tools | 0 | 13 | 0 |

## Daily Summary

| Date | Events | Tokens | Cost |
|------|--------|--------|------|
| 2026-02-20 | 26 | 250.25M | $498.9840 |

## Usage over time

```mermaid
xychart-beta
    title "Token usage over time (all sources)"
    x-axis ["02-20 00:42", "02-20 02:10", "02-20 02:10", "02-20 08:22", "02-20 08:22", "02-20 08:45", "02-20 08:45", "02-20 09:59", "02-20 09:59", "02-20 10:48", "02-20 10:48", "02-20 11:08", "02-20 11:08", "02-20 11:35", "02-20 11:35"]
    y-axis "Tokens" 0 --> 26178
    line "Input" [0, 526, 0, 50, 0, 20, 0, 4471, 0, 23798, 0, 23, 0, 7477, 0]
    line "Output" [0, 3326, 0, 558, 0, 111, 0, 1128, 0, 7756, 0, 167, 0, 1473, 0]
```

```mermaid
xychart-beta
    title "Cost over time (all sources, USD)"
    x-axis ["02-20 00:42", "02-20 02:10", "02-20 02:10", "02-20 08:22", "02-20 08:22", "02-20 08:45", "02-20 08:45", "02-20 09:59", "02-20 09:59", "02-20 10:48", "02-20 10:48", "02-20 11:08", "02-20 11:08", "02-20 11:35", "02-20 11:35"]
    y-axis "USD" 0 --> 444
    line "Cost" [0.0085, 93.4174245, 0.1205, 6.139039500000001, 0.011, 1.37979225, 0.002, 34.197531, 0.0505, 214.80995174999998, 0.29, 4.380927, 0.0055, 48.30119775, 0.0475]
    line "Cumulative" [0.0085, 93.4259, 93.5464, 99.6855, 99.6965, 101.0763, 101.0783, 135.2758, 135.3263, 350.1362, 350.4262, 354.8072, 354.8127, 403.1139, 403.1614]
```

```mermaid
xychart-beta
    title "Cost by source over time (USD)"
    x-axis ["02-20 00:42", "02-20 02:10", "02-20 02:10", "02-20 08:22", "02-20 08:22", "02-20 08:45", "02-20 08:45", "02-20 09:59", "02-20 09:59", "02-20 10:48", "02-20 10:48", "02-20 11:08", "02-20 11:08", "02-20 11:35", "02-20 11:35"]
    y-axis "USD" 0 --> 237
    line "Claude" [0, 93.4174245, 0, 6.139039500000001, 0, 1.37979225, 0, 34.197531, 0, 214.80995174999998, 0, 4.380927, 0, 48.30119775, 0]
    line "Cursor" [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    line "Runtime proxy" [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    line "Scripts" [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    line "MCP" [0.0085, 0, 0.1205, 0, 0.011, 0, 0.002, 0, 0.0505, 0, 0.29, 0, 0.0055, 0, 0.0475]
```

## Recent Events

| Time | Source | Provider | Model | In | Out | Cost | Method |
|------|--------|----------|-------|----|-----|------|--------|
| 2026-02-20 16:35 | MCP tools | claude | mcp-tooling | 0 | 0 | $0.0475 | best_effort |
| 2026-02-20 16:35 | Claude | anthropic | claude-opus-4-6 | 7.5k | 1.5k | $48.3012 | best_effort |
| 2026-02-20 16:08 | MCP tools | claude | mcp-tooling | 0 | 0 | $0.0055 | best_effort |
| 2026-02-20 16:08 | Claude | anthropic | claude-opus-4-6 | 23 | 167 | $4.3809 | best_effort |
| 2026-02-20 15:48 | MCP tools | claude | mcp-tooling | 0 | 0 | $0.2900 | best_effort |
| 2026-02-20 15:48 | Claude | anthropic | claude-opus-4-6 | 23.8k | 7.8k | $214.8100 | best_effort |
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

---
*Last updated: 2026-02-20 16:35:02 UTC*

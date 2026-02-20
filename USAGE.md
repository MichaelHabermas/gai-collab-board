# Unified AI Usage Tracker

> Auto-updated cumulative usage from Claude, Cursor, runtime proxy, scripts, and MCP signals.

## Grand Total

| Metric | Value |
|--------|-------|
| Events | 18 |
| Requests | 536 |
| Total tokens | 95.34M |
| Input tokens | 21.0k |
| Output tokens | 6.4k |
| Cache read | 92.25M |
| Cache create | 3.06M |
| Estimated cost | $196.9009 |

## Segmented Totals by Source

| Source | Events | Requests | Total tokens | Input | Output | Cost |
|--------|--------|----------|--------------|-------|--------|------|
| Claude | 9 | 9 | 95.34M | 21.0k | 6.4k | $196.6374 |
| MCP tools | 9 | 527 | 0 | 0 | 0 | $0.2635 |

## Estimation Quality

| Source | Exact | Best effort | Unavailable |
|--------|-------|-------------|-------------|
| Claude | 0 | 9 | 0 |
| MCP tools | 0 | 9 | 0 |

## Daily Summary

| Date | Events | Tokens | Cost |
|------|--------|--------|------|
| 2026-02-20 | 18 | 95.34M | $196.9009 |

## Usage over time

```mermaid
xychart-beta
    title "Token usage over time (all sources)"
    x-axis ["02-19 21:26", "02-19 23:38", "02-19 23:38", "02-20 00:03", "02-20 00:03", "02-20 00:12", "02-20 00:12", "02-20 00:42", "02-20 00:42", "02-20 02:10", "02-20 02:10", "02-20 08:22", "02-20 08:22", "02-20 08:45", "02-20 08:45"]
    y-axis "Tokens" 0 --> 3659
    line "Input" [0, 107, 0, 15, 0, 302, 0, 38, 0, 526, 0, 50, 0, 20, 0]
    line "Output" [0, 328, 0, 36, 0, 1766, 0, 106, 0, 3326, 0, 558, 0, 111, 0]
```

```mermaid
xychart-beta
    title "Cost over time (all sources, USD)"
    x-axis ["02-19 21:26", "02-19 23:38", "02-19 23:38", "02-20 00:03", "02-20 00:03", "02-20 00:12", "02-20 00:12", "02-20 00:42", "02-20 00:42", "02-20 02:10", "02-20 02:10", "02-20 08:22", "02-20 08:22", "02-20 08:45", "02-20 08:45"]
    y-axis "USD" 0 --> 205
    line "Cost" [0.0075, 16.9902225, 0.0225, 1.93984725, 0.0015, 59.945744250000004, 0.08750000000000001, 5.441724, 0.0085, 93.4174245, 0.1205, 6.139039500000001, 0.011, 1.37979225, 0.002]
    line "Cumulative" [0.0075, 16.9977, 17.0202, 18.9601, 18.9616, 78.9073, 78.9948, 84.4365, 84.445, 177.8625, 177.983, 184.122, 184.133, 185.5128, 185.5148]
```

```mermaid
xychart-beta
    title "Cost by source over time (USD)"
    x-axis ["02-19 21:26", "02-19 23:38", "02-19 23:38", "02-20 00:03", "02-20 00:03", "02-20 00:12", "02-20 00:12", "02-20 00:42", "02-20 00:42", "02-20 02:10", "02-20 02:10", "02-20 08:22", "02-20 08:22", "02-20 08:45", "02-20 08:45"]
    y-axis "USD" 0 --> 103
    line "Claude" [0, 16.9902225, 0, 1.93984725, 0, 59.945744250000004, 0, 5.441724, 0, 93.4174245, 0, 6.139039500000001, 0, 1.37979225, 0]
    line "Cursor" [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    line "Runtime proxy" [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    line "Scripts" [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    line "MCP" [0.0075, 0, 0.0225, 0, 0.0015, 0, 0.08750000000000001, 0, 0.0085, 0, 0.1205, 0, 0.011, 0, 0.002]
```

## Recent Events

| Time | Source | Provider | Model | In | Out | Cost | Method |
|------|--------|----------|-------|----|-----|------|--------|
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
| 2026-02-20 01:16 | MCP tools | claude | mcp-tooling | 0 | 0 | $0.0025 | best_effort |
| 2026-02-20 01:16 | Claude | anthropic | claude-opus-4-6 | 12 | 34 | $1.4010 | best_effort |

---
*Last updated: 2026-02-20 13:45:52 UTC*

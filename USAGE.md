# Unified AI Usage Tracker

> Auto-updated cumulative usage from Claude, Cursor, runtime proxy, scripts, and MCP signals.

## Grand Total

| Metric | Value |
|--------|-------|
| Events | 14 |
| Requests | 451 |
| Total tokens | 80.64M |
| Input tokens | 20.8k |
| Output tokens | 4.9k |
| Cache read | 78.14M |
| Cache create | 2.48M |
| Estimated cost | $164.5605 |

## Segmented Totals by Source

| Source | Events | Requests | Total tokens | Input | Output | Cost |
|--------|--------|----------|--------------|-------|--------|------|
| Claude | 7 | 7 | 80.64M | 20.8k | 4.9k | $164.3385 |
| MCP tools | 7 | 444 | 0 | 0 | 0 | $0.2220 |

## Estimation Quality

| Source | Exact | Best effort | Unavailable |
|--------|-------|-------------|-------------|
| Claude | 0 | 7 | 0 |
| MCP tools | 0 | 7 | 0 |

## Daily Summary

| Date | Events | Tokens | Cost |
|------|--------|--------|------|
| 2026-02-20 | 14 | 80.64M | $164.5605 |

## Usage over time

```mermaid
xychart-beta
    title "Token usage over time (all sources)"
    x-axis ["02-19 20:16", "02-19 20:16", "02-19 21:26", "02-19 21:26", "02-19 23:38", "02-19 23:38", "02-20 00:03", "02-20 00:03", "02-20 00:12", "02-20 00:12", "02-20 00:42", "02-20 00:42", "02-20 01:40", "02-20 01:40"]
    y-axis "Tokens" 0 --> 21969
    line "Input" [12, 0, 19971, 0, 107, 0, 15, 0, 302, 0, 38, 0, 353, 0]
    line "Output" [34, 0, 146, 0, 328, 0, 36, 0, 1766, 0, 106, 0, 2470, 0]
```

```mermaid
xychart-beta
    title "Cost over time (all sources, USD)"
    x-axis ["02-19 20:16", "02-19 20:16", "02-19 21:26", "02-19 21:26", "02-19 23:38", "02-19 23:38", "02-20 00:03", "02-20 00:03", "02-20 00:12", "02-20 00:12", "02-20 00:42", "02-20 00:42", "02-20 01:40", "02-20 01:40"]
    y-axis "USD" 0 --> 182
    line "Cost" [1.40096775, 0.0025, 9.98261325, 0.0075, 16.9902225, 0.0225, 1.93984725, 0.0015, 59.945744250000004, 0.08750000000000001, 5.441724, 0.0085, 68.63738175, 0.092]
    line "Cumulative" [1.401, 1.4035, 11.3861, 11.3936, 28.3838, 28.4063, 30.3462, 30.3477, 90.2934, 90.3809, 95.8226, 95.8311, 164.4685, 164.5605]
```

```mermaid
xychart-beta
    title "Cost by source over time (USD)"
    x-axis ["02-19 20:16", "02-19 20:16", "02-19 21:26", "02-19 21:26", "02-19 23:38", "02-19 23:38", "02-20 00:03", "02-20 00:03", "02-20 00:12", "02-20 00:12", "02-20 00:42", "02-20 00:42", "02-20 01:40", "02-20 01:40"]
    y-axis "USD" 0 --> 76
    line "Claude" [1.40096775, 0, 9.98261325, 0, 16.9902225, 0, 1.93984725, 0, 59.945744250000004, 0, 5.441724, 0, 68.63738175, 0]
    line "Cursor" [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    line "Runtime proxy" [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    line "Scripts" [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    line "MCP" [0, 0.0025, 0, 0.0075, 0, 0.0225, 0, 0.0015, 0, 0.08750000000000001, 0, 0.0085, 0, 0.092]
```

## Recent Events

| Time | Source | Provider | Model | In | Out | Cost | Method |
|------|--------|----------|-------|----|-----|------|--------|
| 2026-02-20 06:40 | MCP tools | claude | mcp-tooling | 0 | 0 | $0.0920 | best_effort |
| 2026-02-20 06:40 | Claude | anthropic | claude-opus-4-6 | 353 | 2.5k | $68.6374 | best_effort |
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
*Last updated: 2026-02-20 06:40:10 UTC*

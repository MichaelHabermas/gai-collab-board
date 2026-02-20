# Unified AI Usage Tracker

> Auto-updated cumulative usage from Claude, Cursor, runtime proxy, scripts, and MCP signals.

## Grand Total

| Metric | Value |
|--------|-------|
| Events | 12 |
| Requests | 266 |
| Total tokens | 44.82M |
| Input tokens | 20.4k |
| Output tokens | 2.4k |
| Cache read | 43.18M |
| Cache create | 1.62M |
| Estimated cost | $95.8311 |

## Segmented Totals by Source

| Source | Events | Requests | Total tokens | Input | Output | Cost |
|--------|--------|----------|--------------|-------|--------|------|
| Claude | 6 | 6 | 44.82M | 20.4k | 2.4k | $95.7011 |
| MCP tools | 6 | 260 | 0 | 0 | 0 | $0.1300 |

## Estimation Quality

| Source | Exact | Best effort | Unavailable |
|--------|-------|-------------|-------------|
| Claude | 0 | 6 | 0 |
| MCP tools | 0 | 6 | 0 |

## Daily Summary

| Date | Events | Tokens | Cost |
|------|--------|--------|------|
| 2026-02-20 | 12 | 44.82M | $95.8311 |

## Usage over time

```mermaid
xychart-beta
    title "Token usage over time (all sources)"
    x-axis ["02-19 20:16", "02-19 20:16", "02-19 21:26", "02-19 21:26", "02-19 23:38", "02-19 23:38", "02-20 00:03", "02-20 00:03", "02-20 00:12", "02-20 00:12", "02-20 00:42", "02-20 00:42"]
    y-axis "Tokens" 0 --> 21969
    line "Input" [12, 0, 19971, 0, 107, 0, 15, 0, 302, 0, 38, 0]
    line "Output" [34, 0, 146, 0, 328, 0, 36, 0, 1766, 0, 106, 0]
```

```mermaid
xychart-beta
    title "Cost over time (all sources, USD)"
    x-axis ["02-19 20:16", "02-19 20:16", "02-19 21:26", "02-19 21:26", "02-19 23:38", "02-19 23:38", "02-20 00:03", "02-20 00:03", "02-20 00:12", "02-20 00:12", "02-20 00:42", "02-20 00:42"]
    y-axis "USD" 0 --> 106
    line "Cost" [1.40096775, 0.0025, 9.98261325, 0.0075, 16.9902225, 0.0225, 1.93984725, 0.0015, 59.945744250000004, 0.08750000000000001, 5.441724, 0.0085]
    line "Cumulative" [1.401, 1.4035, 11.3861, 11.3936, 28.3838, 28.4063, 30.3462, 30.3477, 90.2934, 90.3809, 95.8226, 95.8311]
```

```mermaid
xychart-beta
    title "Cost by source over time (USD)"
    x-axis ["02-19 20:16", "02-19 20:16", "02-19 21:26", "02-19 21:26", "02-19 23:38", "02-19 23:38", "02-20 00:03", "02-20 00:03", "02-20 00:12", "02-20 00:12", "02-20 00:42", "02-20 00:42"]
    y-axis "USD" 0 --> 66
    line "Claude" [1.40096775, 0, 9.98261325, 0, 16.9902225, 0, 1.93984725, 0, 59.945744250000004, 0, 5.441724, 0]
    line "Cursor" [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    line "Runtime proxy" [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    line "Scripts" [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    line "MCP" [0, 0.0025, 0, 0.0075, 0, 0.0225, 0, 0.0015, 0, 0.08750000000000001, 0, 0.0085]
```

## Recent Events

| Time | Source | Provider | Model | In | Out | Cost | Method |
|------|--------|----------|-------|----|-----|------|--------|
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
*Last updated: 2026-02-20 05:42:05 UTC*

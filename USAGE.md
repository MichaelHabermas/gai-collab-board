# Unified AI Usage Tracker

> Auto-updated cumulative usage from Claude, Cursor, runtime proxy, scripts, and MCP signals.

## Grand Total

| Metric | Value |
|--------|-------|
| Events | 64 |
| Requests | 2438 |
| Total tokens | 470.58M |
| Input tokens | 141.2k |
| Output tokens | 52.6k |
| Cache read | 454.87M |
| Cache create | 15.52M |
| Estimated cost | $969.9637 |

## Segmented Totals by Source

| Source | Events | Requests | Total tokens | Input | Output | Cost |
|--------|--------|----------|--------------|-------|--------|------|
| Claude | 32 | 32 | 470.58M | 141.2k | 52.6k | $968.7607 |
| MCP tools | 32 | 2406 | 0 | 0 | 0 | $1.2030 |

## Estimation Quality

| Source | Exact | Best effort | Unavailable |
|--------|-------|-------------|-------------|
| Claude | 0 | 32 | 0 |
| MCP tools | 0 | 32 | 0 |

## Daily Summary

| Date | Events | Tokens | Cost |
|------|--------|--------|------|
| 2026-02-21 | 4 | 2.25M | $7.6683 |
| 2026-02-20 | 60 | 468.33M | $962.2954 |

## Usage over time

```mermaid
xychart-beta
    title "Token usage over time (all sources)"
    x-axis ["02-20 16:35", "02-20 17:15", "02-20 17:15", "02-20 17:19", "02-20 17:19", "02-20 17:29", "02-20 17:29", "02-20 18:37", "02-20 18:37", "02-20 18:53", "02-20 18:53", "02-20 19:50", "02-20 19:50", "02-20 20:01", "02-20 20:01"]
    y-axis "Tokens" 0 --> 55668
    line "Input" [0, 179, 0, 28, 0, 50607, 0, 13381, 0, 6994, 0, 31, 0, 36, 0]
    line "Output" [0, 1163, 0, 114, 0, 1231, 0, 1253, 0, 363, 0, 45, 0, 235, 0]
```

```mermaid
xychart-beta
    title "Cost over time (all sources, USD)"
    x-axis ["02-20 16:35", "02-20 17:15", "02-20 17:15", "02-20 17:19", "02-20 17:19", "02-20 17:29", "02-20 17:29", "02-20 18:37", "02-20 18:37", "02-20 18:53", "02-20 18:53", "02-20 19:50", "02-20 19:50", "02-20 20:01", "02-20 20:01"]
    y-axis "USD" 0 --> 154
    line "Cost" [0.058, 30.7421055, 0.035500000000000004, 2.8003875000000003, 0.005, 34.05879975, 0.046, 45.20010599999999, 0.037, 18.63021525, 0.011, 3.4002099999999995, 0.0005, 4.26157575, 0.006]
    line "Cumulative" [0.058, 30.8001, 30.8356, 33.636, 33.641, 67.6998, 67.7458, 112.9459, 112.9829, 131.6131, 131.6241, 135.0243, 135.0248, 139.2864, 139.2924]
```

```mermaid
xychart-beta
    title "Cost by source over time (USD)"
    x-axis ["02-20 16:35", "02-20 17:15", "02-20 17:15", "02-20 17:19", "02-20 17:19", "02-20 17:29", "02-20 17:29", "02-20 18:37", "02-20 18:37", "02-20 18:53", "02-20 18:53", "02-20 19:50", "02-20 19:50", "02-20 20:01", "02-20 20:01"]
    y-axis "USD" 0 --> 50
    line "Claude" [0, 30.7421055, 0, 2.8003875000000003, 0, 34.05879975, 0, 45.20010599999999, 0, 18.63021525, 0, 3.4002099999999995, 0, 4.26157575, 0]
    line "Cursor" [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    line "Runtime proxy" [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    line "Scripts" [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    line "MCP" [0.058, 0, 0.035500000000000004, 0, 0.005, 0, 0.046, 0, 0.037, 0, 0.011, 0, 0.0005, 0, 0.006]
```

## Recent Events

| Time | Source | Provider | Model | In | Out | Cost | Method |
|------|--------|----------|-------|----|-----|------|--------|
| 2026-02-21 01:01 | MCP tools | claude | mcp-tooling | 0 | 0 | $0.0060 | best_effort |
| 2026-02-21 01:01 | Claude | anthropic | claude-opus-4-6 | 36 | 235 | $4.2616 | best_effort |
| 2026-02-21 00:50 | MCP tools | claude | mcp-tooling | 0 | 0 | $0.0005 | best_effort |
| 2026-02-21 00:50 | Claude | anthropic | claude-opus-4-6,claude-haiku-4-5-20251001 | 31 | 45 | $3.4002 | best_effort |
| 2026-02-20 23:53 | MCP tools | claude | mcp-tooling | 0 | 0 | $0.0110 | best_effort |
| 2026-02-20 23:53 | Claude | anthropic | claude-opus-4-6 | 7.0k | 363 | $18.6302 | best_effort |
| 2026-02-20 23:37 | MCP tools | claude | mcp-tooling | 0 | 0 | $0.0370 | best_effort |
| 2026-02-20 23:37 | Claude | anthropic | claude-opus-4-6 | 13.4k | 1.3k | $45.2001 | best_effort |
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

---
*Last updated: 2026-02-21 01:01:40 UTC*

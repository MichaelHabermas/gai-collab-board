# AI Cost Analysis

## Development Costs

- **Cursor IDE subscription:** $20/month (includes integrated AI — Claude/GPT)
- **External LLM API spend:** $0 (all development AI usage via Cursor subscription)
- **Cumulative tokens (estimated):** ~442k input / ~157k output across 20+ development sessions
- **Context7 MCP:** Free (library documentation lookups for Konva.js, Firebase, Tailwind)

Development cost is fixed and does not scale with end-user count.

## Production Projections

Monthly LLM API cost to run CollabBoard's AI feature at scale. Assumptions: 4 sessions/user/month, 2.5 AI commands/session = **10 commands/user/month**.

| Users   | Commands/User/Month | Groq (Llama 3.3 70B) |
| ------- | ------------------- | --------------------- |
| 100     | 10                  | $0.72/month           |
| 1,000   | 10                  | $7.25/month           |
| 10,000  | 10                  | $72.48/month          |
| 100,000 | 10                  | $724.80/month         |

Costs scale linearly with commands per user per month.

## Pricing Sources

- **Groq (Llama 3.3 70B):** $0.59/1M input, $0.79/1M output — [groq.com/pricing](https://groq.com/pricing) (Feb 2026)

## Token Mix Per Command

| Type    | Input Tokens | Output Tokens | Share of Commands |
| ------- | ------------ | ------------- | ----------------- |
| Simple  | 500          | 200           | 60%               |
| Medium  | 1,000        | 400           | 30%               |
| Complex | 2,000        | 800           | 10%               |

## Key Findings

- Development cost is dominated by Cursor subscription ($20/mo); production cost scales with user count and command volume
- Cost scales with command volume; choose model/capability vs. budget
- Doubling commands per user per month doubles monthly cost
- At 100K users, Groq costs ~$725/month — well within typical SaaS margins

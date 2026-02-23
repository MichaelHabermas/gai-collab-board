# AI Cost Analysis — Final

Development spend and production projections for CollabBoard. This analysis satisfies the AI Cost Analysis requirement (G4 Week 1, Development & Testing Costs and Production Cost Projections).

---

## Development & Testing Costs

### LLM API costs

- **Anthropic Claude:** $200 (subscription used for development).
- **Cursor:** $200 (subscription; includes integrated Claude/GPT usage in the IDE).
- **External LLM API for development:** $0 (all development AI usage was via Cursor and Anthropic subscriptions).
- **Estimated pay-as-you-go equivalent** (from project USAGE.md): ~$1,250 (Claude + MCP). Actual reported dev spend is the fixed subscriptions below.

### Total tokens consumed (input / output breakdown)

- **Cursor IDE** (from `cursor-usage-events-2026-02-23.csv`, “Included” requests only):
  - Input (no cache): 96,934,823
  - Cache read: 1,048,371,769
  - Output: 7,532,676
  - Total tokens: 1,156,816,505
- **Claude / session log** (from AI-DEVELOPMENT-LOG.md and AI-SESSION-LOG.md): ~492k input / ~175k output across 20+ development sessions.
- **Runtime proxy (Gemini) during testing** (from Langfuse export):
  - Input: 190,427
  - Output: 3,199

### Number of API calls

- **Cursor IDE:** 1,153 (“Included” requests in the Cursor usage CSV).
- **Runtime proxy (Gemini):** 35 generations (Langfuse `ai-board-command` traces).

### Any other AI-related costs

- **Context7 MCP:** Free (library documentation lookups for Konva.js, Firebase, Tailwind).
- **Runtime proxy (Gemini) during development/testing:** 35 calls; total cost **$0.07** (from Langfuse export).
- **Embeddings / hosting:** None.

### Total development spend

- **Subscriptions:** $200 (Anthropic) + $200 (Cursor) = **$400**.
- **Other:** $0.07 (Gemini proxy during testing).
- **Total:** **$400.07** (rounded **$400** for reporting).

---

## Production Cost Projections

Estimate monthly LLM API cost at different user scales. Production uses Groq (Llama 3.3 70B) via server-side AI proxy for natural-language board commands.

| 100 Users | 1,000 Users | 10,000 Users | 100,000 Users |
| --- | --- | --- | --- |
| $0.72/month | $7.25/month | $72.48/month | $724.80/month |

### Assumptions

- **Average sessions per user per month:** 4.
- **Average AI commands per user per session:** 2.5.
- **Commands per user per month:** 4 × 2.5 = **10**.

### Token counts per command type

| Type | Input Tokens | Output Tokens | Share of Commands |
| --- | --- | --- | --- |
| Simple | 500 | 200 | 60% |
| Medium | 1,000 | 400 | 30% |
| Complex | 2,000 | 800 | 10% |

### Pricing source

- **Groq (Llama 3.3 70B):** $0.59/1M input, $0.79/1M output — [groq.com/pricing](https://groq.com/pricing) (Feb 2026).

---

## Key findings

- Development cost is dominated by fixed subscriptions ($400); production cost scales with user count and command volume.
- Cost scales linearly with command volume; model/capability can be traded against budget.
- At 100K users, Groq is ~$725/month — within typical SaaS margins.

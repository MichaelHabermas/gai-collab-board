# Summary

This document estimates and tracks AI-related costs. It separates development costs (optional) from production projections (monthly LLM cost at 100 / 1K / 10K / 100K users), documents assumptions (sessions per user, commands per session, token mix), and cites pricing sources. Its purpose is to make AI cost transparent and reproducible so that scaling and provider choices can be discussed with numbers.

---

## AI Cost Analysis

### Development Costs

- **LLM API costs:** Track actual spend (e.g. OpenAI, Anthropic, Groq) during
  the project and fill in $X.XX
- **Total tokens:** XXX,XXX (input) / XXX,XXX (output) — measure via provider
  dashboards or logging
- **API calls:** XXX — total number of completion/chat requests during
  development

_Update these with real numbers from your billing or usage dashboards._

Optional: Development was primarily Cursor ($20/month) plus browser LLMs; this
is a fixed team cost and does not scale with end-user count.

### Production Projections

This section estimates **production** monthly cost: the LLM API cost to run the
CollabBoard AI feature when 100, 1,000, 10,000, or 100,000 **end-users** use it.
It does not include Cursor or other development tooling.

| Users   | Commands/User/Month | Groq (Llama 3.3 70B) | NVIDIA (Kimi 2.5) |
| ------- | ------------------- | -------------------- | ------------------ |
| 100     | 10                  | $0.72/month          | $1.44/month        |
| 1,000   | 10                  | $7.25/month          | $14.40/month       |
| 10,000  | 10                  | $72.48/month         | $144.00/month      |
| 100,000 | 10                  | $724.80/month        | $1,440.00/month    |

Costs scale linearly with commands per user per month. If usage doubles, costs
double.

### Pricing (sources)

- **Groq (Llama 3.3 70B Versatile):** $0.59 per 1M input tokens, $0.79 per 1M
  output tokens. Source: [Groq pricing](https://groq.com/pricing) (as of Feb 2026).
  Free tier may cover low volume; table assumes pay-per-token.
- **NVIDIA (Kimi 2.5):** $0.60 per 1M input tokens, $3.00 per 1M output tokens.
  Source: [PRD Appendix E](PRD.md) / [NVIDIA build](https://build.nvidia.com/moonshotai/kimi-k2.5) (as of Feb 2026).

### Assumptions

All of the following are documented so the table is reproducible.

- **Scope:** Production only — monthly LLM API cost for end-users at each scale.
  Development costs (e.g. Cursor) are not included.
- **Session:** One continuous use of the app (e.g. one board open until close or
  ~30 minutes of inactivity). Used only to derive commands per month.
- **Sessions per user per month:** 4 (typical). Low/medium/high scenarios: 2 / 4 / 8.
- **AI command:** One user message sent to the AI that results in one or more
  LLM calls (one chat completion, possibly with tool calls).
- **Average AI commands per user per session:** 2.5.
- **Commands per user per month:** 10 (= sessions per user per month × commands
  per session; e.g. 4 × 2.5 = 10).

### Token counts per command type

| Type    | Input (tokens) | Output (tokens) | Share of commands  |
| ------- | -------------- | --------------- | ------------------ |
| Simple  | 500            | 200             | 60%                |
| Medium  | 1,000          | 400             | 30%                |
| Complex | 2,000          | 800             | 10%                |

- **Simple:** single create/update (e.g. “add a sticky note”).
- **Medium:** multi-step or layout (e.g. “arrange these in a row”).
- **Complex:** templates, multi-object (e.g. “create a SWOT analysis template”).

**Sensitivity:** If commands per user per month double, monthly cost doubles.
If you change the mix (e.g. more complex commands), recalculate using the
token table and pricing above.

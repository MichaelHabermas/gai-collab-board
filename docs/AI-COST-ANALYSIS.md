# AI Cost Analysis

## Development Costs

- **LLM API costs:** Track actual spend (e.g. OpenAI, Anthropic, Groq) during the project and fill in $X.XX
- **Total tokens:** XXX,XXX (input) / XXX,XXX (output) — measure via provider dashboards or logging
- **API calls:** XXX — total number of completion/chat requests during development

*Update these with real numbers from your billing or usage dashboards.*

## Production Projections

| Users   | Commands/User/Month | Est. Monthly Cost   |
| ------- | ------------------- | -------------------- |
| 100     | 10                  | $0.50 – $2.00        |
| 1,000   | 10                  | $5.00 – $20.00       |
| 10,000  | 10                  | $50.00 – $200.00     |
| 100,000 | 10                  | $500.00 – $2,000.00  |

*Ranges reflect provider and model mix (e.g. Groq vs OpenAI) and command complexity.*

## Assumptions

- **Input:** ~1,000 tokens per command on average (system prompt + board state + user message)
- **Output:** ~300 tokens per command on average (tool calls + short responses)
- **Mix:** ~60% simple (single create/update), ~30% medium (multi-step or layout), ~10% complex (templates, multi-object)
- **Pricing:** Based on typical Groq/OpenAI list prices; actual costs depend on model and provider chosen

# AI Troubleshooting

## Confirmed: Gemini 429 Quota (Local Failures)

When the AI panel fails locally with a message like "Too Many Requests" or "quota exceeded", the **root cause** is typically:

- **Gemini free tier quota** — Google returns `429` with `quota exceeded` (e.g. `generate_content_free_tier_requests` limit 0). Transport and proxy are working; the provider is rejecting requests due to account quota or billing/plan limits.

### Expected User-Facing Guidance

The app normalizes provider errors so users see actionable text instead of raw API messages:

| Condition | User sees (summary) | Remediation hint |
|-----------|---------------------|------------------|
| **429 / quota exceeded** | Rate limit or quota exceeded | Check your AI provider plan and billing; try again later or switch provider. |
| **401 / 403** | API key invalid or not configured | Set the correct API key in .env (dev) or on the server (production). |
| **Timeout / network** | Request timed out or connection failed | Check network and that the AI proxy is reachable. |
| **5xx** | AI service temporarily unavailable | Retry in a few moments. |
| **Malformed / no choices** | Unexpected response from AI | Ensure proxy and model are configured correctly. |

Diagnostics: run `bun run test:ai-connection` (via proxy) or `bun run test:ai-connection -- --direct` to verify provider connectivity and key; 429 from Gemini indicates quota, not a misconfiguration.

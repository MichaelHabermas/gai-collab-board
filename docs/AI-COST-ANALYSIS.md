# Summary

This document summarizes AI cost findings for CollabBoard: optional development costs, production monthly LLM cost at 100 / 1K / 10K / 100K users, main assumptions, and how to recalculate. Purpose: transparent, reproducible numbers for scaling and provider choices.

---

## AI Cost Analysis

### Development Costs

- **LLM API costs:** Track actual spend (e.g. OpenAI, Anthropic, Groq) and fill in $X.XX
- **Total tokens:** XXX,XXX (input) / XXX,XXX (output) — from provider dashboards or logging
- **API calls:** XXX — completion/chat requests during development

_Update from billing or usage dashboards. The running total is kept in [AI-DEVELOPMENT-LOG.md](AI-DEVELOPMENT-LOG.md)._

Development was primarily Cursor ($20/month) plus optional browser LLMs; fixed team cost, does not scale with end-user count.

### Production Projections

Monthly LLM API cost to run the CollabBoard AI feature at scale (development tooling not included):

| Users   | Commands/User/Month | Groq (Llama 3.3 70B) | NVIDIA (Kimi 2.5)   |
| ------- | ------------------- | -------------------- | -------------------- |
| 100     | 10                  | $0.72/month          | $1.44/month          |
| 1,000   | 10                  | $7.25/month          | $14.40/month         |
| 10,000  | 10                  | $72.48/month         | $144.00/month        |
| 100,000 | 10                  | $724.80/month         | $1,440.00/month      |

Costs scale linearly with commands per user per month; if usage doubles, costs double.

### Pricing (sources)

- **Groq (Llama 3.3 70B):** $0.59/1M input, $0.79/1M output. [Groq pricing](https://groq.com/pricing) (Feb 2026). Free tier may cover low volume.
- **NVIDIA (Kimi 2.5):** $0.60/1M input, $3.00/1M output. [PRD Appendix E](PRD.md) / [NVIDIA build](https://build.nvidia.com/moonshotai/kimi-k2.5) (Feb 2026).

### Assumptions

Production scope only (monthly LLM cost for end-users). One **session** = one board open until close or ~30 min inactivity. **4 sessions/user/month** (typical), **2.5 AI commands/session** → **10 commands/user/month**. One **AI command** = one user message that may trigger one or more LLM calls.

### Token mix per command

| Type    | Input | Output | Share |
| ------- | ----- | ------ | ----- |
| Simple  | 500   | 200    | 60%   |
| Medium  | 1,000 | 400    | 30%   |
| Complex | 2,000 | 800    | 10%   |

**Sensitivity:** Doubling commands per user per month doubles monthly cost. Changing the mix (e.g. more complex commands) requires recalc from this table and pricing above.

### Findings

- **Dev cost** is dominated by Cursor; production cost scales with user count and commands per user.
- **Groq is roughly half the cost** of NVIDIA at this token mix; choose by capability vs. budget.
- **Document actual usage** (commands per user, mix of simple/medium/complex) to refine projections; doubling commands per user doubles cost.

### Theme fix (Feb 2026) — production relevance

Dark/light theme fix (root background and token application, browser-override behaviour) is UI-only. No change to LLM usage, API calls, or deployment cost. The production projections and assumptions above remain the source of truth for what the app actually uses and is likely to use in production. No new monitoring or testing overhead is material to cost.

### Right panel collapse (Feb 2026) — production relevance

Collapsible right panel (icon rail when collapsed, full panel when expanded, state persisted per board in localStorage) is UI-only. No change to LLM usage, API calls, or deployment cost. Production projections and token mix remain unchanged. Focus production cost tracking on what is actually used: AI chat commands (Groq/NVIDIA), session and command-per-user assumptions, and the token mix table above.

### Canvas object shadow (Feb 2026) — production relevance

Canvas object shadow (shared constants, slight shadow on all object types: sticky note, shapes, frame, text, line, connector) is UI-only. No change to LLM usage, API calls, or deployment cost. Production cost assumptions unchanged.

### Performance benchmark refactor (Feb 2026) — production relevance

Performance work in this cycle targeted client-side render churn, Konva drag/alignment computation cost, and Firebase listener/update efficiency. The implementation introduced no new AI endpoints, no additional model calls, and no change to provider selection (Groq/NVIDIA assumptions remain unchanged).

Key cost implications:

- **LLM cost:** unchanged (same command volume and token mix assumptions).
- **Infra/runtime:** potentially lower non-LLM cost at scale due to reduced redundant client updates/listener churn, but this is outside the LLM budget table and should be measured in hosting/Firebase dashboards.
- **Testing/benchmarking overhead:** dev-time only; no material recurring production cost.

Operational note: continue tracking real production command mix and commands-per-user before revising LLM projections; performance refactors improve responsiveness but do not change per-command token economics.

### Benchmark hardening follow-up (Feb 2026) — cost relevance

Follow-up changes focused on benchmark reliability (fresh-board setup in E2E benchmarks, deterministic propagation triggering) and reduced pan-mode cursor event overhead. These updates:

- do **not** add new production AI calls,
- do **not** change provider/model routing,
- do **not** change token-per-command assumptions.

Result: projected production LLM costs remain the same as the table above. Any cost benefit is expected in non-LLM infrastructure efficiency (fewer unnecessary realtime updates), which should be measured separately in Firebase and hosting telemetry.

### Share links / deep-linking (Feb 2026) — production relevance

Share-link and deep-linking work is UI/routing only: PRD documentation, share-link helper, ShareDialog using it, and regression tests (unit + E2E). No change to LLM usage, API calls, or deployment cost. Production projections and token mix remain unchanged.

### AI proxy on Render (Feb 2026) — production relevance

Production stack is **Render + Firebase** (not Netlify). AI must be fronted by a server-side proxy so the API key is not in the client. The app supports configurable `VITE_AI_PROXY_URL` (full URL) or `VITE_AI_PROXY_PATH` (default `/api/ai/v1`). An in-repo proxy server (`bun run proxy`) can be deployed as a Render Web Service. Defensive handling ensures malformed proxy responses (e.g. no `choices` array) show a clear error instead of a TypeError. **LLM cost:** unchanged; same command volume, token mix, and provider assumptions (Groq/NVIDIA). What we actually use in production: same per-command economics; proxy deployment is configuration and resilience only.

### Render refresh and active board (Feb 2026) — production relevance

Fix for "Not Found" on refresh (Render Static Site rewrite `/*` → `/index.html`) and per-user active board resolution (no default board id; boards have unique Firestore-generated ids) is routing and deployment-config only. No new AI endpoints, no change to command volume or token mix. **LLM cost:** unchanged. Production cost remains driven by AI command volume and provider (Groq/NVIDIA) as in the table above.

### Non-owner leave board verification (Feb 2026) — production relevance

Verification and documentation only: PRD subsection, unit tests for `removeBoardMember` and BoardListSidebar leave/delete UI, UI-UX plan item marked done. No feature or runtime change. **LLM cost:** unchanged. Production projections and what is used in production (Groq/NVIDIA, command volume) unchanged.

### Bulk delete performance verification (Feb 2026) — production relevance

Verification, unit tests, and PRD subsection for Task 4 (bulk delete). Batch path was already in place; no new runtime behaviour. Client/sync only: multi-select delete uses a single Firestore batch write. **LLM cost:** unchanged. Production cost and token mix unchanged. Focus remains on what is actually used in production: AI commands (Groq/NVIDIA) and the table above.

### Task 7 overlay stability (Feb 2026) — production relevance

Text editing overlay stability (sticky note, text element, frame title) is client-side UI only: overlay position/styles recompute on stage and node transform changes during edit. No new AI endpoints, no change to command volume or token mix. **LLM cost:** unchanged. Production projections (Groq/NVIDIA table) and assumptions remain the source of truth.

### Owner-only board rename (Feb 2026) — production relevance

Task 3 (only owners can rename board names) is permissions and backend alignment: service-layer owner check in `updateBoardName`, Firestore rule so only owner can change `name`. No new AI endpoints, no change to LLM usage or command volume. **LLM cost:** unchanged. Production projections and token mix unchanged. Focus remains on what is actually used in production: AI commands (Groq/NVIDIA) and the table above.

### Snap-to-grid drag parity (Feb 2026) — production relevance

Snap-to-grid parity (drag position constrained to grid during drag, not only on end) is client-side canvas behavior only. No new AI endpoints, no change to LLM usage, API calls, or command volume. **LLM cost:** unchanged. Production cost and token mix unchanged. Track production cost by what is actually used: AI chat (Groq/NVIDIA) and the projections table above.

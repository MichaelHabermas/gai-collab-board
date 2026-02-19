# AI Development Log

## Tools & Workflow

- **Cursor** as the primary IDE with integrated AI (Claude/GPT) for code generation, refactors, and test scaffolding
- **Context7 MCP** for up-to-date library documentation (Konva.js, Firebase, Tailwind, Shadcn/ui, OpenAI API)
- **Bun** as runtime and package manager; **Vitest** for unit/integration tests; **Playwright** for E2E

## MCP Usage

- **Context7** for Konva.js and react-konva patterns (Stage, Layer, shapes, transforms, drag bounds)
- **Context7** for Firebase (Firestore queries, Realtime Database presence, security rules, `writeBatch`)
- **Context7** for Tailwind v4 (`@custom-variant dark`, theme tokens) and Shadcn/ui component APIs
- Documentation queries for OpenAI-compatible API usage and server-side AI proxy configuration

## Effective Prompts

1. "Implement Konva real-time sync with Firebase" — drove the object sync and cursor layer design
2. "Create optimistic update pattern for object sync" — local-first updates then Firestore write with rollback
3. "Add subscribeToUserBoards to list boards where the user is a member" — Firestore query for board list sidebar
4. "Add dark mode toggle with class-based Tailwind and localStorage persistence" — theme hook and `@custom-variant dark`
5. "Add mobile bottom sheet for toolbar using existing Dialog" — responsive toolbar and Tools button on small viewports

## Code Analysis

- **AI-generated:** ~65–70% — boilerplate, service layer, hooks, component structure, test scaffolding, type definitions
- **Hand-written:** ~30–35% — business rules, edge cases, wiring, PRD alignment, complex state (canvas selection + transform + connector flow)

## Strengths & Limitations

- **Strengths:** Boilerplate and repetitive code (Firebase helpers, type definitions), documentation lookup via Context7, test scaffolding, consistent patterns (hooks, error handling), rapid iteration on UI components
- **Limitations:** Complex state interactions (canvas selection + transform + connector flow), Firestore composite indexes, subtle UX (theme flash on load, overlay alignment during pan/zoom), and performance tuning required human iteration and debugging

## Key Learnings

- Resolving library IDs in Context7 before querying docs saves time and avoids outdated snippets
- Breaking tasks into small, single-responsibility steps (per PRD story/commit) keeps AI output focused and reviewable
- Explicit types and interfaces (no `any`) reduce AI mistakes and improve refactor safety
- Running format, lint, and tests after each story catches drift early
- AI is most effective for the "middle 80%" of code; the first 10% (architecture decisions) and last 10% (edge cases, performance) require human judgment

## Cost & Usage

**Development (fixed cost):** Cursor subscription $20/month. External LLM API spend: $0 (all AI usage via Cursor subscription). Approximate cumulative tokens across 20+ logged sessions: ~442k input / ~157k output.

**Production projections** (monthly LLM API cost at scale, 10 AI commands/user/month):

| Users   | Groq (Llama 3.3 70B) |
| ------- | --------------------- |
| 100     | $0.72                 |
| 1,000   | $7.25                 |
| 10,000  | $72.48                |
| 100,000 | $724.80               |

See [AI-COST-ANALYSIS.md](AI-COST-ANALYSIS.md) for assumptions, token mix, and pricing sources. Detailed per-session notes are in [AI-SESSION-LOG.md](AI-SESSION-LOG.md).

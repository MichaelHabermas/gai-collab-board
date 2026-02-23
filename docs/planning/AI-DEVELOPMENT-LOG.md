# AI Development Log — CollabBoard G4 Week 1

## Tools & Workflow

- **Cursor** as the primary IDE with integrated AI (Claude/GPT) for code generation, refactors, and test scaffolding; Agent mode for multi-step tasks.
- **Context7 MCP** for up-to-date library documentation (Konva.js, Firebase, Tailwind, Shadcn/ui, OpenAI API).
- **Bun** as runtime and package manager; **Vitest** for unit/integration tests; **Playwright** for E2E. Format, lint, and test run after each story.

## MCP Usage

- **Context7** for Konva.js and react-konva (Stage, Layer, shapes, transforms, drag bounds).
- **Context7** for Firebase (Firestore queries, Realtime Database presence, security rules, `writeBatch`).
- **Context7** for Tailwind v4 (`@custom-variant dark`, theme tokens) and Shadcn/ui component APIs.
- Documentation queries for OpenAI-compatible API usage and server-side AI proxy configuration.

## Effective Prompts

1. "Implement Konva real-time sync with Firebase" — drove the object sync and cursor layer design.
2. "Create optimistic update pattern for object sync" — local-first updates then Firestore write with rollback.
3. "Add subscribeToUserBoards to list boards where the user is a member" — Firestore query for board list sidebar.
4. "Add dark mode toggle with class-based Tailwind and localStorage persistence" — theme hook and `@custom-variant dark`.
5. "Add mobile bottom sheet for toolbar using existing Dialog" — responsive toolbar and Tools button on small viewports.

## Code Analysis

- **AI-generated (~65–70%):** Boilerplate, service layer, hooks, component structure, test scaffolding, type definitions.
- **Hand-written (~30–35%):** Business rules, edge cases, wiring, PRD alignment, complex state (canvas selection + transform + connector flow).

## Strengths & Limitations

- **Strengths:** Boilerplate and repetitive code (Firebase helpers, types), documentation lookup via Context7, test scaffolding, consistent patterns (hooks, error handling), rapid iteration on UI components.
- **Limitations:** Complex state interactions (canvas selection + transform + connector flow), Firestore composite indexes, subtle UX (theme flash on load, overlay alignment during pan/zoom), and performance tuning required human iteration and debugging.

## Key Learnings

- Resolving library IDs in Context7 before querying docs saves time and avoids outdated snippets.
- Breaking tasks into small, single-responsibility steps (per PRD story/commit) keeps AI output focused and reviewable.
- Explicit types and interfaces (no `any`) reduce AI mistakes and improve refactor safety.
- Running format, lint, and tests after each story catches drift early.
- AI is most effective for the "middle 80%" of code; the first 10% (architecture decisions) and last 10% (edge cases, performance) require human judgment.

---

**Development cost:** $200 Anthropic Claude subscription and $200 Cursor subscription; no separate LLM API spend. Development spanned 20+ sessions; Cursor usage (from export): 1,153 included events. Production cost projections and assumptions: see [AI-COST-ANALYSIS.md](AI-COST-ANALYSIS.md). Per-session notes: [AI-SESSION-LOG.md](AI-SESSION-LOG.md).

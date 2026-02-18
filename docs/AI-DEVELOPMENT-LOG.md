## Summary

This log records how AI was used during development: tools (Cursor, Context7 MCP), workflows, effective prompts, and a rough split of AI-generated vs hand-written code. It also notes strengths, limitations, learnings, and includes cost and deployment expectations with running totals. It serves as both a submission artifact and a reference for improving future AI-assisted workflow and for explaining the development approach.

---

# AI Development Log

## Tools & Workflow

- **Cursor** as the primary IDE with integrated AI
- **Context7 MCP** for up-to-date library documentation (Konva.js, Firebase, Tailwind, etc.)
- Claude/GPT used for code generation, refactors, and test scaffolding

## MCP Usage

- **Context7** for Konva.js and react-konva patterns (Stage, Layer, shapes, transforms)
- **Context7** for Firebase (Firestore, Realtime Database) queries and security rules
- **Context7** for Tailwind v4 and Shadcn/ui component usage
- Documentation queries for OpenAI/Anthropic API usage and Netlify serverless functions

## Effective Prompts

1. "Implement Konva real-time sync with Firebase" — drove the object sync and cursor layer design
2. "Create optimistic update pattern for object sync" — local-first updates then Firestore write
3. "Add subscribeToUserBoards to list boards where the user is a member" — Firestore query for board list sidebar
4. "Add dark mode toggle with class-based Tailwind and localStorage persistence" — theme hook and @custom-variant dark
5. "Add mobile bottom sheet for toolbar using existing Dialog" — responsive toolbar and Tools button on small viewports

## Code Analysis

- **AI-generated:** ~65–70% (boilerplate, service layer, hooks, component structure, tests)
- **Hand-written:** ~30–35% (business rules, edge cases, wiring, PRD alignment)

## Strengths & Limitations

- **Strengths:** Boilerplate and repetitive code (Firebase helpers, type definitions), documentation lookup, test scaffolding, consistent patterns (e.g. hooks, error handling)
- **Limitations:** Complex state (e.g. canvas selection + transform + connector flow), Firestore composite indexes, and subtle UX (e.g. theme flash on load) required human iteration

## Key Learnings

- Resolving library IDs in Context7 before querying docs saves time and avoids outdated snippets.
- Breaking tasks into small, single-responsibility steps (per PRD commits) keeps AI output focused and reviewable.
- Explicit types and interfaces (no `any`) reduce AI mistakes and improve refactor safety.
- Running format and tests after each story catches drift early.

## Cost & usage

- **Development:** AI use during development was via Cursor (integrated AI) and Context7 MCP for docs. LLM API spend during dev: fill from billing (e.g. $0 if Cursor subscription only; or $X.XX if external APIs used). Optional: total input/output tokens and API call count — update from provider dashboards.
- **Running total (development):** Cursor $20/mo; API $0. _Update as numbers are filled in._
- **Deployment (expected):** See [AI-COST-ANALYSIS.md](AI-COST-ANALYSIS.md) for assumptions and sources. At 10 commands/user/month: ~$0.72–$1.44 (100 users), ~$7–$14 (1K), ~$72–$144 (10K), ~$725–$1,440 (100K) depending on provider (Groq vs NVIDIA).
- **Running totals (deployment):** Update when assumptions change; keep in sync with AI-COST-ANALYSIS.md.

| Users   | Groq (approx) | NVIDIA (approx) |
| ------- | ------------- | --------------- |
| 100     | $0.72/mo      | $1.44/mo        |
| 1,000   | $7.25/mo      | $14.40/mo       |
| 10,000  | $72.48/mo     | $144.00/mo      |
| 100,000 | $724.80/mo    | $1,440.00/mo    |

## Theme fix session (Feb 2026)

**Audit (baseline):** Theme state lives in `useTheme` (localStorage `collabboard-theme`); `applyTheme()` sets `document.documentElement.classList` and `colorScheme` on root/body. Class-based dark variant is correct (`@custom-variant dark`). Root cause: `html`, `body`, and `#root` in `index.css` do not set `background-color` or `color` from theme tokens (they use hardcoded `#000000`), so viewport background does not change with toggle and can match browser default (e.g. white), making toggle appear to do nothing. Dark palette uses `#0f172a` (slate-900), perceived as too dark; canvas already uses `#1e293b` for dark. PRD Commit 3 (Theme Support) does not yet specify that manual theme must override browser/system preference or that full-app background must update visibly.

**Implementation:** Applied `background-color: var(--color-background)` and `color: var(--color-foreground)` to `html`, `body`, and `#root` in `src/index.css` so toggling theme updates the full viewport in all browsers. Changed dark background token from `#0f172a` to `#1e293b` in both `@theme dark` and `html.dark` to align with canvas dark and reduce perceived “too dark” look. No change to theme hook or `prefers-color-scheme` usage (app already ignores system preference when stored theme exists). Added unit tests: invalid localStorage fallback to light, stored dark at init, and app theme overrides `matchMedia('prefers-color-scheme')` when storage has a value. Updated PRD with expected theme behaviour and unchecked verification checkboxes for manual browser confirmation. **Running total (development):** unchanged (Cursor $20/mo; API $0). **Deployment (expected):** no change; theme fix is UI-only, no additional LLM or runtime cost.

## Right panel collapse (Feb 2026)

**Scope:** Collapsible right panel (Boards, Properties, AI) with persisted state: collapsed mode shows a slim icon rail (56px) with tab icons and expand control; expanded mode is full width (320px). State persisted per board via `useBoardSettings` (localStorage).

**Implementation:** Added `sidebarCollapsed` to `IBoardSettings` and `useBoardSettings` (default false, immediate persist, reload on board switch). Extracted `RightSidebar` component (`src/components/board/RightSidebar.tsx`) with collapse/expand and icon rail; `App.tsx` uses it with `expandedContent` (TabsContent for boards, properties, AI). Unit tests: `useBoardSettings` (default, persist, reload, invalid fallback) and `App.rightPanelCollapse.test.tsx` (expand/collapse, rail tabs, initial collapsed). PRD updated with expected behaviour and unchecked verification checkboxes.

**Cost & usage (this session):** Development via Cursor; no additional external LLM API. Approximate token use for planning + implementation + tests + docs: ~25k input / ~8k output (estimate). **Running total (development):** Cursor $20/mo; API $0. **Deployment (expected):** no change; UI-only feature, no new LLM or runtime cost.

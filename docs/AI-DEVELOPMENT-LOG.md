## Summary

This log records how AI was used during development: tools (Cursor, Context7 MCP), workflows, effective prompts, and a rough split of AI-generated vs hand-written code. It also notes strengths, limitations, and learnings. It serves as both a submission artifact and a reference for improving future AI-assisted workflow and for explaining the development approach.

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

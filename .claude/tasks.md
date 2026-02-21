# AI Chat Improvements — Tasks

Base branch: `spike/ai-chat-improvements`. Source: docs/AI-CHAT-IMPROVEMENT-PLAN.md.

---

## T1 — Create src/lib/boardObjectDefaults.ts

- **Status:** review
- **Tier:** architect
- **Worktree name:** board-defaults-lib
- **Description:** Add `src/lib/boardObjectDefaults.ts` as single source for board object default dimensions, colors, and options (constants only). Exports: sticky/frame/shape/text/connector defaults, STICKY_COLORS, StickyColor type.
- **Acceptance criteria:**
  1. File exists with all requested constants and type export.
  2. `bun run validate` passes.
- **Dependencies:** None
- **Notes:** Implemented; ready for review.

---

## T2 — System prompt: defaults vs. converse

- **Status:** done
- **Tier:** sonnet
- **Role:** architect
- **Worktree name:** ai-prompt
- **Description:** Update SYSTEM_PROMPT in aiService.ts so that: when the request is definitive and the tool is identifiable (e.g. "add a circle", "create a mind map"), the model uses object defaults for unspecified properties and does not require a clarification round; when the request is vague or exploratory, the model has a normal conversation (ask questions, suggest). Goal: prefer "right tool, default props" over "ask for every parameter".
- **Acceptance criteria:**
  1. SYSTEM_PROMPT in aiService includes clear guidance for "definitive + recognizable tool → use defaults" and "general/inquisitive → converse".
  2. No executor code changes required for this task.
  3. `bun run validate` passes.
- **Dependencies:** None

---

## T3 — Wire Clear button to backend clearContext

- **Status:** done
- **Tier:** haiku
- **Role:** quick-fixer
- **Worktree name:** ai-clear-context
- **Description:** When the user clicks Clear in the AI panel, clear both the UI message list and the backend conversation context. In useAI.ts, clearMessages currently only does setMessages([]); AIService.clearContext() exists but is never called.
- **Acceptance criteria:**
  1. clearMessages in useAI calls aiServiceRef.current?.clearContext() (before or after setMessages([])).
  2. After Clear, the next user message is a true new conversation.
  3. `bun run validate` passes.
- **Dependencies:** None

---

## T4 — Full-height AI panel and resizable input

- **Status:** done
- **Tier:** sonnet
- **Role:** architect
- **Worktree name:** ai-panel-layout
- **Description:** (1) Make the AI panel fill the tab content height: remove max-h-[320px] on the messages area in AIChatPanel.tsx, use flex so the conversation region grows. (2) Make the user input resizable (e.g. textarea) with a reasonable max height (e.g. 4–6 lines or ~200px).
- **Acceptance criteria:**
  1. Messages area has no max-height; card/panel fills the AI tab content (flex-1 min-h-0 chain).
  2. Input is a resizable textarea with a capped max height.
  3. No layout regressions; `bun run validate` passes.
- **Dependencies:** None

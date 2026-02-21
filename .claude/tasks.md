# AI Chat Improvements — Tasks

Base branch: `spike/ai-chat-improvements`. Source: docs/AI-CHAT-IMPROVEMENT-PLAN.md.

---

## T1 — AI defaults module and executor merge

- **Status:** done
- **Tier:** opus
- **Role:** architect
- **Worktree name:** ai-defaults
- **Description:** Add a single TypeScript module (e.g. `src/modules/ai/defaults.ts`) that exports typed default objects per intent: sticky, shape (rectangle/circle/line), frame, text, connector, plus compound intents (mindMap, flowchart, quadrant, columnLayout). Executors merge template + user-specified props (user wins); omitted fields stay as template values.
- **Acceptance criteria:**
  1. `defaults.ts` exists with typed exports used by toolExecutor and compoundExecutor.
  2. No duplicate default constants in toolExecutor.ts or compoundHelpers.ts; they import and merge.
  3. Merge rule: start from template for that intent, overwrite only provided keys.
  4. `bun run validate` passes.
- **Dependencies:** None
- **Notes:** **Review #2 — REJECTED**
  - File: `src/modules/ai/defaults.ts`
  - Issue: `mergeWithTemplate` uses `if (value)` (line 214), which skips explicit falsy values (0, false, ''). The JSDoc requires overwriting when the key is present with `value !== undefined` so that e.g. `opacity: 0` overwrites the template.
  - Fix: Change `if (value)` to `if (value !== undefined)` so only omitted keys keep template values; explicit falsy values overwrite.

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

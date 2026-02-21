# AI Chat Improvement Plan

Short plan for improving the AI Assistant: defaults, behavior, context, and layout.

---

## 1. Defaults / single source of truth (Option A)

- **Approach:** One TypeScript/JS module (e.g. `src/modules/ai/defaults.ts` or `templates.ts`) that exports typed default objects per intent: `defaultCircle`, `defaultSticky`, `defaultMindMap`, etc.
- **Merge rule:** For each request, start from the template for that intent, then overwrite only the properties the user (or model) specified. Omitted fields stay as template values.
- **Benefit:** Single place to change defaults; executors and layout utils consume the same source. No JSON files; full type safety and refactor safety.

---

## 2. When to use defaults vs. converse

- **Definitive request + recognizable tool:** If the AI can infer which tool is being requested (e.g. “add a circle”, “create a mind map”) and the user has made a definitive request (including “your choice” / “defaults” after a prior message), **use object defaults for any unspecified properties**. Do not require a clarification round. The user can adjust position/size/content on the board afterward.
- **General or inquisitive:** When the request is vague, exploratory, or not clearly a tool call, have a normal conversation (ask questions, clarify, suggest).
- **Goal:** Avoid the failure mode where the user asks for one thing (e.g. circle), says “your choice”, and the AI does something unrelated. Prefer “right tool, default props” over “ask for every parameter.”

---

## 3. Context window / Clear

- **Sync Clear with backend:** When the user clicks Clear in the AI panel, clear both the UI message list and the backend conversation context (e.g. call the service’s `clearContext()` so the next turn is a true new conversation).
- **Optional:** For very long chats, consider an appended context string or summary (or truncating to last N turns) to control tokens; not required for the first iteration.

---

## 4. Layout: full-height AI panel and resizable input

- **AI window to full height of container:** Remove the fixed max height on the messages area (e.g. drop `max-h-[320px]`). Use flex so the conversation region grows with the sidebar. The whole AI panel (card) should fill the tab content height so the right-side AI window extends to the bottom of the container.
- **Resizable user input:** Allow the user input (textarea/input) to be increased in height up to a reasonable maximum (e.g. cap at 4–6 lines or ~200px) so longer prompts are comfortable without taking over the whole panel.

---

## 5. Out of scope for this plan

- Mandatory “ask for details then your choice” flow: we do **not** require the AI to always ask for x, y, width, height before acting. Use defaults when the request is definitive and the tool is clear; user can fix on the board if needed.

---

## Implementation order (suggested)

1. Add the defaults/templates module (Option A) and wire executors to merge template + user-specified props.
2. Update the system prompt: use defaults for unspecified properties when the request is definitive and the tool is identifiable; converse when the request is general or inquisitive.
3. Wire Clear in the UI to the backend’s clear-context so “new conversation” is consistent.
4. Layout: full-height AI panel (remove message-area max height, flex to fill) and resizable input with a reasonable max height.

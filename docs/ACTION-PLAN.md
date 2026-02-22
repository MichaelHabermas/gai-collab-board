# CollabBoard — Final Submission Action Plan

**Deadline:** Sunday night (2026-02-22, 10:59 PM CT)  
**Time remaining:** ~24 hours  
**Source:** [AUDIT-REPORT.md](./AUDIT-REPORT.md), [EARLY-SUBMISSION-REPORT.md](./EARLY-SUBMISSION-REPORT.md)  
**Goal:** Fix all high-priority bugs, raise branch coverage to 80%, improve FPS, re-record demo, ship social post.

---

## How to Use This Plan

Each fix is broken into:

- **Epic** — the theme (bug fix, performance, testing, deliverable)
- **Feature/Fix branch** — one branch per logical unit of work, branched from `development`
- **Commits** — granular, one logical change per commit
- **Subtasks** — concrete steps inside each commit, actionable by any developer or LLM agent

**Workflow per branch:**

```
git checkout development && git pull
git checkout -b fix/<branch-name>
# ... make changes, commit per step ...
bun run validate
git checkout development && git merge fix/<branch-name>
git push origin development
git branch -d fix/<branch-name>
```

**Principles:** Every change follows Single Responsibility (one fix per commit), Open/Closed (extend with type guards, don't modify working interfaces), and Interface Segregation (small focused functions). No gold-plating — ship only what moves the needle for final submission.

---

## Priority 1 — CRITICAL (Do First, Saturday Morning)

> These are real bugs that could cause crashes or data issues during evaluation.

---

### Epic 1.1: Fix Memory Leaks in Text Editing Components

**Branch:** `fix/text-editing-memory-leaks`  
**Risk if skipped:** Event listeners accumulate on every edit session; long board sessions leak memory and may cause the app to slow down or crash during live evaluation.  
**Time estimate:** 45 minutes

#### Commit 1: Extract text-editing cleanup into unmount-safe pattern in TextElement

**File:** `src/components/canvas/shapes/TextElement.tsx`

**Subtasks:**

1. Read the component and locate the `useEffect` or event handler that creates the textarea overlay and attaches `keydown`/`blur`/`input` listeners (~line 140)
2. Identify where `removeTextarea()` is called — confirm it only runs on blur/escape, not on unmount
3. Add a `useEffect` cleanup return that calls `removeTextarea()` if the textarea ref is still mounted
4. Verify: the cleanup function must remove all event listeners attached to the textarea DOM element
5. Run `bun run test:run -- TextElement` to confirm no regressions

#### Commit 2: Apply same cleanup pattern to StickyNote

**File:** `src/components/canvas/shapes/StickyNote.tsx`

**Subtasks:**

1. Read the component and locate the text-editing listener attachment (~line 208)
2. Apply the same unmount-safe cleanup pattern from Commit 1
3. Run `bun run test:run -- StickyNote` to confirm no regressions

#### Commit 3: Apply same cleanup pattern to Frame

**File:** `src/components/canvas/shapes/Frame.tsx`

**Subtasks:**

1. Read the component and locate the title-editing listener attachment (~line 260)
2. Apply the same unmount-safe cleanup pattern from Commits 1-2
3. Run `bun run test:run -- Frame` to confirm no regressions

#### Commit 4: Run full validate

**Subtasks:**

1. Run `bun run validate`
2. Fix any lint or type errors introduced
3. Confirm all existing tests pass

---

### Epic 1.2: Fix Uncaught JSON.parse in AI Service

**Branch:** `fix/ai-json-parse-safety`  
**Risk if skipped:** If the LLM returns malformed JSON (which happens occasionally with any provider), the entire AI command flow crashes with an unhandled exception. This could happen during live evaluation.  
**Time estimate:** 20 minutes

#### Commit 1: Wrap JSON.parse in try/catch with user-facing error

**File:** `src/modules/ai/aiService.ts`

**Subtasks:**

1. Read `aiService.ts` and locate the `JSON.parse(toolCall.function.arguments ?? '{}')` call (~line 178)
2. Wrap it in a try/catch block
3. In the catch: log the raw string for debugging, return an error result like `{ error: 'Failed to parse AI tool arguments. Please try rephrasing your command.' }`
4. Ensure the error propagates as a user-visible message in the chat panel, not a silent failure
5. Run `bun run test:run -- aiService` to confirm no regressions

#### Commit 2: Add unit test for malformed JSON handling

**File:** `tests/unit/aiService.test.ts` (or appropriate test file)

**Subtasks:**

1. Add a test case: when `toolCall.function.arguments` is `'{invalid json'`, the service returns a user-friendly error instead of throwing
2. Add a test case: when `toolCall.function.arguments` is `undefined`, defaults to `'{}'` and proceeds
3. Run the test to confirm both pass

---

### Epic 1.3: Add Firebase Environment Variable Validation

**Branch:** `fix/firebase-env-validation`  
**Risk if skipped:** Missing or typo'd env vars cause cryptic runtime errors. If the evaluator clones and misconfigures, they get a blank screen with no explanation.  
**Time estimate:** 20 minutes

#### Commit 1: Add startup validation for required env vars

**File:** `src/lib/firebase.ts`

**Subtasks:**

1. Read `firebase.ts` and locate where `import.meta.env.VITE_FIREBASE_*` values are read (~lines 22-28)
2. Before the Firebase `initializeApp()` call, add a validation function:

   ```typescript
   function validateFirebaseEnv(): Record<string, string> {
     const required = [
       'VITE_FIREBASE_API_KEY',
       'VITE_FIREBASE_AUTH_DOMAIN',
       'VITE_FIREBASE_PROJECT_ID',
     ] as const;
     const missing = required.filter((key) => !import.meta.env[key]);
     if (missing.length > 0) {
       throw new Error(
         `Missing required Firebase environment variables: ${missing.join(', ')}. ` +
         'Copy .env.example to .env and fill in your Firebase config.'
       );
     }
     return Object.fromEntries(required.map((k) => [k, import.meta.env[k]]));
   }
   ```

3. Call it before `initializeApp()` and use the returned values
4. Run `bun run validate`

---

## Priority 2 — HIGH (Saturday Midday)

> These improve code quality and pass the project's own standards. Evaluators may check.

---

### Epic 2.1: Replace Unsafe `as` Casts with Type Guards

**Branch:** `fix/replace-unsafe-casts`  
**Risk if skipped:** Violates the project's own CLAUDE.md and code-standards rules. An evaluator reading the code will see the contradiction.  
**Time estimate:** 1.5 hours

#### Commit 1: Add reusable type guard functions

**File:** `src/types/guards.ts` (new file)

**Subtasks:**

1. Create `src/types/guards.ts`
2. Add type guard for board objects:

   ```typescript
   function isBoardObject(value: unknown): value is IBoardObject {
     return typeof value === 'object' && value !== null && 'id' in value && 'type' in value;
   }
   ```

3. Add type guard for Konva node types (Group, Rect, Ellipse) using Konva's `getClassName()`:

   ```typescript
   function isKonvaGroup(node: Konva.Node): node is Konva.Group {
     return node.getClassName() === 'Group';
   }
   ```

4. Export all guards

#### Commit 2: Replace casts in TransformHandler.tsx

**File:** `src/components/canvas/TransformHandler.tsx`

**Subtasks:**

1. Read the file and locate the 4 `as Konva.Group`, `as Konva.Rect`, `as Konva.Ellipse` casts (~lines 68, 75, 98, 112)
2. Replace each with the corresponding type guard + early return or conditional
3. Run `bun run test:run -- TransformHandler` (or related tests)

#### Commit 3: Replace casts in boardService.ts

**File:** `src/modules/sync/boardService.ts`

**Subtasks:**

1. Read the file and locate the 4 `as IBoard` casts (~lines 61, 71, 93, 110)
2. Replace with `isBoardObject()` or a `isBoard()` type guard
3. Handle the case where the data doesn't match (return null or throw descriptive error)
4. Run `bun run test:run -- boardService`

#### Commit 4: Replace casts in aiService.ts

**File:** `src/modules/ai/aiService.ts`

**Subtasks:**

1. Locate the 3 casts: `functionName as IToolCall['name']` (~line 182), `(error as Error).message` (~line 195), `(lastUserContent.content as string)` (~line 230)
2. For error: use `error instanceof Error ? error.message : String(error)`
3. For functionName: validate it exists in the tool registry before using
4. For content: check `typeof lastUserContent.content === 'string'` before using
5. Run `bun run test:run -- aiService`

#### Commit 5: Replace double cast in AIChatPanel.tsx

**File:** `src/components/ai/AIChatPanel.tsx`

**Subtasks:**

1. Locate `window as unknown as {...}` (~line 98)
2. Replace with a proper interface extension or a type guard
3. Run `bun run test:run -- AIChatPanel`

#### Commit 6: Replace casts in useObjects.ts

**File:** `src/hooks/useObjects.ts`

**Subtasks:**

1. Locate the 3 casts: `as IBoardObject[]` (~lines 163, 515, 572)
2. For `.filter(Boolean) as IBoardObject[]` — use a type-narrowing filter: `.filter((obj): obj is IBoardObject => Boolean(obj))`
3. For `Object.values() as IBoardObject[]` — add proper generic typing to the source record
4. Run `bun run test:run -- useObjects`

#### Commit 7: Run full validate

**Subtasks:**

1. `bun run validate`
2. Fix any type errors or lint issues introduced
3. Confirm all tests pass

---

### Epic 2.2: Fix Hot-Path Performance Issues

**Branch:** `fix/hot-path-performance`  
**Risk if skipped:** Contributes to the 44 FPS problem. These are low-hanging fruit.  
**Time estimate:** 45 minutes

#### Commit 1: Replace JSON.stringify comparison with shallow array equality

**File:** `src/hooks/useObjects.ts`

**Subtasks:**

1. Locate `JSON.stringify(a.points) === JSON.stringify(b.points)` (~line 41)
2. Replace with a shallow array comparison:

   ```typescript
   function shallowArrayEqual(a?: number[], b?: number[]): boolean {
     if (a === b) return true;
     if (!a || !b || a.length !== b.length) return false;
     for (let i = 0; i < a.length; i++) {
       if (a[i] !== b[i]) return false;
     }
     return true;
   }
   ```

3. Use this in the comparison function
4. Run `bun run test:run -- useObjects`

#### Commit 2: Debounce AI context recomputation

**File:** `src/hooks/useAI.ts`

**Subtasks:**

1. Locate the effect that runs on every `objects` change (~lines 94-99)
2. Add a debounce (300-500ms) so the AI context isn't recomputed on every keystroke/drag
3. Use a ref to store the timeout ID and clear it on cleanup
4. Run `bun run test:run -- useAI`

---

### Epic 2.3: Add Firebase Subscription Error Handling

**Branch:** `fix/subscription-error-handling`  
**Risk if skipped:** Silent failures leave the UI in a stale state. Not a crash, but confusing for users.  
**Time estimate:** 30 minutes

#### Commit 1: Add error callback to useBoardSubscription

**File:** `src/hooks/useBoardSubscription.ts`

**Subtasks:**

1. Read the hook
2. Add an `onError` callback to the Firestore `onSnapshot` call
3. Log the error and set an error state that the consuming component can display
4. Run related tests

#### Commit 2: Add error callback to useComments

**File:** `src/hooks/useComments.ts`

**Subtasks:**

1. Same pattern as Commit 1 — add `onError` to the snapshot listener
2. Surface errors via a returned error state
3. Run related tests

---

## Priority 3 — IMPORTANT (Saturday Afternoon/Evening)

> These directly affect the spec score: coverage threshold, FPS target, deliverables.

---

### Epic 3.1: Raise Branch Coverage to 80%

**Branch:** `test/branch-coverage-push`  
**Risk if skipped:** `bun run validate` will fail the coverage gate. Evaluators may run this.  
**Time estimate:** 3-4 hours (largest single item)

#### Commit 1: Add branch tests for toolExecutor.ts

**File:** `tests/unit/toolExecutor.test.ts`

**Subtasks:**

1. Run `bun run test:coverage` and identify the lowest branch-coverage files
2. For `toolExecutor.ts`: add tests for error paths (invalid tool name, missing parameters, null object ID)
3. Add tests for at least 5 untested tool execution branches
4. Re-run coverage to measure improvement

#### Commit 2: Add branch tests for boardService.ts

**File:** `tests/unit/boardService.test.ts`

**Subtasks:**

1. Add tests for: permission denied paths, missing board, invalid role, member not found
2. Add tests for edge cases: empty board name, duplicate member add
3. Re-run coverage

#### Commit 3: Add branch tests for useObjectDragHandlers.ts

**File:** `tests/unit/useObjectDragHandlers.test.ts`

**Subtasks:**

1. Add tests for: drag cancelled, drop outside bounds, multi-select drag, alignment snap thresholds
2. Add tests for frame containment edge cases
3. Re-run coverage

#### Commit 4: Add branch tests for BoardCanvas.tsx conditional paths

**File:** `tests/unit/BoardCanvas.*.test.tsx`

**Subtasks:**

1. Add tests for: tool switching, layer visibility toggling, empty board rendering
2. Add tests for: guest vs. authenticated user rendering differences
3. Re-run coverage

#### Commit 5: Verify 80% threshold passes

**Subtasks:**

1. Run `bun run test:coverage`
2. Confirm all 4 metrics (statements, branches, functions, lines) are at or above 80%
3. If branches still below 80%, identify the next lowest-coverage file and add targeted tests
4. Repeat until threshold passes

---

### Epic 3.2: FPS Optimization

**Branch:** `perf/fps-optimization`  
**Risk if skipped:** Spec target is 60 FPS; current is ~44. Measurable during evaluation.  
**Time estimate:** 2 hours

#### Commit 1: Profile and identify FPS bottlenecks

**Subtasks:**

1. Open the deployed app in Chrome DevTools Performance tab
2. Record a 10-second session of: pan, zoom, drag multiple objects, rotate
3. Identify the top 3 functions by self-time
4. Document findings in a comment on the commit

#### Commit 2: Optimize alignment guide computation

**File:** `src/hooks/useObjectDragHandlers.ts` (or relevant alignment file)

**Subtasks:**

1. Check if alignment guides are computed for ALL objects on every drag frame
2. If so: limit to visible objects only (use spatial index), or throttle to every 2nd frame
3. Measure FPS before and after

#### Commit 3: Optimize layer redraw strategy

**File:** `src/components/canvas/BoardCanvas.tsx`

**Subtasks:**

1. Check if the overlay layer (cursors, guides) is causing full redraws
2. If so: use `layer.batchDraw()` instead of React re-renders for cursor updates
3. Measure FPS before and after

#### Commit 4: Update README with final FPS measurement

**File:** `README.md`

**Subtasks:**

1. Run the benchmark E2E test: `bun run test:e2e -- benchmark`
2. Update the performance section with the new FPS number
3. If FPS is still below 60, document the bottleneck and what was tried

---

## Priority 4 — DELIVERABLES (Sunday)

> These are required submission items. Not code fixes, but they affect the grade.

---

### Epic 4.1: Re-Record Demo Video

**No branch needed — this is a recording task.**  
**Time estimate:** 1-2 hours (including script writing and 2-3 takes)

#### Subtasks

1. **Write a script** (3-5 minutes, timed):
   - 0:00-0:30 — Introduction: what is CollabBoard, tech stack (React, Konva, Firebase, Groq)
   - 0:30-1:30 — Core features: create sticky notes, shapes, connectors, frames; transform, select, group
   - 1:30-2:30 — Real-time collaboration: open second browser, show cursors, presence, simultaneous editing
   - 2:30-3:30 — AI commands: "Create a SWOT analysis", "Arrange in a grid", show shared state
   - 3:30-4:15 — Architecture: show component structure, store/hook/service separation, AI proxy pattern
   - 4:15-4:45 — Observability: show custom AI usage tracking, cost analysis
   - 4:45-5:00 — Wrap-up: deployed link, what's next
2. **Pre-flight the AI** — before recording, test 3-4 AI commands to ensure Groq is responsive
3. **Record** — screen + voice, clear narration, no rushing
4. **Review** — watch it back, re-record if AI fails or narration is unclear
5. Upload to YouTube/Loom and add the link to README.md

---

### Epic 4.2: Social Post

**No branch needed.**  
**Time estimate:** 15 minutes

#### Subtasks

1. Take 2-3 screenshots: landing page, board with objects, AI command in action
2. Write a post for X or LinkedIn:
   - What you built (CollabBoard — real-time whiteboard with AI)
   - Key features (multiplayer, AI commands, custom observability)
   - Tech stack
   - Link to deployed app
   - Tag @GauntletAI
3. Post it
4. Save a screenshot or link as evidence in the repo (optional but helpful)

---

### Epic 4.3: Final Polish Fixes

**Branch:** `fix/final-polish`  
**Time estimate:** 1 hour

#### Commit 1: Fix post-rotate rendering

**Subtasks:**

1. Identify the rotate rendering bug mentioned in the demo video
2. Check `TransformHandler.tsx` for the rotation end handler
3. Ensure the shape's position/bounds are recalculated after rotation ends
4. Test: rotate a shape, confirm it renders correctly after releasing

#### Commit 2: Improve connector drawing UX (or document limitation)

**Subtasks:**

1. If fixable quickly: allow free-draw connectors (click empty canvas → drag to target)
2. If not fixable in time: add a tooltip or status bar message: "Click a source node, then click a target node to create a connector"
3. Either way, document the current behavior in README under "Known Limitations"

---

## Priority 5 — NICE-TO-HAVE (Only if Time Permits)

> Skip these if you're behind on Priority 1-4.

---

### Epic 5.1: Add Network Throttle Test

**Branch:** `test/network-throttle`

#### Commit 1: Add E2E test for disconnect/reconnect

**File:** `tests/e2e/network-resilience.spec.ts`

**Subtasks:**

1. Create a Playwright test that: creates objects → goes offline (via `context.setOffline(true)`) → creates more objects → comes back online → verifies all objects synced
2. Run locally to confirm

---

### Epic 5.2: Basic Accessibility Pass

**Branch:** `fix/basic-a11y`

#### Commit 1: Add aria-labels to toolbar buttons

**File:** `src/components/canvas/CanvasToolbarWrapper.tsx` (or Toolbar component)

**Subtasks:**

1. Add `aria-label` to each tool button (e.g., "Sticky Note tool", "Rectangle tool")
2. Add `role="toolbar"` to the toolbar container

---

### Epic 5.3: Write Queue Error Surfacing

**Branch:** `fix/write-queue-error-feedback`

#### Commit 1: Surface persistent write failures to user

**File:** `src/lib/writeQueue.ts`

**Subtasks:**

1. After 3 failed retries for the same object, emit an error event or set error state
2. Display a toast notification: "Failed to save changes. Check your connection."

---

## Execution Timeline

```
SATURDAY MORNING (4 hours)
├── Epic 1.1: Text editing memory leaks        [45 min]  fix/text-editing-memory-leaks
├── Epic 1.2: AI JSON.parse safety              [20 min]  fix/ai-json-parse-safety
├── Epic 1.3: Firebase env validation           [20 min]  fix/firebase-env-validation
├── Epic 2.1: Replace unsafe casts              [90 min]  fix/replace-unsafe-casts
└── Epic 2.2: Hot-path performance              [45 min]  fix/hot-path-performance

SATURDAY AFTERNOON (4 hours)
├── Epic 2.3: Subscription error handling       [30 min]  fix/subscription-error-handling
├── Epic 3.1: Branch coverage to 80%            [3-4 hr]  test/branch-coverage-push
└── (run bun run validate between each merge)

SATURDAY EVENING (2 hours)
├── Epic 3.2: FPS optimization                  [2 hr]    perf/fps-optimization
└── Epic 4.3: Final polish fixes                [1 hr]    fix/final-polish

SUNDAY MORNING (2 hours)
├── Epic 4.1: Re-record demo video              [1.5 hr]
└── Epic 4.2: Social post                       [15 min]

SUNDAY AFTERNOON
├── Final bun run validate
├── Final bun run release:gate (if available)
├── Push to development, verify deployment
└── Review all deliverables against spec checklist
```

---

## Verification Checklist (Run Before Final Push)

```bash
bun run validate                    # typecheck + lint + test
bun run test:coverage               # confirm all 4 metrics >= 80%
bun run test:e2e                    # E2E suite passes
bun run test:ai-connection          # AI proxy responds
```

Then manually verify:

- [ ] Deployed app loads at gai-collab-board.onrender.com
- [ ] Create board, add objects, verify sync between two browser tabs
- [ ] Issue AI command ("Create a SWOT analysis"), confirm it works
- [ ] Guest board accessible without login
- [ ] Demo video link in README
- [ ] Social post live with @GauntletAI tag
- [ ] AI Development Log present in docs/
- [ ] AI Cost Analysis present in docs/ with 4-tier projections
- [ ] Pre-Search document present in docs/

---

*This action plan was generated from the [AUDIT-REPORT.md](./AUDIT-REPORT.md) findings. Each epic is independent and can be worked in parallel by different people or agents. Priority 1-3 items are mandatory for a strong final submission. Priority 4 items are required deliverables. Priority 5 items are stretch goals.*

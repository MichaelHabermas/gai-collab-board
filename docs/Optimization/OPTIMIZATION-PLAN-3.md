# GAI Collab Board — Prioritized Task List

Scored across 5 dimensions (each 1–5, higher = better):
**Ease** | **Usefulness** | **Risk** (5 = safest) | **Priority** | **Need**

---

| # | Task | Ease | Useful | Risk | Priority | Need | **Total** |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| 1 | Welcome / Landing Page | 4 | 5 | 5 | 5 | 5 | **24** |
| 2 | Board Deletion — Owner vs. Non-Owner | 4 | 5 | 3 | 5 | 5 | **22** |
| 3 | Fix Share Link | 3 | 5 | 3 | 5 | 5 | **21** |
| 4 | Fix Trackpad Panning (macOS) | 3 | 5 | 3 | 5 | 5 | **21** |
| 5 | Fix Text Editing (Text Moves) | 2 | 5 | 3 | 5 | 5 | **20** |
| 6 | Move Groups of Selected Objects | 3 | 5 | 3 | 4 | 5 | **20** |
| 7 | Board Name Editing — Owner Only | 4 | 4 | 5 | 4 | 4 | **21** |
| 8 | Fix Light & Dark Mode | 3 | 4 | 4 | 4 | 4 | **19** |
| 9 | Increase Property Panel Height | 5 | 3 | 5 | 3 | 3 | **19** |
| 10 | Fix Delete Performance (Many Objects) | 3 | 4 | 3 | 4 | 4 | **18** |
| 11 | Middle Mouse Button Panning | 4 | 3 | 5 | 3 | 3 | **18** |
| 12 | Fix Snap-to-Grid When Dragging | 4 | 3 | 4 | 3 | 3 | **17** |
| 13 | Expand AI Use in App | 2 | 4 | 3 | 3 | 4 | **16** |
| 14 | Fix Fast-Click Spin Boxes | 4 | 2 | 5 | 2 | 2 | **15** |
| 15 | Voice Input in App | 3 | 3 | 4 | 2 | 2 | **14** |
| 16 | Enforce `only-export-components` ESLint Rule | 4 | 2 | 4 | 2 | 2 | **14** |
| 17 | Refactor Components with 3+ `useEffect`s | 3 | 2 | 3 | 2 | 2 | **12** |
| 18 | Clarify & Implement Frames | 1 | 3 | 2 | 2 | 2 | **10** |

---

## Ordered Task List

---

### 1. Welcome / Landing Page `Score: 24`

**Goal:** Give logged-out users a proper first impression and a clear path to sign up or log in.

- Create a `/welcome` route that renders only when the user is not authenticated
- Include: app name, tagline, feature highlights (real-time collab, AI tools, infinite canvas), and a demo/screenshot
- Prominent **Log In** and **Sign Up** CTA buttons
- Auto-redirect authenticated users to their board list
- Responsive, matches the existing design system

---

### 2. Board Deletion — Owner vs. Non-Owner `Score: 22`

**Goal:** Prevent accidental or unauthorized permanent deletion of shared boards.

- **Non-owner "delete"** → removes the board from *their* list only (leave board / remove membership reference); board persists for everyone else
- **Owner delete** → shows a confirmation dialog ("This will permanently delete the board for all members") → hard-deletes the Firestore document and all associated objects
- Update Firebase security rules to enforce this server-side
- UI label changes: **"Leave Board"** for non-owners, **"Delete Board"** for owners

---

### 3. Fix Share Link `Score: 21`

**Goal:** Shared links should actually open the correct board for any recipient.

- Reproduce in an incognito window to confirm the failure mode
- Audit the URL structure — does it encode the board ID correctly?
- Check Firestore read rules: can an unauthenticated or non-member user read board data?
- Ensure the app routes to the correct board on load when a link is followed
- Test with owner, invited member, and a stranger

---

### 4. Fix Trackpad Panning (macOS) `Score: 21`

**Goal:** Two-finger swipe on a trackpad should pan the canvas, not zoom or do nothing.

- Intercept `wheel` events: if `ctrlKey` is set → zoom; otherwise → translate the viewport (standard macOS convention)
- Ensure the fix doesn't break existing scroll-to-zoom or spacebar-pan behavior
- Test on macOS trackpad, Windows precision touchpad, and a mouse scroll wheel

---

### 5. Fix Text Editing (Text Moves on Edit) `Score: 20`

**Goal:** Entering text edit mode should not visually shift the element.

- Reproduce: double-click a text/sticky-note element and observe the position jump
- Investigate how the Konva `Text` node hands off to the DOM `<textarea>` overlay — the coordinate transform likely doesn't account for zoom and pan offset
- Fix the position calculation so the textarea sits exactly over the canvas element at all zoom levels
- Regression test at multiple zoom levels and pan offsets

---

### 6. Move Groups of Selected Objects `Score: 20`

**Goal:** Dragging a multi-selection should move all selected objects as a unit.

- Verify that the drag handler applies the delta to all selected objects, not just the one under the cursor
- Preserve relative positions within the selection throughout the drag
- Apply snap-to-grid to the group's bounding box (not each object individually)
- Batch all position updates into a single Firestore `writeBatch`

---

### 7. Board Name Editing — Owner Only `Score: 20`

**Goal:** Only the board owner should be able to rename a board.

- Derive or add `ownerId` to the board document
- In the board list sidebar and board header, show an editable input only if `currentUser.uid === board.ownerId`
- Non-owners see the name as plain read-only text
- Add a tooltip for discoverability: "Only the board owner can rename this board"

---

### 8. Fix Light & Dark Mode `Score: 19`

**Goal:** All UI surfaces should correctly respond to the selected theme.

- Audit all components for hardcoded colors that bypass theme variables
- Ensure `useTheme` and Tailwind dark-mode classes are applied consistently across the canvas, sidebars, modals, and property panel
- Verify theme preference persists across sessions (saved to user preferences)
- Full visual QA pass in both modes

---

### 9. Increase Property Panel Height `Score: 19`

**Goal:** Show more properties at once without excessive scrolling.

- Review current height constraints (CSS/Tailwind classes) in the panel layout
- Increase the default height so common properties are immediately visible
- Add a drag handle to make the panel resizable by the user
- Verify no overflow or clipping on smaller screens

---

### 10. Fix Delete Performance (Many Objects) `Score: 18`

**Goal:** Deleting 20+ objects should feel instant, not sluggish.

- Profile a bulk delete to identify the bottleneck (Firestore writes vs. React re-renders vs. Konva redraws)
- Batch all Firestore deletes into a single `writeBatch` call
- Defer canvas re-renders until the batch resolves
- Add a loading indicator for operations taking > 300 ms

---

### 11. Middle Mouse Button Panning `Score: 18`

**Goal:** Pressing and dragging with the middle mouse button should pan the canvas (standard CAD/design tool behavior).

- On `mousedown` with `button === 1`: enter a temporary pan mode
- `mousemove` translates the viewport; `mouseup` exits pan mode
- Prevent the browser's default autoscroll behavior during middle-button drag
- Ensure this coexists cleanly with spacebar-pan and trackpad-pan

---

### 12. Fix Snap-to-Grid When Dragging `Score: 17`

**Goal:** Snap-to-grid should be consistent — currently works on resize but not on drag.

- Locate where the drag position is set vs. where resize uses the `snapToGrid` utility
- Apply the same snap logic to the drag move/end handler
- Apply snap to the group bounding box when multiple objects are selected
- Test: single drag, multi-select drag, frame drag

---

### 13. Expand AI Use in App `Score: 16`

**Goal:** Move AI from a side panel to a first-class, context-aware tool across the canvas.

Candidate expansions (scope each separately before implementing):

- **AI shape generation:** describe a diagram → generate objects on the canvas
- **AI summarization:** summarize sticky notes or the full board
- **AI layout suggestions:** auto-arrange selected objects
- **Contextual AI panel:** AI is aware of what's selected and can act on it directly

---

### 14. Fix Fast-Click Spin Boxes `Score: 15`

**Goal:** Rapidly clicking numeric inputs in the property panel should not produce erratic values.

- Reproduce: rapidly click up/down on any spin box
- Check for state update race conditions or batching issues
- Debounce the commit handler or switch to a fully controlled input pattern
- Verify fix on all numeric property fields

---

### 15. Voice Input in App `Score: 14`

**Goal:** Users can speak to the AI chat panel instead of typing.

- Add a microphone button to the AI chat input (or bind to a global hotkey)
- Use the Web Speech API (`SpeechRecognition`) for transcription where available
- Transcribed text populates the AI prompt input field; user can review before submitting
- Show a clear fallback message on unsupported browsers (Firefox, older Safari)

---

### 16. Enforce `only-export-components` ESLint Rule `Score: 14`

**Goal:** Keep component files clean — no mixing of components and non-component exports.

- Run ESLint to identify all current violations
- Move utilities, constants, and types into dedicated files
- Enable the rule as an `error` in `eslint.config.js`
- Confirm CI passes with zero violations

---

### 17. Refactor Components with 3+ `useEffect`s `Score: 12`

**Goal:** Improve maintainability by extracting tangled effects into named custom hooks.

- Audit all components and flag those with 3 or more `useEffect` calls
- Extract related effects into custom hooks with a single clear responsibility (e.g., `usePresenceSync`, `useCanvasEvents`)
- Update or add unit tests that target the new hooks directly
- Do not change behavior — this is a structural refactor only

---

### 18. Clarify & Implement Frames `Score: 10`

**Goal:** Define what Frames are and build them into a coherent, usable feature.

**Definition to establish first:**

- Frames are named, bounded regions (like artboards/sections) that group and move their children
- Objects dragged into a frame become children; they move with the frame
- Frames can be used for presentation slides, export regions, or canvas sections

**Implementation work:**

- Frame-child parenting: entering/exiting a frame updates the parent relationship in Firestore
- **Layering:** frame background renders below its children, which render below objects outside the frame
- Frame-specific UI: editable label, resize handles, optional background color
- Document the intended use in a visible tooltip or onboarding hint

# useEffect Census

Per-file inventory of every `useEffect` with classification: `keep`, `remove`, `extract`, or `defer`. Apply the decision standard: (1) computable during render → remove; (2) user-intent driven → event handler; (3) one-time init → initializer/ref; (4) else → keep with category.

## BoardCanvas.tsx

| Line | Purpose | Status | Reason / Replacement |
|------|---------|--------|----------------------|
| 192 | Sync `snapToGridEnabled` to ref | **remove** | Read `snapToGridEnabled` in closure where ref is used; ref sync unnecessary. |
| 206 | Sync `objects` to ref | **keep** | Event handlers (e.g. drag) need latest `objects` without re-subscribing; ref is correct. |
| 243 | Middle mouse pan: add/remove window mousemove/mouseup | **extract** | Lifecycle effect; extract to `useMiddleMousePanListeners`. |
| 316 | Sync `activeToolRef`, `drawingActiveRef`, `selectingActiveRef` | **remove** | Consolidate with other ref sync or assign in render (ref.current = value) where safe. |
| 323 | Tool keyboard shortcuts (V, Space, S, R, C, L, T, F, A) | **extract** | Lifecycle effect; extract to `useCanvasKeyboardShortcuts`. |
| 694 | Cleanup on unmount: cancel RAF, clear viewport persist timeout | **keep** | Cleanup/timer lifecycle; required. |
| 1004 | Update `setGuidesThrottledRef.current` (RAF-throttled setter) | **remove** | Create throttled setter in render via useMemo/useCallback or assign ref in same place that uses it. |
| 1024 | Update `guideCandidateBoundsRef` + clear dragBoundFunc cache | **extract** | Derived cache sync; extract to `useAlignmentGuideCache`. |
| 1150 | Prune stale handler maps when `objects` changes | **keep** | Cleanup of stale entries; required for correctness. |
| 1480 | Call `onViewportActionsReady(viewportActions)` and cleanup | **keep** | Prop callback / external sync; required. |

## useCanvasViewport.ts

| Line | Purpose | Status | Reason / Replacement |
|------|---------|--------|----------------------|
| 79 | Sync `onViewportChangeRef.current = onViewportChange` | **remove** | Use `onViewportChange` in dependency array of effect that calls it, or pass stable callback. |
| 104 | Sync `viewportRef.current = viewport` | **keep** | Throttled flush reads ref; ref sync required. |
| 141 | Cleanup throttle timeout on unmount | **keep** | Cleanup/timer lifecycle. |
| 152 | Notify parent via `onViewportChangeRef.current?.(viewport)` (skip first run) | **keep** | External sync for persistence. |
| 162 | Apply `initialViewport` when it changes (e.g. board switch) | **keep** | Prop sync / external system. |
| 195 | Window resize listener | **keep** | Subscription/listener lifecycle. |

## useCursors.ts

| Line | Purpose | Status | Reason / Replacement |
|------|---------|--------|----------------------|
| 34 | Set `userColorRef.current = getUserColor(user.uid)` | **remove** | Derive color from `user?.uid` in handler or useMemo; no effect needed. |
| 41 | Subscribe to cursors + setup disconnect handler; cleanup | **keep** | Subscription/listener lifecycle. |

## useObjects.ts

| Line | Purpose | Status | Reason / Replacement |
|------|---------|--------|----------------------|
| 150 | Subscribe to Firestore objects | **keep** | Subscription lifecycle. |

## useCanvasOperations.ts

| Line | Purpose | Status | Reason / Replacement |
|------|---------|--------|----------------------|
| 105 | Keyboard shortcuts (delete, duplicate, copy, paste) | **keep** | Event listener lifecycle. |

## App.tsx (BoardView + ResolveActiveBoardRoute + BoardViewRoute)

| Line | Purpose | Status | Reason / Replacement |
|------|---------|--------|----------------------|
| 90 | Subscribe to board data | **keep** | Subscription lifecycle. |
| 102 | Auto-join board as viewer when not member | **keep** | Side effect in response to board + user; keep. |
| 345 | Load user preferences + subscribe to user boards | **keep** | Subscription lifecycle. |
| 355 | Navigate to active board (or create first) | **keep** | Routing / external sync. |
| 405 | Update recent board IDs when opening board | **keep** | Side effect on navigation. |

## TransformHandler.tsx

| Line | Purpose | Status | Reason / Replacement |
|------|---------|--------|----------------------|
| 40 | Attach transformer nodes to selection | **keep** | DOM/ref sync; required. |

## BoardListSidebar.tsx

| Line | Purpose | Status | Reason / Replacement |
|------|---------|--------|----------------------|
| 73 | Subscribe to user boards | **keep** | Subscription lifecycle. |
| 81 | Subscribe to user preferences | **keep** | Subscription lifecycle. |

## StickyNote.tsx / Frame.tsx

| File | Line | Purpose | Status | Reason / Replacement |
|------|------|---------|--------|----------------------|
| StickyNote | 214 | Sync forwardRef with internal ref | **keep** | Ref forwarding contract. |
| Frame | 188 | Sync forwardRef with internal ref | **keep** | Ref forwarding contract. |

## useDebouncedNumberField.ts

| Line | Purpose | Status | Reason / Replacement |
|------|---------|--------|----------------------|
| 54 | Sync local state from prop (controlled input) | **keep** | Controlled component sync. |
| 95 | Cleanup debounce timer on unmount | **keep** | Cleanup/timer lifecycle. |

## useCanEdit.ts / useAuth.ts / useTheme.ts

| File | Line | Purpose | Status | Reason / Replacement |
|------|------|---------|--------|----------------------|
| useCanEdit | 22 | Subscribe to board for permissions | **keep** | Subscription lifecycle. |
| useAuth | 28 | Subscribe to auth state | **keep** | Subscription lifecycle. |
| useTheme | 47 | Apply theme to DOM and persist | **keep** | External system sync. |

## usePresence.ts / useBoardSettings.ts / useAI.ts

| File | Line | Purpose | Status | Reason / Replacement |
|------|------|---------|--------|----------------------|
| usePresence | 36 | Subscribe to presence + disconnect | **keep** | Subscription lifecycle. |
| usePresence | 59 | Update own presence when user changes | **keep** | Side effect. |
| useBoardSettings | 112 | Reload settings when boardId changes | **keep** | Prop sync. |
| useBoardSettings | 191 | Cleanup viewport debounce on unmount | **keep** | Cleanup lifecycle. |
| useAI | 78 | Initialize AIService when executor ready | **keep** | Initialization. |
| useAI | 90 | Update AI board state when objects change | **keep** | Side effect. |

## AIChatPanel.tsx / useConnectionStatus.ts / ConnectionStatus.tsx

| File | Line | Purpose | Status | Reason / Replacement |
|------|------|---------|--------|----------------------|
| AIChatPanel | 35 | Auto-scroll to bottom on new messages | **keep** | DOM side effect. |
| useConnectionStatus | 18 | Subscribe to connection status | **keep** | Subscription lifecycle. |
| ConnectionStatus | 19 | Clear offline flag after reconnection message | **keep** | Side effect. |

## Summary

- **remove**: 4 (BoardCanvas snapToGrid ref, BoardCanvas tool refs sync, BoardCanvas setGuidesThrottledRef effect, useCanvasViewport callback ref, useCursors userColor ref).
- **extract**: 3 (BoardCanvas: middle-mouse pan, keyboard shortcuts, alignment guide cache).
- **keep**: all others (subscriptions, cleanup, DOM/ref sync, prop callbacks).

## Implementation summary (2026-02-19)

- **Wave 1:** Removed unnecessary ref-sync effects in BoardCanvas (snapToGrid ref; kept tool refs and setGuidesThrottled in effects because ref assignment during render is disallowed by `react-hooks/refs`). Removed callback-ref sync in useCanvasViewport; use `onViewportChange` in effect deps. Replaced userColor effect in useCursors with `useMemo`.
- **Wave 2:** Extracted `useMiddleMousePanListeners`, `useCanvasKeyboardShortcuts`, and `useAlignmentGuideCache`; BoardCanvas calls these hooks and no longer contains the inlined middle-pan effect, tool-shortcuts effect, or alignment-cache effect.
- **Guardrails:** `local/max-use-effect-count` ESLint rule (warn, max 2) added; Cursor rules and code-standards updated; OPTIMIZATION-PLAN and REFACTOR_AUDIT_REPORT updated with prevention strategy and guidelines.
- **Verification:** Lint passes (warnings only, including max-use-effect-count on files that still have 3+ effects by design). Unit tests 504 passed. TypeScript: `tsc --noEmit` reports existing errors in test mocks only (unchanged by this work).

# PRD Unchecked Item Tracker

This file maps each unchecked item in `docs/PRD.md` to an implementation and evidence path.

## Epic 3 - Canvas Editing and Board Features

| PRD item | Category | Evidence target |
| --- | --- | --- |
| Sticky note overlay aligned during pan/zoom/rotation | automatable | `tests/e2e/textOverlayStability.spec.ts` sticky note pan + zoom assertions |
| Text element overlay aligned during pan/zoom/rotation | automatable | `tests/e2e/textOverlayStability.spec.ts` text element pan + zoom assertions |
| Frame title overlay aligned during pan/zoom/rotation | automatable | `tests/e2e/textOverlayStability.spec.ts` frame title pan + zoom assertions |
| Sticky note overlay has no visible jump/drift | automatable | Same E2E alignment assertions; bounds delta checks |
| Text overlay has no visible jump/drift | automatable | Same E2E alignment assertions; bounds delta checks |
| Frame title overlay has no visible jump/drift | automatable | Same E2E alignment assertions; bounds delta checks |
| Multi-select marquee drag moves whole group and shows grabbing cursor | automatable | `tests/e2e/benchmark.spec.ts` or dedicated E2E scenario validating group move + cursor style |
| Chromium benchmark >=58 FPS | automatable | `tests/e2e/benchmark.spec.ts` FPS assertion |
| 5 concurrent users shared propagation passes repeatedly | automatable | `tests/e2e/benchmark.spec.ts` multi-context propagation scenario |
| Sync latency envelopes stay below targets | automatable | `tests/integration/sync.latency.test.ts` thresholds and release script |

## Epic 5 - UI, Deployment, and Polish

| PRD item | Category | Evidence target |
| --- | --- | --- |
| Theme toggle visibly changes app in Chromium-family browsers | automatable + manual spot check | Unit tests + E2E theme toggle checks; final manual checks in Edge/Brave |
| Stored theme preference wins on reload | automatable | `tests/unit/useTheme.test.ts` + E2E reload assertion |
| Right panel collapse shows icon rail and restores tab | automatable | `tests/unit/App.rightPanelCollapse.test.tsx` + E2E interaction |
| Collapsed state persists through refresh | automatable | E2E localStorage-backed persistence check |
| Per-board collapsed state restores when switching boards | automatable | E2E board switch persistence scenario |
| Production AI proxy command succeeds on deployed app | manual-external | Scripted smoke command + deployed runbook validation |
| Malformed AI response handled with clear error and no `reading '0'` | automatable | `tests/unit/aiService.test.ts` malformed response cases |

## Appendix D - Deployment Checklist

| PRD item | Category | Evidence target |
| --- | --- | --- |
| Render environment variables configured | manual-external with scripted preflight | Local preflight script verifies required env keys before deploy |
| AI proxy URL/path and server API keys configured | manual-external with scripted preflight | Local preflight + Render runbook |
| Firebase security rules deployed | automatable (operator-driven) | Local script wrapper for `firebase deploy --only firestore:rules` |
| Realtime Database rules deployed | automatable (operator-driven) | Local script wrapper for `firebase deploy --only database` |
| Build passes locally | automatable | `bun run build` in release gate |
| All tests pass | automatable | release gate script running unit + integration + E2E groups |
| No console.log statements | automatable | lint rule + explicit scan script |
| No TypeScript errors | automatable | `bun run typecheck` in release gate |
| Performance targets met | automatable | benchmark suite in release gate |
| Multi-user testing completed | automatable | benchmark 5-user scenario in release gate |
| AI commands tested | automatable + manual-external | local AI connection test + production smoke runbook |
| Mobile responsiveness verified | automatable | E2E responsive suite in release gate |

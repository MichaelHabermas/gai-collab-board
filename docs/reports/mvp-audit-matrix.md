# MVP Compliance And Benchmark Evidence Matrix

## Scope

Sources:

- `docs/G4 Week 1 - CollabBoard.pdf`
- `docs/PRD.md`

Legend:

- `PASS`: strong implementation + direct test evidence
- `PARTIAL`: implementation present, but benchmark evidence is indirect/weak
- `FAIL`: missing implementation or missing validation

## MVP Hard-Gate Criteria

| Criterion | Target | Implementation Evidence | Test Evidence | Status | Gap Notes |
| --- | --- | --- | --- | --- | --- |
| Infinite board with pan/zoom | Smooth pan/zoom, bounded scale | `src/hooks/useCanvasViewport.ts`, `src/components/canvas/BoardCanvas.tsx` | `tests/unit/useCanvasViewport.test.ts`, `tests/e2e/collaboration.spec.ts` | PASS | No direct FPS assertion yet |
| Sticky notes with editable text | Create + inline edit text | `src/components/canvas/shapes/StickyNote.tsx` | `tests/integration/canvas.test.ts` | PASS | Editing is tested in integration, not in perf contexts |
| At least one shape type | 1+ shape | `src/components/canvas/shapes/RectangleShape.tsx`, `CircleShape.tsx`, `LineShape.tsx` | `tests/integration/canvas.test.ts` | PASS | Exceeds minimum (multiple shape types) |
| Create, move, edit objects | CRUD + transforms | `src/modules/sync/objectService.ts`, `src/hooks/useObjects.ts`, `src/components/canvas/BoardCanvas.tsx` | `tests/unit/objectService.test.ts`, `tests/integration/canvas.test.ts` | PASS | No benchmark for rapid mutation throughput |
| Real-time sync between 2+ users | Cross-client object propagation | `src/modules/sync/objectService.ts` (`subscribeToObjects`) | `tests/integration/sync.test.ts`, `tests/e2e/collaboration.spec.ts` | PASS | Current e2e multi-user checks are shallow |
| Multiplayer cursors with names | Cursor stream + labels | `src/hooks/useCursors.ts`, `src/components/canvas/CursorLayer.tsx` | `tests/unit/realtimeService.test.ts`, `tests/integration/sync.test.ts` | PASS | No latency SLA assertion (<50ms) |
| Presence awareness | Online users visible | `src/hooks/usePresence.ts`, `src/components/presence/PresenceAvatars.tsx` | `tests/integration/sync.test.ts`, `tests/e2e/collaboration.spec.ts` | PASS | No explicit churn stress test |
| User authentication | Login/signup/session | `src/modules/auth/authService.ts`, `src/modules/auth/useAuth.ts` | `tests/unit/authService.test.ts`, `tests/e2e/collaboration.spec.ts` | PASS | E2E auth flow relies on env/project readiness |
| Deployed and publicly accessible | Public URL | `README.md`, `netlify.toml`, `docs/DEPLOYMENT.md` | Manual deploy evidence | PARTIAL | README points to Render URL; deployment target consistency should be verified |

## Performance And AI Benchmark Criteria

| Criterion | Target | Current Evidence | Status | Gap Notes |
| --- | --- | --- | --- | --- |
| Frame rate during pan/zoom/manipulate | 60 FPS | Performance-oriented code (`useBatchDraw`, `useVisibleShapes`) but no hard FPS test | FAIL | Need dedicated FPS benchmark test |
| Object sync latency | <100ms | Sync integration exists, no explicit latency assertion | FAIL | Need measured cross-context latency test |
| Cursor sync latency | <50ms | 16ms debounce in `useCursors`, no end-to-end latency assertion | FAIL | Need measured cursor latency test |
| Object capacity | 500+ objects without drop | Culling and batching exist | FAIL | Need stress test that creates 500+ objects and validates responsiveness |
| Concurrent users | 5+ without degradation | Basic multi-context smoke check in e2e | FAIL | Need 5+ context load/sync benchmark |
| AI response latency | <2s single-step commands | E2E has generic load checks and limited AI timing checks | PARTIAL | Need deterministic AI latency benchmark with retries/bounds |
| AI command breadth | 6+ command categories | `src/modules/ai/tools.ts` exposes 20+ tools across 6+ categories | PASS | No gap on breadth |
| MVP test coverage | 60% | Coverage threshold configured in `vitest.config.ts` | PARTIAL | Need actual run output proving current coverage values |

## Verification Commands (Planned)

- `bun run test:run`
- `bun run test:coverage`
- `bun run test:e2e`

Additional benchmark runs will be added after baseline if gaps remain.

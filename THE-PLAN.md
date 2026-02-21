Context
React-Konva puts React reconciliation in the canvas hot path. Every shape = React component. Every state change = diffing + bridge + Konva redraw. No fast whiteboard uses this pattern. This migration replaces react-konva with imperative Konva node management: one React shell (CanvasHost), all shapes managed by KonvaNodeManager subscribing directly to Zustand stores. Target: ≥50% drag frame time reduction.
Base branch: spike/react-konva-1
Feature branches: spike/react-konva-1/<epic>-<name>, merged back into spike/react-konva-1
Governance: CONSTITUTION.md (Articles I–XIX existing + XX–XXV, XXVII added in Epic 0)
Source of truth: docs/IMPERATIVE-KONVA-MIGRATION-V5.md
SOLID Principles Enforcement
PrincipleHow It's AppliedSRPOne factory per shape type. One controller per interaction mode. Drag split into 5 modules (commit, alignment, bounds, reparenting, coordinator).OCPFactory registry (Map<ShapeType, IShapeFactoryEntry>) — add shapes without modifying KonvaNodeManager. StageEventRouter dispatches by tool without router changes.LSPAll factories satisfy IShapeFactoryEntry. All shape nodes satisfy IShapeNodes. Any factory substitutable in registry.ISPSmall interfaces: IShapeNodes, ShapeFactory, ShapeUpdater, IDragCoordinator, IDrawingController, IMarqueeController, IConnectorController. No god-interfaces.DIPKonvaNodeManager depends on IShapeFactoryEntry abstraction. useCanvasSetup injects dependencies via config interfaces. Controllers depend on store abstractions.
Dependency Graph
E0 (rules+baselines+E2E) → E1 (factories) → E2 (NodeManager) ──┐
                                             └→ E3 (events/drag) ─┤ parallel
                                                                   E4 (overlays) → E5 (cutover) → E6 (cleanup)
Task Decomposition (28 tasks, 8 waves)

WAVE 1: Epic 0 — Foundation (3 parallel agents)
TaskTitleTierRoleDepsBranchLOCT1Constitutional Amendments (Art XX–XXV, XXVII)haikuquick-fixer—epic0-constitution120T2Performance Baselines → docs/perf-baselines/pre-migration.jsonsonnetarchitect—epic0-perf-baselines50T3E2E: marquee, single drag, multi-drag, undo/redosonnettester—epic0-e2e-drag400T4E2E: connector creation, endpoint drag, resize, rotatesonnettester—epic0-e2e-connector-transform400T5E2E: frame reparenting, sticky text, frame title, alignment, drawingsonnettester—epic0-e2e-frame-text-draw500
Scheduling: A=T1, B=T2, C=T3→T4→T5. Review gate W1-R after all merge.

WAVE 2: Epic 1 — Shape Factories (3 parallel after T6)
TaskTitleTierRoleDepsBranchLOCSOLIDT6Factory types.ts + registry index.ts + directory scaffoldsonnetarchitectW1-Repic1-factory-types70OCP, ISP, DIPT7createRectangle + createCircle + createLine + testssonnetarchitectT6epic1-simple-factories250SRP, LSPT8createStickyNote + createFrame + tests (cacheable=true)opusarchitectT6epic1-complex-factories400SRP, OCPT9createConnector (4 modes) + createTextElement + testssonnetarchitectT6epic1-connector-text-factories300SRP, LSP
Scheduling: A=T6→T7, B=[wait T6]→T8, C=[wait T6]→T9. Review gate W2-R.

WAVE 3: Epic 2 + Epic 3 Start (3 parallel)
TaskTitleTierRoleDepsBranchLOCSOLIDT10LayerManager (4 layers, RAF-coalesced batchDraw)sonnetarchitectW2-Repic2-layer-manager130SRPT11KonvaNodeManager (O(changed) diff, connector dedup)opusarchitectT10epic2-node-manager550SRP, OCP, DIPT12SelectionSyncController (layer moves, cache lifecycle)sonnetarchitectT11epic2-selection-sync250SRPT13dragCommit + dragBounds + frameDragReparentingopusarchitectW2-Repic3-drag-modules600SRP, OCPT14alignmentEngine (wraps existing pure fns)sonnetarchitectW2-Repic3-alignment250SRP, DIP
Scheduling: A=T10→T11→T12, B=T13, C=T14. Review gate W3-R.

WAVE 4: Epic 3 Remaining + Epic 4 Start (3 parallel)
TaskTitleTierRoleDepsBranchLOCSOLIDT15DragCoordinator (thin dispatcher, <50 LOC)haikuquick-fixerT13, T14epic3-drag-coordinator80SRP, DIPT16StageEventRouter + ShapeEventWiringsonnetarchitectT15epic3-event-wiring400SRP, ISPT17DrawingController + MarqueeController + ConnectorControllersonnetarchitectW3-Repic3-controllers450SRP, ISPT18TextEditController (reuses canvasTextEditOverlay.ts)sonnetarchitectT11epic3-text-edit160SRP, DIPT19OverlayManager (5 subsystems: marquee, guides, preview, cursors, anchors)opusarchitectT10epic4-overlay-manager400SRP, OCP
Scheduling: A=T15→T16, B=T17, C=T18→T19. Review gate W4-R. Appendix D fully verified at this gate.

WAVE 5: Epic 4 Remaining (2 parallel)
TaskTitleTierRoleDepsBranchLOCSOLIDT20TransformerManager (exact config from TransformHandler)sonnetarchitectW4-Repic4-transformer200SRPT21GridRenderer + SelectionDragHandlehaikuquick-fixerW4-Repic4-grid-handle130SRP
Scheduling: A=T20, B=T21. Review gate W5-R.

WAVE 6: Epic 5 — THE CUTOVER (sequential, 1 opus agent)
TaskTitleTierRoleDepsBranchLOCT22useCanvasSetup.ts (DI, subscriptions, cleanup)opusarchitectW5-Repic5-integration200T23CanvasHost.tsx (React shell, surviving hooks)opusarchitectT22epic5-integration250T24Import swap <BoardCanvas> → <CanvasHost> + full E2E + manual matrixopusarchitectT23epic5-integration60
Scheduling: T22→T23→T24 strictly sequential. Review gate W6-R (opus reviewer).

WAVE 7: Epic 6 — Cleanup (sequential)
TaskTitleTierRoleDepsBranchLOCT25Delete 26 dead files + remove react-konva depsonnetarchitectW6-Repic6-cleanup-4907T26Update shapes/index.ts + CLAUDE.mdhaikuquick-fixerT25epic6-cleanup10T27Performance verification + bun run release:gatesonnetarchitectT26epic6-cleanup50
Scheduling: T25→T26→T27. Review gate W7-R. ≥50% drag frame time reduction required.

WAVE 8: Final Merge
TaskTitleTierRoleDepsT28Merge spike/react-konva-1 → developmentsonnetarchitectW7-R

Critical Files
FileWhydocs/IMPERATIVE-KONVA-MIGRATION-V5.mdSource of truth, Appendix D behavior checklistsrc/hooks/useObjectDragHandlers.ts (792 LOC)Being rewritten → 5 drag modules. Every behavior preserved per Appendix Dsrc/components/canvas/BoardCanvas.tsx (973 LOC)Being replaced by CanvasHost. Wiring reference for Epic 5src/stores/objectsStore.tsSubscription contract (Zustand v5 vanilla). connectorsByEndpoint index for dedupdocs/CONSTITUTION.mdGovernance. Articles I–XIX + new XX–XXV, XXVIIsrc/lib/alignmentGuides.tsPure geometry — survives, wrapped by alignmentEnginesrc/lib/canvasTextEditOverlay.tsSurvives unchanged — reused by TextEditController
Verification
After each wave review gate:

bun run validate (format → lint:fix → typecheck → test)
All unit tests pass for new modules
No existing files modified (Epics 1–4)
LOC limits enforced (300/file, 200/drag module)

After Epic 5 cutover (W6-R):
5. All 13 new E2E tests + all 9 existing E2E tests pass
6. Manual integration checklist (27 items from V5 doc §11) verified
7. Post-migration baselines captured
After Epic 6 cleanup (W7-R):
8. ≥50% drag frame time reduction vs pre-migration baselines
9. 0 shape-related React re-renders during drag
10. Bundle size reduced ~45KB (react-konva removed)
11. bun run release:gate passes
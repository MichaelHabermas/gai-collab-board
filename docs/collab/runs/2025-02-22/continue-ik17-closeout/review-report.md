# Review report — IK17 closeout

**Run:** continue-ik17-closeout  
**Scope:** DrawingController, MarqueeController, ConnectorController and their unit tests.

---

## Severity-ordered findings

### High

- **None.** No regressions, no contract violations, no missing dependencies.

### Medium

- **ConnectorController not wired in StageEventRouter.** Per continue-connector-controller implementation-log, wiring is a separate step. Does not block IK17 "module + tests exist" closeout; residual risk for Epic 5 integration.

### Low

- **DrawingController.onDrawEnd is async** but interface exposes it as sync; callers must handle promise. Existing pattern; no change required for this step.
- **MarqueeController.getPointerFromEvent** falls back to clientX/clientY when stage.getPointerPosition() is null; appropriate for edge cases.

---

## Residual risks

- ConnectorController (and Drawing/Marquee) are not yet invoked from StageEventRouter or BoardCanvas. Integration will be done in Epic 5 (CanvasHost/useCanvasSetup). Risk: low; wiring is explicit follow-up work.

---

## Test gaps

- **DrawingController:** Tool coverage is rectangle, circle, line, frame; no test for "other" tool (early return). Min size (5px) and onSuccess callback covered. Acceptable for IK17.
- **MarqueeController:** AABB hit-test and min size (5px) covered; getPointerFromEvent fallback not unit-tested (would require stage/container mocks). Acceptable.
- **ConnectorController:** First click, same-shape clear, different-shape create, clearConnector, missing toObj, reject path covered (6 tests). Acceptable.

---

## Go/no-go recommendation

**Go.** Validate passes; no React state in any of the three controllers (grep confirmed); 19 unit tests pass. IK17 can be marked done. V5 §9 "MarqueeController uses no React state" verified and checked.

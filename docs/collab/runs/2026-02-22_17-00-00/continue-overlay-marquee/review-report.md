# Review Report — OverlayManager marquee subsystem

**Run:** 2026-02-22_17-00-00  
**Scope:** Marquee subsystem (2 files: OverlayManager.ts, OverlayManager.test.ts)

## Findings (severity-ordered)

| Severity | Finding | Location | Notes |
|----------|---------|----------|--------|
| **None** | No regressions | — | Additive; guides and stubs unchanged. |
| **Low** | validate fails (pre-existing) | scripts/cleanup-daily-logs.ts | TS18048: candidates possibly undefined. Not caused by this change. Recommend fixing in a separate 1-line change so validate passes. |
| **None** | Marquee geometry matches SelectionLayer | OverlayManager.ts | x = min(x1,x2), y = min(y1,y2), width = abs(x2-x1), height = abs(y2-y1); fill/stroke/dash match. |

## Open questions and assumptions

- **Assumption:** showMarquee() no-op is correct; callers use updateMarquee(rect) with visible true.

## Residual risks

- **Low:** OverlayManager still not wired to StageEventRouter/MarqueeController; wiring is a follow-up step.

## Test gaps

- **Covered:** updateMarquee(visible) adds rect, updateMarquee(!visible) and hideMarquee() destroy rect, destroy() cleans. Stub contract test still passes.
- **Optional:** Assert rect.setAttrs called on second updateMarquee(visible) with different coords (currently covered by stub contract).

## Go / no-go recommendation

**Go.** Implementation matches PRD and SelectionLayer behavior; 2 files only; all OverlayManager tests pass. validate fails only on pre-existing scripts/cleanup-daily-logs.ts; fix that in a separate minimal commit to unblock the gate.

# Research — Continue Epic 3 checkpoint

## Done vs pending (Wave 4 / Epic 3–4)

| Epic / Wave | Done | Pending |
|-------------|------|---------|
| **E3 (Epic 3)** | 11/11: DragCoordinator, StageEventRouter, ShapeEventWiring, DrawingController, MarqueeController, ConnectorController, TextEditController + drag modules; IK16–IK18 done in tasks.md; dblclick wired (continue-dblclick-wire-ik18) | Epic 3 “Completion checkpoint recorded” checkbox in V5 still **unchecked** |
| **E4 (Epic 4)** | T20 TransformerManager, T21 GridRenderer + SelectionDragHandle (IK20, IK21 done) | T19 OverlayManager (IK19 reject — no OverlayManager in repo) |
| **Wave 4** | T15–T18 done | T19 OverlayManager |
| **Wave 5** | T20, T21 done | T19 still pending |

## Contradictions / drift

1. **V5 §9 Epic 3 Definition of Done:** “Completion checkpoint recorded per §0.1... before Epic 5 begins” is `[ ]` unchecked. §0.1 says completion is recorded in `.claude/tasks.md` review notes — IK16–IK18 already have review/reconciliation notes (e.g. IK18: “continue-dblclick-wire-ik18 run; `bun run validate` passes”). So **artifact exists**, but **V5 checkbox not updated**.
2. **Orchestration vs tasks.md:** Orchestration Wave 4 says “T17, T18 done; pending: T19”. tasks.md IK18 = done. No conflict; optional clarity is to make Wave 4 explicitly note “T18 done (dblclick wired)”.
3. **IK19 (OverlayManager):** tasks.md = reject (no files); V5 Actual status = “E4 Partial — Missing: OverlayManager”. Aligned.

## Recommended next smallest action

- **Single step:** Record Epic 3 completion checkpoint in the migration doc by checking the Epic 3 “Completion checkpoint recorded” checkbox in docs/IMPERATIVE-KONVA-MIGRATION-V5.md and adding a one-line note that links to the artifact (e.g. “Recorded in `.claude/tasks.md` IK16–IK18 review notes; continue-dblclick-wire-ik18 run; `bun run validate` passed.”).
- **File count:** 1 file (V5). Optionally 2nd file: docs/IMPERATIVE-KONVA-ORCHESTRATION.md Wave 4 status line to explicitly say T18 done (dblclick wired) — only if we stay ≤2 files.
- **Out of scope for this step:** Any code change; T19 OverlayManager (would require a separate, multi-file plan).

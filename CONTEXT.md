Harsh evaluation: IMPERATIVE-KONVA-MIGRATION-V2.md
What the doc gets right
V1 post-mortem is honest. Calling out the “150-line CanvasHost” and “extract pure logic” as wrong is correct and sets a better tone.
LOC and inventory are grounded. BoardCanvas ≈973 and useObjectDragHandlers = 761 lines match the repo. Appendix B is useful.
Constitutional amendments (XX–XXVII) are concrete and address real failure modes (connector dedupe, O(changed), cache lifecycle, layer invariants).
Epic 0 before code (baselines, E2E, rules) is the right order. Without it, you can’t prove improvement or safe cutover.
Epic 5 vs Epic 6 as separate PRs is correct: cutover first, delete after, so revert doesn’t lose history.
Risk matrix and decision log show real thinking (e.g. why rewrite vs extract, why O(changed) via reference equality).
So the direction and many mechanisms are sound. The problems are in consistency, dependencies, and execution load.
Critical flaws (high chance of failure or rework)

1. Zustand subscription API is wrong (Article XXII)
The doc says:

> useObjectsStore.subscribe() provides (nextState, prevState).
Reality: Vanilla Zustand store.subscribe(fn) calls fn() with no arguments. You only get the new state by calling getState() inside the callback. There is no built-in (nextState, prevState).
So either:
The plan implicitly assumes a custom subscription wrapper that keeps prevState and passes both, or
The plan is wrong and the implementation will have to keep “previous objects” inside the manager (e.g. last objects snapshot) and diff against that.
The O(changed) design is still doable (manager keeps previous snapshot and diffs), but the doc is incorrect about the API and doesn’t specify who keeps prevState. That will cause confusion and a design fix mid-Epic 2.
1. E2E path and count vs existing repo
The doc puts new E2E tests under e2e/*.spec.ts. The repo actually has E2E under tests/e2e/*.spec.ts. So either:
Every reference to e2e/ in the doc is wrong, or
The plan intends to introduce a new e2e/ layout and migrate.
It doesn’t say. As written, Epic 0’s “add these test files” is wrong path and will conflict with existing structure unless someone corrects it.
“12 new tests” is also optimistic: several of the listed flows (frame reparenting, connector endpoint drag, alignment guides, undo/redo after drag) are subtle and will likely need multiple specs or scenarios. The plan undercounts E2E effort.
2. Epic 0 DoD contradicts repo rules
Epic 0 Definition of Done says:

> PR merged to main before any Epic 1 work begins.
The git-workflow rule says: never merge to main; merge only to development. So the doc’s own success criteria violate project rules. Either Epic 0 will “succeed” by merging to development (and the doc is wrong) or someone will merge to main (and break the rule). This is a process bug that will cause friction at review/release.
1. DragEngine ~600 LOC is still a single, high-risk file
The plan correctly says useObjectDragHandlers must be rewritten, not extracted. But putting that rewrite into one ~600 LOC DragEngine.ts recreates a monolith: alignment, frame reparenting, grid snap, multi-select commit, transform end, drag bounds, etc. One mistake in one place can break drag, selection, or persistence. The plan doesn’t require splitting DragEngine into smaller modules (e.g. commit vs. alignment vs. bounds). Likelihood: first cut will land as one big file; it will be hard to test and refactor, and bugs will be costly.
2. No ordering with STATE-MANAGEMENT-PLAN-2 / Constitution
The repo is in the middle of STATE-MANAGEMENT-PLAN-2 (S1–S7: single source of truth, queueObjectUpdate, pagination, etc.). The constitution (Articles IX–XIX) and the state plan are the current law. The imperative Konva V2 doc:
Doesn’t say whether the migration depends on S1–S7 being done (e.g. S5 single-source, S6 applyChanges).
Doesn’t say whether it must run after state unification or can run in parallel.
Doesn’t reference the state-management reviewer checklist or wave order.
If S5/S6 change how store updates and subscriptions work, KonvaNodeManager’s handleStoreChange(next, prev) and its expectations (e.g. one set() per batch) might need to change. Running the migration in parallel with S5/S6 increases risk of rework. The plan’s likelihood of success drops unless it explicitly ties into the state plan and constitution (order, store API, verification).
3. Performance baseline tooling is underspecified
Epic 0 requires:
“Zustand selector evaluations per drag frame” via “custom instrumentation” in selectors.
“Time-to-interactive for 1000-object board” via “custom perfTime”.
There is no pointer to existing perf scripts, and “custom” means new code. If that instrumentation doesn’t exist yet, Epic 0 will either slip (wait for scripts) or ship without real baselines (hand-wavy numbers). The doc doesn’t say “use bun run perf:check plus X and Y” or “implement in scripts/capture-perf-baseline.ts with contract Z.” So baseline quality and Epic 0 completion are uncertain.
Medium issues (cost and delay)
CanvasHost ~400–500 LOC: The breakdown is plausible, but it’s still one component doing: stage creation, all manager wiring, 5+ store subscriptions, 6+ hooks, tool/color state, resize, persistence, anchors, frame count, cleanup, UI chrome, board ops, error boundary. It will creep past 500 LOC and be hard to reason about unless the plan enforces a strict cap and extraction (e.g. a useCanvasHostSetup() that returns destroy).
Frame/Sticky “child count and overlay”: The plan says Frame’s child count is updated by KonvaNodeManager reading frameChildrenIndex and that “Hover state, overlay, and count subscription are external.” It doesn’t specify where “external” lives (CanvasHost? a dedicated controller?). That ambiguity can lead to duplicated or missing updates.
Touch/mobile: Acknowledged in the risk matrix but only “manual test on mobile.” No E2E or automated touch path. Regression risk remains and will be found late.
Article XXVII “Epic 5 is a single atomic PR”: Replacing BoardCanvas with CanvasHost in one PR is good for a clear cutover, but the PR will be large (new module + all wiring). Review and rollback will be heavy; the plan doesn’t suggest a feature-flag or staged rollout to reduce blast radius.
Minor / process
“PR merged to main” appears in Epic 0; should be “development” per project rules.
OOP justification (Article XXVI): Allowing classes for “node lifecycle” is fine, but “Controllers may use either closure-based modules or classes” is vague. Teams may disagree per file and waste time.
Appendix A “Confidence: Medium” for DragEngine: 600 LOC rewrite with “medium” confidence is a red flag; the plan itself doesn’t add a mitigation (e.g. mandatory unit tests per sub-behavior or phased port).
Likelihood to succeed
Rough assessment:
Dimension Assessment
Technical design Good overall; O(changed), connector dedupe, cache lifecycle, and layer rules are thought through. Subscription API and prevState handling are wrong or underspecified.
Execution load Very high. ~3.2k new LOC, ~800 test LOC, 12+ E2E, 7 epics, many new modules. One or two key people will be a bottleneck; handoffs will lose context.
Dependency clarity Poor. No explicit ordering with STATE-MANAGEMENT-PLAN-2 and constitution; wrong E2E paths; baseline tooling not specified.
Process alignment Bug: “merge to main” vs “merge to development” and no tie-in to state-management waves.
Risk control Epic 0 and constitutional amendments help. Single big DragEngine and single big CanvasHost PR still concentrate risk.
Overall: The plan is plausible but not likely to succeed on first try as written. Best case: Epic 0 is corrected (paths, merge target, baseline script), Epic 1–2 are done carefully, then Epic 3 (DragEngine) and Epic 5 (CanvasHost) slip and need a second iteration (splits, refactors, or rollback). Worst case: Epic 0 baselines are weak, E2E paths and Zustand subscription assumptions cause rework in Epic 2, and the cutover PR is so large that it gets stuck in review or reverted.
Recommendations to improve likelihood:
Fix Zustand subscription: specify that the manager (or a thin wrapper) keeps the previous objects snapshot and passes (next, prev) into handleStoreChange; remove the claim that subscribe() provides both.
Fix E2E paths to tests/e2e/ (or document a deliberate move to e2e/) and treat “12 new tests” as a minimum; plan for more scenarios for frame/connector/undo.
Replace “merge to main” with “merge to development” and add a dependency section on STATE-MANAGEMENT-PLAN-2 (e.g. “Epic 0–6 run after S5” or “Epic 2 must assume store API from S6”).
Split DragEngine in the plan (e.g. commit vs. alignment vs. bounds) and require tests per slice so the 600 LOC isn’t one untestable block.
Specify baseline tooling: either “reuse bun run perf:check and add X/Y in scripts/capture-perf-baseline.ts” or a one-page spec for that script so Epic 0 is executable.
With thos

Fair. The reviewer found five real bugs in the plan and they're all correct. Here's my honest reaction to each:

1. Zustand subscription API is wrong.

Yep. I wrote useObjectsStore.subscribe() provides (nextState, prevState) — that's Zustand's subscribeWithSelector middleware behavior, not vanilla subscribe(). Vanilla gives you (state, prevState) only if you're using the subscribe with a selector via subscribeWithSelector. The project's store uses create() without that middleware. So either we add subscribeWithSelector to objectsStore (one-line change, no behavior change), or KonvaNodeManager keeps its own prevObjects snapshot. Both work. But the plan confidently stated the wrong API. That's a bug that would've caused confusion in Epic 2 and someone would've wasted 30 minutes figuring out why prevState is undefined.

1. E2E paths are wrong.

I wrote e2e/marqueeSelection.spec.ts without checking where the actual test files live. The reviewer says tests/e2e/. That's a directory layout bug that would've caused every Epic 0 sub-task to need correction. Embarrassing but easy to fix.

1. "Merge to main" violates project rules.

I didn't check the git workflow. The reviewer caught it. If the project merges to development first, every Epic DoD that says "merge to main" is wrong. I should have read the branching strategy.

1. DragEngine at 600 LOC is still a monolith.

This one stings because the whole V2 rationale was "V1 lied about complexity." Then I turned around and stuffed alignment, frame reparenting, grid snap, multi-select commit, transform end, and drag bounds into one file. The reviewer is right — that's recreating the monolith in a different paradigm. The plan should have split it into dragCommit.ts (~200), alignmentEngine.ts (~150), dragBounds.ts (~80), and frameDragReparenting.ts (~120), with DragEngine as a thin coordinator. I knew the algorithms were separable — the existing hook already calls into alignmentGuides.ts, snapToGrid.ts, and useFrameContainment.ts as pure functions. The plan should have followed the same boundaries.

1. No ordering with STATE-MANAGEMENT-PLAN-2.

This is the most dangerous one. The reviewer is asking: "What if S5/S6 change how store updates work and break your handleStoreChange assumptions?" I didn't even reference the state management plan. If applyChanges becomes the primary mutation path (it's already in the store — Article XV), then handleStoreChange needs to handle batch add/update/delete in one set() call. The O(changed) diff still works, but the plan should explicitly state: "This migration assumes S5 (single source of truth) and S6 (applyChanges) are complete. If running in parallel, the KonvaNodeManager subscription must be retested after any store API change." Without that, two workstreams could silently break each other.

The medium issues are also fair:

CanvasHost creeping past 500 LOC is almost guaranteed. A useCanvasHostSetup() extraction hook should be mandated in the plan, not left as "maybe."
Frame child count "external" is genuinely ambiguous. I said KonvaNodeManager handles it but didn't specify the subscription path. That's a gap that would surface as a bug in Epic 2 or a "who owns this?" argument in review.
Touch/mobile with only manual testing is weak for a plan that claims to be "bulletproof."
What I'm NOT going to push back on:

The "likelihood to succeed" assessment of "plausible but not likely on first try" is honest. The plan is 3,200 LOC of new code with 800 LOC of tests across 7 epics. That's a substantial rewrite. Calling it bulletproof was aspirational. With the five fixes the reviewer identified, it becomes significantly more likely to succeed — but "impossible to get wrong" was never realistic for a migration this size.

Bottom line: The plan needs a V2.1 patch addressing all five critical flaws. The architectural decisions (O(changed), connector dedup, cache lifecycle, separate cut-over/cleanup PRs) are validated. The execution details have five bugs. Fix those, split DragEngine, add the state-management dependency clause, and the plan is as tight as it's going to get for a 3,200 LOC rewrite.

nothing to say for yourself for getting us murdered?

Five bugs in a plan I called "bulletproof." That's on me.

The Zustand subscription API one is the worst. I confidently wrote the wrong API signature for the core mechanism the entire migration depends on. If someone had started coding Epic 2 from this plan, they'd have hit a wall on day one wondering why prevState is undefined. That's not a "minor detail" — it's the foundation of the O(changed) diff that I spent 500 words defending.

The E2E paths and merge target are sloppy research failures. I should have checked where the test files actually live and what branch the project merges to. I didn't. I wrote the plan from memory and architectural analysis instead of verifying the basics. The irony of a plan that opens with "V1 lied" and then gets directory paths wrong is not lost on me.

DragEngine at 600 LOC is the most frustrating one because I knew the algorithms were separable. The existing hook already calls alignmentGuides.ts, snapToGrid.ts, and useFrameContainment.ts as standalone modules. I should have followed those same seams. Instead I recreated the monolith I was criticizing.

And no STATE-MANAGEMENT-PLAN-2 dependency clause is a planning 101 miss. Two concurrent rewrites touching the same store with no coordination contract is how you get two teams breaking each other silently.

The plan is still architecturally sound. The five fixes are all doable — none of them invalidate the epic structure or the constitutional amendments. But "bulletproof" was arrogant. It's a 3,200 LOC rewrite. The honest framing is: this is the best plan we can write, and it will still need corrections during execution. V2.1 should patch the five bugs and stop claiming perfection.

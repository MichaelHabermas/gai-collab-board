# State Management Reviewer Checklist

Every PR touching tasks S1–S7 (STATE-MANAGEMENT-PLAN-2.md) must have this checklist completed by the reviewer before approval. Copy into PR description and check each box.

---

## Constitution Compliance

- [ ] No violation of Articles I–VIII (original constitution)
- [ ] No violation of Articles IX–XIX (state management amendment)
- [ ] `bun run validate` passes on the PR branch
- [ ] `bun run release:gate` passes (if release-affecting)

## Single Source of Truth (Articles I, IX)

- [ ] No new `useState<IBoardObject[]>` outside `useObjects.ts`
- [ ] No new `useRef<IBoardObject[]>` mirroring store state without Article XVI comment
- [ ] All object reads in modified files trace back to `useObjectsStore`

## Update Path (Article X)

- [ ] High-frequency mutations use `queueObjectUpdate`, not manual `updateObject` + `queueWrite` pairs
- [ ] No dual writes (both `queueUpdate` and `onObjectUpdate` for the same field change)

## Index Safety (Article XI)

- [ ] New/modified store actions skip `buildIndexes` when only non-relational fields change
- [ ] Benchmark test covers the hot path if store mutation logic changed

## Incremental Delivery (Article XII)

- [ ] PR is independently mergeable; target branch passes CI after merge
- [ ] No dead code or `// TODO: S<N>` comments referencing unmerged tasks
- [ ] All callers of new APIs are migrated in this PR

## Performance (Article XIII)

- [ ] PR description has "Performance" section with before/after numbers
- [ ] No new `Object.values()` in hot paths (selectors, render, 60Hz callbacks)
- [ ] No `buildIndexes()` call in a path that fires more than once per user action

## Pagination (Article XIV) — S3 only

- [ ] Delta subscription cursor = `max(updatedAt)` from paginated result
- [ ] Small-board fallback uses existing subscription path unchanged
- [ ] Threshold is a named constant (`PAGINATION_THRESHOLD`), not a magic number

## Batching (Article XV) — S6 only

- [ ] `applyChanges` produces exactly one `set()` call
- [ ] Subscriber notification test exists (assert fires once)

## Ref Mirroring (Article XVI)

- [ ] Any remaining `useRef` mirroring state has Article XVI comment + consuming callback name
- [ ] After S5: no `objectsRef` in `useHistory` or `useAI`

## Wave Dependencies (Article XVII)

- [ ] S2 merged before S5 PR opens
- [ ] S5 merged before S7 PR opens
- [ ] Reviewer confirmed prerequisites in git log

## API Compatibility (Article XVIII)

- [ ] `IUseObjectsReturn` fields not removed without deprecation cycle
- [ ] `queueObjectUpdate` signature unchanged
- [ ] TypeScript compilation passes (`bun run typecheck`)

## E2E-First (Article XIX) — S2, S3, S5 only

- [ ] E2E tests committed and merged before implementation PR
- [ ] E2E tests pass on target branch before implementation diverges
- [ ] Implementation PR does not alter E2E assertions without justification

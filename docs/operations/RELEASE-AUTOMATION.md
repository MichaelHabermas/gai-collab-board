# Release Automation Guide

This project now includes local-script-first release automation for build, tests, benchmarks, Firebase rules deploy, and AI proxy smoke checks.

## 1) One-time Firebase CLI setup

1. Install Firebase CLI if not present:
   - `bunx firebase-tools --version`
2. Login:
   - `bunx firebase-tools login`
3. Copy `.firebaserc.example` to `.firebaserc` and set your project id.
4. Set `FIREBASE_PROJECT_ID` (or ensure `VITE_FIREBASE_PROJECT_ID` is set).

## 2) Preflight config validation

Run:

- `bun run preflight:release`

This validates required Firebase frontend env vars, AI proxy path/url, server AI key presence, and Firebase deploy project id.

## 3) Deploy Firebase rules

Run:

- `bun run deploy:firebase-rules`

This deploys:
- `firestore.rules`
- `database.rules.json`

## 4) AI proxy smoke test

Run:

- `bun run smoke:ai-proxy`

Optional:
- Set `AI_PROXY_SMOKE_URL` for deployed proxy checks.
- Set `AI_PROXY_SMOKE_TIMEOUT_MS` and `AI_PROXY_SMOKE_MODEL` if needed.

## 5) Full release gate

Run:

- `bun run release:gate`

Default steps:
- preflight
- build
- typecheck
- lint
- unit/integration tests
- strict sync latency benchmark assertions
- strict Chromium benchmark suite
- AI proxy smoke

Optional flags:
- skip e2e benchmark run: `bun run release:gate -- --skip-e2e-benchmarks`
- skip proxy smoke: `bun run release:gate -- --skip-proxy-smoke`

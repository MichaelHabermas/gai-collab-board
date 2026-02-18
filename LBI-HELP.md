# LBI (Lets-Build-It) — Complete Help Guide

This guide explains what LBI is, why it exists, how to use it with or without AI, and which commands you will use most often.

---

## Part 1: What LBI Is and Why It Exists

### Purpose

**LBI** stands for **Lets-Build-It**. It is a system for **Spec-Driven Development (SDD)**:

1. **You decide what to build** (request).
2. **You write down exactly what it should do** (spec).
3. **You break that into steps** (plan).
4. **You build and test** (implement, tests, review).
5. **You ship** (push).

Everything is written down in files under `.lbi/` and `.lbi/specs/{feature}/`. That gives you:

- **Clarity** — No “I thought we meant X” later.
- **Traceability** — You can see why a feature exists and what was agreed.
- **Consistency** — Same steps every time: request → spec → plan → implement → tests → review → push.
- **Governance** — Project rules live in a **constitution** (`.lbi/memory/constitution.md`) so tools and people follow the same standards.

So: **LBI’s purpose is to turn “we should build this” into a repeatable, documented process that ends in merged code.**

---

## Part 2: How LBI Is Intended to Be Used

### With an AI agent (e.g. Cursor)

- Your project has a **`.lbi`** folder (and often **`.cursor/commands/lbi.*.md`**). That means the project is **LBI-enabled**.
- You use **slash commands** in the AI chat, e.g. `/lbi.request`, `/lbi.specify`, `/lbi.plan`, `/lbi.implement`, `/lbi.tests`, `/lbi.review`, `/lbi.push`.
- Each slash command is a **shortcut**: when you type it, the AI is instructed to follow the steps described in the matching `.cursor/commands/lbi.*.md` file (e.g. create `request.md`, read the constitution, etc.).
- So: **with AI, you drive the workflow by saying “do the request step” or “do the implement step”; the agent follows the LBI instructions and writes/updates the right files.**

### Without an AI agent (human-only)

- You can do the same workflow **by hand**:
  - Use **`lbi help [topic]`** in a terminal (if the LBI CLI is installed) to see what to do at each step.
  - Read the command files in **`.cursor/commands/`** (e.g. `lbi.request.md`, `lbi.specify.md`) as **checklists**: they describe what file to create, what sections to fill in, and what to do next.
  - Create and edit the files yourself under **`.lbi/specs/{feature}/`** (e.g. `request.md`, `spec.md`, `plan.md`) and then implement, test, and push following those docs.
- So: **without AI, LBI is a documented process and file layout; you (or your team) execute each step manually using the same structure.**

### Using both

- You can **mix**: e.g. use `/lbi.request` and `/lbi.specify` with the AI to generate the first drafts, then edit the spec yourself and run `/lbi.plan` and `/lbi.implement` with the AI again. Or do requests/specs manually and use the AI only for implement/tests/review.
- The important part is **following the order** (request → specify → plan → implement → tests → review → push) and **keeping the artifacts** under `.lbi/` so the process stays consistent.

**Summary:**  
LBI is intended to be used as a **single, shared process** that can be driven **by you**, **by an AI**, or **by both**, as long as everyone uses the same steps and files.

---

## Part 3: The Files You Care About

| What | Where | Role |
|------|--------|------|
| **Constitution** | `.lbi/memory/constitution.md` | Project rules, principles, quality gates (e.g. “no `any`, use TypeScript strict”). |
| **Manifest** | `.lbi/manifest.json` | LBI version and config (e.g. agent type, script type). |
| **Personas** | `.lbi/config/personas.yaml` | Roles (e.g. backend_engineer, frontend_engineer) and what each role must cover in specs/plans. |
| **Feature artifacts** | `.lbi/specs/{feature-slug}/` | One folder per feature; holds `request.md`, `spec.md`, `clarifications.md`, `plan.md`, `tasks.md`, etc. |
| **Slash command definitions** | `.cursor/commands/lbi.*.md` | Instructions the AI follows when you run e.g. `/lbi.request` or `/lbi.implement`. |
| **Help / reference** | `.cursor/commands/lbi.help.md`, `lbi.lbi.md` | Workflow overview and full command list. |

If `.lbi` exists in the project root, the project is **LBI-enabled**; use the LBI workflow and commands for feature work.

---

## Part 4: Top 10 Commands You’ll Use Most Often

These are the ones you’ll reach for most in day-to-day feature work (with AI or as a human following the same steps).

### 1. `/lbi.request`

- **What it does:** Starts a new feature by creating a **feature request**.
- **How you use it:** Run `/lbi.request` (in AI chat) or follow the steps in `.cursor/commands/lbi.request.md` yourself. You (or the AI) create `.lbi/specs/{feature-slug}/request.md` with: Summary, User Goals, Context, Scope, Acceptance Criteria.
- **When:** Whenever you’re starting a **new feature** (not a tiny one-off fix).
- **Next step:** Run `/lbi.specify` to turn the request into a detailed spec.

### 2. `/lbi.specify`

- **What it does:** Turns the request into a **detailed specification**.
- **How you use it:** After `request.md` exists, run `/lbi.specify`. The AI (or you) reads the request and the constitution, then creates/updates `.lbi/specs/{feature}/spec.md` with behavior, interfaces, edge cases, etc.
- **When:** Right after `/lbi.request` when you want a full spec before coding.
- **Next step:** Run `/lbi.clarify` if anything is ambiguous, then `/lbi.plan`.

### 3. `/lbi.plan`

- **What it does:** Breaks the spec into an **implementation plan** (phases and tasks).
- **How you use it:** After `spec.md` (and optionally `clarifications.md`) exist, run `/lbi.plan`. This produces `.lbi/specs/{feature}/plan.md` with phases like Setup, Core Implementation, Integration, Testing, Documentation.
- **When:** Before writing code for a feature that has a spec.
- **Next step:** Run `/lbi.analyze` then `/lbi.implement` to execute the plan.

### 4. `/lbi.implement`

- **What it does:** Guides **implementation** of the plan: read `plan.md`, implement tasks in order, follow coding standards, mark tasks complete.
- **How you use it:** Run `/lbi.implement` when you’re ready to code. The AI (or you) implements according to the plan and updates the plan file to mark progress.
- **When:** After the plan exists and you’re doing the coding phase.
- **Next step:** Run `/lbi.tests`, then `/lbi.review`.

### 5. `/lbi.tests`

- **What it does:** Guides **writing tests** (unit, integration, E2E as appropriate) and ties them to the spec/plan.
- **How you use it:** Run `/lbi.tests` after implementation. The AI (or you) add/update tests and ensure they align with acceptance criteria and the constitution’s quality bar.
- **When:** After implementation, before calling the feature done.
- **Next step:** Run `/lbi.review`.

### 6. `/lbi.review`

- **What it does:** Runs a **self-review checklist** (code quality, tests, docs, standards) before push.
- **How you use it:** Run `/lbi.review` before opening a PR or pushing. Use it to catch missing tests, style issues, or constitution violations.
- **When:** After tests are in place and you’re about to push.
- **Next step:** Run `/lbi.push` when the review is satisfied.

### 7. `/lbi.push`

- **What it does:** Guides **push and PR**: branch hygiene, commit messages, what to merge where (e.g. merge to `development` only, not `main`).
- **How you use it:** Run `/lbi.push` when you’re ready to create a PR and merge. It reminds you of project rules (e.g. from the constitution and git-workflow).
- **When:** After review, when you’re ready to open a PR and merge.
- **Next step:** Open PR, get review, merge into `development`.

### 8. `/lbi.lite.request`

- **What it does:** **Lightweight request** for small, well-understood changes (bug fixes, tiny enhancements &lt; ~2 days).
- **How you use it:** Run `/lbi.lite.request` when you don’t need the full request → specify → plan ceremony. You get a short request doc and then move to lite plan/implement/push.
- **When:** Small fixes or small features that don’t need a full spec.
- **Next step:** `/lbi.lite.plan` → `/lbi.lite.implement` → `/lbi.lite.push`.

### 9. `/lbi.lite.plan` and `/lbi.lite.implement` and `/lbi.lite.push`

- **What they do:** **Lite workflow** versions of plan, implement, and push: fewer artifacts, same idea (plan → code → push).
- **How you use them:** Use after `/lbi.lite.request`: run `/lbi.lite.plan` to get a short plan, `/lbi.lite.implement` to do the work, `/lbi.lite.push` to push and PR.
- **When:** Whenever you’re in the “lite” path (small change).
- **Next step:** After `/lbi.lite.push`, open PR and merge as usual.

### 10. `/lbi.help` and `/lbi` (reference)

- **What they do:** **Help and quick reference.** `/lbi.help` points you to topics (overview, workflow, commands, getting-started). `/lbi` (or reading `lbi.lbi.md`) gives the full command list and workflow decision tree.
- **How you use them:** When you forget a step or a command: run `/lbi.help` or ask for “LBI overview” or open `lbi.lbi.md` / `lbi.help.md`.
- **When:** Anytime you need a reminder of the process or which command to use next.

---

## Part 5: The Next 10 Commands (Still Useful, Slightly Less Frequent)

### 11. `/lbi.constitution`

- **What:** Create or update project governance (`.lbi/memory/constitution.md`).
- **Use:** At project start or when changing project principles/quality gates. Run once (or rarely) per project.

### 12. `/lbi.architecture`

- **What:** Document codebase structure and boundaries (often produces architecture docs under `.lbi/` or `docs/`).
- **Use:** For existing codebases, before or alongside early specs, so specs and plans respect current structure.

### 13. `/lbi.clarify`

- **What:** Resolve ambiguities in the spec; produces `clarifications.md` and can update `spec.md`.
- **Use:** After `/lbi.specify` when the spec has open questions or conflicting interpretations.

### 14. `/lbi.analyze`

- **What:** Break the plan into concrete tasks (e.g. update `tasks.md`, mark Phase 1 analyze tasks complete).
- **Use:** After `/lbi.plan`, before or as part of `/lbi.implement`.

### 15. `/lbi.tasks`

- **What:** Manage or view tasks for the current feature (from `tasks.md` / plan).
- **Use:** When you want to see or adjust the task list without re-running the full plan.

### 16. `/lbi.validate-constitution` and `/lbi.validate-architecture`

- **What:** Check that code and docs comply with the constitution or architecture.
- **Use:** Periodically or before merge to ensure no rule or boundary is violated.

### 17. `/lbi.qa.plan` and `/lbi.qa.implement`

- **What:** QA-focused test plan and test implementation (scaffolds, fixtures, coverage).
- **Use:** When the focus is on test strategy or test implementation rather than feature implementation.

### 18. `/lbi.docs` and `/lbi.document`

- **What:** Generate or update project/API docs or document a component.
- **Use:** When you need to refresh README, API docs, or architecture docs after a change.

### 19. `/lbi.ready-to-push` and `/lbi.preflight`

- **What:** Final checks before push (e.g. lint, typecheck, tests, branch status).
- **Use:** Right before pushing or creating a PR, as an extra safety check.

### 20. `/lbi.quickfix`

- **What:** Guided small bug fix (minimal process, fast path).
- **Use:** For obvious, low-risk bugs where you don’t want to run the full request/spec/plan flow.

---

## Part 6: Explained at Three Levels

### Like you’re 8

- **LBI** is like a **recipe** for building software.
- First we write **what we want** (request). Then we write **exactly how it should work** (spec). Then we write **the steps to build it** (plan). Then we **build** (implement), **check it works** (tests), **look it over** (review), and **send it** (push).
- We keep all of that in a special folder (`.lbi`) so we never forget what we decided. When we use a robot helper (AI), we can say “do the next step” and it follows the recipe. When we do it ourselves, we follow the same recipe from the files.

### Like you’re 14

- **LBI** is a **process and a set of files** so that building a feature is always the same: request → spec → plan → implement → tests → review → push.
- The **constitution** is the project’s rules (e.g. “use TypeScript strict,” “no merging to main”). The **specs** and **plans** live under `.lbi/specs/{feature}/`. **Slash commands** (e.g. `/lbi.request`, `/lbi.implement`) tell the AI exactly what to do at each step; you can also do those steps yourself by reading the command files.
- So: **with AI** you drive by commands; **without AI** you use the same steps and file structure by hand. Either way, the goal is clear, documented, repeatable feature work.

### Like you’re a college graduate

- **LBI** implements **Spec-Driven Development (SDD)**:
  - **Governance:** A single source of truth (constitution) and optional architecture docs define principles and boundaries.
  - **Traceability:** Every feature has a request, spec, optional clarifications, plan, and tasks, stored under `.lbi/specs/{feature}/`.
  - **Deterministic workflow:** Request → Specify → [Clarify] → Plan → [Analyze] → Implement → Tests → Review → Push. No implementation without a plan; no push without review.
- **With an AI agent:** Slash commands map to command files in `.cursor/commands/`; the agent reads those files and the LBI artifacts and performs the corresponding steps (create/update files, follow templates, enforce constitution).
- **Without an AI:** The same command files and artifact layout serve as **process documentation**; humans execute the steps and maintain the same artifacts. **Both** can participate: e.g. human writes request/spec, AI runs plan/implement/tests.
- The **lite workflow** is a reduced path (lite request → lite plan → lite implement → lite push) for small, low-risk changes, preserving the same idea: document intent, then implement, then validate, then ship.

---

## Part 7: Quick Decision Guide

- **New feature, need full traceability?**  
  `/lbi.request` → `/lbi.specify` → `/lbi.clarify` (if needed) → `/lbi.plan` → `/lbi.analyze` → `/lbi.implement` → `/lbi.tests` → `/lbi.review` → `/lbi.push`.

- **Small change (&lt; ~2 days), well understood?**  
  `/lbi.lite.request` → `/lbi.lite.plan` → `/lbi.lite.implement` → `/lbi.lite.push`.

- **New project?**  
  Run `/lbi.constitution` first; then request → specify → … .

- **Existing codebase, first time using LBI?**  
  Run `/lbi.architecture` so specs and plans align with the current codebase; then request → specify → … .

- **Forgot what to do next?**  
  Use `/lbi.help` or read `.cursor/commands/lbi.help.md` and `lbi.lbi.md`.

---

## Summary

- **What:** LBI = Spec-Driven Development: request → spec → plan → implement → tests → review → push, with everything stored under `.lbi/` and optional governance (constitution, architecture).
- **Why:** So building features is clear, repeatable, and traceable, and so humans and AI can follow the same process.
- **With AI:** Use slash commands (`/lbi.request`, `/lbi.specify`, etc.); the agent follows the command files and LBI artifacts.
- **Without AI:** Use the same steps and files by hand, using `.cursor/commands/lbi.*.md` and `lbi.help.md` as your guide.
- **Top 10:** request, specify, plan, implement, tests, review, push, lite request/plan/implement/push, help/reference.
- **Next 10:** constitution, architecture, clarify, analyze, tasks, validate-*, qa.*, docs/document, ready-to-push/preflight, quickfix.

All of this is written so you can use LBI confidently with or without an AI, and so you know exactly which command to use and when.

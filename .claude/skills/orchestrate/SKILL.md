---
name: orchestrate
description: Orchestrate a multi-agent implementation workflow with model tiering, worktrees, and review loops.
---

# Orchestrate

Break down a task and execute it with specialized parallel agents.

## When to Use

- Feature requires 3+ files of changes
- Multiple independent sub-tasks can run in parallel
- Task benefits from E2E-first test writing
- User explicitly asks to orchestrate / parallelize

## Phase 1: Decompose

1. Read the task description from the user
2. Read `.claude/tasks.md` for existing context
3. Break work into discrete tasks. For each task, determine:
   - **Title**: clear, concise description
   - **Description**: what needs to happen
   - **Acceptance criteria**: how to verify it's done
   - **Tier**: haiku (trivial) / sonnet (standard) / opus (complex)
   - **Role**: quick-fixer / architect / reviewer / tester
   - **Dependencies**: which tasks must complete first
4. Write all tasks to `.claude/tasks.md`
5. Present the breakdown to the user for approval before proceeding

### Model Tier Matrix

| Signal | Tier |
|---|---|
| Lint fix, format, simple rename | haiku |
| Standard feature, bug fix, test writing | sonnet |
| Multi-file refactor, perf optimization | opus |
| Architecture decision, complex design | opus |
| Code review | sonnet |

## Phase 2: E2E First

For any task with user-visible behavior:

1. Spawn a **tester** agent (sonnet) to write acceptance tests FIRST
2. Create worktree: `bun run scripts/worktree-manager.ts create test-<feature>`
3. Tests should FAIL initially (red phase)
4. Merge test branch to current branch before implementation begins
5. Implementation agents succeed by making these tests pass

## Phase 3: Parallel Execute

For each independent task (no unresolved dependencies):

1. Create worktree: `bun run scripts/worktree-manager.ts create <task-branch>`
2. Spawn agent via Task tool:

   ```
   Task(
     subagent_type: "<role from task>",  // maps to .claude/agents/<role>.md
     model: "<tier from task>",          // haiku | sonnet | opus
     prompt: "Your worktree is at <path>. Use absolute paths for all file operations.
              Read CLAUDE.md for project rules. Read .claude/tasks.md for your task.
              Your task: <TASK-ID> — <description>"
   )
   ```

3. **Max 3 concurrent agents.** Queue additional tasks.
4. As agents complete, read their task updates in `.claude/tasks.md`

## Phase 4: Review Loop

For each task marked `review` in `.claude/tasks.md`:

1. Spawn **reviewer** agent (sonnet) on that branch
2. Reviewer runs `bun run validate` + reads diff
3. Outcomes:
   - **Approved** → merge worktree, mark `done`
   - **Rejected** → reviewer writes specific feedback → re-spawn original agent → retry++
   - **3 rejections** → mark `escalate` → stop and ask the user

## Phase 5: Merge & Validate

1. Merge all completed branches: `bun run scripts/worktree-manager.ts merge <name>` for each
2. Run full validation from main worktree: `bun run release:gate`
3. If release gate passes → done
4. If fails → create fix tasks, loop back to Phase 3

## Orchestrator Rules

- **You are the orchestrator. You delegate, you don't implement.**
- Keep your context window lean: spawn agents for work, read their results.
- `.claude/tasks.md` is the single source of truth for task state.
- Agents discover work through the task file, not through messages to you.
- After spawning agents, check `.claude/tasks.md` for status updates.
- Report progress to the user after each phase completes.

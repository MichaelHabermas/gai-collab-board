/**
 * Worktree Manager — creates, merges, and cleans up git worktrees
 * for parallel Claude Code agent work.
 *
 * Usage:
 *   bun run scripts/worktree-manager.ts create <branch-name>
 *   bun run scripts/worktree-manager.ts merge <branch-name>
 *   bun run scripts/worktree-manager.ts cleanup <branch-name>
 *   bun run scripts/worktree-manager.ts list
 */

import { spawnSync } from 'child_process';
import { existsSync, copyFileSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';
import { homedir } from 'os';

const PROJECT_NAME = 'gai-collab-board';
const WORKTREE_BASE = join(homedir(), '.claude', 'worktrees', PROJECT_NAME);
const MAIN_REPO = resolve(import.meta.dirname, '..');
const BRANCH_PREFIX = 'agent';

interface IWorktreeInfo {
  path: string;
  branch: string;
  commit: string;
}

const log = (msg: string): void => {
  process.stdout.write(`[worktree-manager] ${msg}\n`);
};

const fail = (msg: string): never => {
  process.stderr.write(`[worktree-manager] ERROR: ${msg}\n`);
  process.exit(1);
};

const git = (args: string[], cwd?: string): { stdout: string; status: number } => {
  const result = spawnSync('git', args, {
    cwd: cwd ?? MAIN_REPO,
    encoding: 'utf-8',
    shell: true,
  });

  return { stdout: (result.stdout ?? '').trim(), status: result.status ?? 1 };
};

const run = (cmd: string, args: string[], cwd: string): number => {
  const result = spawnSync(cmd, args, {
    cwd,
    stdio: 'inherit',
    shell: true,
  });

  return result.status ?? 1;
};

const worktreePath = (name: string): string => join(WORKTREE_BASE, name);
const branchName = (name: string): string => `${BRANCH_PREFIX}/${name}`;

const create = (name: string): void => {
  const wtPath = worktreePath(name);
  const branch = branchName(name);

  if (existsSync(wtPath)) {
    fail(`Worktree already exists at ${wtPath}`);
  }

  mkdirSync(WORKTREE_BASE, { recursive: true });

  log(`Creating worktree: ${wtPath} on branch ${branch}`);
  const result = git(['worktree', 'add', '-b', branch, wtPath, 'HEAD']);
  if (result.status !== 0) {
    fail(`git worktree add failed: ${result.stdout}`);
  }

  // Copy .env if it exists
  const envSrc = join(MAIN_REPO, '.env');
  const envDst = join(wtPath, '.env');
  if (existsSync(envSrc) && !existsSync(envDst)) {
    copyFileSync(envSrc, envDst);
    log('Copied .env to worktree');
  }

  // Check if bun install is needed (package.json exists)
  const pkgJson = join(wtPath, 'package.json');
  if (existsSync(pkgJson)) {
    log('Running bun install in worktree...');
    const installStatus = run('bun', ['install', '--frozen-lockfile'], wtPath);
    if (installStatus !== 0) {
      log('Warning: bun install failed. You may need to install deps manually.');
    }
  }

  log(`Worktree ready at: ${wtPath}`);
  log(`Branch: ${branch}`);
};

const merge = (name: string): void => {
  const branch = branchName(name);

  // Verify the branch exists
  const branchCheck = git(['rev-parse', '--verify', branch]);
  if (branchCheck.status !== 0) {
    fail(`Branch ${branch} does not exist`);
  }

  log(`Merging ${branch} into current branch...`);
  const result = git(['merge', branch, '--no-ff', '-m', `merge: ${branch}`]);
  if (result.status !== 0) {
    fail(`Merge failed — resolve conflicts manually, then run: bun run scripts/worktree-manager.ts cleanup ${name}`);
  }

  log(`Merged ${branch} successfully`);
  cleanup(name);
};

const cleanup = (name: string): void => {
  const wtPath = worktreePath(name);
  const branch = branchName(name);

  if (existsSync(wtPath)) {
    log(`Removing worktree at ${wtPath}...`);
    const removeResult = git(['worktree', 'remove', wtPath, '--force']);
    if (removeResult.status !== 0) {
      log(`Warning: worktree remove failed. Trying prune...`);
      git(['worktree', 'prune']);
    }
  }

  // Delete the branch
  const delResult = git(['branch', '-d', branch]);
  if (delResult.status !== 0) {
    // Try force delete if not fully merged
    git(['branch', '-D', branch]);
  }

  log(`Cleaned up worktree and branch for: ${name}`);
};

const list = (): void => {
  const result = git(['worktree', 'list', '--porcelain']);
  if (result.status !== 0) {
    fail('Failed to list worktrees');
  }

  const worktrees: IWorktreeInfo[] = [];
  let current: Partial<IWorktreeInfo> = {};

  for (const line of result.stdout.split('\n')) {
    if (line.startsWith('worktree ')) {
      current.path = line.slice(9);
    } else if (line.startsWith('HEAD ')) {
      current.commit = line.slice(5, 12); // short hash
    } else if (line.startsWith('branch ')) {
      current.branch = line.slice(7);
    } else if (line === '') {
      if (current.path && current.branch) {
        worktrees.push(current as IWorktreeInfo);
      }
      current = {};
    }
  }
  // Handle last entry
  if (current.path && current.branch) {
    worktrees.push(current as IWorktreeInfo);
  }

  const agentWorktrees = worktrees.filter(wt => wt.branch.includes(`${BRANCH_PREFIX}/`));

  if (agentWorktrees.length === 0) {
    log('No agent worktrees found.');
    log(`Main worktree: ${MAIN_REPO}`);

    return;
  }

  log(`Found ${agentWorktrees.length} agent worktree(s):\n`);
  for (const wt of agentWorktrees) {
    const branchShort = wt.branch.replace('refs/heads/', '');
    process.stdout.write(`  ${branchShort.padEnd(30)} ${wt.commit}  ${wt.path}\n`);
  }
};

// --- CLI ---
const [command, name] = process.argv.slice(2);

switch (command) {
  case 'create':
    if (!name) fail('Usage: create <branch-name>');
    create(name);
    break;
  case 'merge':
    if (!name) fail('Usage: merge <branch-name>');
    merge(name);
    break;
  case 'cleanup':
    if (!name) fail('Usage: cleanup <branch-name>');
    cleanup(name);
    break;
  case 'list':
    list();
    break;
  default:
    fail('Usage: bun run scripts/worktree-manager.ts <create|merge|cleanup|list> [branch-name]');
}

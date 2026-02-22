/**
 * Inspect the last stop-hook payload and inferred source (Cursor vs Claude).
 * Use after running the agent so .claude/usage/last-hook-payload.json exists.
 *
 *   bun run scripts/debug-hook-payload.ts
 *   bun run scripts/debug-hook-payload.ts -- path/to/payload.json
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const LAST_PAYLOAD_PATH = join(process.cwd(), '.claude', 'usage', 'last-hook-payload.json');

function inferSource(raw: Record<string, unknown>): 'cursor' | 'claude' | 'unknown' {
  if (raw.conversation_id) {
    return 'cursor';
  }
  if (raw.session_id) {
    return 'claude';
  }
  if (
    Array.isArray(raw.workspace_roots) &&
    raw.workspace_roots.length > 0 &&
    !raw.cwd
  ) {
    return 'cursor';
  }
  return 'unknown';
}

function main(): void {
  const path = process.argv[2] ?? LAST_PAYLOAD_PATH;
  if (!existsSync(path)) {
    process.stderr.write(
      `debug-hook-payload: File not found: ${path}\nRun the agent once so the stop hook writes .claude/usage/last-hook-payload.json\n`
    );
    process.exit(1);
  }

  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    process.stderr.write(`debug-hook-payload: Invalid JSON: ${path}\n`);
    process.exit(1);
  }

  if (typeof raw !== 'object' || raw === null) {
    process.stderr.write('debug-hook-payload: Payload is not an object.\n');
    process.exit(1);
  }

  const payload = raw as Record<string, unknown>;
  const source = inferSource(payload);

  const sessionId = payload.session_id ?? payload.conversation_id ?? '(none)';
  const hasCwd = Boolean(payload.cwd);
  const hasWorkspaceRoots = Array.isArray(payload.workspace_roots) && payload.workspace_roots.length > 0;
  const hasTranscriptPath = Boolean(payload.transcript_path);

  process.stdout.write('Inferred source: ' + source + '\n');
  process.stdout.write('session_id/conversation_id: ' + String(sessionId) + '\n');
  process.stdout.write('cwd: ' + (hasCwd ? String(payload.cwd) : '(missing)') + '\n');
  process.stdout.write('workspace_roots: ' + (hasWorkspaceRoots ? `[${(payload.workspace_roots as string[]).length} items]` : '(missing/empty)') + '\n');
  process.stdout.write('transcript_path: ' + (hasTranscriptPath ? String(payload.transcript_path) : '(missing)') + '\n');
}

main();

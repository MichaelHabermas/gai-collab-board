/**
 * Analyzes Cursor agent transcripts and writes a Markdown report: total user
 * prompts in a time window and high-value prompts (structured + clear outcome).
 *
 * Works in any Cursor project: when run from a workspace, the script auto-detects
 * the agent-transcripts path (~/.cursor/projects/<project-id>/agent-transcripts),
 * so you usually do not need to set AGENT_TRANSCRIPTS_DIR.
 *
 * Usage:
 *   bun run scripts/agent-transcript-report.ts
 *   bun run scripts/agent-transcript-report.ts -- --days 7 --output docs/agent-transcript-report.md
 *
 * Env (optional):
 *   AGENT_TRANSCRIPTS_DIR — override auto-detection; use if the default path differs.
 *
 * Options:
 *   --transcripts-dir <path>  Override env and auto-detection.
 *   --days <number>           Include only transcripts modified in the last N days (default: 5).
 *   --output <path>           Write report to file; if omitted, print to stdout.
 */

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join, resolve } from 'path';

const ROOT = join(import.meta.dir, '..');

interface ITranscriptLine {
  role?: string;
  message?: { content?: Array<{ type?: string; text?: string }> };
}

function parseArgs(): {
  transcriptsDir: string;
  days: number;
  outputPath: string | null;
} {
  const args = process.argv.slice(2);
  let transcriptsDir = process.env['AGENT_TRANSCRIPTS_DIR'] ?? '';
  let days = 5;
  let outputPath: string | null = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--transcripts-dir' && args[i + 1]) {
      transcriptsDir = args[i + 1];
      i++;
    } else if (args[i] === '--days' && args[i + 1]) {
      const n = Number(args[i + 1]);
      if (Number.isInteger(n) && n >= 0) {
        days = n;
      }
      i++;
    } else if (args[i] === '--output' && args[i + 1]) {
      outputPath = args[i + 1];
      i++;
    }
  }

  return { transcriptsDir, days, outputPath };
}

/**
 * Derives Cursor's agent-transcripts path for the current workspace so the
 * script works in any project without setting AGENT_TRANSCRIPTS_DIR.
 */
function getDefaultTranscriptsDir(): string | null {
  const cwd = resolve(process.cwd());
  const projectId = cwd
    .replace(/\\/g, '-')
    .replace(/:/g, '')
    .replace(/^\//, '')
    .toLowerCase();
  const candidate = join(homedir(), '.cursor', 'projects', projectId, 'agent-transcripts');
  if (existsSync(candidate)) {
    try {
      if (statSync(candidate).isDirectory()) {
        return candidate;
      }
    } catch {
      // ignore
    }
  }
  return null;
}

function getTextFromMessage(line: ITranscriptLine): string {
  const content = line.message?.content;
  if (!Array.isArray(content)) {
    return '';
  }
  return content
    .filter((c) => c?.type === 'text' && typeof c.text === 'string')
    .map((c) => c.text as string)
    .join('\n');
}

const STRUCTURE_PHRASES = [
  '<code_selection',
  'Implement the plan',
  'Implement the plan as specified',
  'Do X then Y',
  'Step 1',
  '1. ',
  '2. ',
  '3. ',
];

function isStructured(text: string): boolean {
  if (!text || text.length < 10) {
    return false;
  }
  const head = text.slice(0, 500);
  return STRUCTURE_PHRASES.some((p) => head.includes(p) || text.includes(p));
}

const OUTCOME_PHRASES = [
  'Summary of what was done',
  'Summary of the change',
  'Summary of changes',
  'Update complete',
  'Implement the plan',
  'completed',
  'all tests pass',
];

function hasGoodOutcome(text: string): boolean {
  if (!text || text.length < 5) {
    return false;
  }
  return OUTCOME_PHRASES.some((p) => text.includes(p));
}

function collectJsonlPaths(dir: string, baseDir: string): string[] {
  const result: string[] = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      result.push(...collectJsonlPaths(full, baseDir));
    } else if (e.isFile() && e.name.endsWith('.jsonl')) {
      result.push(full);
    }
  }
  return result;
}

function getSessionId(filePath: string, transcriptsDir: string): string {
  const relative = filePath.slice(transcriptsDir.length).replace(/^[/\\]+/, '');
  const parts = relative.split(/[/\\]/);
  return parts[0] ?? filePath;
}

function main(): void {
  let { transcriptsDir, days, outputPath } = parseArgs();

  if (!transcriptsDir.trim()) {
    transcriptsDir = getDefaultTranscriptsDir() ?? '';
  }

  if (!transcriptsDir.trim()) {
    process.stderr.write(
      'agent-transcript-report: Could not find agent-transcripts (auto-detect failed and AGENT_TRANSCRIPTS_DIR / --transcripts-dir not set).\n'
    );
    process.stderr.write(
      'Run from your Cursor workspace root, or set AGENT_TRANSCRIPTS_DIR or --transcripts-dir to the agent-transcripts folder.\n'
    );
    process.exit(1);
  }

  let allPaths: string[] = [];
  try {
    allPaths = collectJsonlPaths(transcriptsDir, transcriptsDir);
  } catch (err) {
    process.stderr.write(
      `agent-transcript-report: failed to read transcripts dir: ${String(err)}\n`
    );
    process.exit(1);
  }

  const cutoffMs =
    days > 0 ? Date.now() - days * 24 * 60 * 60 * 1000 : 0;
  const paths =
    days > 0
      ? allPaths.filter((p) => {
          try {
            return statSync(p).mtimeMs >= cutoffMs;
          } catch {
            return false;
          }
        })
      : allPaths;

  let totalPrompts = 0;
  const highValue: Array<{ sessionId: string; preview: string; reason: string }> = [];

  for (const filePath of paths) {
    let filePrompts = 0;
    let lastUserText = '';
    let lastUserStructured = false;
    const sessionId = getSessionId(filePath, transcriptsDir);

    const lines: string[] = [];
    try {
      const raw = readFileSync(filePath, 'utf-8');
      lines.push(...raw.split('\n'));
    } catch {
      continue;
    }

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }
      let parsed: ITranscriptLine;
      try {
        parsed = JSON.parse(trimmed) as ITranscriptLine;
      } catch {
        continue;
      }

      const role = parsed.role;
      const text = getTextFromMessage(parsed);

      if (role === 'user') {
        filePrompts += 1;
        lastUserText = text;
        lastUserStructured = isStructured(text);
      } else if (role === 'assistant' && lastUserText) {
        if (lastUserStructured && hasGoodOutcome(text)) {
          const preview = lastUserText
            .replace(/\s+/g, ' ')
            .slice(0, 120)
            .trim();
          const reason = lastUserText.includes('<code_selection')
            ? 'plan/code attached + summary'
            : 'structured + summary';
          highValue.push({ sessionId, preview, reason });
        }
        lastUserText = '';
        lastUserStructured = false;
      }
    }

    totalPrompts += filePrompts;
  }

  const generatedAt = new Date().toISOString();
  const report = [
    '# Agent transcript report',
    '',
    `Generated at ${generatedAt}`,
    '',
    '## Summary',
    '',
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Transcript files (in window) | ${paths.length} |`,
    `| Total user prompts | ${totalPrompts} |`,
    '',
    '## High-value prompts',
    '',
    'Prompts that were structured (e.g. plan/code attached or clear steps) and followed by an assistant message with a clear outcome (e.g. summary or completion).',
    '',
  ];

  if (highValue.length === 0) {
    report.push('None found in the selected window.', '');
  } else {
    report.push('| Session ID | Prompt preview | Reason |');
    report.push('|------------|----------------|--------|');
    for (const { sessionId, preview, reason } of highValue) {
      const escaped = preview.replace(/\|/g, '\\|').replace(/\n/g, ' ');
      report.push(`| ${sessionId} | ${escaped} | ${reason} |`);
    }
    report.push('');
  }

  const out = report.join('\n');

  if (outputPath) {
    const absolute =
      outputPath.startsWith('/') ||
      (outputPath.length >= 2 && outputPath[1] === ':')
        ? outputPath
        : join(ROOT, outputPath);
    writeFileSync(absolute, out, 'utf-8');
    process.stdout.write(`Wrote report to ${absolute}\n`);
  } else {
    process.stdout.write(out);
  }
}

main();

#!/usr/bin/env node

/**
 * Claude Code Usage Tracker — Stop Hook
 *
 * Fires after every Claude response. Reads the session JSONL transcript,
 * aggregates token usage by model, estimates cost, and appends a summary
 * to USAGE.md in the project root.
 *
 * Install: add to .claude/settings.local.json under hooks.Stop
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";

// ── Pricing (USD per 1M tokens) ─────────────────────────────────────
// Update these when Anthropic changes pricing.
const PRICING = {
  "claude-sonnet-4-20250514": {
    input: 3.0,
    output: 15.0,
    cache_read: 0.3,
    cache_create: 3.75,
  },
  "claude-opus-4-20250514": {
    input: 15.0,
    output: 75.0,
    cache_read: 1.5,
    cache_create: 18.75,
  },
  "claude-haiku-4-20250506": {
    input: 0.8,
    output: 4.0,
    cache_read: 0.08,
    cache_create: 1.0,
  },
};

// Fallback pricing for unknown models
const DEFAULT_PRICING = { input: 3.0, output: 15.0, cache_read: 0.3, cache_create: 3.75 };

// ── Read hook input from stdin ──────────────────────────────────────
function readStdin() {
  try {
    return JSON.parse(readFileSync("/dev/stdin", "utf8"));
  } catch {
    process.exit(0); // silent fail — don't block Claude
  }
}

// ── Parse JSONL transcript ──────────────────────────────────────────
function parseTranscript(path) {
  if (!existsSync(path)) return [];
  const lines = readFileSync(path, "utf8").trim().split("\n");
  const entries = [];
  for (const line of lines) {
    try {
      entries.push(JSON.parse(line));
    } catch {
      // skip malformed lines
    }
  }
  return entries;
}

// ── Aggregate tokens by model ───────────────────────────────────────
function aggregateUsage(entries) {
  const byModel = {};
  let totalInput = 0;
  let totalOutput = 0;
  let totalCacheRead = 0;
  let totalCacheCreate = 0;

  for (const entry of entries) {
    const usage = entry?.message?.usage;
    if (!usage) continue;

    // Detect model — check multiple possible locations
    const model =
      entry?.message?.model ||
      entry?.model ||
      entry?.metadata?.model ||
      "unknown";

    if (!byModel[model]) {
      byModel[model] = {
        input_tokens: 0,
        output_tokens: 0,
        cache_read_input_tokens: 0,
        cache_creation_input_tokens: 0,
      };
    }

    const inp = usage.input_tokens || 0;
    const out = usage.output_tokens || 0;
    const cr = usage.cache_read_input_tokens || 0;
    const cc = usage.cache_creation_input_tokens || 0;

    byModel[model].input_tokens += inp;
    byModel[model].output_tokens += out;
    byModel[model].cache_read_input_tokens += cr;
    byModel[model].cache_creation_input_tokens += cc;

    totalInput += inp;
    totalOutput += out;
    totalCacheRead += cr;
    totalCacheCreate += cc;
  }

  return { byModel, totalInput, totalOutput, totalCacheRead, totalCacheCreate };
}

// ── Calculate cost ──────────────────────────────────────────────────
function calculateCost(byModel) {
  let total = 0;
  const breakdown = {};

  for (const [model, tokens] of Object.entries(byModel)) {
    // Find pricing — try exact match, then prefix match, then default
    const pricing =
      PRICING[model] ||
      Object.entries(PRICING).find(([k]) => model.startsWith(k.split("-").slice(0, -1).join("-")))?.[1] ||
      DEFAULT_PRICING;

    const cost =
      (tokens.input_tokens / 1_000_000) * pricing.input +
      (tokens.output_tokens / 1_000_000) * pricing.output +
      (tokens.cache_read_input_tokens / 1_000_000) * pricing.cache_read +
      (tokens.cache_creation_input_tokens / 1_000_000) * pricing.cache_create;

    breakdown[model] = cost;
    total += cost;
  }

  return { total, breakdown };
}

// ── Format numbers ──────────────────────────────────────────────────
function fmtTokens(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return String(n);
}

function fmtCost(n) {
  return "$" + n.toFixed(4);
}

// ── Load or initialize tracking data ────────────────────────────────
function loadTrackingData(dataPath) {
  if (existsSync(dataPath)) {
    try {
      return JSON.parse(readFileSync(dataPath, "utf8"));
    } catch {
      // corrupted file — start fresh but back up
      const backup = dataPath + ".bak." + Date.now();
      try {
        writeFileSync(backup, readFileSync(dataPath, "utf8"));
      } catch { /* ignore */ }
    }
  }
  return {
    project: process.env.CLAUDE_PROJECT_DIR || "unknown",
    created: new Date().toISOString(),
    sessions: [],
    totals: {
      input_tokens: 0,
      output_tokens: 0,
      cache_read_input_tokens: 0,
      cache_creation_input_tokens: 0,
      estimated_cost: 0,
      session_count: 0,
    },
  };
}

// ── Generate USAGE.md ───────────────────────────────────────────────
function generateMarkdown(data) {
  const t = data.totals;
  const totalTokens = t.input_tokens + t.output_tokens + t.cache_read_input_tokens + t.cache_creation_input_tokens;

  let md = `# Claude Usage Tracker\n\n`;
  md += `> Auto-updated by Claude Code stop hook\n\n`;

  // ── Totals
  md += `## Totals\n\n`;
  md += `| Metric | Value |\n|--------|-------|\n`;
  md += `| Sessions | ${t.session_count} |\n`;
  md += `| Total tokens | ${fmtTokens(totalTokens)} |\n`;
  md += `| Input tokens | ${fmtTokens(t.input_tokens)} |\n`;
  md += `| Output tokens | ${fmtTokens(t.output_tokens)} |\n`;
  md += `| Cache read | ${fmtTokens(t.cache_read_input_tokens)} |\n`;
  md += `| Cache create | ${fmtTokens(t.cache_creation_input_tokens)} |\n`;
  md += `| Estimated cost | ${fmtCost(t.estimated_cost)} |\n\n`;

  // ── Daily summary
  const dailyMap = {};
  for (const s of data.sessions) {
    const day = s.timestamp.slice(0, 10);
    if (!dailyMap[day]) dailyMap[day] = { sessions: 0, tokens: 0, cost: 0 };
    dailyMap[day].sessions++;
    dailyMap[day].tokens += s.total_tokens;
    dailyMap[day].cost += s.estimated_cost;
  }

  const days = Object.entries(dailyMap).sort((a, b) => b[0].localeCompare(a[0]));
  if (days.length > 0) {
    md += `## Daily Summary\n\n`;
    md += `| Date | Sessions | Tokens | Cost |\n|------|----------|--------|------|\n`;
    for (const [day, d] of days) {
      md += `| ${day} | ${d.sessions} | ${fmtTokens(d.tokens)} | ${fmtCost(d.cost)} |\n`;
    }
    md += `\n`;
  }

  // ── Recent sessions (last 20)
  const recent = data.sessions.slice(-20).reverse();
  if (recent.length > 0) {
    md += `## Recent Sessions\n\n`;
    md += `| Time | Model(s) | In | Out | Cache | Cost |\n|------|----------|----|-----|-------|------|\n`;
    for (const s of recent) {
      const time = s.timestamp.slice(0, 16).replace("T", " ");
      const models = Object.keys(s.by_model || {}).map(m => {
        const parts = m.split("-");
        return parts.length >= 2 ? parts.slice(0, 2).join("-") : m;
      }).join(", ");
      md += `| ${time} | ${models} | ${fmtTokens(s.input_tokens)} | ${fmtTokens(s.output_tokens)} | ${fmtTokens(s.cache_read + s.cache_create)} | ${fmtCost(s.estimated_cost)} |\n`;
    }
    md += `\n`;
  }

  md += `---\n*Last updated: ${new Date().toISOString().slice(0, 19).replace("T", " ")} UTC*\n`;
  return md;
}

// ── Main ────────────────────────────────────────────────────────────
function main() {
  const input = readStdin();
  if (!input) process.exit(0);

  // Prevent infinite loops if stop hook triggers another stop
  if (input.stop_hook_active) process.exit(0);

  const transcriptPath = input.transcript_path;
  if (!transcriptPath) process.exit(0);

  const projectDir = input.cwd || process.env.CLAUDE_PROJECT_DIR || ".";
  const trackingDir = join(projectDir, ".claude", "usage");
  const dataPath = join(trackingDir, "usage-data.json");
  const mdPath = join(projectDir, "USAGE.md");

  // Parse transcript
  const entries = parseTranscript(transcriptPath);
  if (entries.length === 0) process.exit(0);

  const { byModel, totalInput, totalOutput, totalCacheRead, totalCacheCreate } =
    aggregateUsage(entries);

  // Skip if no usage data found in this session
  const totalTokens = totalInput + totalOutput + totalCacheRead + totalCacheCreate;
  if (totalTokens === 0) process.exit(0);

  const cost = calculateCost(byModel);

  // Build session record
  const sessionRecord = {
    session_id: input.session_id || "unknown",
    timestamp: new Date().toISOString(),
    input_tokens: totalInput,
    output_tokens: totalOutput,
    cache_read: totalCacheRead,
    cache_create: totalCacheCreate,
    total_tokens: totalTokens,
    estimated_cost: cost.total,
    by_model: byModel,
  };

  // Load existing data and append
  mkdirSync(trackingDir, { recursive: true });
  const data = loadTrackingData(dataPath);

  // Deduplicate — don't re-record the same session
  if (data.sessions.some((s) => s.session_id === sessionRecord.session_id)) {
    // Update in place (session grew since last stop)
    const idx = data.sessions.findIndex((s) => s.session_id === sessionRecord.session_id);
    const old = data.sessions[idx];
    data.sessions[idx] = sessionRecord;

    // Adjust totals (subtract old, add new)
    data.totals.input_tokens += sessionRecord.input_tokens - old.input_tokens;
    data.totals.output_tokens += sessionRecord.output_tokens - old.output_tokens;
    data.totals.cache_read_input_tokens += sessionRecord.cache_read - old.cache_read;
    data.totals.cache_creation_input_tokens += sessionRecord.cache_create - old.cache_create;
    data.totals.estimated_cost += sessionRecord.estimated_cost - old.estimated_cost;
  } else {
    data.sessions.push(sessionRecord);
    data.totals.input_tokens += totalInput;
    data.totals.output_tokens += totalOutput;
    data.totals.cache_read_input_tokens += totalCacheRead;
    data.totals.cache_creation_input_tokens += totalCacheCreate;
    data.totals.estimated_cost += cost.total;
    data.totals.session_count++;
  }

  // Write data + markdown
  writeFileSync(dataPath, JSON.stringify(data, null, 2));
  writeFileSync(mdPath, generateMarkdown(data));

  // Output to Claude (optional status message)
  const out = {
    continue: false,
    suppressOutput: true,
  };
  console.log(JSON.stringify(out));
}

main();

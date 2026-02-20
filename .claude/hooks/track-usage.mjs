#!/usr/bin/env node

/**
 * Usage Tracker — Stop Hook (Claude Code + Cursor)
 *
 * Fires after each agent response. Reads the session JSONL transcript,
 * aggregates token usage by model, estimates cost, and appends a summary
 * to USAGE.md in the project root. Deduplicates by session/conversation ID
 * so the same conversation is never counted twice (update-in-place).
 *
 * Claude: add to .claude/settings.local.json under hooks.Stop
 * Cursor: add to .cursor/hooks.json under hooks.stop
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { spawnSync } from "child_process";

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

// ── Read hook input from stdin (cross-platform: Node fd 0) ───────────
function readStdin() {
  try {
    const raw = readFileSync(0, "utf8");
    return raw ? JSON.parse(raw) : null;
  } catch {
    process.exit(0); // silent fail — don't block agent
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

// ── Mermaid charts (usage over time) ────────────────────────────────
const MAX_CHART_POINTS = 15;

function formatSessionLabel(session) {
  const ts = session.timestamp;
  if (!ts) return "?";
  const d = new Date(ts);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${mm}-${dd} ${hh}:${min}`;
}

function buildTokenChart(sessions) {
  if (sessions.length === 0) {
    return "No session data yet.";
  }
  if (sessions.length === 1) {
    return "One data point so far. More sessions will show a trend.";
  }
  const labels = sessions.map((s) => formatSessionLabel(s));
  const input = sessions.map((s) => s.input_tokens ?? 0);
  const output = sessions.map((s) => s.output_tokens ?? 0);
  const maxVal = Math.max(...input, ...output, 1);
  const yMax = Math.ceil(maxVal * 1.1);
  return [
    "```mermaid",
    "xychart-beta",
    '    title "Token usage over time"',
    `    x-axis [${labels.map((l) => `"${l}"`).join(", ")}]`,
    `    y-axis "Tokens" 0 --> ${yMax}`,
    `    line "Input" [${input.join(", ")}]`,
    `    line "Output" [${output.join(", ")}]`,
    "```",
  ].join("\n");
}

function buildCostChart(sessions) {
  if (sessions.length === 0) {
    return "No session data yet.";
  }
  if (sessions.length === 1) {
    return "One data point so far. More sessions will show a trend.";
  }
  const labels = sessions.map((s) => formatSessionLabel(s));
  const cost = sessions.map((s) => (s.estimated_cost ?? 0));
  let cumulative = 0;
  const cumulativeArr = cost.map((c) => {
    cumulative += c;
    return Math.round(cumulative * 100) / 100;
  });
  const maxCost = Math.max(...cost, ...cumulativeArr, 0.01);
  const yMax = Math.ceil(maxCost * 1.2 * 100) / 100;
  return [
    "```mermaid",
    "xychart-beta",
    '    title "Cost over time (USD)"',
    `    x-axis [${labels.map((l) => `"${l}"`).join(", ")}]`,
    `    y-axis "Cost (USD)" 0 --> ${yMax}`,
    `    line "Cost" [${cost.join(", ")}]`,
    `    line "Cumulative" [${cumulativeArr.join(", ")}]`,
    "```",
  ].join("\n");
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

  let md = `# Usage Tracker\n\n`;
  md += `> Auto-updated by Claude Code / Cursor stop hook\n\n`;

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

  // ── Usage over time (Mermaid charts)
  md += `## Usage over time\n\n`;
  if (data.sessions.length === 0) {
    md += `No session data yet.\n\n`;
  } else {
    const slice = data.sessions.slice(-MAX_CHART_POINTS);
    md += buildTokenChart(slice) + "\n\n";
    md += buildCostChart(slice) + "\n\n";
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

function detectUsageSource(raw) {
  if (raw?.conversation_id) {
    return "cursor";
  }
  if (raw?.session_id) {
    return "claude";
  }
  return "unknown";
}

function getMcpCostPerCall() {
  const parsed = Number(process.env.AI_USAGE_MCP_COST_PER_CALL_USD ?? "0.0005");
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return parsed;
}

function aggregateMcpToolUsage(entries) {
  const byTool = {};
  let toolCallCount = 0;

  for (const entry of entries) {
    const directTool = entry?.tool_name;
    if (typeof directTool === "string" && directTool) {
      byTool[directTool] = (byTool[directTool] ?? 0) + 1;
      toolCallCount += 1;
    }

    const content = entry?.message?.content;
    if (!Array.isArray(content)) {
      continue;
    }
    for (const block of content) {
      if (block?.type !== "tool_use") {
        continue;
      }
      const toolName = typeof block?.name === "string" && block.name ? block.name : "unknown_tool";
      byTool[toolName] = (byTool[toolName] ?? 0) + 1;
      toolCallCount += 1;
    }
  }

  const costPerCall = getMcpCostPerCall();
  return {
    tool_call_count: toolCallCount,
    estimated_cost: toolCallCount * costPerCall,
    by_tool: byTool,
  };
}

function recordUnifiedEvent(projectDir, payload) {
  try {
    const result = spawnSync("bun", ["run", "scripts/record-usage-event.ts"], {
      cwd: projectDir,
      input: JSON.stringify(payload),
      encoding: "utf8",
      timeout: 30000,
    });
    return result.status === 0;
  } catch {
    return false;
  }
}

// ── Normalize hook payload (Claude vs Cursor) ─────────────────────────
function normalizeInput(raw) {
  if (!raw) return null;
  // Cursor: conversation_id, workspace_roots; Claude: session_id, cwd
  const sessionId = raw.session_id ?? raw.conversation_id ?? "unknown";
  const projectDir =
    raw.cwd ??
    (Array.isArray(raw.workspace_roots) && raw.workspace_roots[0]
      ? raw.workspace_roots[0]
      : process.env.CLAUDE_PROJECT_DIR || process.cwd());
  return {
    transcript_path: raw.transcript_path,
    session_id: sessionId,
    cwd: projectDir,
    stop_hook_active: raw.stop_hook_active,
    source: detectUsageSource(raw),
  };
}

// ── Main ────────────────────────────────────────────────────────────
function main() {
  const raw = readStdin();
  const input = normalizeInput(raw);
  if (!input) process.exit(0);

  // Prevent infinite loops if stop hook triggers another stop
  if (input.stop_hook_active) process.exit(0);

  const transcriptPath = input.transcript_path;
  if (!transcriptPath) process.exit(0);

  const projectDir = input.cwd;
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
  const mcpUsage = aggregateMcpToolUsage(entries);
  const timestamp = new Date().toISOString();

  // Build session record (one per conversation; dedup by session_id below)
  const sessionRecord = {
    session_id: input.session_id,
    timestamp,
    source: input.source,
    input_tokens: totalInput,
    output_tokens: totalOutput,
    cache_read: totalCacheRead,
    cache_create: totalCacheCreate,
    total_tokens: totalTokens,
    estimated_cost: cost.total,
    by_model: byModel,
    mcp_tool_calls: mcpUsage.tool_call_count,
    mcp_estimated_cost: mcpUsage.estimated_cost,
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

  // Write legacy data (kept for backwards compatibility)
  writeFileSync(dataPath, JSON.stringify(data, null, 2));

  const devRecorded = recordUnifiedEvent(projectDir, {
    event_type: "dev",
    source: input.source,
    session_id: input.session_id,
    timestamp,
    provider: "anthropic",
    model: Object.keys(byModel).join(","),
    input_tokens: totalInput,
    output_tokens: totalOutput,
    cache_read_tokens: totalCacheRead,
    cache_create_tokens: totalCacheCreate,
    estimated_cost: cost.total,
    estimation_method: "best_effort",
    request_count: 1,
    metadata: {
      hook_source: input.source,
      by_model_count: Object.keys(byModel).length,
    },
  });

  let mcpRecorded = true;
  if (mcpUsage.tool_call_count > 0) {
    mcpRecorded = recordUnifiedEvent(projectDir, {
      event_type: "mcp",
      source: input.source,
      session_id: input.session_id,
      tool_call_count: mcpUsage.tool_call_count,
      estimated_cost: mcpUsage.estimated_cost,
    });
  }

  // If unified recording fails, keep legacy report generation as fallback.
  if (!devRecorded || !mcpRecorded) {
    writeFileSync(mdPath, generateMarkdown(data));
  }

  // Output to Claude (optional status message)
  const out = {
    continue: false,
    suppressOutput: true,
  };
  console.log(JSON.stringify(out));
}

main();

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import {
  AI_USAGE_SOURCE_CLAUDE,
  AI_USAGE_SOURCE_CURSOR,
  AI_USAGE_SOURCE_MCP,
  AI_USAGE_SOURCE_RUNTIME_PROXY,
  AI_USAGE_SOURCE_SCRIPT,
  AI_USAGE_SOURCE_UNKNOWN,
  type IAIUsageEvent,
  type IAIUsageEstimationMethod,
  type IAIUsageLedger,
  type IAIUsageSource,
  buildUsageTimeSeries,
  createEmptyUsageLedger,
  reduceUsageRollup,
  sortUsageEventsByTimestamp,
  upsertUsageEvent,
} from '../src/modules/ai/usageLedger';

const UNIFIED_USAGE_DIR = join(process.cwd(), '.claude', 'usage');
const UNIFIED_USAGE_PATH = join(UNIFIED_USAGE_DIR, 'unified-usage-data.json');
const USAGE_MD_PATH = join(process.cwd(), 'USAGE.md');
const MAX_CHART_POINTS = 15;

/** Line colors readable on both white and dark: blue, orange, purple, violet, dark gray. No teal/light blue. */
const CHART_COLOR_1 = '#0066CC';
const CHART_COLOR_2 = '#E67E22';
const CHART_COLOR_3 = '#6A1B9A';
const CHART_COLOR_4 = '#7D3C98';
const CHART_COLOR_5 = '#455A64';
const XYCHART_PALETTE = `${CHART_COLOR_1},${CHART_COLOR_2},${CHART_COLOR_3},${CHART_COLOR_4},${CHART_COLOR_5}`;
const MERMAID_INIT = `%%{init: {'theme': 'base', 'themeVariables': {'background': '#000000', 'xyChart': {'plotColorPalette': '${XYCHART_PALETTE}'}}}}%%`;

interface IExtractedUsage {
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_create_tokens: number;
  total_tokens: number;
}

interface IRecordRuntimeProxyUsageParams {
  response_body: string;
  status_code: number;
  path_suffix: string;
  provider_base_url: string;
  model?: string;
}

interface IRecordScriptUsageParams {
  script_name: string;
  mode: string;
  response_body: string;
  target_url: string;
  model?: string;
}

interface IRecordDevUsageEventParams {
  source: IAIUsageSource;
  session_id: string;
  timestamp: string;
  provider?: string;
  model?: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_create_tokens: number;
  estimated_cost: number;
  estimation_method: IAIUsageEstimationMethod;
  request_count: number;
  metadata?: Record<string, string | number | boolean>;
}

interface IFirestoreRuntimeSinkConfig {
  project_id: string;
  api_key: string;
  collection: string;
  bearer_token: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readJson(path: string): unknown {
  const raw = readFileSync(path, 'utf8');
  return JSON.parse(raw) as unknown;
}

function loadUnifiedUsageLedger(): IAIUsageLedger {
  if (!existsSync(UNIFIED_USAGE_PATH)) {
    return createEmptyUsageLedger(process.cwd());
  }
  try {
    const parsed = readJson(UNIFIED_USAGE_PATH);
    if (!isRecord(parsed)) {
      return createEmptyUsageLedger(process.cwd());
    }
    const project = typeof parsed.project === 'string' ? parsed.project : process.cwd();
    const created = typeof parsed.created === 'string' ? parsed.created : new Date().toISOString();
    const eventsValue = parsed.events;
    const events = Array.isArray(eventsValue) ? eventsValue.filter((entry): entry is IAIUsageEvent => isUsageEvent(entry)) : [];
    return {
      project,
      created,
      events,
    };
  } catch {
    return createEmptyUsageLedger(process.cwd());
  }
}

function isUsageEvent(value: unknown): value is IAIUsageEvent {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.event_id === 'string' &&
    typeof value.source === 'string' &&
    typeof value.timestamp === 'string' &&
    typeof value.input_tokens === 'number' &&
    typeof value.output_tokens === 'number' &&
    typeof value.cache_read_tokens === 'number' &&
    typeof value.cache_create_tokens === 'number' &&
    typeof value.total_tokens === 'number' &&
    typeof value.estimated_cost === 'number' &&
    typeof value.request_count === 'number' &&
    typeof value.estimation_method === 'string'
  );
}

function saveUnifiedUsageLedger(ledger: IAIUsageLedger): void {
  mkdirSync(UNIFIED_USAGE_DIR, { recursive: true });
  writeFileSync(UNIFIED_USAGE_PATH, JSON.stringify(ledger, null, 2), 'utf8');
}

function fmtTokens(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}k`;
  }
  return String(Math.round(value));
}

function fmtCost(value: number): string {
  return `$${value.toFixed(4)}`;
}

function sourceLabel(source: IAIUsageSource): string {
  if (source === AI_USAGE_SOURCE_CLAUDE) {
    return 'Claude';
  }
  if (source === AI_USAGE_SOURCE_CURSOR) {
    return 'Cursor';
  }
  if (source === AI_USAGE_SOURCE_RUNTIME_PROXY) {
    return 'Runtime proxy';
  }
  if (source === AI_USAGE_SOURCE_SCRIPT) {
    return 'Scripts';
  }
  if (source === AI_USAGE_SOURCE_MCP) {
    return 'MCP tools';
  }
  return 'Unknown';
}

function collectDailySummary(events: IAIUsageEvent[]): Array<{ day: string; events: number; tokens: number; cost: number }> {
  const dayMap: Record<string, { events: number; tokens: number; cost: number }> = {};
  for (const event of events) {
    const day = event.timestamp.slice(0, 10);
    if (!dayMap[day]) {
      dayMap[day] = { events: 0, tokens: 0, cost: 0 };
    }
    dayMap[day].events += 1;
    dayMap[day].tokens += event.total_tokens;
    dayMap[day].cost += event.estimated_cost;
  }
  return Object.entries(dayMap)
    .map(([day, value]) => ({ day, events: value.events, tokens: value.tokens, cost: value.cost }))
    .sort((left, right) => right.day.localeCompare(left.day));
}

function computeYAxisMax(values: number[], minimum: number): number {
  if (values.length === 0) {
    return minimum;
  }
  const maxValue = Math.max(...values, minimum);
  if (maxValue <= 1) {
    return Math.ceil(maxValue * 100) / 100;
  }
  return Math.ceil(maxValue * 1.1);
}

function chartNoteToken(): string {
  return [
    `- **First line (blue):** Input — tokens sent to the model (prompt + cache).`,
    `- **Second line (orange):** Output — tokens generated by the model.`,
    '',
    'Same time axis; scales can differ.',
  ].join('\n');
}

function buildTokenChart(events: IAIUsageEvent[]): string {
  const series = buildUsageTimeSeries(events, MAX_CHART_POINTS);
  if (series.labels.length < 2) {
    return 'Not enough data points yet for a token trend chart.';
  }
  const yAxisMax = computeYAxisMax([...series.input_tokens, ...series.output_tokens], 10);
  return [
    '```mermaid',
    MERMAID_INIT,
    'xychart-beta',
    '    title "Token usage over time (all sources)"',
    `    x-axis [${series.labels.map((label) => `"${label}"`).join(', ')}]`,
    `    y-axis "Tokens" 0 --> ${yAxisMax}`,
    `    line "Input" [${series.input_tokens.join(', ')}]`,
    `    line "Output" [${series.output_tokens.join(', ')}]`,
    '```',
  ].join('\n');
}

function chartNoteCost(): string {
  return [
    `- **First line (blue):** Cost — USD per event (spikes).`,
    `- **Second line (orange):** Cumulative — running total USD over time (staircase).`,
  ].join('\n');
}

function buildCostChart(events: IAIUsageEvent[]): string {
  const series = buildUsageTimeSeries(events, MAX_CHART_POINTS);
  if (series.labels.length < 2) {
    return 'Not enough data points yet for a cost trend chart.';
  }
  const yAxisMax = computeYAxisMax([...series.estimated_cost, ...series.cumulative_cost], 0.01);
  return [
    '```mermaid',
    MERMAID_INIT,
    'xychart-beta',
    '    title "Cost over time (all sources, USD)"',
    `    x-axis [${series.labels.map((label) => `"${label}"`).join(', ')}]`,
    `    y-axis "USD" 0 --> ${yAxisMax}`,
    `    line "Cost" [${series.estimated_cost.join(', ')}]`,
    `    line "Cumulative" [${series.cumulative_cost.join(', ')}]`,
    '```',
  ].join('\n');
}

function chartNoteCostBySource(): string {
  return [
    '*Which line is which (order in chart):*',
    `- **1st (blue):** Claude — Claude Code usage.`,
    `- **2nd (orange):** Cursor — Cursor IDE usage.`,
    `- **3rd (purple):** Runtime proxy — app AI proxy.`,
    `- **4th (violet):** Scripts — script-invoked calls.`,
    `- **5th (dark gray):** MCP — MCP tool usage.`,
    '',
    'Each line = USD cost at that time; zeros = no spend from that source then.',
  ].join('\n');
}

function buildCostBySourceChart(events: IAIUsageEvent[]): string {
  const series = buildUsageTimeSeries(events, MAX_CHART_POINTS);
  if (series.labels.length < 2) {
    return 'Not enough data points yet for per-source cost trends.';
  }
  const yAxisMax = computeYAxisMax(
    [
      ...series.cost_by_source[AI_USAGE_SOURCE_CLAUDE],
      ...series.cost_by_source[AI_USAGE_SOURCE_CURSOR],
      ...series.cost_by_source[AI_USAGE_SOURCE_RUNTIME_PROXY],
      ...series.cost_by_source[AI_USAGE_SOURCE_SCRIPT],
      ...series.cost_by_source[AI_USAGE_SOURCE_MCP],
      ...series.cost_by_source[AI_USAGE_SOURCE_UNKNOWN],
    ],
    0.01
  );
  return [
    '```mermaid',
    MERMAID_INIT,
    'xychart-beta',
    '    title "Cost by source over time (USD)"',
    `    x-axis [${series.labels.map((label) => `"${label}"`).join(', ')}]`,
    `    y-axis "USD" 0 --> ${yAxisMax}`,
    `    line "Claude" [${series.cost_by_source[AI_USAGE_SOURCE_CLAUDE].join(', ')}]`,
    `    line "Cursor" [${series.cost_by_source[AI_USAGE_SOURCE_CURSOR].join(', ')}]`,
    `    line "Runtime proxy" [${series.cost_by_source[AI_USAGE_SOURCE_RUNTIME_PROXY].join(', ')}]`,
    `    line "Scripts" [${series.cost_by_source[AI_USAGE_SOURCE_SCRIPT].join(', ')}]`,
    `    line "MCP" [${series.cost_by_source[AI_USAGE_SOURCE_MCP].join(', ')}]`,
    '```',
  ].join('\n');
}

function estimationSummaryBySource(events: IAIUsageEvent[]): Record<
  IAIUsageSource,
  { exact: number; best_effort: number; unavailable: number }
> {
  const summary: Record<IAIUsageSource, { exact: number; best_effort: number; unavailable: number }> = {
    [AI_USAGE_SOURCE_CLAUDE]: { exact: 0, best_effort: 0, unavailable: 0 },
    [AI_USAGE_SOURCE_CURSOR]: { exact: 0, best_effort: 0, unavailable: 0 },
    [AI_USAGE_SOURCE_RUNTIME_PROXY]: { exact: 0, best_effort: 0, unavailable: 0 },
    [AI_USAGE_SOURCE_SCRIPT]: { exact: 0, best_effort: 0, unavailable: 0 },
    [AI_USAGE_SOURCE_MCP]: { exact: 0, best_effort: 0, unavailable: 0 },
    [AI_USAGE_SOURCE_UNKNOWN]: { exact: 0, best_effort: 0, unavailable: 0 },
  };
  for (const event of events) {
    const sourceSummary = summary[event.source] ?? summary[AI_USAGE_SOURCE_UNKNOWN];
    if (event.estimation_method === 'exact') {
      sourceSummary.exact += 1;
    } else if (event.estimation_method === 'best_effort') {
      sourceSummary.best_effort += 1;
    } else {
      sourceSummary.unavailable += 1;
    }
  }
  return summary;
}

const ESTIMATION_SOURCES: IAIUsageSource[] = [
  AI_USAGE_SOURCE_CLAUDE,
  AI_USAGE_SOURCE_CURSOR,
  AI_USAGE_SOURCE_RUNTIME_PROXY,
  AI_USAGE_SOURCE_SCRIPT,
  AI_USAGE_SOURCE_MCP,
  AI_USAGE_SOURCE_UNKNOWN,
];

function estimationTotals(estimationSummary: Record<
  IAIUsageSource,
  { exact: number; best_effort: number; unavailable: number }
>): { exact: number; best_effort: number; unavailable: number } {
  const out = { exact: 0, best_effort: 0, unavailable: 0 };
  for (const source of ESTIMATION_SOURCES) {
    const s = estimationSummary[source];
    out.exact += s.exact;
    out.best_effort += s.best_effort;
    out.unavailable += s.unavailable;
  }
  return out;
}

/** True if events use more than one estimation method (exact / best_effort / unavailable). */
function hasMixedEstimationMethods(estimationSummary: Record<
  IAIUsageSource,
  { exact: number; best_effort: number; unavailable: number }
>): boolean {
  const t = estimationTotals(estimationSummary);
  const methodsWithCount = [t.exact, t.best_effort, t.unavailable].filter((n) => n > 0).length;
  return methodsWithCount > 1;
}

function estimationQualitySingleSentence(estimationSummary: Record<
  IAIUsageSource,
  { exact: number; best_effort: number; unavailable: number }
>): string {
  const { exact, best_effort: bestEffort, unavailable } = estimationTotals(estimationSummary);
  if (exact > 0 && bestEffort === 0 && unavailable === 0) {
    return 'Cost estimation: all events use **exact** provider pricing.';
  }
  if (bestEffort > 0 && exact === 0 && unavailable === 0) {
    return 'Cost estimation: all events use **approximate** pricing (no provider-exact data).';
  }
  if (unavailable > 0 && exact === 0 && bestEffort === 0) {
    return 'Cost estimation: no cost data available for any event.';
  }
  return '';
}

export function generateUnifiedUsageMarkdown(ledger: IAIUsageLedger): string {
  const orderedEvents = sortUsageEventsByTimestamp(ledger.events);
  const rollup = reduceUsageRollup(orderedEvents);
  const dailySummary = collectDailySummary(orderedEvents);
  const estimationSummary = estimationSummaryBySource(orderedEvents);
  const recentEvents = [...orderedEvents].slice(-20).reverse();

  let markdown = '# Unified AI Usage Tracker\n\n';
  markdown += '> Auto-updated cumulative usage from Claude, Cursor, runtime proxy, scripts, and MCP signals.\n\n';

  markdown += '## Grand Total\n\n';
  markdown += '| Metric | Value |\n|--------|-------|\n';
  markdown += `| Events | ${rollup.grand_total.event_count} |\n`;
  markdown += `| Requests | ${rollup.grand_total.request_count} |\n`;
  markdown += `| Total tokens | ${fmtTokens(rollup.grand_total.total_tokens)} |\n`;
  markdown += `| Input tokens | ${fmtTokens(rollup.grand_total.input_tokens)} |\n`;
  markdown += `| Output tokens | ${fmtTokens(rollup.grand_total.output_tokens)} |\n`;
  markdown += `| Cache read | ${fmtTokens(rollup.grand_total.cache_read_tokens)} |\n`;
  markdown += `| Cache create | ${fmtTokens(rollup.grand_total.cache_create_tokens)} |\n`;
  markdown += `| Estimated cost | ${fmtCost(rollup.grand_total.estimated_cost)} |\n\n`;

  markdown += '## Segmented Totals by Source\n\n';
  markdown += '| Source | Events | Requests | Total tokens | Input | Output | Cost |\n';
  markdown += '|--------|--------|----------|--------------|-------|--------|------|\n';
  const sources: IAIUsageSource[] = [
    AI_USAGE_SOURCE_CLAUDE,
    AI_USAGE_SOURCE_CURSOR,
    AI_USAGE_SOURCE_RUNTIME_PROXY,
    AI_USAGE_SOURCE_SCRIPT,
    AI_USAGE_SOURCE_MCP,
    AI_USAGE_SOURCE_UNKNOWN,
  ];
  for (const source of sources) {
    const sourceTotals = rollup.by_source[source];
    if (sourceTotals.event_count === 0) {
      continue;
    }
    markdown += `| ${sourceLabel(source)} | ${sourceTotals.event_count} | ${sourceTotals.request_count} | ${fmtTokens(sourceTotals.total_tokens)} | ${fmtTokens(sourceTotals.input_tokens)} | ${fmtTokens(sourceTotals.output_tokens)} | ${fmtCost(sourceTotals.estimated_cost)} |\n`;
  }
  markdown += '\n';

  markdown += '## Estimation Quality\n\n';
  if (hasMixedEstimationMethods(estimationSummary)) {
    markdown += '| Source | Exact | Best effort | Unavailable |\n';
    markdown += '|--------|-------|-------------|-------------|\n';
    for (const source of sources) {
      const sourceSummary = estimationSummary[source];
      if (sourceSummary.exact + sourceSummary.best_effort + sourceSummary.unavailable === 0) {
        continue;
      }
      markdown += `| ${sourceLabel(source)} | ${sourceSummary.exact} | ${sourceSummary.best_effort} | ${sourceSummary.unavailable} |\n`;
    }
  } else {
    const sentence = estimationQualitySingleSentence(estimationSummary);
    markdown += sentence ? `${sentence}\n` : 'No cost-estimation data.\n';
  }
  markdown += '\n';

  markdown += '## Daily Summary\n\n';
  markdown += '| Date | Events | Tokens | Cost |\n';
  markdown += '|------|--------|--------|------|\n';
  for (const day of dailySummary) {
    markdown += `| ${day.day} | ${day.events} | ${fmtTokens(day.tokens)} | ${fmtCost(day.cost)} |\n`;
  }
  markdown += '\n';

  markdown += '## Usage over time\n\n';
  markdown += `${buildTokenChart(orderedEvents)}\n\n${chartNoteToken()}\n\n`;
  markdown += `${buildCostChart(orderedEvents)}\n\n${chartNoteCost()}\n\n`;
  markdown += `${buildCostBySourceChart(orderedEvents)}\n\n${chartNoteCostBySource()}\n\n`;

  markdown += '## Recent Events\n\n';
  markdown +=
    'Events from **all sources**: **Source** = where the call came from (Claude Code, Cursor IDE, MCP tools, **runtime proxy**, scripts). **Runtime proxy** = in-app AI (local or deployed) — when the app sends requests through this project\'s AI proxy, those show up here and are also sent to Langfuse. **Provider** / **Model** = API or model when known. **Method** = how cost was derived: `exact`, `best_effort` (approximate), or `unavailable`.\n\n';
  markdown += '| Time | Source | Provider | Model | In | Out | Cost | Method |\n';
  markdown += '|------|--------|----------|-------|----|-----|------|--------|\n';
  for (const event of recentEvents) {
    const time = event.timestamp.slice(0, 16).replace('T', ' ');
    markdown += `| ${time} | ${sourceLabel(event.source)} | ${event.provider ?? '-'} | ${event.model ?? '-'} | ${fmtTokens(event.input_tokens)} | ${fmtTokens(event.output_tokens)} | ${fmtCost(event.estimated_cost)} | ${event.estimation_method} |\n`;
  }
  markdown += '\n';
  markdown += `---\n*Last updated: ${new Date().toISOString().slice(0, 19).replace('T', ' ')} UTC*\n`;
  return markdown;
}

/** Rebuild USAGE.md. Pass ledger to avoid reloading from disk (e.g. after a batch persist). */
export function rebuildUnifiedUsageReport(ledger?: IAIUsageLedger): void {
  const resolved = ledger ?? loadUnifiedUsageLedger();
  const markdown = generateUnifiedUsageMarkdown(resolved);
  writeFileSync(USAGE_MD_PATH, markdown, 'utf8');
}

function persistEventLocally(event: IAIUsageEvent): void {
  const ledger = loadUnifiedUsageLedger();
  ledger.events = upsertUsageEvent(ledger.events, event);
  saveUnifiedUsageLedger(ledger);
}

/** Persist multiple events with one load and one save; returns updated ledger for optional rebuild. */
function persistEventsLocally(events: IAIUsageEvent[]): IAIUsageLedger {
  if (events.length === 0) {
    return loadUnifiedUsageLedger();
  }
  let ledger = loadUnifiedUsageLedger();
  for (const event of events) {
    ledger.events = upsertUsageEvent(ledger.events, event);
  }
  saveUnifiedUsageLedger(ledger);
  return ledger;
}

function getRuntimeSinkConfig(env: NodeJS.ProcessEnv = process.env): IFirestoreRuntimeSinkConfig | null {
  const projectId = (env.AI_USAGE_FIREBASE_PROJECT_ID ?? '').trim();
  const apiKey = (env.AI_USAGE_FIREBASE_API_KEY ?? '').trim();
  if (!projectId || !apiKey) {
    return null;
  }
  return {
    project_id: projectId,
    api_key: apiKey,
    collection: (env.AI_USAGE_FIREBASE_COLLECTION ?? 'ai_usage_events').trim(),
    bearer_token: (env.AI_USAGE_FIREBASE_BEARER_TOKEN ?? '').trim(),
  };
}

function firestoreStringField(value: string): Record<string, string> {
  return { stringValue: value };
}

function firestoreNumberField(value: number): Record<string, string> {
  return { doubleValue: String(value) };
}

function toFirestoreDocument(event: IAIUsageEvent): { fields: Record<string, Record<string, string>> } {
  return {
    fields: {
      event_id: firestoreStringField(event.event_id),
      source: firestoreStringField(event.source),
      timestamp: { timestampValue: event.timestamp },
      session_id: firestoreStringField(event.session_id ?? ''),
      provider: firestoreStringField(event.provider ?? ''),
      model: firestoreStringField(event.model ?? ''),
      input_tokens: firestoreNumberField(event.input_tokens),
      output_tokens: firestoreNumberField(event.output_tokens),
      cache_read_tokens: firestoreNumberField(event.cache_read_tokens),
      cache_create_tokens: firestoreNumberField(event.cache_create_tokens),
      total_tokens: firestoreNumberField(event.total_tokens),
      estimated_cost: firestoreNumberField(event.estimated_cost),
      request_count: firestoreNumberField(event.request_count),
      estimation_method: firestoreStringField(event.estimation_method),
      metadata_json: firestoreStringField(JSON.stringify(event.metadata ?? {})),
    },
  };
}

async function persistEventToFirestore(event: IAIUsageEvent, config: IFirestoreRuntimeSinkConfig): Promise<void> {
  const url = `https://firestore.googleapis.com/v1/projects/${config.project_id}/databases/(default)/documents/${config.collection}?key=${config.api_key}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (config.bearer_token) {
    headers.Authorization = `Bearer ${config.bearer_token}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(toFirestoreDocument(event)),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Firestore usage sink failed (${response.status}): ${body.slice(0, 300)}`);
  }
}

export function extractUsageFromResponseBody(responseBody: string): IExtractedUsage | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(responseBody);
  } catch {
    return null;
  }
  if (!isRecord(parsed)) {
    return null;
  }
  const usageValue = parsed.usage;
  if (!isRecord(usageValue)) {
    return null;
  }
  const inputTokens = pickNumber(usageValue, ['input_tokens', 'prompt_tokens']);
  const outputTokens = pickNumber(usageValue, ['output_tokens', 'completion_tokens']);
  const cacheReadTokens = pickNumber(usageValue, ['cache_read_input_tokens']);
  const cacheCreateTokens = pickNumber(usageValue, ['cache_creation_input_tokens']);
  const explicitTotalTokens = pickNumber(usageValue, ['total_tokens']);
  const computedTotalTokens = inputTokens + outputTokens + cacheReadTokens + cacheCreateTokens;
  return {
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cache_read_tokens: cacheReadTokens,
    cache_create_tokens: cacheCreateTokens,
    total_tokens: explicitTotalTokens || computedTotalTokens,
  };
}

function pickNumber(record: Record<string, unknown>, keys: string[]): number {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      return value;
    }
  }
  return 0;
}

function inferProviderFromBaseUrl(baseUrl: string): string {
  const lower = baseUrl.toLowerCase();
  if (lower.includes('groq')) {
    return 'groq';
  }
  if (lower.includes('generativelanguage') || lower.includes('googleapis')) {
    return 'gemini';
  }
  return 'unknown';
}

interface IProviderPricing {
  input: number;
  output: number;
  cache_read: number;
  cache_create: number;
}

function getProviderPricing(provider: string, env: NodeJS.ProcessEnv = process.env): IProviderPricing {
  if (provider === 'groq') {
    return {
      input: parseRate(env.AI_USAGE_PRICE_GROQ_INPUT_PER_1M, 0.59),
      output: parseRate(env.AI_USAGE_PRICE_GROQ_OUTPUT_PER_1M, 0.79),
      cache_read: parseRate(env.AI_USAGE_PRICE_GROQ_CACHE_READ_PER_1M, 0),
      cache_create: parseRate(env.AI_USAGE_PRICE_GROQ_CACHE_CREATE_PER_1M, 0),
    };
  }
  if (provider === 'gemini') {
    return {
      input: parseRate(env.AI_USAGE_PRICE_GEMINI_INPUT_PER_1M, 0),
      output: parseRate(env.AI_USAGE_PRICE_GEMINI_OUTPUT_PER_1M, 0),
      cache_read: parseRate(env.AI_USAGE_PRICE_GEMINI_CACHE_READ_PER_1M, 0),
      cache_create: parseRate(env.AI_USAGE_PRICE_GEMINI_CACHE_CREATE_PER_1M, 0),
    };
  }
  return {
    input: parseRate(env.AI_USAGE_PRICE_DEFAULT_INPUT_PER_1M, 0),
    output: parseRate(env.AI_USAGE_PRICE_DEFAULT_OUTPUT_PER_1M, 0),
    cache_read: parseRate(env.AI_USAGE_PRICE_DEFAULT_CACHE_READ_PER_1M, 0),
    cache_create: parseRate(env.AI_USAGE_PRICE_DEFAULT_CACHE_CREATE_PER_1M, 0),
  };
}

function parseRate(rawValue: string | undefined, fallback: number): number {
  const parsed = Number(rawValue ?? '');
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
}

function estimateCostForProvider(
  provider: string,
  usage: IExtractedUsage | null
): { estimated_cost: number; estimation_method: IAIUsageEstimationMethod } {
  if (!usage || usage.total_tokens === 0) {
    return { estimated_cost: 0, estimation_method: 'unavailable' };
  }
  const pricing = getProviderPricing(provider);
  const hasAnyPrice = pricing.input > 0 || pricing.output > 0 || pricing.cache_read > 0 || pricing.cache_create > 0;
  if (!hasAnyPrice) {
    return { estimated_cost: 0, estimation_method: 'unavailable' };
  }

  const estimatedCost =
    (usage.input_tokens / 1_000_000) * pricing.input +
    (usage.output_tokens / 1_000_000) * pricing.output +
    (usage.cache_read_tokens / 1_000_000) * pricing.cache_read +
    (usage.cache_create_tokens / 1_000_000) * pricing.cache_create;

  return {
    estimated_cost: estimatedCost,
    estimation_method: 'best_effort',
  };
}

function createUsageEventId(prefix: string): string {
  return `${prefix}:${randomUUID()}`;
}

function createUsageEventBase(
  source: IAIUsageSource,
  eventId?: string,
  timestamp?: string
): Pick<IAIUsageEvent, 'event_id' | 'source' | 'timestamp'> {
  return {
    event_id: eventId ?? createUsageEventId(source),
    source,
    timestamp: timestamp ?? new Date().toISOString(),
  };
}

const REBUILD_DEBOUNCE_MS = 2000;
let rebuildDebounceTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleDebouncedRebuild(): void {
  if (rebuildDebounceTimer !== null) {
    clearTimeout(rebuildDebounceTimer);
  }
  rebuildDebounceTimer = setTimeout(() => {
    rebuildDebounceTimer = null;
    rebuildUnifiedUsageReport();
  }, REBUILD_DEBOUNCE_MS);
}

export async function recordRuntimeProxyUsage(params: IRecordRuntimeProxyUsageParams): Promise<void> {
  const usage = extractUsageFromResponseBody(params.response_body);
  const provider = inferProviderFromBaseUrl(params.provider_base_url);
  const estimate = estimateCostForProvider(provider, usage);

  const event: IAIUsageEvent = {
    ...createUsageEventBase(AI_USAGE_SOURCE_RUNTIME_PROXY),
    provider,
    model: params.model,
    input_tokens: usage?.input_tokens ?? 0,
    output_tokens: usage?.output_tokens ?? 0,
    cache_read_tokens: usage?.cache_read_tokens ?? 0,
    cache_create_tokens: usage?.cache_create_tokens ?? 0,
    total_tokens: usage?.total_tokens ?? 0,
    estimated_cost: estimate.estimated_cost,
    request_count: 1,
    estimation_method: estimate.estimation_method,
    metadata: {
      path_suffix: params.path_suffix,
      status_code: params.status_code,
    },
  };

  const runtimeSink = getRuntimeSinkConfig();
  if (runtimeSink) {
    try {
      await persistEventToFirestore(event, runtimeSink);
    } catch {
      // If remote persistence fails, we still keep the local fallback ledger.
    }
  }
  persistEventLocally(event);
  scheduleDebouncedRebuild();
}

function inferProviderFromUrl(url: string): string {
  const lower = url.toLowerCase();
  if (lower.includes('groq')) {
    return 'groq';
  }
  if (lower.includes('googleapis') || lower.includes('generativelanguage')) {
    return 'gemini';
  }
  if (lower.includes('/api/ai/')) {
    return 'proxy';
  }
  return 'unknown';
}

export function recordScriptUsage(params: IRecordScriptUsageParams): void {
  const usage = extractUsageFromResponseBody(params.response_body);
  const provider = inferProviderFromUrl(params.target_url);
  const estimate = estimateCostForProvider(provider, usage);
  const event: IAIUsageEvent = {
    ...createUsageEventBase(AI_USAGE_SOURCE_SCRIPT),
    provider,
    model: params.model,
    input_tokens: usage?.input_tokens ?? 0,
    output_tokens: usage?.output_tokens ?? 0,
    cache_read_tokens: usage?.cache_read_tokens ?? 0,
    cache_create_tokens: usage?.cache_create_tokens ?? 0,
    total_tokens: usage?.total_tokens ?? 0,
    estimated_cost: estimate.estimated_cost,
    request_count: 1,
    estimation_method: estimate.estimation_method,
    metadata: {
      script_name: params.script_name,
      mode: params.mode,
      target_url: params.target_url,
    },
  };
  persistEventLocally(event);
  rebuildUnifiedUsageReport();
}

export function recordDevUsageEvent(params: IRecordDevUsageEventParams): void {
  const totalTokens = params.input_tokens + params.output_tokens + params.cache_read_tokens + params.cache_create_tokens;
  const eventId = `dev:${params.source}:${params.session_id}`;
  const event: IAIUsageEvent = {
    ...createUsageEventBase(params.source, eventId, params.timestamp),
    session_id: params.session_id,
    provider: params.provider,
    model: params.model,
    input_tokens: params.input_tokens,
    output_tokens: params.output_tokens,
    cache_read_tokens: params.cache_read_tokens,
    cache_create_tokens: params.cache_create_tokens,
    total_tokens: totalTokens,
    estimated_cost: params.estimated_cost,
    request_count: params.request_count,
    estimation_method: params.estimation_method,
    metadata: params.metadata,
  };
  persistEventLocally(event);
  rebuildUnifiedUsageReport();
}

export function recordMcpUsageEvent(
  source: IAIUsageSource,
  sessionId: string,
  toolCallCount: number,
  estimatedCost: number
): void {
  if (toolCallCount <= 0) {
    return;
  }
  const eventId = `mcp:${source}:${sessionId}`;
  const event: IAIUsageEvent = {
    ...createUsageEventBase(AI_USAGE_SOURCE_MCP, eventId),
    session_id: sessionId,
    provider: source,
    model: 'mcp-tooling',
    input_tokens: 0,
    output_tokens: 0,
    cache_read_tokens: 0,
    cache_create_tokens: 0,
    total_tokens: 0,
    estimated_cost: estimatedCost,
    request_count: toolCallCount,
    estimation_method: 'best_effort',
    metadata: {
      origin_source: source,
      tool_call_count: toolCallCount,
    },
  };
  persistEventLocally(event);
  rebuildUnifiedUsageReport();
}

export function inferDevUsageSource(payload: { conversation_id?: string; session_id?: string }): IAIUsageSource {
  if (payload.conversation_id) {
    return AI_USAGE_SOURCE_CURSOR;
  }
  if (payload.session_id) {
    return AI_USAGE_SOURCE_CLAUDE;
  }
  return AI_USAGE_SOURCE_UNKNOWN;
}

export interface IRecordMcpPayload {
  source: IAIUsageSource;
  session_id: string;
  tool_call_count: number;
  estimated_cost: number;
}

/**
 * Record one or both of dev and MCP in a single batch: one ledger load, one save, one report rebuild.
 * Use from the stop-hook script when both dev and MCP events are available.
 */
export function recordUsageEventBatch(
  devPayload: IRecordDevUsageEventParams | null,
  mcpPayload: IRecordMcpPayload | null
): void {
  const events: IAIUsageEvent[] = [];

  if (devPayload) {
    const totalTokens =
      devPayload.input_tokens +
      devPayload.output_tokens +
      devPayload.cache_read_tokens +
      devPayload.cache_create_tokens;
    const eventId = `dev:${devPayload.source}:${devPayload.session_id}`;
    events.push({
      ...createUsageEventBase(devPayload.source, eventId, devPayload.timestamp),
      session_id: devPayload.session_id,
      provider: devPayload.provider,
      model: devPayload.model,
      input_tokens: devPayload.input_tokens,
      output_tokens: devPayload.output_tokens,
      cache_read_tokens: devPayload.cache_read_tokens,
      cache_create_tokens: devPayload.cache_create_tokens,
      total_tokens: totalTokens,
      estimated_cost: devPayload.estimated_cost,
      request_count: devPayload.request_count,
      estimation_method: devPayload.estimation_method,
      metadata: devPayload.metadata,
    });
  }

  if (mcpPayload && mcpPayload.tool_call_count > 0) {
    const eventId = `mcp:${mcpPayload.source}:${mcpPayload.session_id}`;
    events.push({
      ...createUsageEventBase(AI_USAGE_SOURCE_MCP, eventId),
      session_id: mcpPayload.session_id,
      provider: mcpPayload.source,
      model: 'mcp-tooling',
      input_tokens: 0,
      output_tokens: 0,
      cache_read_tokens: 0,
      cache_create_tokens: 0,
      total_tokens: 0,
      estimated_cost: mcpPayload.estimated_cost,
      request_count: mcpPayload.tool_call_count,
      estimation_method: 'best_effort',
      metadata: {
        origin_source: mcpPayload.source,
        tool_call_count: mcpPayload.tool_call_count,
      },
    });
  }

  if (events.length === 0) {
    return;
  }
  const ledger = persistEventsLocally(events);
  rebuildUnifiedUsageReport(ledger);
}


export const AI_USAGE_SOURCE_CLAUDE = 'claude';
export const AI_USAGE_SOURCE_CURSOR = 'cursor';
export const AI_USAGE_SOURCE_RUNTIME_PROXY = 'runtime_proxy';
export const AI_USAGE_SOURCE_SCRIPT = 'script';
export const AI_USAGE_SOURCE_MCP = 'mcp';
export const AI_USAGE_SOURCE_UNKNOWN = 'unknown';

export const AI_USAGE_SOURCES = [
  AI_USAGE_SOURCE_CLAUDE,
  AI_USAGE_SOURCE_CURSOR,
  AI_USAGE_SOURCE_RUNTIME_PROXY,
  AI_USAGE_SOURCE_SCRIPT,
  AI_USAGE_SOURCE_MCP,
  AI_USAGE_SOURCE_UNKNOWN,
] as const;

export type IAIUsageSource = (typeof AI_USAGE_SOURCES)[number];
export type IAIUsageEstimationMethod = 'exact' | 'best_effort' | 'unavailable';

export interface IAIUsageMetadata {
  [key: string]: string | number | boolean;
}

export interface IAIUsageEvent {
  event_id: string;
  source: IAIUsageSource;
  timestamp: string;
  session_id?: string;
  provider?: string;
  model?: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_create_tokens: number;
  total_tokens: number;
  estimated_cost: number;
  request_count: number;
  estimation_method: IAIUsageEstimationMethod;
  metadata?: IAIUsageMetadata;
}

export interface IAIUsageTotals {
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_create_tokens: number;
  total_tokens: number;
  estimated_cost: number;
  request_count: number;
  event_count: number;
}

export interface IAIUsageLedger {
  project: string;
  created: string;
  events: IAIUsageEvent[];
}

export interface IAIUsageRollup {
  by_source: Record<IAIUsageSource, IAIUsageTotals>;
  grand_total: IAIUsageTotals;
}

export interface IAIUsageTimeSeries {
  labels: string[];
  input_tokens: number[];
  output_tokens: number[];
  estimated_cost: number[];
  cumulative_cost: number[];
  cost_by_source: Record<IAIUsageSource, number[]>;
}

export function createEmptyUsageTotals(): IAIUsageTotals {
  return {
    input_tokens: 0,
    output_tokens: 0,
    cache_read_tokens: 0,
    cache_create_tokens: 0,
    total_tokens: 0,
    estimated_cost: 0,
    request_count: 0,
    event_count: 0,
  };
}

export function createEmptyUsageLedger(project: string): IAIUsageLedger {
  return {
    project,
    created: new Date().toISOString(),
    events: [],
  };
}

export function sanitizeUsageNumber(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value < 0) {
    return 0;
  }
  return value;
}

export function normalizeUsageEvent(event: IAIUsageEvent): IAIUsageEvent {
  const inputTokens = sanitizeUsageNumber(event.input_tokens);
  const outputTokens = sanitizeUsageNumber(event.output_tokens);
  const cacheReadTokens = sanitizeUsageNumber(event.cache_read_tokens);
  const cacheCreateTokens = sanitizeUsageNumber(event.cache_create_tokens);
  const computedTotal = inputTokens + outputTokens + cacheReadTokens + cacheCreateTokens;
  const totalTokens = sanitizeUsageNumber(event.total_tokens) || computedTotal;
  return {
    ...event,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cache_read_tokens: cacheReadTokens,
    cache_create_tokens: cacheCreateTokens,
    total_tokens: totalTokens,
    estimated_cost: sanitizeUsageNumber(event.estimated_cost),
    request_count: sanitizeUsageNumber(event.request_count),
  };
}

function addEventToTotals(totals: IAIUsageTotals, event: IAIUsageEvent): void {
  totals.input_tokens += event.input_tokens;
  totals.output_tokens += event.output_tokens;
  totals.cache_read_tokens += event.cache_read_tokens;
  totals.cache_create_tokens += event.cache_create_tokens;
  totals.total_tokens += event.total_tokens;
  totals.estimated_cost += event.estimated_cost;
  totals.request_count += event.request_count;
  totals.event_count += 1;
}

export function upsertUsageEvent(events: IAIUsageEvent[], event: IAIUsageEvent): IAIUsageEvent[] {
  const normalizedEvent = normalizeUsageEvent(event);
  const nextEvents = [...events];
  const existingIndex = nextEvents.findIndex((entry) => entry.event_id === normalizedEvent.event_id);
  if (existingIndex === -1) {
    nextEvents.push(normalizedEvent);
  } else {
    nextEvents[existingIndex] = normalizedEvent;
  }
  return nextEvents;
}

export function sortUsageEventsByTimestamp(events: IAIUsageEvent[]): IAIUsageEvent[] {
  return [...events].sort((left, right) => {
    return left.timestamp.localeCompare(right.timestamp);
  });
}

function createEmptyBySourceTotals(): Record<IAIUsageSource, IAIUsageTotals> {
  return {
    [AI_USAGE_SOURCE_CLAUDE]: createEmptyUsageTotals(),
    [AI_USAGE_SOURCE_CURSOR]: createEmptyUsageTotals(),
    [AI_USAGE_SOURCE_RUNTIME_PROXY]: createEmptyUsageTotals(),
    [AI_USAGE_SOURCE_SCRIPT]: createEmptyUsageTotals(),
    [AI_USAGE_SOURCE_MCP]: createEmptyUsageTotals(),
    [AI_USAGE_SOURCE_UNKNOWN]: createEmptyUsageTotals(),
  };
}

export function reduceUsageRollup(events: IAIUsageEvent[]): IAIUsageRollup {
  const normalizedEvents = events.map((event) => normalizeUsageEvent(event));
  const bySource = createEmptyBySourceTotals();
  const grandTotal = createEmptyUsageTotals();

  for (const event of normalizedEvents) {
    const sourceTotals = bySource[event.source] ?? bySource[AI_USAGE_SOURCE_UNKNOWN];
    addEventToTotals(sourceTotals, event);
    addEventToTotals(grandTotal, event);
  }

  return {
    by_source: bySource,
    grand_total: grandTotal,
  };
}

function formatTimeSeriesLabel(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month}-${day} ${hours}:${minutes}`;
}

export function buildUsageTimeSeries(events: IAIUsageEvent[], maxPoints: number): IAIUsageTimeSeries {
  const normalizedEvents = sortUsageEventsByTimestamp(events).slice(-maxPoints).map((event) => normalizeUsageEvent(event));
  const labels: string[] = [];
  const inputTokens: number[] = [];
  const outputTokens: number[] = [];
  const estimatedCost: number[] = [];
  const cumulativeCost: number[] = [];
  const costBySource: Record<IAIUsageSource, number[]> = {
    [AI_USAGE_SOURCE_CLAUDE]: [],
    [AI_USAGE_SOURCE_CURSOR]: [],
    [AI_USAGE_SOURCE_RUNTIME_PROXY]: [],
    [AI_USAGE_SOURCE_SCRIPT]: [],
    [AI_USAGE_SOURCE_MCP]: [],
    [AI_USAGE_SOURCE_UNKNOWN]: [],
  };

  let runningCost = 0;
  for (const event of normalizedEvents) {
    labels.push(formatTimeSeriesLabel(event.timestamp));
    inputTokens.push(event.input_tokens);
    outputTokens.push(event.output_tokens);
    estimatedCost.push(event.estimated_cost);
    runningCost += event.estimated_cost;
    cumulativeCost.push(Math.round(runningCost * 10000) / 10000);

    costBySource[AI_USAGE_SOURCE_CLAUDE].push(event.source === AI_USAGE_SOURCE_CLAUDE ? event.estimated_cost : 0);
    costBySource[AI_USAGE_SOURCE_CURSOR].push(event.source === AI_USAGE_SOURCE_CURSOR ? event.estimated_cost : 0);
    costBySource[AI_USAGE_SOURCE_RUNTIME_PROXY].push(
      event.source === AI_USAGE_SOURCE_RUNTIME_PROXY ? event.estimated_cost : 0
    );
    costBySource[AI_USAGE_SOURCE_SCRIPT].push(event.source === AI_USAGE_SOURCE_SCRIPT ? event.estimated_cost : 0);
    costBySource[AI_USAGE_SOURCE_MCP].push(event.source === AI_USAGE_SOURCE_MCP ? event.estimated_cost : 0);
    costBySource[AI_USAGE_SOURCE_UNKNOWN].push(event.source === AI_USAGE_SOURCE_UNKNOWN ? event.estimated_cost : 0);
  }

  return {
    labels,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    estimated_cost: estimatedCost,
    cumulative_cost: cumulativeCost,
    cost_by_source: costBySource,
  };
}

import { recordDevUsageEvent, recordMcpUsageEvent } from '../server/ai-usage-tracker';
import {
  AI_USAGE_SOURCE_CLAUDE,
  AI_USAGE_SOURCE_CURSOR,
  AI_USAGE_SOURCE_RUNTIME_PROXY,
  AI_USAGE_SOURCE_SCRIPT,
  AI_USAGE_SOURCE_MCP,
  AI_USAGE_SOURCE_UNKNOWN,
  type IAIUsageSource,
} from '../src/modules/ai/usageLedger';

interface IRecordDevPayload {
  event_type: 'dev';
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
  estimation_method: 'exact' | 'best_effort' | 'unavailable';
  request_count: number;
  metadata?: Record<string, string | number | boolean>;
}

interface IRecordMcpPayload {
  event_type: 'mcp';
  source: IAIUsageSource;
  session_id: string;
  tool_call_count: number;
  estimated_cost: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isSource(value: unknown): value is IAIUsageSource {
  if (typeof value !== 'string') {
    return false;
  }
  return (
    value === AI_USAGE_SOURCE_CLAUDE ||
    value === AI_USAGE_SOURCE_CURSOR ||
    value === AI_USAGE_SOURCE_RUNTIME_PROXY ||
    value === AI_USAGE_SOURCE_SCRIPT ||
    value === AI_USAGE_SOURCE_MCP ||
    value === AI_USAGE_SOURCE_UNKNOWN
  );
}

function toNumber(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return 0;
  }
  return value;
}

function parseDevPayload(raw: Record<string, unknown>): IRecordDevPayload | null {
  if (raw.event_type !== 'dev') {
    return null;
  }
  if (
    !isSource(raw.source) ||
    typeof raw.session_id !== 'string' ||
    typeof raw.timestamp !== 'string'
  ) {
    return null;
  }
  const method = raw.estimation_method;
  if (method !== 'exact' && method !== 'best_effort' && method !== 'unavailable') {
    return null;
  }
  const metadataRaw = raw.metadata;
  const metadata: Record<string, string | number | boolean> = {};
  if (isRecord(metadataRaw)) {
    for (const [key, value] of Object.entries(metadataRaw)) {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        metadata[key] = value;
      }
    }
  }
  return {
    event_type: 'dev',
    source: raw.source,
    session_id: raw.session_id,
    timestamp: raw.timestamp,
    provider: typeof raw.provider === 'string' ? raw.provider : undefined,
    model: typeof raw.model === 'string' ? raw.model : undefined,
    input_tokens: toNumber(raw.input_tokens),
    output_tokens: toNumber(raw.output_tokens),
    cache_read_tokens: toNumber(raw.cache_read_tokens),
    cache_create_tokens: toNumber(raw.cache_create_tokens),
    estimated_cost: toNumber(raw.estimated_cost),
    estimation_method: method,
    request_count: toNumber(raw.request_count),
    metadata,
  };
}

function parseMcpPayload(raw: Record<string, unknown>): IRecordMcpPayload | null {
  if (raw.event_type !== 'mcp') {
    return null;
  }
  if (!isSource(raw.source) || typeof raw.session_id !== 'string') {
    return null;
  }
  return {
    event_type: 'mcp',
    source: raw.source,
    session_id: raw.session_id,
    tool_call_count: toNumber(raw.tool_call_count),
    estimated_cost: toNumber(raw.estimated_cost),
  };
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function main(): Promise<void> {
  const rawText = await readStdin();
  if (rawText.trim() === '') {
    return;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return;
  }
  if (!isRecord(parsed)) {
    return;
  }

  const devPayload = parseDevPayload(parsed);
  if (devPayload) {
    recordDevUsageEvent(devPayload);
    return;
  }

  const mcpPayload = parseMcpPayload(parsed);
  if (mcpPayload) {
    recordMcpUsageEvent(
      mcpPayload.source,
      mcpPayload.session_id,
      mcpPayload.tool_call_count,
      mcpPayload.estimated_cost
    );
  }
}

void main();

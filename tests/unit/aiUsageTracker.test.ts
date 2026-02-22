import { describe, expect, it } from 'vitest';
import { generateUnifiedUsageMarkdown, extractUsageFromResponseBody } from '../../server/ai-usage-tracker';
import { createEmptyUsageLedger, type IAIUsageLedger } from '@/modules/ai/usageLedger';

function buildLedger(): IAIUsageLedger {
  const ledger = createEmptyUsageLedger('project');
  ledger.events = [
    {
      event_id: 'dev:claude:s1',
      source: 'claude',
      timestamp: '2026-02-20T00:00:00.000Z',
      session_id: 's1',
      provider: 'anthropic',
      model: 'claude-opus',
      input_tokens: 1000,
      output_tokens: 400,
      cache_read_tokens: 0,
      cache_create_tokens: 0,
      total_tokens: 1400,
      estimated_cost: 0.12,
      request_count: 1,
      estimation_method: 'best_effort',
    },
    {
      event_id: 'script:test:1',
      source: 'script',
      timestamp: '2026-02-20T01:00:00.000Z',
      provider: 'groq',
      model: 'llama-3.3-70b-versatile',
      input_tokens: 120,
      output_tokens: 32,
      cache_read_tokens: 0,
      cache_create_tokens: 0,
      total_tokens: 152,
      estimated_cost: 0.0004,
      request_count: 1,
      estimation_method: 'best_effort',
    },
  ];
  return ledger;
}

describe('ai usage tracker', () => {
  it('extracts usage from OpenAI-compatible response body', () => {
    const usage = extractUsageFromResponseBody(
      JSON.stringify({
        usage: {
          prompt_tokens: 321,
          completion_tokens: 123,
          total_tokens: 444,
        },
      })
    );
    expect(usage).not.toBeNull();
    if (!usage) {
      return;
    }
    expect(usage.input_tokens).toBe(321);
    expect(usage.output_tokens).toBe(123);
    expect(usage.total_tokens).toBe(444);
  });

  it('renders unified markdown with segmented totals and charts', () => {
    const markdown = generateUnifiedUsageMarkdown(buildLedger());
    expect(markdown).toContain('# Unified AI Usage Tracker');
    expect(markdown).toContain('## Grand Total');
    expect(markdown).toContain('## Segmented Totals by Source');
    expect(markdown).toContain('## Usage over time');
    expect(markdown).toContain('```mermaid');
    expect(markdown).toContain('line "Input"');
    expect(markdown).toContain('line "Cost"');
  });

  it('shows Estimation Quality as one sentence when all events use same method', () => {
    const markdown = generateUnifiedUsageMarkdown(buildLedger());
    expect(markdown).toContain('## Estimation Quality');
    expect(markdown).toContain('Cost estimation: all events use **approximate** pricing');
    expect(markdown).not.toContain('| Source | Exact | Best effort | Unavailable |');
  });
});

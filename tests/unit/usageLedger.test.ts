import { describe, expect, it } from 'vitest';
import {
  AI_USAGE_SOURCE_CLAUDE,
  AI_USAGE_SOURCE_CURSOR,
  AI_USAGE_SOURCE_RUNTIME_PROXY,
  buildUsageTimeSeries,
  createEmptyUsageLedger,
  reduceUsageRollup,
  upsertUsageEvent,
  type IAIUsageEvent,
} from '@/modules/ai/usageLedger';

function makeEvent(overrides: Partial<IAIUsageEvent>): IAIUsageEvent {
  return {
    event_id: 'event-1',
    source: AI_USAGE_SOURCE_CLAUDE,
    timestamp: '2026-02-20T00:00:00.000Z',
    input_tokens: 100,
    output_tokens: 50,
    cache_read_tokens: 10,
    cache_create_tokens: 5,
    total_tokens: 165,
    estimated_cost: 0.01,
    request_count: 1,
    estimation_method: 'best_effort',
    ...overrides,
  };
}

describe('usageLedger', () => {
  it('upserts by event_id instead of duplicating', () => {
    const first = makeEvent({ event_id: 'dup-1', input_tokens: 100 });
    const updated = makeEvent({ event_id: 'dup-1', input_tokens: 500, total_tokens: 565 });
    const withFirst = upsertUsageEvent([], first);
    const withUpdated = upsertUsageEvent(withFirst, updated);
    expect(withUpdated).toHaveLength(1);
    const updatedEvent = withUpdated[0];
    expect(updatedEvent).toBeDefined();
    if (!updatedEvent) {
      return;
    }
    expect(updatedEvent.input_tokens).toBe(500);
    expect(updatedEvent.total_tokens).toBe(565);
  });

  it('reduces segmented and grand totals', () => {
    const events = [
      makeEvent({ event_id: 'a', source: AI_USAGE_SOURCE_CLAUDE, input_tokens: 100, output_tokens: 20, total_tokens: 120, estimated_cost: 0.01 }),
      makeEvent({
        event_id: 'b',
        source: AI_USAGE_SOURCE_CURSOR,
        input_tokens: 200,
        output_tokens: 30,
        total_tokens: 230,
        estimated_cost: 0.02,
      }),
      makeEvent({
        event_id: 'c',
        source: AI_USAGE_SOURCE_RUNTIME_PROXY,
        input_tokens: 10,
        output_tokens: 5,
        total_tokens: 15,
        estimated_cost: 0.003,
      }),
    ];

    const rollup = reduceUsageRollup(events);
    expect(rollup.by_source.claude.total_tokens).toBe(120);
    expect(rollup.by_source.cursor.total_tokens).toBe(230);
    expect(rollup.by_source.runtime_proxy.total_tokens).toBe(15);
    expect(rollup.grand_total.total_tokens).toBe(365);
    expect(rollup.grand_total.estimated_cost).toBeCloseTo(0.033);
    expect(rollup.grand_total.event_count).toBe(3);
  });

  it('builds time series with cumulative cost', () => {
    const ledger = createEmptyUsageLedger('project');
    ledger.events = [
      makeEvent({
        event_id: 'ts-1',
        timestamp: '2026-02-20T00:00:00.000Z',
        input_tokens: 100,
        output_tokens: 40,
        estimated_cost: 0.01,
      }),
      makeEvent({
        event_id: 'ts-2',
        timestamp: '2026-02-20T01:00:00.000Z',
        source: AI_USAGE_SOURCE_CURSOR,
        input_tokens: 200,
        output_tokens: 80,
        estimated_cost: 0.02,
      }),
    ];
    const series = buildUsageTimeSeries(ledger.events, 15);
    expect(series.labels).toHaveLength(2);
    expect(series.input_tokens).toEqual([100, 200]);
    expect(series.output_tokens).toEqual([40, 80]);
    expect(series.cumulative_cost).toEqual([0.01, 0.03]);
  });
});

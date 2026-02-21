import { describe, expect, it } from 'vitest';
import {
  AI_USAGE_SOURCE_CLAUDE,
  AI_USAGE_SOURCE_CURSOR,
  AI_USAGE_SOURCE_RUNTIME_PROXY,
  buildUsageTimeSeries,
  createEmptyUsageLedger,
  normalizeUsageEvent,
  reduceUsageRollup,
  sanitizeUsageNumber,
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

  it('sanitizeUsageNumber returns 0 for non-finite values (branch 96)', () => {
    expect(sanitizeUsageNumber(Number.NaN)).toBe(0);
    expect(sanitizeUsageNumber(Number.POSITIVE_INFINITY)).toBe(0);
    expect(sanitizeUsageNumber(Number.NEGATIVE_INFINITY)).toBe(0);
  });

  it('sanitizeUsageNumber returns 0 for negative values (branch 99-100)', () => {
    expect(sanitizeUsageNumber(-1)).toBe(0);
    expect(sanitizeUsageNumber(-0.5)).toBe(0);
  });

  it('sanitizeUsageNumber returns value for finite non-negative (branch 100)', () => {
    expect(sanitizeUsageNumber(0)).toBe(0);
    expect(sanitizeUsageNumber(10)).toBe(10);
    expect(sanitizeUsageNumber(0.5)).toBe(0.5);
  });

  it('normalizeUsageEvent sanitizes negative and NaN fields', () => {
    const event = makeEvent({
      input_tokens: -10,
      output_tokens: Number.NaN,
      estimated_cost: 100,
    });
    const out = normalizeUsageEvent(event);
    expect(out.input_tokens).toBe(0);
    expect(out.output_tokens).toBe(0);
    expect(out.estimated_cost).toBe(100);
  });

  it('buildUsageTimeSeries uses raw timestamp as label when date is invalid (branch 188)', () => {
    const events = [
      makeEvent({
        event_id: 'bad-ts',
        timestamp: 'not-a-valid-date',
        input_tokens: 10,
        output_tokens: 5,
        estimated_cost: 0.001,
      }),
    ];
    const series = buildUsageTimeSeries(events, 10);
    expect(series.labels).toHaveLength(1);
    expect(series.labels[0]).toBe('not-a-valid-date');
  });
});

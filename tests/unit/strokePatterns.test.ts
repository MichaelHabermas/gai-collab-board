import { describe, expect, it } from 'vitest';
import { getStrokeDash } from '@/lib/strokePatterns';

describe('getStrokeDash', () => {
  it('returns undefined for solid', () => {
    expect(getStrokeDash('solid')).toBeUndefined();
  });

  it('returns undefined for undefined (defaults to solid)', () => {
    expect(getStrokeDash(undefined)).toBeUndefined();
  });

  it('returns [8, 8] for dashed', () => {
    expect(getStrokeDash('dashed')).toEqual([8, 8]);
  });

  it('returns [2, 4] for dotted', () => {
    expect(getStrokeDash('dotted')).toEqual([2, 4]);
  });
});

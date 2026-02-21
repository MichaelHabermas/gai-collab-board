import { describe, it, expect } from 'vitest';
import { cn, generateId } from '@/lib/utils';

describe('utils', () => {
  describe('cn', () => {
    it('merges class names', () => {
      expect(cn('foo', 'bar')).toBe('foo bar');
    });

    it('handles conditional classes', () => {
      expect(cn('base', false && 'hidden', 'visible')).toBe('base visible');
    });

    it('merges tailwind conflicts', () => {
      expect(cn('p-4', 'p-2')).toBe('p-2');
    });
  });

  describe('generateId', () => {
    it('generates a string of default length 21', () => {
      const id = generateId();
      expect(id).toHaveLength(21);
    });

    it('generates a string of specified length', () => {
      const id = generateId(10);
      expect(id).toHaveLength(10);
    });

    it('generates unique IDs', () => {
      const ids = new Set(Array.from({ length: 100 }, () => generateId()));
      expect(ids.size).toBe(100);
    });

    it('only contains alphanumeric characters', () => {
      const id = generateId(100);
      expect(id).toMatch(/^[0-9a-z]+$/);
    });
  });
});

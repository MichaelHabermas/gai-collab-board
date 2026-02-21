import { describe, it, expect } from 'vitest';
import { validateCommand } from '@/modules/ai/commandValidator';

describe('validateCommand', () => {
  describe('top-level validation', () => {
    it('rejects non-object input', () => {
      const result = validateCommand('not-an-object');

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toContain('Command must be an object');
      }
    });

    it('rejects null input', () => {
      const result = validateCommand(null);

      expect(result.valid).toBe(false);
    });

    it('rejects array input', () => {
      const result = validateCommand([]);

      expect(result.valid).toBe(false);
    });

    it('rejects missing action', () => {
      const result = validateCommand({ payload: {} });

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors[0]).toMatch(/action must be one of/);
      }
    });

    it('rejects invalid action', () => {
      const result = validateCommand({ action: 'PATCH', payload: {} });

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors[0]).toMatch(/action must be one of/);
      }
    });

    it('rejects missing payload', () => {
      const result = validateCommand({ action: 'CREATE' });

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors[0]).toMatch(/payload/);
      }
    });

    it('rejects non-object payload', () => {
      const result = validateCommand({ action: 'CREATE', payload: 'bad' });

      expect(result.valid).toBe(false);
    });
  });

  describe('CREATE validation', () => {
    const validCreate = {
      action: 'CREATE',
      payload: {
        type: 'sticky',
        x: 100,
        y: 200,
        width: 200,
        height: 120,
        fill: '#fef08a',
      },
    };

    it('accepts a valid CREATE command', () => {
      const result = validateCommand(validCreate);

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.command.action).toBe('CREATE');
      }
    });

    it('accepts CREATE with optional fields', () => {
      const result = validateCommand({
        action: 'CREATE',
        payload: {
          ...validCreate.payload,
          text: 'Hello',
          opacity: 0.8,
          stroke: '#000',
        },
      });

      expect(result.valid).toBe(true);
    });

    it('rejects invalid shape type', () => {
      const result = validateCommand({
        action: 'CREATE',
        payload: { ...validCreate.payload, type: 'invalid' },
      });

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors[0]).toMatch(/type must be one of/);
      }
    });

    it('rejects missing x', () => {
      const { x: _, ...payloadWithoutX } = validCreate.payload;
      const result = validateCommand({ action: 'CREATE', payload: payloadWithoutX });

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toEqual(expect.arrayContaining([expect.stringMatching(/x must be/)]));
      }
    });

    it('rejects non-numeric width', () => {
      const result = validateCommand({
        action: 'CREATE',
        payload: { ...validCreate.payload, width: 'big' },
      });

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toEqual(
          expect.arrayContaining([expect.stringMatching(/width must be/)])
        );
      }
    });

    it('rejects missing fill', () => {
      const { fill: _, ...payloadWithoutFill } = validCreate.payload;
      const result = validateCommand({ action: 'CREATE', payload: payloadWithoutFill });

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toEqual(
          expect.arrayContaining([expect.stringMatching(/fill must be/)])
        );
      }
    });

    it('collects multiple errors at once', () => {
      const result = validateCommand({
        action: 'CREATE',
        payload: { type: 'bad', x: 'a', y: 'b' },
      });

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.length).toBeGreaterThan(1);
      }
    });

    it('accepts all valid shape types', () => {
      const types = ['sticky', 'rectangle', 'circle', 'line', 'text', 'frame', 'connector'];
      for (const type of types) {
        const result = validateCommand({
          action: 'CREATE',
          payload: { ...validCreate.payload, type },
        });

        expect(result.valid).toBe(true);
      }
    });

    it('rejects NaN for numeric fields', () => {
      const result = validateCommand({
        action: 'CREATE',
        payload: { ...validCreate.payload, x: NaN },
      });

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors).toEqual(expect.arrayContaining([expect.stringMatching(/x must be/)]));
      }
    });
  });

  describe('UPDATE validation', () => {
    it('accepts a valid UPDATE command', () => {
      const result = validateCommand({
        action: 'UPDATE',
        payload: { objectId: 'obj-1', updates: { x: 50 } },
      });

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.command.action).toBe('UPDATE');
      }
    });

    it('rejects missing objectId', () => {
      const result = validateCommand({
        action: 'UPDATE',
        payload: { updates: { x: 50 } },
      });

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors[0]).toMatch(/objectId/);
      }
    });

    it('rejects empty objectId', () => {
      const result = validateCommand({
        action: 'UPDATE',
        payload: { objectId: '', updates: { x: 50 } },
      });

      expect(result.valid).toBe(false);
    });

    it('rejects missing updates', () => {
      const result = validateCommand({
        action: 'UPDATE',
        payload: { objectId: 'obj-1' },
      });

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors[0]).toMatch(/updates/);
      }
    });

    it('rejects empty updates object', () => {
      const result = validateCommand({
        action: 'UPDATE',
        payload: { objectId: 'obj-1', updates: {} },
      });

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors[0]).toMatch(/must not be empty/);
      }
    });
  });

  describe('DELETE validation', () => {
    it('accepts a valid DELETE command', () => {
      const result = validateCommand({
        action: 'DELETE',
        payload: { objectId: 'obj-1' },
      });

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.command.action).toBe('DELETE');
      }
    });

    it('rejects missing objectId', () => {
      const result = validateCommand({
        action: 'DELETE',
        payload: {},
      });

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors[0]).toMatch(/objectId/);
      }
    });

    it('rejects empty objectId', () => {
      const result = validateCommand({
        action: 'DELETE',
        payload: { objectId: '' },
      });

      expect(result.valid).toBe(false);
    });
  });
});

import { describe, it, expect } from 'vitest';
import type Konva from 'konva';
import {
  isBoardObject,
  isBoard,
  isKonvaGroup,
  isKonvaRect,
  isKonvaEllipse,
  isKonvaLine,
  isKonvaText,
} from '@/types/guards';

function createKonvaNode(getClassName: () => string): Konva.Node {
  return { getClassName } as Konva.Node;
}

describe('guards', () => {
  describe('isBoardObject', () => {
    it('returns true for valid board object', () => {
      expect(isBoardObject({ id: 'x', type: 'sticky' })).toBe(true);
    });

    it('returns false for null', () => {
      expect(isBoardObject(null)).toBe(false);
    });

    it('returns false for non-object', () => {
      expect(isBoardObject(1)).toBe(false);
      expect(isBoardObject('str')).toBe(false);
      expect(isBoardObject(undefined)).toBe(false);
    });

    it('returns false for object missing id or type', () => {
      expect(isBoardObject({ type: 'sticky' })).toBe(false);
      expect(isBoardObject({ id: 'x' })).toBe(false);
      expect(isBoardObject({})).toBe(false);
    });
  });

  describe('isBoard', () => {
    it('returns true for valid board', () => {
      expect(isBoard({ id: 'b1', name: 'Board', ownerId: 'u1' })).toBe(true);
    });

    it('returns false for null', () => {
      expect(isBoard(null)).toBe(false);
    });

    it('returns false for non-object', () => {
      expect(isBoard(0)).toBe(false);
      expect(isBoard(true)).toBe(false);
    });

    it('returns false for object missing id, name, or ownerId', () => {
      expect(isBoard({ name: 'Board', ownerId: 'u1' })).toBe(false);
      expect(isBoard({ id: 'b1', ownerId: 'u1' })).toBe(false);
      expect(isBoard({ id: 'b1', name: 'Board' })).toBe(false);
    });
  });

  describe('isKonvaGroup', () => {
    it('returns true when getClassName is Group', () => {
      const node = createKonvaNode(() => 'Group');
      expect(isKonvaGroup(node)).toBe(true);
    });

    it('returns false for null', () => {
      expect(isKonvaGroup(null as unknown as Konva.Node)).toBe(false);
    });

    it('returns false for non-object', () => {
      const notNode = 1 as unknown as Konva.Node;
      expect(isKonvaGroup(notNode)).toBe(false);
    });

    it('returns false for wrong shape', () => {
      const node = createKonvaNode(() => 'Rect');
      expect(isKonvaGroup(node)).toBe(false);
    });
  });

  describe('isKonvaRect', () => {
    it('returns true when getClassName is Rect', () => {
      const node = createKonvaNode(() => 'Rect');
      expect(isKonvaRect(node)).toBe(true);
    });

    it('returns false for null', () => {
      expect(isKonvaRect(null as unknown as Konva.Node)).toBe(false);
    });

    it('returns false for non-object', () => {
      expect(isKonvaRect(undefined as unknown as Konva.Node)).toBe(false);
    });

    it('returns false for wrong shape', () => {
      const node = createKonvaNode(() => 'Ellipse');
      expect(isKonvaRect(node)).toBe(false);
    });
  });

  describe('isKonvaEllipse', () => {
    it('returns true when getClassName is Ellipse', () => {
      const node = createKonvaNode(() => 'Ellipse');
      expect(isKonvaEllipse(node)).toBe(true);
    });

    it('returns false for null', () => {
      expect(isKonvaEllipse(null as unknown as Konva.Node)).toBe(false);
    });

    it('returns false for non-object', () => {
      expect(isKonvaEllipse('x' as unknown as Konva.Node)).toBe(false);
    });

    it('returns false for wrong shape', () => {
      const node = createKonvaNode(() => 'Text');
      expect(isKonvaEllipse(node)).toBe(false);
    });
  });

  describe('isKonvaLine', () => {
    it('returns true when getClassName is Line', () => {
      const node = createKonvaNode(() => 'Line');
      expect(isKonvaLine(node)).toBe(true);
    });

    it('returns true when getClassName is Arrow', () => {
      const node = createKonvaNode(() => 'Arrow');
      expect(isKonvaLine(node)).toBe(true);
    });

    it('returns false for null', () => {
      expect(isKonvaLine(null as unknown as Konva.Node)).toBe(false);
    });

    it('returns false for non-object', () => {
      expect(isKonvaLine(1 as unknown as Konva.Node)).toBe(false);
    });

    it('returns false for wrong shape', () => {
      const node = createKonvaNode(() => 'Rect');
      expect(isKonvaLine(node)).toBe(false);
    });
  });

  describe('isKonvaText', () => {
    it('returns true when getClassName is Text', () => {
      const node = createKonvaNode(() => 'Text');
      expect(isKonvaText(node)).toBe(true);
    });

    it('returns false for null', () => {
      expect(isKonvaText(null as unknown as Konva.Node)).toBe(false);
    });

    it('returns false for non-object', () => {
      expect(isKonvaText(undefined as unknown as Konva.Node)).toBe(false);
    });

    it('returns false for wrong shape', () => {
      const node = createKonvaNode(() => 'Group');
      expect(isKonvaText(node)).toBe(false);
    });
  });
});

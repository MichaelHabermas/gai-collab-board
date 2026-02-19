import { describe, it, expect } from 'vitest';
import {
  snapToGrid,
  snapPositionToGrid,
  snapSizeToGrid,
  snapResizeRectToGrid,
  applySnapPositionToNode,
  type IDragSnapNode,
  type IDragSnapObject,
} from '@/lib/snapToGrid';

describe('snapToGrid', () => {
  const gridSize = 20;

  describe('snapToGrid', () => {
    it('rounds to nearest multiple of grid size', () => {
      expect(snapToGrid(0, gridSize)).toBe(0);
      expect(snapToGrid(10, gridSize)).toBe(20);
      expect(snapToGrid(15, gridSize)).toBe(20);
      expect(snapToGrid(25, gridSize)).toBe(20);
      expect(snapToGrid(30, gridSize)).toBe(40);
      expect(snapToGrid(-5, gridSize)).toEqual(0);
      expect(snapToGrid(-15, gridSize)).toBe(-20);
    });
  });

  describe('snapPositionToGrid', () => {
    it('snaps x and y to grid', () => {
      expect(snapPositionToGrid(12, 18, gridSize)).toEqual({ x: 20, y: 20 });
      expect(snapPositionToGrid(0, 0, gridSize)).toEqual({ x: 0, y: 0 });
      expect(snapPositionToGrid(100, 55, gridSize)).toEqual({ x: 100, y: 60 });
    });
  });

  describe('snapSizeToGrid', () => {
    it('snaps width and height to grid with minimum one grid unit', () => {
      expect(snapSizeToGrid(50, 30, gridSize)).toEqual({ width: 60, height: 40 });
      expect(snapSizeToGrid(20, 20, gridSize)).toEqual({ width: 20, height: 20 });
      expect(snapSizeToGrid(5, 5, gridSize)).toEqual({ width: 20, height: 20 });
    });
  });

  describe('snapResizeRectToGrid', () => {
    it('snaps right edge while keeping left edge fixed', () => {
      const result = snapResizeRectToGrid(
        { x: 20, y: 20, width: 80, height: 80 },
        { x: 20, y: 20, width: 93, height: 80 },
        gridSize
      );
      expect(result).toEqual({ x: 20, y: 20, width: 100, height: 80 });
    });

    it('snaps left edge while keeping right edge fixed', () => {
      const result = snapResizeRectToGrid(
        { x: 20, y: 20, width: 80, height: 80 },
        { x: 7, y: 20, width: 93, height: 80 },
        gridSize
      );
      expect(result).toEqual({ x: 0, y: 20, width: 100, height: 80 });
    });

    it('snaps bottom edge while keeping top edge fixed', () => {
      const result = snapResizeRectToGrid(
        { x: 20, y: 20, width: 80, height: 80 },
        { x: 20, y: 20, width: 80, height: 91 },
        gridSize
      );
      expect(result).toEqual({ x: 20, y: 20, width: 80, height: 100 });
    });
  });

  describe('applySnapPositionToNode', () => {
    function createMockNode(
      id: string,
      className: string,
      x: number,
      y: number
    ): IDragSnapNode & { positionCalls: { x: number; y: number }[] } {
      const positionCalls: { x: number; y: number }[] = [];
      return {
        id: () => id,
        getClassName: () => className,
        x: () => x,
        y: () => y,
        position(pos) {
          positionCalls.push({ x: pos.x, y: pos.y });
        },
        positionCalls,
      };
    }

    it('sets rect-like node position to snapped topLeft', () => {
      const node = createMockNode('rect-1', 'Rect', 13, 17);
      const objectsById = new Map<string, IDragSnapObject>([
        ['rect-1', { width: 100, height: 50 }],
      ]);
      applySnapPositionToNode(node, objectsById, gridSize);
      expect(node.positionCalls).toHaveLength(1);
      expect(node.positionCalls[0]).toEqual({ x: 20, y: 20 });
    });

    it('sets ellipse-like node position to snapped topLeft plus half size', () => {
      const node = createMockNode('circle-1', 'Ellipse', 60, 60);
      const objectsById = new Map<string, IDragSnapObject>([
        ['circle-1', { width: 40, height: 40 }],
      ]);
      applySnapPositionToNode(node, objectsById, gridSize);
      expect(node.positionCalls).toHaveLength(1);
      expect(node.positionCalls[0]).toEqual({ x: 60, y: 60 });
    });

    it('does not set position when object is missing and does not throw', () => {
      const node = createMockNode('missing-1', 'Rect', 10, 10);
      const objectsById = new Map<string, IDragSnapObject>([]);
      applySnapPositionToNode(node, objectsById, gridSize);
      expect(node.positionCalls).toHaveLength(0);
    });
  });
});

import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useVisibleShapes } from '@/hooks/useVisibleShapes';
import type { IBoardObject } from '@/types';
import type { IViewportState } from '@/types';

const createViewport = (overrides: Partial<IViewportState> = {}): IViewportState => ({
  position: { x: 0, y: 0 },
  scale: { x: 1, y: 1 },
  width: 1000,
  height: 800,
  ...overrides,
});

const createObject = (overrides: Partial<IBoardObject>): IBoardObject => ({
  id: overrides.id ?? 'obj-default',
  type: overrides.type ?? 'sticky',
  x: overrides.x ?? 0,
  y: overrides.y ?? 0,
  width: overrides.width ?? 100,
  height: overrides.height ?? 100,
  rotation: overrides.rotation ?? 0,
  fill: overrides.fill ?? '#fef08a',
  createdBy: overrides.createdBy ?? 'tester',
  createdAt: overrides.createdAt ?? ({ toMillis: () => 0 } as IBoardObject['createdAt']),
  updatedAt: overrides.updatedAt ?? ({ toMillis: () => 0 } as IBoardObject['updatedAt']),
  points: overrides.points,
  stroke: overrides.stroke,
  strokeWidth: overrides.strokeWidth,
  text: overrides.text,
  fontSize: overrides.fontSize,
  opacity: overrides.opacity,
  fromObjectId: overrides.fromObjectId,
  toObjectId: overrides.toObjectId,
  fromAnchor: overrides.fromAnchor,
  toAnchor: overrides.toAnchor,
});

describe('useVisibleShapes', () => {
  it('returns objects inside viewport bounds', () => {
    const objects: IBoardObject[] = [
      createObject({ id: 'inside', x: 100, y: 100, width: 50, height: 50 }),
      createObject({ id: 'outside', x: 4000, y: 4000, width: 50, height: 50 }),
    ];

    const { result } = renderHook(() =>
      useVisibleShapes({
        objects,
        viewport: createViewport(),
      })
    );

    expect(result.current.map((shape) => shape.id)).toEqual(['inside']);
  });

  it('keeps near-edge objects visible with viewport padding', () => {
    const objects: IBoardObject[] = [
      createObject({ id: 'padded', x: -180, y: 50, width: 30, height: 30 }),
      createObject({ id: 'too-far', x: -500, y: 50, width: 30, height: 30 }),
    ];

    const { result } = renderHook(() =>
      useVisibleShapes({
        objects,
        viewport: createViewport(),
      })
    );

    expect(result.current.map((shape) => shape.id)).toEqual(['padded']);
  });

  it('computes bounds from line points for line and connector types', () => {
    const objects: IBoardObject[] = [
      createObject({
        id: 'line-in-view',
        type: 'line',
        x: 10,
        y: 10,
        width: 0,
        height: 0,
        points: [0, 0, 80, 40],
      }),
      createObject({
        id: 'connector-outside',
        type: 'connector',
        x: 3000,
        y: 3000,
        width: 0,
        height: 0,
        points: [0, 0, 20, 20],
      }),
    ];

    const { result } = renderHook(() =>
      useVisibleShapes({
        objects,
        viewport: createViewport(),
      })
    );

    expect(result.current.map((shape) => shape.id)).toEqual(['line-in-view']);
  });

  it('respects viewport translation and scale', () => {
    const objects: IBoardObject[] = [
      createObject({ id: 'translated-visible', x: 1250, y: 900, width: 80, height: 80 }),
      createObject({ id: 'translated-hidden', x: 2600, y: 2000, width: 80, height: 80 }),
    ];

    const { result } = renderHook(() =>
      useVisibleShapes({
        objects,
        viewport: createViewport({
          position: { x: -1000, y: -700 },
          scale: { x: 1, y: 1 },
        }),
      })
    );

    expect(result.current.map((shape) => shape.id)).toEqual(['translated-visible']);
  });
});

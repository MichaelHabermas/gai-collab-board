import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConnectionNodesLayer } from '@/components/canvas/ConnectionNodesLayer';
import type { IBoardObject } from '@/types';

let circleIndex = 0;
const circlePropsByIndex = new Map<number, Record<string, unknown>>();

vi.mock('react-konva', () => ({
  Circle: (props: Record<string, unknown>) => {
    const index = circleIndex++;
    circlePropsByIndex.set(index, props);
    return (
      <button
        data-testid={`connector-node-${index}`}
        onClick={(event) => {
          const clickHandler = props.onClick as ((e: unknown) => void) | undefined;
          clickHandler?.(event);
        }}
      />
    );
  },
}));

const createShape = (overrides: Partial<IBoardObject>): IBoardObject => ({
  id: overrides.id ?? 'shape-1',
  type: overrides.type ?? 'rectangle',
  x: overrides.x ?? 100,
  y: overrides.y ?? 100,
  width: overrides.width ?? 80,
  height: overrides.height ?? 40,
  rotation: overrides.rotation ?? 0,
  fill: overrides.fill ?? '#93c5fd',
  createdBy: overrides.createdBy ?? 'user-1',
  createdAt: overrides.createdAt ?? ({ toMillis: () => 0 } as IBoardObject['createdAt']),
  updatedAt: overrides.updatedAt ?? ({ toMillis: () => 0 } as IBoardObject['updatedAt']),
  stroke: overrides.stroke,
  strokeWidth: overrides.strokeWidth,
  text: overrides.text,
  textFill: overrides.textFill,
  fontSize: overrides.fontSize,
  opacity: overrides.opacity,
  points: overrides.points,
  fromObjectId: overrides.fromObjectId,
  toObjectId: overrides.toObjectId,
  fromAnchor: overrides.fromAnchor,
  toAnchor: overrides.toAnchor,
});

describe('ConnectionNodesLayer', () => {
  beforeEach(() => {
    circleIndex = 0;
    circlePropsByIndex.clear();
  });

  it('renders anchor nodes only for connectable shapes', () => {
    const onNodeClick = vi.fn();
    const shapes = [
      createShape({ id: 'rect-1', type: 'rectangle' }),
      createShape({ id: 'text-1', type: 'text' }),
    ];

    render(<ConnectionNodesLayer shapes={shapes} onNodeClick={onNodeClick} />);

    expect(screen.getAllByRole('button')).toHaveLength(4);
  });

  it('calls onNodeClick with shape id and anchor on node click', () => {
    const onNodeClick = vi.fn();
    const shapes = [createShape({ id: 'sticky-1', type: 'sticky' })];

    render(<ConnectionNodesLayer shapes={shapes} onNodeClick={onNodeClick} />);

    const firstNode = screen.getByTestId('connector-node-0');
    fireEvent.click(firstNode);

    expect(onNodeClick).toHaveBeenCalledWith('sticky-1', 'top');
  });
});

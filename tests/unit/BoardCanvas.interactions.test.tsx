import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';
import type Konva from 'konva';
import type { IBoardObject } from '@/types';
import { BoardCanvas } from '@/components/canvas/BoardCanvas';

type KonvaEvent = Konva.KonvaEventObject<MouseEvent>;

interface IStageProps {
  onClick?: (event: KonvaEvent) => void;
  onMouseDown?: (event: KonvaEvent) => void;
  onMouseMove?: (event: KonvaEvent) => void;
  onMouseUp?: (event: KonvaEvent) => void;
  children?: ReactNode;
}

let latestStageProps: IStageProps = {};
const shapePropsById = new Map<string, Record<string, unknown>>();

/** Toggled by tests to assert snap-to-grid behavior in dragBoundFunc. */
let mockSnapToGridEnabled = false;

vi.mock('react-konva', () => ({
  Stage: (props: IStageProps) => {
    latestStageProps = props;
    return <div data-testid='stage-mock'>{props.children}</div>;
  },
  Layer: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  Rect: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  Line: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/canvas/shapes', () => {
  const makeShape = (name: string) => (props: Record<string, unknown>) => {
    const shapeId = String(props.id ?? `${name}-shape`);
    shapePropsById.set(shapeId, props);
    return <div data-testid={`${name}-${shapeId}`} />;
  };

  return {
    STICKY_COLORS: {
      yellow: '#fef08a',
      pink: '#fda4af',
      blue: '#93c5fd',
      green: '#86efac',
      purple: '#c4b5fd',
      orange: '#fed7aa',
      red: '#ef4444',
    },
    StickyNote: makeShape('sticky'),
    RectangleShape: makeShape('rectangle'),
    CircleShape: makeShape('circle'),
    LineShape: makeShape('line'),
    Connector: makeShape('connector'),
    TextElement: makeShape('text'),
    Frame: makeShape('frame'),
  };
});

vi.mock('@/components/canvas/Toolbar', () => ({
  Toolbar: ({
    onToolChange,
  }: {
    onToolChange: (tool: 'select' | 'sticky' | 'rectangle' | 'connector' | 'text') => void;
  }) => (
    <div>
      <button data-testid='set-tool-select' onClick={() => onToolChange('select')} />
      <button data-testid='set-tool-sticky' onClick={() => onToolChange('sticky')} />
      <button data-testid='set-tool-rectangle' onClick={() => onToolChange('rectangle')} />
      <button data-testid='set-tool-connector' onClick={() => onToolChange('connector')} />
      <button data-testid='set-tool-text' onClick={() => onToolChange('text')} />
    </div>
  ),
}));

vi.mock('@/hooks/useCanvasViewport', () => ({
  useCanvasViewport: () => ({
    viewport: {
      position: { x: 0, y: 0 },
      scale: { x: 1, y: 1 },
      width: 1000,
      height: 800,
    },
    handleWheel: vi.fn(),
    handleDragEnd: vi.fn(),
    handleTouchMove: vi.fn(),
    handleTouchEnd: vi.fn(),
    zoomTo: vi.fn(),
    zoomToFitBounds: vi.fn(),
    resetViewport: vi.fn(),
  }),
}));

vi.mock('@/hooks/useCursors', () => ({
  useCursors: () => ({
    cursors: {},
    handleMouseMove: vi.fn(),
  }),
}));

vi.mock('@/hooks/useCanvasOperations', () => ({
  useCanvasOperations: vi.fn(),
}));

vi.mock('@/hooks/useExportAsImage', () => ({
  useExportAsImage: () => ({
    exportViewport: vi.fn(),
    exportFullBoard: vi.fn(),
  }),
}));

vi.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'light' }),
}));

vi.mock('@/hooks/useBoardSettings', () => ({
  useBoardSettings: () => ({
    viewport: {
      position: { x: 0, y: 0 },
      scale: { x: 1, y: 1 },
    },
    setViewport: vi.fn(),
    showGrid: false,
    setShowGrid: vi.fn(),
    get snapToGrid() {
      return mockSnapToGridEnabled;
    },
    setSnapToGrid: vi.fn(),
  }),
}));

vi.mock('@/contexts/selectionContext', () => ({
  useSelection: () => ({
    selectedIds: [],
    setSelectedIds: vi.fn(),
  }),
}));

vi.mock('@/components/canvas/ConnectionNodesLayer', () => ({
  ConnectionNodesLayer: ({
    shapes,
    onNodeClick,
  }: {
    shapes: IBoardObject[];
    onNodeClick: (shapeId: string, anchor: 'top' | 'right' | 'bottom' | 'left') => void;
  }) => (
    <div>
      <button
        data-testid='connector-node-a'
        onClick={() => onNodeClick(String(shapes[0]?.id), 'top')}
      />
      <button
        data-testid='connector-node-b'
        onClick={() => onNodeClick(String(shapes[1]?.id), 'bottom')}
      />
    </div>
  ),
}));

vi.mock('@/components/canvas/AlignToolbar', () => ({
  AlignToolbar: () => <div data-testid='align-toolbar-mock' />,
}));

vi.mock('@/components/canvas/AlignmentGuidesLayer', () => ({
  AlignmentGuidesLayer: () => <div data-testid='alignment-guides-mock' />,
}));

vi.mock('@/components/canvas/CursorLayer', () => ({
  CursorLayer: () => <div data-testid='cursor-layer-mock' />,
}));

vi.mock('@/components/canvas/SelectionLayer', () => ({
  SelectionLayer: () => <div data-testid='selection-layer-mock' />,
}));

vi.mock('@/components/canvas/TransformHandler', () => ({
  TransformHandler: () => <div data-testid='transform-handler-mock' />,
}));

const createUser = (): User =>
  ({
    uid: 'user-1',
    email: 'user-1@example.com',
    displayName: 'User One',
  }) as User;

const createObject = (overrides: Partial<IBoardObject>): IBoardObject => ({
  id: overrides.id ?? 'obj-1',
  type: overrides.type ?? 'rectangle',
  x: overrides.x ?? 100,
  y: overrides.y ?? 100,
  width: overrides.width ?? 100,
  height: overrides.height ?? 80,
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

const createStageEvent = (pointer: { x: number; y: number }): KonvaEvent => {
  const stage = {
    x: () => 0,
    y: () => 0,
    scaleX: () => 1,
    getPointerPosition: () => pointer,
    container: () => ({
      getBoundingClientRect: () => ({
        left: 0,
        top: 0,
      }),
    }),
  };

  const target = {
    getStage: () => stage,
    name: () => 'background',
    getClassName: () => 'Rect',
    getParent: () => null,
  };

  return {
    target,
    evt: {
      clientX: pointer.x,
      clientY: pointer.y,
      shiftKey: false,
      ctrlKey: false,
      metaKey: false,
    } as unknown as MouseEvent,
  } as KonvaEvent;
};

const GRID_SIZE = 20;

describe('BoardCanvas interactions', () => {
  beforeEach(() => {
    latestStageProps = {};
    shapePropsById.clear();
    mockSnapToGridEnabled = false;
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  it('creates sticky note from empty-area click when sticky tool is selected', async () => {
    const onObjectCreate = vi.fn().mockResolvedValue(createObject({ id: 'new-sticky', type: 'sticky' }));

    render(
      <BoardCanvas
        boardId='board-1'
        boardName='Board'
        user={createUser()}
        objects={[]}
        canEdit={true}
        onObjectCreate={onObjectCreate}
      />
    );

    fireEvent.click(screen.getByTestId('set-tool-sticky'));
    latestStageProps.onClick?.(createStageEvent({ x: 500, y: 300 }));

    await waitFor(() => {
      expect(onObjectCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'sticky',
          x: 400,
          y: 200,
          width: 200,
          height: 200,
          text: '',
        })
      );
    });
  });

  it('creates text object from empty-area click when text tool is selected', async () => {
    const onObjectCreate = vi.fn().mockResolvedValue(createObject({ id: 'new-text', type: 'text' }));

    render(
      <BoardCanvas
        boardId='board-1'
        boardName='Board'
        user={createUser()}
        objects={[]}
        canEdit={true}
        onObjectCreate={onObjectCreate}
      />
    );

    fireEvent.click(screen.getByTestId('set-tool-text'));
    latestStageProps.onClick?.(createStageEvent({ x: 220, y: 180 }));

    await waitFor(() => {
      expect(onObjectCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'text',
          x: 220,
          y: 180,
          width: 200,
          height: 30,
          text: '',
        })
      );
    });
  });

  it('handles connector creation flow and shape drag updates', async () => {
    const onObjectCreate = vi.fn().mockResolvedValue(createObject({ id: 'connector-1', type: 'connector' }));
    const onObjectUpdate = vi.fn();
    const objects = [
      createObject({ id: 'shape-a', type: 'rectangle', x: 100, y: 100 }),
      createObject({ id: 'shape-b', type: 'rectangle', x: 300, y: 240 }),
    ];

    render(
      <BoardCanvas
        boardId='board-1'
        boardName='Board'
        user={createUser()}
        objects={objects}
        canEdit={true}
        onObjectCreate={onObjectCreate}
        onObjectUpdate={onObjectUpdate}
      />
    );

    const rectangleProps = shapePropsById.get('shape-a');
    const dragEnd = rectangleProps?.onDragEnd as ((x: number, y: number) => void) | undefined;
    dragEnd?.(420, 210);

    expect(onObjectUpdate).toHaveBeenCalledWith('shape-a', { x: 420, y: 210 });

    fireEvent.click(screen.getByTestId('set-tool-connector'));
    fireEvent.click(screen.getByTestId('connector-node-a'));
    fireEvent.click(screen.getByTestId('connector-node-b'));

    await waitFor(() => {
      expect(onObjectCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'connector',
          fromObjectId: 'shape-a',
          toObjectId: 'shape-b',
          fromAnchor: 'top',
          toAnchor: 'bottom',
        })
      );
    });
  });

  it('does not create rectangle when draw size is below threshold', async () => {
    const onObjectCreate = vi.fn().mockResolvedValue(createObject({ id: 'rect-1', type: 'rectangle' }));

    render(
      <BoardCanvas
        boardId='board-1'
        boardName='Board'
        user={createUser()}
        objects={[]}
        canEdit={true}
        onObjectCreate={onObjectCreate}
      />
    );

    fireEvent.click(screen.getByTestId('set-tool-rectangle'));

    await act(async () => {
      latestStageProps.onMouseDown?.(createStageEvent({ x: 200, y: 200 }));
    });

    await act(async () => {
      latestStageProps.onMouseMove?.(createStageEvent({ x: 203, y: 203 }));
    });

    await act(async () => {
      await latestStageProps.onMouseUp?.(createStageEvent({ x: 203, y: 203 }));
    });

    expect(onObjectCreate).not.toHaveBeenCalled();
  });

  it('cancels connector flow when selecting the same shape twice', async () => {
    const onObjectCreate = vi.fn().mockResolvedValue(createObject({ id: 'connector-2', type: 'connector' }));
    const objects = [
      createObject({ id: 'shape-a', type: 'rectangle', x: 100, y: 100 }),
      createObject({ id: 'shape-b', type: 'rectangle', x: 300, y: 240 }),
    ];

    render(
      <BoardCanvas
        boardId='board-1'
        boardName='Board'
        user={createUser()}
        objects={objects}
        canEdit={true}
        onObjectCreate={onObjectCreate}
      />
    );

    fireEvent.click(screen.getByTestId('set-tool-connector'));

    await act(async () => {
      fireEvent.click(screen.getByTestId('connector-node-a'));
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('connector-node-a'));
    });

    expect(onObjectCreate).not.toHaveBeenCalled();
  });

  it('does not create sticky note when clicking on an existing shape target', async () => {
    const onObjectCreate = vi.fn().mockResolvedValue(createObject({ id: 'new-sticky', type: 'sticky' }));

    render(
      <BoardCanvas
        boardId='board-1'
        boardName='Board'
        user={createUser()}
        objects={[createObject({ id: 'shape-a', type: 'rectangle' })]}
        canEdit={true}
        onObjectCreate={onObjectCreate}
      />
    );

    fireEvent.click(screen.getByTestId('set-tool-sticky'));

    const stageEvent = createStageEvent({ x: 200, y: 200 });
    const shapeTarget = {
      ...stageEvent.target,
      name: () => 'shape rectangle',
      getClassName: () => 'Rect',
      getParent: () => null,
    };

    latestStageProps.onClick?.({
      ...stageEvent,
      target: shapeTarget,
    } as KonvaEvent);

    await waitFor(() => {
      expect(onObjectCreate).not.toHaveBeenCalled();
    });
  });

  it('keeps drag bound behavior stable across rerenders for unchanged shapes', () => {
    const objects = [createObject({ id: 'shape-a', type: 'rectangle', x: 120, y: 140 })];
    const { rerender } = render(
      <BoardCanvas
        boardId='board-1'
        boardName='Board'
        user={createUser()}
        objects={objects}
        canEdit={true}
      />
    );

    const firstProps = shapePropsById.get('shape-a');
    const firstDragBoundFunc = firstProps?.dragBoundFunc;
    expect(typeof firstDragBoundFunc).toBe('function');

    rerender(
      <BoardCanvas
        boardId='board-1'
        boardName='Board'
        user={createUser()}
        objects={objects}
        canEdit={true}
      />
    );

    const secondProps = shapePropsById.get('shape-a');
    const secondDragBoundFunc = secondProps?.dragBoundFunc as
      | ((pos: { x: number; y: number }) => { x: number; y: number })
      | undefined;
    expect(typeof secondDragBoundFunc).toBe('function');
    const sampleInput = { x: 180, y: 200 };
    let firstResult: { x: number; y: number } | undefined;
    let secondResult: { x: number; y: number } | undefined;
    act(() => {
      firstResult = (
        firstDragBoundFunc as (pos: { x: number; y: number }) => { x: number; y: number }
      )(sampleInput);
      secondResult = secondDragBoundFunc?.(sampleInput);
    });

    expect(secondResult).toEqual(firstResult);
  });

  it('returns grid-aligned position from dragBoundFunc when snap to grid is enabled', () => {
    mockSnapToGridEnabled = true;
    const objects = [
      createObject({
        id: 'shape-a',
        type: 'rectangle',
        x: 0,
        y: 0,
        width: 100,
        height: 80,
      }),
    ];
    render(
      <BoardCanvas
        boardId='board-1'
        boardName='Board'
        user={createUser()}
        objects={objects}
        canEdit={true}
      />
    );

    const props = shapePropsById.get('shape-a');
    const dragBoundFunc = props?.dragBoundFunc as
      | ((pos: { x: number; y: number }) => { x: number; y: number })
      | undefined;
    expect(typeof dragBoundFunc).toBe('function');

    const nonGridPos = { x: 13, y: 17 };
    let result: { x: number; y: number } | undefined;
    act(() => {
      result = dragBoundFunc(nonGridPos);
    });

    expect(result).toEqual({ x: 20, y: 20 });
    expect((result?.x ?? 0) % GRID_SIZE).toBe(0);
    expect((result?.y ?? 0) % GRID_SIZE).toBe(0);
  });
});

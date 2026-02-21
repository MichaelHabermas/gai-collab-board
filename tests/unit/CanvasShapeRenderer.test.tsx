import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { CanvasShapeRenderer } from '@/components/canvas/CanvasShapeRenderer';
import { StickyNote } from '@/components/canvas/shapes';

vi.mock('@/components/canvas/shapes', () => ({
  StickyNote: vi.fn(() => <div data-testid="shape-sticky" />),
  RectangleShape: vi.fn(() => <div data-testid="shape-rectangle" />),
  CircleShape: vi.fn(() => <div data-testid="shape-circle" />),
  LineShape: vi.fn(() => <div data-testid="shape-line" />),
  Connector: vi.fn(() => <div data-testid="shape-connector" />),
  TextElement: vi.fn(() => <div data-testid="shape-text" />),
  Frame: vi.fn(() => <div data-testid="shape-frame" />),
}));

vi.mock('react-konva', () => ({
  Rect: vi.fn(() => <div data-testid="konva-rect" />),
}));

describe('CanvasShapeRenderer', () => {
  const defaultProps = {
    isSelected: false,
    canEdit: true,
    selectionColor: '#000',
    getSelectHandler: vi.fn(() => vi.fn()),
    getDragEndHandler: vi.fn(() => vi.fn()),
    getTextChangeHandler: vi.fn(() => vi.fn()),
    getDragBoundFunc: vi.fn(),
    handleObjectSelect: vi.fn(),
    handleObjectDragEnd: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const types = ['sticky', 'rectangle', 'circle', 'line', 'connector', 'text', 'frame'] as const;

  types.forEach((type) => {
    it(`renders ${type} correctly`, () => {
      const mockObject: any = {
        id: `obj-${type}`,
        type,
        x: 10,
        y: 10,
        width: 100,
        height: 100,
      };

      if (type === 'line') {
        mockObject.points = [0, 0, 100, 100];
      }
      if (type === 'connector') {
        mockObject.fromObjectId = 'f1';
        mockObject.toObjectId = 't1';
        mockObject.fromAnchor = 'center';
        mockObject.toAnchor = 'center';
      }

      const objectsById = type === 'connector' ? new Map<string, any>([
        ['f1', { id: 'f1', x: 0, y: 0, width: 10, height: 10, type: 'rectangle' }],
        ['t1', { id: 't1', x: 50, y: 50, width: 10, height: 10, type: 'rectangle' }],
      ]) : new Map<string, any>();

      const { getByTestId } = render(
        <CanvasShapeRenderer {...defaultProps} object={mockObject} objectsById={objectsById} />
      );

      const testId = `shape-${type}`;
      expect(getByTestId(testId)).toBeTruthy();
    });
  });

  it('renders a fallback Rect for unknown type', () => {
    const mockObject: any = {
      id: 'obj-unknown',
      type: 'unknown_type_here',
      x: 10,
      y: 10,
      width: 100,
      height: 100,
    };
    
    const { getByTestId } = render(
      <CanvasShapeRenderer {...defaultProps} object={mockObject} objectsById={new Map()} />
    );
    
    expect(getByTestId('konva-rect')).toBeTruthy();
  });

  it('applies frameDragOffset when shape is child of moving frame', () => {
    const mockObject: any = {
      id: 'obj-sticky',
      type: 'sticky',
      x: 10,
      y: 10,
      width: 100,
      height: 100,
      parentFrameId: 'frame-1'
    };

    const frameDragOffset = { frameId: 'frame-1', dx: 50, dy: 50 };
    
    render(
      <CanvasShapeRenderer 
        {...defaultProps} 
        object={mockObject} 
        objectsById={new Map()} 
        frameDragOffset={frameDragOffset} 
      />
    );
    
    expect((StickyNote as any).mock.calls[0][0]).toMatchObject({ x: 60, y: 60 });
  });

  it('applies groupDragOffset when selected and no frame drag offset', () => {
    const mockObject: any = {
      id: 'obj-sticky',
      type: 'sticky',
      x: 10,
      y: 10,
      width: 100,
      height: 100,
    };

    const groupDragOffset = { dx: 30, dy: 30 };
    
    render(
      <CanvasShapeRenderer 
        {...defaultProps} 
        object={mockObject} 
        objectsById={new Map()} 
        isSelected={true}
        groupDragOffset={groupDragOffset} 
      />
    );
    
    expect((StickyNote as any).mock.calls[0][0]).toMatchObject({ x: 40, y: 40 });
  });
});
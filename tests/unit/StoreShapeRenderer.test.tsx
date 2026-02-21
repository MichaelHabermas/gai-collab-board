import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { StoreShapeRenderer } from '@/components/canvas/StoreShapeRenderer';
import { useObjectsStore } from '@/stores/objectsStore';
import { useSelectionStore } from '@/stores/selectionStore';
import { useDragOffsetStore, selectGroupDragOffset } from '@/stores/dragOffsetStore';

vi.mock('@/stores/objectsStore', () => ({
  useObjectsStore: vi.fn(),
  selectObject: vi.fn((id: string) => (state: any) => id), // dummy selector returning id just to test passing it
}));

vi.mock('@/stores/selectionStore', () => ({
  useSelectionStore: vi.fn(),
}));

vi.mock('@/stores/dragOffsetStore', () => ({
  useDragOffsetStore: vi.fn(),
  selectFrameOffset: vi.fn(() => vi.fn()),
  selectIsDropTarget: vi.fn(() => vi.fn()),
  selectGroupDragOffset: vi.fn(), // direct selector
}));

vi.mock('@/components/canvas/CanvasShapeRenderer', () => ({
  CanvasShapeRenderer: vi.fn((props) => {
    // Manually serialize Map so we can test it in the snapshot
    const serializedProps = {
      ...props,
      objectsById: props.objectsById instanceof Map 
        ? Object.fromEntries(props.objectsById) 
        : props.objectsById
    };
    return <div data-testid="canvas-shape-renderer" data-props={JSON.stringify(serializedProps)} />;
  }),
}));

describe('StoreShapeRenderer', () => {
  const defaultProps = {
    id: 'obj1',
    canEdit: true,
    selectionColor: '#000',
    getSelectHandler: vi.fn(),
    getDragEndHandler: vi.fn(),
    getTextChangeHandler: vi.fn(),
    getDragBoundFunc: vi.fn(),
    handleObjectSelect: vi.fn(),
    handleObjectDragEnd: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when useObjectsStore returns no object', () => {
    (useObjectsStore as any).mockReturnValue(undefined);
    (useSelectionStore as any).mockReturnValue(new Set()); // Not selected
    (useDragOffsetStore as any).mockReturnValue(null);

    const { container } = render(<StoreShapeRenderer {...defaultProps} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders CanvasShapeRenderer with correct props for an unselected shape', () => {
    const mockObject = { id: 'obj1', type: 'rectangle' };
    
    // We have multiple useObjectsStore calls inside StoreShapeRenderer and CanvasShapeRendererWithConnectorLookup
    // 1st: for object
    // 2nd: for fromObjectId (if connector)
    // 3rd: for toObjectId (if connector)
    (useObjectsStore as any).mockImplementation((selector: any) => {
      if (selector.name === '_selectUndefined') return undefined;
      return mockObject;
    });
    
    const mockSelectedIds = new Set(['otherObj']);
    (useSelectionStore as any).mockImplementation((selector: any) => {
      return selector({ selectedIds: mockSelectedIds });
    });
    
    (useDragOffsetStore as any).mockReturnValue(null); // Return null for everything

    const { getByTestId } = render(<StoreShapeRenderer {...defaultProps} />);
    
    const renderer = getByTestId('canvas-shape-renderer');
    expect(renderer).toBeTruthy();
    
    const propsJSON = JSON.parse(renderer.getAttribute('data-props') || '{}');
    expect(propsJSON.object.id).toBe('obj1');
    expect(propsJSON.isSelected).toBe(false);
    expect(propsJSON.groupDragOffset).toBeNull();
    // Normal shape -> empty objectsById
    expect(propsJSON.objectsById).toEqual({}); 
    expect(propsJSON.dropTargetFrameId).toBeNull();
  });

  it('subscribes to groupDragOffset when isSelected is true', () => {
    const mockObject = { id: 'obj1', type: 'rectangle' };
    (useObjectsStore as any).mockImplementation((selector: any) => {
      if (selector.name === '_selectUndefined') return undefined;
      return mockObject;
    });
    
    const mockSelectedIds = new Set(['obj1']);
    (useSelectionStore as any).mockImplementation((selector: any) => {
      return selector({ selectedIds: mockSelectedIds });
    });
    
    const mockGroupOffset = { x: 10, y: 20 };
    (useDragOffsetStore as any).mockImplementation((selector: any) => {
      if (selector === selectGroupDragOffset) return mockGroupOffset;
      return null;
    });

    const { getByTestId } = render(<StoreShapeRenderer {...defaultProps} />);
    
    const renderer = getByTestId('canvas-shape-renderer');
    const propsJSON = JSON.parse(renderer.getAttribute('data-props') || '{}');
    expect(propsJSON.isSelected).toBe(true);
    expect(propsJSON.groupDragOffset).toEqual(mockGroupOffset);
  });

  it('populates objectsById when object is a connector with connected objects', () => {
    const mockObject = { id: 'obj1', type: 'connector', fromObjectId: 'f1', toObjectId: 't1' };
    const mockFrom = { id: 'f1' };
    const mockTo = { id: 't1' };
    
    (useObjectsStore as any).mockImplementation((selector: any) => {
      const state = { f1: mockFrom, t1: mockTo, obj1: mockObject };
      // Return value based on selector output (which is just the ID here)
      const id = typeof selector === 'function' ? selector(state) : undefined;
      return state[id as keyof typeof state];
    });
    
    (useSelectionStore as any).mockImplementation(() => false);
    (useDragOffsetStore as any).mockReturnValue(null);

    const { getByTestId } = render(<StoreShapeRenderer {...defaultProps} />);
    
    const renderer = getByTestId('canvas-shape-renderer');
    const propsJSON = JSON.parse(renderer.getAttribute('data-props') || '{}');
    
    expect(propsJSON.objectsById).toEqual({
      f1: mockFrom,
      t1: mockTo
    });
  });

  it('sets dropTargetFrameId when isDropTarget is true', () => {
    const mockObject = { id: 'obj1', type: 'rectangle' };
    (useObjectsStore as any).mockImplementation((selector: any) => {
      if (selector.name === '_selectUndefined') return undefined;
      return mockObject;
    });
    
    (useSelectionStore as any).mockImplementation((selector: any) => false);
    
    (useDragOffsetStore as any).mockImplementation((selector: any) => {
      // Mock true for isDropTarget
      if (typeof selector === 'function' && selector.name !== 'selectFrameOffset' && selector.name !== '_selectNullGroupOffset') {
         return true;
      }
      return null;
    });

    const { getByTestId } = render(<StoreShapeRenderer {...defaultProps} />);
    
    const renderer = getByTestId('canvas-shape-renderer');
    const propsJSON = JSON.parse(renderer.getAttribute('data-props') || '{}');
    
    expect(propsJSON.dropTargetFrameId).toBe('obj1');
  });
});
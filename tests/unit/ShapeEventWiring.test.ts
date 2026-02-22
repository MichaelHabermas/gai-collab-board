import { beforeEach, describe, expect, it, vi } from 'vitest';
import type Konva from 'konva';
import { spatialIndex } from '@/stores/objectsStore';
import { wireEvents, unwireEvents } from '@/canvas/events/ShapeEventWiring';
import type { IBoardObject, IAlignmentCandidate } from '@/types';
import type { IDragCoordinator } from '@/canvas/drag/DragCoordinator';

type ShapeEvent =
  | 'click tap'
  | 'dragstart'
  | 'dragmove'
  | 'dragend'
  | 'dblclick dbltap';

type EventHandler = (event: unknown) => void;

class MockNode {
  private handlers = new Map<ShapeEvent, EventHandler>();

  public on = vi.fn((event: ShapeEvent, handler: EventHandler) => {
    this.handlers.set(event, handler);
    return this;
  });

  public off = vi.fn((_event: string) => this);

  public draggable = vi.fn((_value: boolean) => this);

  public dragBoundFunc = vi.fn(
    (_fn: (pos: Konva.Vector2d) => Konva.Vector2d) => this
  );

  public x = vi.fn(() => 42);

  public y = vi.fn(() => 24);

  public trigger(event: ShapeEvent, payload: unknown = {}): void {
    const handler = this.handlers.get(event);
    if (handler) {
      handler(payload);
    }
  }
}

function createDragMock(): IDragCoordinator {
  return {
    selectObject: vi.fn(),
    onDragMove: vi.fn(),
    commitDragEnd: vi.fn(),
    createDragBoundFunc: vi.fn((pos: Konva.Vector2d) => pos),
    handleSelectionDragStart: vi.fn(),
    handleSelectionDragMove: vi.fn(),
    handleSelectionDragEnd: vi.fn(),
  };
}

describe('ShapeEventWiring', () => {
  const objectId = 'shape-1';
  let node: MockNode;
  let drag: IDragCoordinator;
  let setDraggingSpy: ReturnType<typeof vi.spyOn>;

  const guideCandidates: IAlignmentCandidate[] = [
    { id: 'c1', bounds: { x1: 0, y1: 0, x2: 10, y2: 10 }, positions: { v: [], h: [] } },
  ];
  const objectsRecord: Record<string, IBoardObject> = {};
  const frames: IBoardObject[] = [];
  const childIndex = new Map<string, Set<string>>();
  const openTextEdit = vi.fn();
  const dragBoundFn = (pos: Konva.Vector2d) => ({ ...pos, x: pos.x + 1 });

  beforeEach(() => {
    node = new MockNode();
    drag = createDragMock();
    openTextEdit.mockReset();
    setDraggingSpy = vi.spyOn(spatialIndex, 'setDragging');
    vi.mocked(drag.createDragBoundFunc).mockReturnValue(dragBoundFn);

    wireEvents(node as unknown as Konva.Node, objectId, {
      drag,
      canEdit: () => true,
      getGuideCandidates: () => guideCandidates,
      getObjectsRecord: () => objectsRecord,
      getFrames: () => frames,
      getChildIndex: () => childIndex,
      openTextEdit,
    });
  });

  it('selects object on click/tap with meta key state', () => {
    node.trigger('click tap', { evt: { metaKey: true } });

    expect(drag.selectObject).toHaveBeenCalledWith(objectId, true);
  });

  it('marks dragging set on dragstart', () => {
    node.trigger('dragstart');

    expect(setDraggingSpy).toHaveBeenCalledTimes(1);
    const value = setDraggingSpy.mock.calls[0]?.[0];
    expect(value instanceof Set).toBe(true);
    expect(value ? Array.from(value) : []).toEqual([objectId]);
  });

  it('delegates dragmove to drag coordinator with guide candidates', () => {
    const event = { target: node };
    node.trigger('dragmove', event);

    expect(drag.onDragMove).toHaveBeenCalledWith(event, guideCandidates);
  });

  it('commits drag on dragend with target coordinates and indexes', () => {
    const event = { target: node };
    node.trigger('dragend', event);

    expect(drag.commitDragEnd).toHaveBeenCalledWith(
      objectId,
      42,
      24,
      objectsRecord,
      frames,
      childIndex
    );
  });

  it('opens text edit on double click/tap', () => {
    node.trigger('dblclick dbltap');

    expect(openTextEdit).toHaveBeenCalledWith(objectId);
  });

  it('sets draggable and drag bound function during wiring', () => {
    expect(node.draggable).toHaveBeenCalledWith(true);
    expect(drag.createDragBoundFunc).toHaveBeenCalledWith(objectId);
    expect(node.dragBoundFunc).toHaveBeenCalledWith(dragBoundFn);
  });

  it('unwires all registered events', () => {
    unwireEvents(node as unknown as Konva.Node);

    expect(node.off).toHaveBeenCalledWith(
      'click tap dragstart dragmove dragend dblclick dbltap'
    );
  });
});

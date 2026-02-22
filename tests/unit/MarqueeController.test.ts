import { beforeEach, describe, expect, it, vi } from 'vitest';
import Konva from 'konva';
import { Timestamp } from 'firebase/firestore';
import type { IBoardObject } from '@/types';
import {
  createMarqueeController,
  type IMarqueeOverlay,
  type IMarqueeControllerConfig,
} from '@/canvas/events/MarqueeController';

const ts = Timestamp.now();

function makeRect(id: string, x: number, y: number, width: number, height: number): IBoardObject {
  return {
    id,
    type: 'rectangle',
    x,
    y,
    width,
    height,
    rotation: 0,
    fill: '#fff',
    createdBy: 'test',
    createdAt: ts,
    updatedAt: ts,
  };
}

function createOverlayMock(): IMarqueeOverlay & { getCalls: () => { show: unknown[]; update: unknown[]; hide: number } } {
  const show = vi.fn();
  const update = vi.fn();
  const hide = vi.fn();
  return {
    showMarquee: show,
    updateMarquee: update,
    hideMarquee: hide,
    getCalls: () => ({ show: show.mock.calls, update: update.mock.calls, hide: hide.mock.calls.length }),
  };
}

function createMockStage(pointer: { x: number; y: number } = { x: 100, y: 100 }) {
  return {
    getPointerPosition: vi.fn(() => pointer),
    container: vi.fn(() => ({ getBoundingClientRect: () => ({ left: 0, top: 0 }) })),
  };
}

function createMockEvent(
  stage: ReturnType<typeof createMockStage>,
  clientX = 100,
  clientY = 100
): Konva.KonvaEventObject<Event> {
  return {
    target: { getStage: () => stage },
    evt: { clientX, clientY } as unknown as Event,
  } as unknown as Konva.KonvaEventObject<Event>;
}

describe('MarqueeController', () => {
  let overlay: ReturnType<typeof createOverlayMock>;
  let getCanvasCoords: IMarqueeControllerConfig['getCanvasCoords'];
  let getObjectsRecord: IMarqueeControllerConfig['getObjectsRecord'];
  let setSelectedIds: (ids: string[]) => void;
  let controller: ReturnType<typeof createMarqueeController>;

  beforeEach(() => {
    overlay = createOverlayMock();
    getCanvasCoords = vi.fn((_stage, pointer) => ({ x: pointer.x, y: pointer.y }));
    getObjectsRecord = vi.fn((): Record<string, IBoardObject> => ({}));
    setSelectedIds = vi.fn();
    controller = createMarqueeController({
      overlay,
      getCanvasCoords,
      getObjectsRecord,
      setSelectedIds,
    });
  });

  it('calls overlay.showMarquee on start with rect', () => {
    controller.onMarqueeStart({ x: 10, y: 20 });

    expect(overlay.showMarquee).toHaveBeenCalledTimes(1);
    expect(overlay.showMarquee).toHaveBeenCalledWith({
      x1: 10,
      y1: 20,
      x2: 10,
      y2: 20,
    });
  });

  it('calls overlay.updateMarquee on move when started', () => {
    controller.onMarqueeStart({ x: 0, y: 0 });
    controller.onMarqueeMove({ x: 50, y: 30 });

    expect(overlay.updateMarquee).toHaveBeenCalledWith({
      x1: 0,
      y1: 0,
      x2: 50,
      y2: 30,
    });
  });

  it('on end with valid rect calls setSelectedIds and hideMarquee', () => {
    const rect = makeRect('rect-1', 20, 20, 20, 20);
    getObjectsRecord = vi.fn(() => ({ 'rect-1': rect }));
    setSelectedIds = vi.fn();
    controller = createMarqueeController({
      overlay,
      getCanvasCoords,
      getObjectsRecord,
      setSelectedIds,
    });

    controller.onMarqueeStart({ x: 0, y: 0 });
    const stage = createMockStage({ x: 100, y: 100 });
    vi.mocked(getCanvasCoords).mockReturnValue({ x: 100, y: 100 });
    controller.onMarqueeEnd(createMockEvent(stage, 100, 100));

    expect(setSelectedIds).toHaveBeenCalledWith(['rect-1']);
    expect(overlay.hideMarquee).toHaveBeenCalled();
  });

  it('on end with tiny rect does not call setSelectedIds', () => {
    controller.onMarqueeStart({ x: 0, y: 0 });
    const stage = createMockStage({ x: 2, y: 2 });
    vi.mocked(getCanvasCoords).mockReturnValue({ x: 2, y: 2 });
    controller.onMarqueeEnd(createMockEvent(stage, 2, 2));

    expect(setSelectedIds).not.toHaveBeenCalled();
    expect(overlay.hideMarquee).toHaveBeenCalled();
  });

  it('on end without start calls hideMarquee only', () => {
    const stage = createMockStage({ x: 50, y: 50 });
    controller.onMarqueeEnd(createMockEvent(stage));

    expect(overlay.hideMarquee).toHaveBeenCalledTimes(1);
    expect(setSelectedIds).not.toHaveBeenCalled();
  });

  it('AABB selects only objects whose bounds intersect marquee', () => {
    const a = makeRect('a', 10, 10, 10, 10);
    const b = makeRect('b', 50, 50, 10, 10);
    getObjectsRecord = vi.fn(() => ({ a, b }));
    setSelectedIds = vi.fn();
    controller = createMarqueeController({
      overlay,
      getCanvasCoords,
      getObjectsRecord,
      setSelectedIds,
    });

    controller.onMarqueeStart({ x: 0, y: 0 });
    const stage = createMockStage({ x: 25, y: 25 });
    vi.mocked(getCanvasCoords).mockReturnValue({ x: 25, y: 25 });
    controller.onMarqueeEnd(createMockEvent(stage, 25, 25));

    expect(setSelectedIds).toHaveBeenCalledWith(['a']);
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import Konva from 'konva';
import type { IPosition, ToolMode } from '@/types';
import { createStageEventRouter } from '@/canvas/events/StageEventRouter';
import type { IStageEventRouterConfig } from '@/canvas/events/StageEventRouter';

vi.mock('@/hooks/useShapeDrawing', () => ({
  isDrawingTool: vi.fn((tool: string) =>
    ['rectangle', 'circle', 'line', 'connector', 'frame'].includes(tool)
  ),
}));

type StageEvent =
  | 'mousedown'
  | 'mousemove'
  | 'mouseup'
  | 'wheel'
  | 'touchstart'
  | 'touchmove'
  | 'touchend';
type EventHandler = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent | WheelEvent>) => void;

function createMockStage() {
  const handlers = new Map<StageEvent, EventHandler>();
  return {
    on: vi.fn((event: StageEvent, handler: EventHandler) => {
      handlers.set(event, handler);
      return {};
    }),
    off: vi.fn((event: StageEvent, _handler: EventHandler) => {
      handlers.delete(event);
      return {};
    }),
    getHandlers: () => handlers,
    getPointerPosition: vi.fn(() => ({ x: 10, y: 20 })),
  };
}

function createMockEvent(
  stage: ReturnType<typeof createMockStage>,
  pointer: { x: number; y: number } = { x: 10, y: 20 }
) {
  stage.getPointerPosition.mockReturnValueOnce(pointer);
  return {
    target: { getStage: () => stage },
    evt: new MouseEvent('mousedown'),
  } as unknown as Konva.KonvaEventObject<MouseEvent>;
}

describe('StageEventRouter', () => {
  let stage: ReturnType<typeof createMockStage>;
  let getActiveTool: () => ToolMode;
  let getCanvasCoords: IStageEventRouterConfig['getCanvasCoords'];
  let controllers: IStageEventRouterConfig['controllers'];
  let config: IStageEventRouterConfig;

  beforeEach(() => {
    stage = createMockStage();
    getActiveTool = vi.fn((): ToolMode => 'select');
    getCanvasCoords = vi.fn((_stage, pointer) => ({ x: pointer.x * 2, y: pointer.y * 2 }));
    controllers = {
      drawing: {
        onDrawStart: vi.fn(),
        onDrawMove: vi.fn(),
        onDrawEnd: vi.fn(),
      },
      marquee: {
        onMarqueeStart: vi.fn(),
        onMarqueeMove: vi.fn(),
        onMarqueeEnd: vi.fn(),
      },
      viewport: {
        handleWheel: vi.fn(),
      },
      cursorBroadcast: vi.fn(),
    };
    config = {
      getCanvasCoords,
      controllers,
    };
  });

  it('returns an object with destroy', () => {
    const router = createStageEventRouter(
      stage as unknown as Konva.Stage,
      getActiveTool,
      config
    );
    expect(router.destroy).toBeDefined();
    expect(typeof router.destroy).toBe('function');
    router.destroy();
  });

  it('attaches stage listeners for mousedown, mousemove, mouseup, wheel, touchstart, touchmove, touchend', () => {
    createStageEventRouter(stage as unknown as Konva.Stage, getActiveTool, config);

    expect(stage.on).toHaveBeenCalledWith('mousedown', expect.any(Function));
    expect(stage.on).toHaveBeenCalledWith('mousemove', expect.any(Function));
    expect(stage.on).toHaveBeenCalledWith('mouseup', expect.any(Function));
    expect(stage.on).toHaveBeenCalledWith('wheel', expect.any(Function));
    expect(stage.on).toHaveBeenCalledWith('touchstart', expect.any(Function));
    expect(stage.on).toHaveBeenCalledWith('touchmove', expect.any(Function));
    expect(stage.on).toHaveBeenCalledWith('touchend', expect.any(Function));
    expect(stage.on).toHaveBeenCalledTimes(7);
  });

  it('destroy removes all listeners and cancels pending RAF', () => {
    let rafCallback: (() => void) | null = null;
    const rafIds: number[] = [];
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((cb: () => void) => {
        rafCallback = cb;
        const id = rafIds.length + 1;
        rafIds.push(id);
        return id;
      })
    );
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    const router = createStageEventRouter(stage as unknown as Konva.Stage, getActiveTool, config);
    const handlers = stage.getHandlers();
    const onMove = handlers.get('mousemove');
    expect(onMove).toBeDefined();

    const evt = createMockEvent(stage);
    onMove?.(evt);
    expect(rafCallback).not.toBeNull();
    router.destroy();

    expect(globalThis.cancelAnimationFrame).toHaveBeenCalled();
    expect(stage.off).toHaveBeenCalledWith('mousedown', expect.any(Function));
    expect(stage.off).toHaveBeenCalledWith('mousemove', expect.any(Function));
    expect(stage.off).toHaveBeenCalledWith('mouseup', expect.any(Function));
    expect(stage.off).toHaveBeenCalledWith('wheel', expect.any(Function));
    expect(stage.off).toHaveBeenCalledWith('touchstart', expect.any(Function));
    expect(stage.off).toHaveBeenCalledWith('touchmove', expect.any(Function));
    expect(stage.off).toHaveBeenCalledWith('touchend', expect.any(Function));
    expect(stage.off).toHaveBeenCalledTimes(7);

    vi.unstubAllGlobals();
  });

  it('uses getCanvasCoords to transform pointer to canvas coordinates', () => {
    getActiveTool = vi.fn((): ToolMode => 'select');
    createStageEventRouter(stage as unknown as Konva.Stage, getActiveTool, config);
    const handlers = stage.getHandlers();
    const onMouseDown = handlers.get('mousedown');
    expect(onMouseDown).toBeDefined();

    const evt = createMockEvent(stage, { x: 100, y: 200 });
    onMouseDown?.(evt);

    expect(getCanvasCoords).toHaveBeenCalledWith(stage, { x: 100, y: 200 });
    expect(controllers.marquee.onMarqueeStart).toHaveBeenCalledWith({
      x: 200,
      y: 400,
    } as IPosition);
  });

  it('dispatches mousedown to marquee when tool is select', () => {
    getActiveTool = vi.fn((): ToolMode => 'select');
    createStageEventRouter(stage as unknown as Konva.Stage, getActiveTool, config);
    const handlers = stage.getHandlers();
    const onMouseDown = handlers.get('mousedown');
    expect(onMouseDown).toBeDefined();

    onMouseDown?.(createMockEvent(stage));

    expect(controllers.marquee.onMarqueeStart).toHaveBeenCalledWith(
      expect.objectContaining({ x: 20, y: 40 })
    );
    expect(controllers.drawing.onDrawStart).not.toHaveBeenCalled();
  });

  it('dispatches mousedown to drawing when tool is a drag-drawing tool (e.g. rectangle)', () => {
    getActiveTool = vi.fn((): ToolMode => 'rectangle');
    createStageEventRouter(stage as unknown as Konva.Stage, getActiveTool, config);
    const handlers = stage.getHandlers();
    const onMouseDown = handlers.get('mousedown');
    expect(onMouseDown).toBeDefined();

    onMouseDown?.(createMockEvent(stage));

    expect(controllers.drawing.onDrawStart).toHaveBeenCalledWith(
      expect.objectContaining({ x: 20, y: 40 })
    );
    expect(controllers.marquee.onMarqueeStart).not.toHaveBeenCalled();
  });

  it('does not dispatch mousedown when tool is pan', () => {
    getActiveTool = vi.fn((): ToolMode => 'pan');
    createStageEventRouter(stage as unknown as Konva.Stage, getActiveTool, config);
    const handlers = stage.getHandlers();
    const onMouseDown = handlers.get('mousedown');
    expect(onMouseDown).toBeDefined();

    onMouseDown?.(createMockEvent(stage));

    expect(controllers.drawing.onDrawStart).not.toHaveBeenCalled();
    expect(controllers.marquee.onMarqueeStart).not.toHaveBeenCalled();
  });

  it('respects isEmptyArea: when false, does not call drawing or marquee start', () => {
    config.isEmptyArea = () => false;
    createStageEventRouter(stage as unknown as Konva.Stage, getActiveTool, config);
    const handlers = stage.getHandlers();
    const onMouseDown = handlers.get('mousedown');
    expect(onMouseDown).toBeDefined();

    onMouseDown?.(createMockEvent(stage));

    expect(controllers.drawing.onDrawStart).not.toHaveBeenCalled();
    expect(controllers.marquee.onMarqueeStart).not.toHaveBeenCalled();
  });

  it('RAF-throttles mousemove and flushes to onDrawMove and onMarqueeMove', () => {
    let rafCallback: (() => void) | null = null;
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((cb: () => void) => {
        rafCallback = cb;
        return 1;
      })
    );

    createStageEventRouter(stage as unknown as Konva.Stage, getActiveTool, config);
    const handlers = stage.getHandlers();
    const onMove = handlers.get('mousemove');
    expect(onMove).toBeDefined();

    onMove?.(createMockEvent(stage));
    expect(controllers.drawing.onDrawMove).not.toHaveBeenCalled();
    expect(controllers.marquee.onMarqueeMove).not.toHaveBeenCalled();

    expect(rafCallback).not.toBeNull();
    const flush: (() => void) | null = rafCallback;
    if (flush) {
      (flush as () => void)();
    }

    expect(controllers.drawing.onDrawMove).toHaveBeenCalledWith(
      expect.objectContaining({ x: 20, y: 40 })
    );
    expect(controllers.marquee.onMarqueeMove).toHaveBeenCalledWith(
      expect.objectContaining({ x: 20, y: 40 })
    );

    vi.unstubAllGlobals();
  });

  it('calls cursorBroadcast on mousemove when tool is not pan', () => {
    getActiveTool = vi.fn((): ToolMode => 'select');
    vi.stubGlobal('requestAnimationFrame', vi.fn((cb: () => void) => { cb(); return 1; }));

    createStageEventRouter(stage as unknown as Konva.Stage, getActiveTool, config);
    const handlers = stage.getHandlers();
    const onMove = handlers.get('mousemove');
    expect(onMove).toBeDefined();

    onMove?.(createMockEvent(stage));

    expect(controllers.cursorBroadcast).toHaveBeenCalledWith(20, 40);
    vi.unstubAllGlobals();
  });

  it('does not call cursorBroadcast on mousemove when tool is pan', () => {
    getActiveTool = vi.fn((): ToolMode => 'pan');
    vi.stubGlobal('requestAnimationFrame', vi.fn((cb: () => void) => { cb(); return 1; }));

    createStageEventRouter(stage as unknown as Konva.Stage, getActiveTool, config);
    const handlers = stage.getHandlers();
    const onMove = handlers.get('mousemove');
    expect(onMove).toBeDefined();

    onMove?.(createMockEvent(stage));

    expect(controllers.cursorBroadcast).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('on pointer up calls onDrawEnd and onMarqueeEnd', () => {
    const evt = createMockEvent(stage);

    createStageEventRouter(stage as unknown as Konva.Stage, getActiveTool, config);
    const handlers = stage.getHandlers();
    const onPointerUp = handlers.get('mouseup');
    expect(onPointerUp).toBeDefined();

    onPointerUp?.(evt);

    expect(controllers.drawing.onDrawEnd).toHaveBeenCalled();
    expect(controllers.marquee.onMarqueeEnd).toHaveBeenCalledWith(evt);
  });

  it('on pointer up with DragEvent calls viewport.handleDragEnd when provided', () => {
    const StubDragEvent = class extends Event {
      constructor() {
        super('dragend');
      }
    };
    vi.stubGlobal('DragEvent', StubDragEvent);
    const evt = {
      target: { getStage: () => stage },
      evt: new StubDragEvent(),
    } as unknown as Konva.KonvaEventObject<DragEvent>;
    stage.getPointerPosition.mockReturnValueOnce({ x: 10, y: 20 });

    const handleDragEnd = vi.fn();
    config.controllers.viewport.handleDragEnd = handleDragEnd;

    createStageEventRouter(stage as unknown as Konva.Stage, getActiveTool, config);
    const handlers = stage.getHandlers();
    const onPointerUp = handlers.get('mouseup');
    expect(onPointerUp).toBeDefined();

    onPointerUp?.(evt);

    expect(controllers.drawing.onDrawEnd).toHaveBeenCalled();
    expect(controllers.marquee.onMarqueeEnd).toHaveBeenCalledWith(evt);
    expect(handleDragEnd).toHaveBeenCalledWith(evt);

    vi.unstubAllGlobals();
  });

  it('on wheel calls viewport.handleWheel', () => {
    const wheelEvt = {
      target: { getStage: () => stage },
      evt: new WheelEvent('wheel'),
    } as unknown as Konva.KonvaEventObject<WheelEvent>;

    createStageEventRouter(stage as unknown as Konva.Stage, getActiveTool, config);
    const handlers = stage.getHandlers();
    const onWheel = handlers.get('wheel');
    expect(onWheel).toBeDefined();

    onWheel?.(wheelEvt);

    expect(controllers.viewport.handleWheel).toHaveBeenCalledWith(wheelEvt);
  });
});

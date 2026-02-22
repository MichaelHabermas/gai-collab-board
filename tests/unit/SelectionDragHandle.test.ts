import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

type EventHandler = (event: unknown) => void;

const { MockRect, MockLayer } = vi.hoisted(() => {
  class MockRect {
    public attrs: {
      x: number;
      y: number;
      width: number;
      height: number;
      visible: boolean;
      name?: string;
      draggable?: boolean;
      listening?: boolean;
      fill?: string;
    };
    public handlers = new Map<string, EventHandler>();

    constructor(config: {
      name?: string;
      draggable?: boolean;
      listening?: boolean;
      fill?: string;
    }) {
      this.attrs = {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        visible: true,
        name: config.name,
        draggable: config.draggable,
        listening: config.listening,
        fill: config.fill,
      };
      globalThis.__selectionDragHandleRect = this;
    }

    on(eventName: string, handler: EventHandler): void {
      this.handlers.set(eventName, handler);
    }

    trigger(eventName: string, event: unknown): void {
      const handler = this.handlers.get(eventName);
      if (handler) {
        handler(event);
      }
    }

    position(pos?: { x: number; y: number }): { x: number; y: number } | void {
      if (!pos) {
        return { x: this.attrs.x, y: this.attrs.y };
      }

      this.attrs.x = pos.x;
      this.attrs.y = pos.y;
    }

    width(value?: number): number | void {
      if (value === undefined) {
        return this.attrs.width;
      }

      this.attrs.width = value;
    }

    height(value?: number): number | void {
      if (value === undefined) {
        return this.attrs.height;
      }

      this.attrs.height = value;
    }

    visible(value?: boolean): boolean | void {
      if (value === undefined) {
        return this.attrs.visible;
      }

      this.attrs.visible = value;
    }

    destroy(): void {
      // no-op for tests
    }
  }

  class MockLayer {
    public add = vi.fn();

    constructor(_config?: { name?: string }) {}
  }

  return { MockRect, MockLayer };
});

declare global {
  // eslint-disable-next-line no-var
  var __selectionDragHandleRect: InstanceType<typeof MockRect> | undefined;
}

vi.mock('konva', () => {
  return {
    default: {
      Rect: MockRect,
      Layer: MockLayer,
    },
  };
});

import Konva from 'konva';
import { SelectionDragHandle } from '@/canvas/SelectionDragHandle';
import { useDragOffsetStore } from '@/stores/dragOffsetStore';

describe('SelectionDragHandle', () => {
  beforeEach(() => {
    globalThis.__selectionDragHandleRect = undefined;
    useDragOffsetStore.getState().clearDragState();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('wires drag and hover events', () => {
    const onDragStart = vi.fn();
    const onDragMove = vi.fn();
    const onDragEnd = vi.fn();
    const onMouseEnter = vi.fn();
    const onMouseLeave = vi.fn();
    const layer = new Konva.Layer({ name: 'active-layer' });
    const scheduleBatchDraw = vi.fn();

    const handle = new SelectionDragHandle({
      layer,
      scheduleBatchDraw,
      onDragStart,
      onDragMove,
      onDragEnd,
      onMouseEnter,
      onMouseLeave,
    });

    const rect = globalThis.__selectionDragHandleRect;
    if (!rect) {
      throw new Error('SelectionDragHandle did not create a rect.');
    }

    rect.trigger('dragstart', { type: 'dragstart' });
    rect.trigger('dragmove', { type: 'dragmove' });
    rect.trigger('dragend', { type: 'dragend' });
    rect.trigger('mouseenter', { type: 'mouseenter' });
    rect.trigger('mouseleave', { type: 'mouseleave' });

    expect(onDragStart).toHaveBeenCalledTimes(1);
    expect(onDragMove).toHaveBeenCalledTimes(1);
    expect(onDragEnd).toHaveBeenCalledTimes(1);
    expect(onMouseEnter).toHaveBeenCalledTimes(1);
    expect(onMouseLeave).toHaveBeenCalledTimes(1);

    handle.destroy();
  });

  it('updates rect position when bounds and groupDragOffset change', () => {
    const layer = new Konva.Layer({ name: 'active-layer' });
    const scheduleBatchDraw = vi.fn();
    const handle = new SelectionDragHandle({
      layer,
      scheduleBatchDraw,
      onDragStart: () => {},
      onDragMove: () => {},
      onDragEnd: () => {},
      onMouseEnter: () => {},
      onMouseLeave: () => {},
    });

    const rect = globalThis.__selectionDragHandleRect;
    if (!rect) {
      throw new Error('SelectionDragHandle did not create a rect.');
    }

    handle.setBounds({ x1: 10, y1: 20, x2: 30, y2: 50 });
    expect(rect.attrs.x).toBe(10);
    expect(rect.attrs.y).toBe(20);
    expect(rect.attrs.width).toBe(20);
    expect(rect.attrs.height).toBe(30);

    useDragOffsetStore.getState().setGroupDragOffset({ dx: 5, dy: -2 });
    expect(rect.attrs.x).toBe(15);
    expect(rect.attrs.y).toBe(18);

    handle.destroy();
  });
});

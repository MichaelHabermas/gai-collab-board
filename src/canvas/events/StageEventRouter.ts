/**
 * Stage-level event router: attaches mouse/touch/wheel to Konva.Stage and dispatches
 * by active tool to injected controllers. RAF-throttles mousemove/touchmove.
 * See docs/IMPERATIVE-KONVA-MIGRATION-V5.md Epic 3.
 */

import Konva from 'konva';
import type { ToolMode, IPosition } from '@/types';
import { isDrawingTool } from '@/types/tools';

export interface IStageEventRouterConfig {
  getCanvasCoords: (
    stage: Konva.Stage,
    pointer: { x: number; y: number }
  ) => { x: number; y: number };
  controllers: {
    drawing: {
      onDrawStart: (pos: IPosition) => void;
      onDrawMove: (pos: IPosition) => void;
      onDrawEnd: () => void;
    };
    marquee: {
      onMarqueeStart: (pos: IPosition) => void;
      onMarqueeMove: (pos: IPosition) => void;
      onMarqueeEnd: (e: Konva.KonvaEventObject<Event>) => void;
    };
    viewport: {
      handleWheel: (e: Konva.KonvaEventObject<WheelEvent>) => void;
      handleDragEnd?: (e: Konva.KonvaEventObject<DragEvent>) => void;
    };
    cursorBroadcast: (x: number, y: number) => void;
  };
  isEmptyArea?: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => boolean;
}

/**
 * Returns true when the event target is empty canvas (stage, layer, background).
 * Returns false when the target is a shape or the selection drag handle.
 */
interface INodeWithNameAndParent {
  name(): string;
  getParent(): INodeWithNameAndParent | null;
}

function hasNameAndParent(node: unknown): node is INodeWithNameAndParent {
  return (
    typeof node === 'object' &&
    node !== null &&
    'name' in node &&
    typeof (node as INodeWithNameAndParent).name === 'function' &&
    'getParent' in node &&
    typeof (node as INodeWithNameAndParent).getParent === 'function'
  );
}

export function defaultIsEmptyArea(e: Konva.KonvaEventObject<MouseEvent | TouchEvent>): boolean {
  let node: unknown = e.target;
  while (node) {
    if (!hasNameAndParent(node)) {
      return true;
    }

    const name = node.name() ?? '';
    if (name.includes('shape')) {
      return false;
    }

    if (name === 'selection-drag-handle') {
      return false;
    }

    node = node.getParent();
  }

  return true;
}

function isDragDrawingTool(tool: ToolMode): boolean {
  return isDrawingTool(tool) && tool !== 'connector';
}

function getCoords(
  e: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
  config: IStageEventRouterConfig
): IPosition | null {
  const stage = e.target.getStage();
  const pointer = stage?.getPointerPosition();
  if (!stage || !pointer) {
    return null;
  }

  return config.getCanvasCoords(stage, pointer);
}

export function createStageEventRouter(
  stage: Konva.Stage,
  getActiveTool: () => ToolMode,
  config: IStageEventRouterConfig
): { destroy: () => void } {
  const { controllers } = config;
  const isEmptyArea = config.isEmptyArea ?? defaultIsEmptyArea;

  let rafId: number | null = null;
  let pendingCoords: IPosition | null = null;

  const flushMove = () => {
    rafId = null;
    const coords = pendingCoords;
    pendingCoords = null;
    if (!coords) {
      return;
    }

    controllers.drawing.onDrawMove(coords);
    controllers.marquee.onMarqueeMove(coords);
  };

  const onPointerMove = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    const coords = getCoords(e, config);
    if (!coords) {
      return;
    }

    if (getActiveTool() !== 'pan') {
      controllers.cursorBroadcast(coords.x, coords.y);
    }

    pendingCoords = coords;
    if (!rafId) {
      rafId = requestAnimationFrame(flushMove);
    }
  };

  const onMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (getActiveTool() === 'pan') {
      return;
    }

    if (!isEmptyArea(e)) {
      return;
    }

    const coords = getCoords(e, config);
    if (!coords) {
      return;
    }

    const tool = getActiveTool();
    if (isDragDrawingTool(tool)) {
      controllers.drawing.onDrawStart(coords);
    } else if (tool === 'select') {
      controllers.marquee.onMarqueeStart(coords);
    }
  };

  const onTouchStart = (e: Konva.KonvaEventObject<TouchEvent>) => {
    if (getActiveTool() === 'pan') {
      return;
    }

    if (!isEmptyArea(e)) {
      return;
    }

    const coords = getCoords(e, config);
    if (!coords) {
      return;
    }

    const tool = getActiveTool();
    if (isDragDrawingTool(tool)) {
      controllers.drawing.onDrawStart(coords);
    } else if (tool === 'select') {
      controllers.marquee.onMarqueeStart(coords);
    }
  };

  const onPointerUp = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }

    pendingCoords = null;
    controllers.drawing.onDrawEnd();
    controllers.marquee.onMarqueeEnd(e);
    const { viewport } = controllers;
    if (viewport.handleDragEnd && e.evt instanceof DragEvent) {
      viewport.handleDragEnd(e as Konva.KonvaEventObject<DragEvent>);
    }
  };

  const onWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    controllers.viewport.handleWheel(e);
  };

  stage.on('mousedown', onMouseDown);
  stage.on('mousemove', onPointerMove);
  stage.on('mouseup', onPointerUp);
  stage.on('wheel', onWheel);
  stage.on('touchstart', onTouchStart);
  stage.on('touchmove', onPointerMove);
  stage.on('touchend', onPointerUp);

  function destroy() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }

    pendingCoords = null;
    stage.off('mousedown', onMouseDown);
    stage.off('mousemove', onPointerMove);
    stage.off('mouseup', onPointerUp);
    stage.off('wheel', onWheel);
    stage.off('touchstart', onTouchStart);
    stage.off('touchmove', onPointerMove);
    stage.off('touchend', onPointerUp);
  }

  return { destroy };
}

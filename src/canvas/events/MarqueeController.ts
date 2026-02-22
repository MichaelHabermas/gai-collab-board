/**
 * Marquee selection controller: start/move/end with AABB hit-test. No React state.
 * Replaces useMarqueeSelection. See docs/IMPERATIVE-KONVA-MIGRATION-V5.md Epic 3.
 */

import Konva from 'konva';
import type { IPosition } from '@/types';
import type { IBoardObject } from '@/types';
import { getObjectBounds } from '@/lib/canvasBounds';

const MIN_MARQUEE_SIZE = 5;

export interface IMarqueeRect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface IMarqueeOverlay {
  showMarquee(rect: IMarqueeRect): void;
  updateMarquee(rect: IMarqueeRect): void;
  hideMarquee(): void;
}

export interface IMarqueeControllerConfig {
  overlay: IMarqueeOverlay;
  getCanvasCoords: (stage: Konva.Stage, pointer: { x: number; y: number }) => IPosition;
  getObjectsRecord: () => Record<string, IBoardObject>;
  setSelectedIds: (ids: string[]) => void;
}

export interface IMarqueeController {
  onMarqueeStart: (pos: IPosition) => void;
  onMarqueeMove: (pos: IPosition) => void;
  onMarqueeEnd: (e: Konva.KonvaEventObject<Event>) => void;
}

export function createMarqueeController(config: IMarqueeControllerConfig): IMarqueeController {
  const { overlay, getCanvasCoords, getObjectsRecord, setSelectedIds } = config;

  let start: IPosition | null = null;

  function getPointerFromEvent(e: Konva.KonvaEventObject<Event>): {
    x: number;
    y: number;
  } | null {
    const stage = e.target.getStage();
    if (!stage) {
      return null;
    }

    const pointer = stage.getPointerPosition();
    if (pointer) {
      return pointer;
    }

    const evt = e.evt as MouseEvent;
    const container = stage.container();
    const rect = container.getBoundingClientRect();
    return {
      x: evt.clientX - rect.left,
      y: evt.clientY - rect.top,
    };
  }

  function onMarqueeStart(pos: IPosition): void {
    start = { x: pos.x, y: pos.y };
    overlay.showMarquee({ x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y });
  }

  function onMarqueeMove(pos: IPosition): void {
    if (!start) {
      return;
    }

    const x1 = Math.min(start.x, pos.x);
    const y1 = Math.min(start.y, pos.y);
    const x2 = Math.max(start.x, pos.x);
    const y2 = Math.max(start.y, pos.y);
    overlay.updateMarquee({ x1, y1, x2, y2 });
  }

  function onMarqueeEnd(e: Konva.KonvaEventObject<Event>): void {
    if (!start) {
      overlay.hideMarquee();
      return;
    }

    const pointer = getPointerFromEvent(e);
    if (!pointer) {
      overlay.hideMarquee();
      start = null;
      return;
    }

    const stage = e.target.getStage();
    if (!stage) {
      overlay.hideMarquee();
      start = null;
      return;
    }

    const end = getCanvasCoords(stage, pointer);
    const selX1 = Math.min(start.x, end.x);
    const selY1 = Math.min(start.y, end.y);
    const selX2 = Math.max(start.x, end.x);
    const selY2 = Math.max(start.y, end.y);

    if (Math.abs(selX2 - selX1) > MIN_MARQUEE_SIZE && Math.abs(selY2 - selY1) > MIN_MARQUEE_SIZE) {
      const objectsRecord = getObjectsRecord();
      const objects = Object.values(objectsRecord);
      const selectedIds = objects
        .filter((obj) => {
          const { x1: objX1, y1: objY1, x2: objX2, y2: objY2 } = getObjectBounds(obj);
          return objX1 < selX2 && objX2 > selX1 && objY1 < selY2 && objY2 > selY1;
        })
        .map((obj) => obj.id);
      setSelectedIds(selectedIds);
    }

    overlay.hideMarquee();
    start = null;
  }

  return {
    onMarqueeStart,
    onMarqueeMove,
    onMarqueeEnd,
  };
}

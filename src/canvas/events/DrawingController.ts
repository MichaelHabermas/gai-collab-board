/**
 * Drawing controller: start/move/end with min 5px, overlay preview, onCreate on commit.
 * No React state. Replaces useShapeDrawing. See docs/IMPERATIVE-KONVA-MIGRATION-V5.md Epic 3.
 */

import type { ToolMode, IPosition } from '@/types';
import type { IBoardObject, ICreateObjectParams } from '@/types';
import { DEFAULT_SHAPE_STROKE, DEFAULT_SHAPE_STROKE_WIDTH } from '@/lib/boardObjectDefaults';

const MIN_DRAW_SIZE = 5;

export interface IDrawingState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

export interface IDrawingOverlay {
  showDrawingPreview(tool: ToolMode, color: string): void;
  updateDrawingPreview(state: IDrawingState, tool: ToolMode, color: string): void;
  hideDrawingPreview(): void;
}

export interface IDrawingControllerConfig {
  overlay: IDrawingOverlay;
  getTool: () => ToolMode;
  getColor: () => string;
  onCreate: (params: Omit<ICreateObjectParams, 'createdBy'>) => Promise<IBoardObject | null>;
  onSuccess?: () => void;
}

export interface IDrawingController {
  onDrawStart: (pos: IPosition) => void;
  onDrawMove: (pos: IPosition) => void;
  onDrawEnd: () => void;
}

export function createDrawingController(config: IDrawingControllerConfig): IDrawingController {
  const { overlay, getTool, getColor, onCreate, onSuccess } = config;

  let state: IDrawingState | null = null;

  function onDrawStart(pos: IPosition): void {
    state = {
      startX: pos.x,
      startY: pos.y,
      currentX: pos.x,
      currentY: pos.y,
    };
    overlay.showDrawingPreview(getTool(), getColor());
  }

  function onDrawMove(pos: IPosition): void {
    if (!state) {
      return;
    }

    state = {
      ...state,
      currentX: pos.x,
      currentY: pos.y,
    };
    overlay.updateDrawingPreview(state, getTool(), getColor());
  }

  async function onDrawEnd(): Promise<void> {
    const s = state;
    state = null;
    overlay.hideDrawingPreview();
    if (!s) {
      return;
    }

    const x = Math.min(s.startX, s.currentX);
    const y = Math.min(s.startY, s.currentY);
    const width = Math.abs(s.currentX - s.startX);
    const height = Math.abs(s.currentY - s.startY);

    if (width <= MIN_DRAW_SIZE || height <= MIN_DRAW_SIZE) {
      return;
    }

    const tool = getTool();
    let result: IBoardObject | null = null;

    if (tool === 'rectangle') {
      result = await onCreate({
        type: 'rectangle',
        x,
        y,
        width: Math.max(width, 20),
        height: Math.max(height, 20),
        fill: getColor(),
        stroke: DEFAULT_SHAPE_STROKE,
        strokeWidth: DEFAULT_SHAPE_STROKE_WIDTH,
        rotation: 0,
      });
    } else if (tool === 'circle') {
      result = await onCreate({
        type: 'circle',
        x,
        y,
        width: Math.max(width, 20),
        height: Math.max(height, 20),
        fill: getColor(),
        stroke: DEFAULT_SHAPE_STROKE,
        strokeWidth: DEFAULT_SHAPE_STROKE_WIDTH,
        rotation: 0,
      });
    } else if (tool === 'line') {
      result = await onCreate({
        type: 'line',
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        points: [s.startX, s.startY, s.currentX, s.currentY],
        fill: 'transparent',
        stroke: getColor(),
        strokeWidth: 3,
        rotation: 0,
      });
    } else if (tool === 'frame') {
      result = await onCreate({
        type: 'frame',
        x,
        y,
        width: Math.max(width, 150),
        height: Math.max(height, 100),
        fill: 'rgba(241, 245, 249, 0.5)',
        stroke: '#94a3b8',
        strokeWidth: 2,
        text: 'Frame',
        rotation: 0,
      });
    }

    if (result && onSuccess) {
      onSuccess();
    }
  }

  return {
    onDrawStart,
    onDrawMove,
    onDrawEnd,
  };
}

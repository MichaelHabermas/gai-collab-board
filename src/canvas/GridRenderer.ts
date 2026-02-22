import Konva from 'konva';
import type { IViewportState } from '@/types';

export const GRID_SIZE = 20;
export const GRID_STROKE_WIDTH = 1;
export const GRID_LINE_OPACITY = 0.5;

export type IGridSceneContext = Pick<Konva.Context, 'setAttr' | 'fillRect'>;

export interface IGridRendererConfig {
  layer: Konva.Layer;
  scheduleBatchDraw: (layer: Konva.Layer) => void;
}

export interface IGridRendererUpdate {
  viewport: IViewportState;
  gridColor: string;
  showGrid: boolean;
}

export function createGridSceneFunc(
  viewport: IViewportState,
  gridColor: string
): (ctx: IGridSceneContext) => void {
  const { position, scale, width, height } = viewport;
  const startX = Math.floor(-position.x / scale.x / GRID_SIZE) * GRID_SIZE - GRID_SIZE;
  const endX = Math.ceil((-position.x + width) / scale.x / GRID_SIZE) * GRID_SIZE + GRID_SIZE;
  const startY = Math.floor(-position.y / scale.y / GRID_SIZE) * GRID_SIZE - GRID_SIZE;
  const endY = Math.ceil((-position.y + height) / scale.y / GRID_SIZE) * GRID_SIZE + GRID_SIZE;
  const lineWidthX = GRID_STROKE_WIDTH / scale.x;
  const lineWidthY = GRID_STROKE_WIDTH / scale.y;
  const color = gridColor;

  return (ctx: IGridSceneContext) => {
    ctx.setAttr('globalAlpha', GRID_LINE_OPACITY);
    ctx.setAttr('fillStyle', color);

    for (let x = startX; x <= endX; x += GRID_SIZE) {
      ctx.fillRect(x, startY, lineWidthX, endY - startY);
    }

    for (let y = startY; y <= endY; y += GRID_SIZE) {
      ctx.fillRect(startX, y, endX - startX, lineWidthY);
    }
  };
}

export class GridRenderer {
  private readonly layer: Konva.Layer;
  private readonly scheduleBatchDraw: (layer: Konva.Layer) => void;
  private readonly shape: Konva.Shape;

  constructor(config: IGridRendererConfig) {
    this.layer = config.layer;
    this.scheduleBatchDraw = config.scheduleBatchDraw;
    this.shape = new Konva.Shape({
      name: 'grid',
      listening: false,
      perfectDrawEnabled: false,
    });

    this.shape.visible(false);
    this.layer.add(this.shape);
  }

  update(config: IGridRendererUpdate): void {
    const { viewport, gridColor, showGrid } = config;
    if (!showGrid) {
      this.shape.visible(false);
      this.scheduleBatchDraw(this.layer);

      return;
    }

    this.shape.visible(true);
    this.shape.sceneFunc(createGridSceneFunc(viewport, gridColor));
    this.scheduleBatchDraw(this.layer);
  }

  destroy(): void {
    this.shape.destroy();
  }
}

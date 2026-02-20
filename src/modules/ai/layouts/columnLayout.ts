import type { ICreateObjectParams } from '@/types';
import {
  resolveStickyColor,
  findOpenSpace,
  DEFAULT_STICKY_WIDTH,
  DEFAULT_STICKY_HEIGHT,
  DEFAULT_FRAME_PADDING,
  FRAME_PLACEHOLDER_ID,
  type BoundedObject,
  type ILayoutResult,
} from './layoutUtils';

interface IColumnConfig {
  title: string;
  columns: Array<{
    heading: string;
    color?: string;
    items: string[];
  }>;
  x?: number;
  y?: number;
}

const COLUMN_WIDTH = DEFAULT_STICKY_WIDTH + 40; // 240px
const COLUMN_GAP = 20;
const STICKY_GAP = 15;
const HEADING_HEIGHT = 40;

function computeMaxItemCount(columns: IColumnConfig['columns']): number {
  let max = 0;

  for (const col of columns) {
    max = Math.max(max, col.items.length);
  }

  return Math.max(max, 1);
}

function buildHeading(
  text: string,
  x: number,
  y: number,
  color: string,
  createdBy: string,
): ICreateObjectParams {
  return {
    type: 'text',
    x,
    y,
    width: COLUMN_WIDTH,
    height: 30,
    fill: 'transparent',
    text,
    textFill: color,
    fontSize: 18,
    parentFrameId: FRAME_PLACEHOLDER_ID,
    createdBy,
  };
}

function buildSticky(
  text: string,
  x: number,
  y: number,
  color: string,
  createdBy: string,
): ICreateObjectParams {
  return {
    type: 'sticky',
    x,
    y,
    width: DEFAULT_STICKY_WIDTH,
    height: DEFAULT_STICKY_HEIGHT,
    fill: color,
    text,
    parentFrameId: FRAME_PLACEHOLDER_ID,
    createdBy,
  };
}

function computeColumnLayout(
  config: IColumnConfig,
  existingObjects: BoundedObject[],
  createdBy: string,
): ILayoutResult {
  const colCount = config.columns.length;
  const maxItems = computeMaxItemCount(config.columns);

  const gridW = COLUMN_WIDTH * colCount + COLUMN_GAP * Math.max(colCount - 1, 0);
  const gridH = HEADING_HEIGHT + maxItems * (DEFAULT_STICKY_HEIGHT + STICKY_GAP);
  const totalW = gridW + DEFAULT_FRAME_PADDING * 2;
  const totalH = gridH + DEFAULT_FRAME_PADDING * 2;

  const origin =
    config.x != null && config.y != null
      ? { x: config.x, y: config.y }
      : findOpenSpace(existingObjects, totalW, totalH);

  const frame: ICreateObjectParams = {
    type: 'frame',
    x: origin.x,
    y: origin.y,
    width: totalW,
    height: totalH,
    fill: 'rgba(255,255,255,0.15)',
    text: config.title,
    createdBy,
  };

  const objects: ICreateObjectParams[] = [frame];
  const contentX = origin.x + DEFAULT_FRAME_PADDING;
  const contentY = origin.y + DEFAULT_FRAME_PADDING;

  for (let c = 0; c < colCount; c++) {
    const col = config.columns[c];
    if (!col) continue;

    const colX = contentX + c * (COLUMN_WIDTH + COLUMN_GAP);
    const color = resolveStickyColor(col.color);

    objects.push(buildHeading(col.heading, colX, contentY, color, createdBy));

    const stickyStartY = contentY + HEADING_HEIGHT;
    const stickyX = colX + (COLUMN_WIDTH - DEFAULT_STICKY_WIDTH) / 2;

    for (let i = 0; i < col.items.length; i++) {
      const item = col.items[i];
      if (item == null) continue;

      const sy = stickyStartY + i * (DEFAULT_STICKY_HEIGHT + STICKY_GAP);
      objects.push(buildSticky(item, stickyX, sy, color, createdBy));
    }
  }

  return { objects, frameId: FRAME_PLACEHOLDER_ID };
}

export { computeColumnLayout };
export type { IColumnConfig };

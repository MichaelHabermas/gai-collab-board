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

interface IQuadrantInput {
  label: string;
  color?: string;
  items: string[];
}

interface IQuadrantConfig {
  title: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  quadrants: {
    topLeft: IQuadrantInput;
    topRight: IQuadrantInput;
    bottomLeft: IQuadrantInput;
    bottomRight: IQuadrantInput;
  };
  x?: number;
  y?: number;
}

const CELL_GAP = 20;
const SECTION_HEADER_HEIGHT = 50;
const STICKY_GAP = 15;
const MIN_CELL_WIDTH = 440;
const STICKIES_PER_ROW_THRESHOLD = 3;

function computeCellWidth(): number {
  return Math.max(2 * DEFAULT_STICKY_WIDTH + 40, MIN_CELL_WIDTH);
}

function computeCellHeight(itemCount: number): number {
  const rows = Math.max(itemCount, 2);

  return rows * (DEFAULT_STICKY_HEIGHT + STICKY_GAP) + SECTION_HEADER_HEIGHT;
}

function buildSectionLabel(
  text: string,
  x: number,
  y: number,
  color: string,
  createdBy: string
): ICreateObjectParams {
  return {
    type: 'text',
    x,
    y,
    width: 200,
    height: 30,
    fill: 'transparent',
    text,
    textFill: color,
    fontSize: 18,
    parentFrameId: FRAME_PLACEHOLDER_ID,
    createdBy,
  };
}

function buildStickyNote(
  text: string,
  x: number,
  y: number,
  color: string,
  createdBy: string
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

function layoutQuadrantStickies(
  items: string[],
  cellX: number,
  cellY: number,
  color: string,
  createdBy: string
): ICreateObjectParams[] {
  const cols = items.length > STICKIES_PER_ROW_THRESHOLD ? 2 : 1;
  const stickyStartY = cellY + SECTION_HEADER_HEIGHT;

  return items.map((text, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const sx = cellX + col * (DEFAULT_STICKY_WIDTH + STICKY_GAP);
    const sy = stickyStartY + row * (DEFAULT_STICKY_HEIGHT + STICKY_GAP);

    return buildStickyNote(text, sx, sy, color, createdBy);
  });
}

function buildAxisLines(
  originX: number,
  originY: number,
  totalWidth: number,
  totalHeight: number,
  createdBy: string
): ICreateObjectParams[] {
  const hLineY = originY + totalHeight / 2;
  const vLineX = originX + totalWidth / 2;

  const horizontal: ICreateObjectParams = {
    type: 'line',
    x: originX,
    y: hLineY,
    width: totalWidth,
    height: 0,
    fill: 'transparent',
    stroke: '#94a3b8',
    strokeWidth: 2,
    points: [0, 0, totalWidth, 0],
    parentFrameId: FRAME_PLACEHOLDER_ID,
    createdBy,
  };

  const vertical: ICreateObjectParams = {
    type: 'line',
    x: vLineX,
    y: originY,
    width: 0,
    height: totalHeight,
    fill: 'transparent',
    stroke: '#94a3b8',
    strokeWidth: 2,
    points: [0, 0, 0, totalHeight],
    parentFrameId: FRAME_PLACEHOLDER_ID,
    createdBy,
  };

  return [horizontal, vertical];
}

function buildAxisLabels(
  originX: number,
  originY: number,
  totalWidth: number,
  totalHeight: number,
  xLabel: string | undefined,
  yLabel: string | undefined,
  createdBy: string
): ICreateObjectParams[] {
  const labels: ICreateObjectParams[] = [];

  if (xLabel) {
    labels.push({
      type: 'text',
      x: originX + totalWidth - 120,
      y: originY + totalHeight / 2 + 8,
      width: 120,
      height: 24,
      fill: 'transparent',
      text: xLabel,
      textFill: '#64748b',
      fontSize: 14,
      parentFrameId: FRAME_PLACEHOLDER_ID,
      createdBy,
    });
  }

  if (yLabel) {
    labels.push({
      type: 'text',
      x: originX + totalWidth / 2 + 8,
      y: originY + 4,
      width: 120,
      height: 24,
      fill: 'transparent',
      text: yLabel,
      textFill: '#64748b',
      fontSize: 14,
      parentFrameId: FRAME_PLACEHOLDER_ID,
      createdBy,
    });
  }

  return labels;
}

function computeQuadrantLayout(
  config: IQuadrantConfig,
  existingObjects: BoundedObject[],
  createdBy: string
): ILayoutResult {
  const { quadrants } = config;
  const entries: [string, IQuadrantInput][] = [
    ['topLeft', quadrants.topLeft],
    ['topRight', quadrants.topRight],
    ['bottomLeft', quadrants.bottomLeft],
    ['bottomRight', quadrants.bottomRight],
  ];

  const cellW = computeCellWidth();
  const maxTop = Math.max(
    computeCellHeight(quadrants.topLeft.items.length),
    computeCellHeight(quadrants.topRight.items.length)
  );
  const maxBottom = Math.max(
    computeCellHeight(quadrants.bottomLeft.items.length),
    computeCellHeight(quadrants.bottomRight.items.length)
  );
  const gridW = cellW * 2 + CELL_GAP;
  const gridH = maxTop + maxBottom + CELL_GAP;
  const totalW = gridW + DEFAULT_FRAME_PADDING * 2;
  const totalH = gridH + DEFAULT_FRAME_PADDING * 2;

  const origin =
    config.x != null && config.y != null
      ? { x: config.x, y: config.y }
      : findOpenSpace(existingObjects, totalW, totalH);

  const gridX = origin.x + DEFAULT_FRAME_PADDING;
  const gridY = origin.y + DEFAULT_FRAME_PADDING;

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

  objects.push(...buildAxisLines(gridX, gridY, gridW, gridH, createdBy));
  objects.push(
    ...buildAxisLabels(gridX, gridY, gridW, gridH, config.xAxisLabel, config.yAxisLabel, createdBy)
  );

  const cellPositions: Record<string, { x: number; y: number }> = {
    topLeft: { x: gridX, y: gridY },
    topRight: { x: gridX + cellW + CELL_GAP, y: gridY },
    bottomLeft: { x: gridX, y: gridY + maxTop + CELL_GAP },
    bottomRight: { x: gridX + cellW + CELL_GAP, y: gridY + maxTop + CELL_GAP },
  };

  for (const [key, quad] of entries) {
    const pos = cellPositions[key];
    if (!pos) continue;

    const color = resolveStickyColor(quad.color);
    objects.push(buildSectionLabel(quad.label, pos.x, pos.y, color, createdBy));
    objects.push(...layoutQuadrantStickies(quad.items, pos.x, pos.y, color, createdBy));
  }

  return { objects, frameId: FRAME_PLACEHOLDER_ID };
}

export { computeQuadrantLayout };
export type { IQuadrantConfig, IQuadrantInput };

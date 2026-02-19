import type { StrokeStyle } from '@/types';

/** Konva dash arrays for each stroke style. */
const STROKE_DASH_MAP: Record<StrokeStyle, number[] | undefined> = {
  solid: undefined,
  dashed: [8, 8],
  dotted: [2, 4],
};

/** Convert a StrokeStyle value to a Konva-compatible dash array. */
export const getStrokeDash = (style: StrokeStyle | undefined): number[] | undefined => {
  return STROKE_DASH_MAP[style ?? 'solid'];
};

import { useMemo, useCallback } from 'react';
import { getPointsCenter } from '@/lib/lineTransform';
import { useShapeDragHandler } from '@/hooks/useShapeDragHandler';
import { useShapeTransformHandler } from '@/hooks/useShapeTransformHandler';
import type { ITransformEndAttrsUnion, ITransformEndLineAttrs } from '@/types';

interface IUseLineLikeShapeParams {
  points: number[];
  onDragEnd?: (x: number, y: number) => void;
  onTransformEnd?: (attrs: ITransformEndLineAttrs) => void;
}

export interface IUseLineLikeShapeResult {
  offset: { x: number; y: number };
  handleDragEnd: ReturnType<typeof useShapeDragHandler>;
  handleTransformEnd: ReturnType<typeof useShapeTransformHandler>;
}

function isLineAttrs(attrs: ITransformEndAttrsUnion): attrs is ITransformEndLineAttrs {
  return 'points' in attrs;
}

/**
 * Shared hook for line-like shapes (Line, Connector): offset for rotation pivot
 * and drag-end origin correction, plus transform handler. Use in LineShape and Connector.
 */
export function useLineLikeShape({
  points,
  onDragEnd,
  onTransformEnd,
}: IUseLineLikeShapeParams): IUseLineLikeShapeResult {
  const offset = useMemo(() => getPointsCenter(points), [points]);
  const handleDragEnd = useShapeDragHandler(onDragEnd, {
    offsetX: offset.x,
    offsetY: offset.y,
  });

  const wrappedTransformEnd = useCallback(
    (attrs: ITransformEndAttrsUnion) => {
      if (isLineAttrs(attrs)) {
        onTransformEnd?.(attrs);
      }
    },
    [onTransformEnd]
  );

  const handleTransformEnd = useShapeTransformHandler(
    'line',
    onTransformEnd ? wrappedTransformEnd : undefined
  );

  return { offset, handleDragEnd, handleTransformEnd };
}

import { Ellipse } from 'react-konva';
import { forwardRef, memo } from 'react';
import type { ReactElement } from 'react';
import Konva from 'konva';
import { useShapeDragHandler } from '@/hooks/useShapeDragHandler';
import { useShapeTransformHandler } from '@/hooks/useShapeTransformHandler';
import { useKonvaCache } from '@/hooks/useKonvaCache';
import { getShapeShadowProps } from '@/lib/shapeShadowProps';
import { DEFAULT_SHAPE_STROKE, DEFAULT_SHAPE_STROKE_WIDTH } from '@/lib/boardObjectDefaults';
import type { IRectLikeShapeProps, ITransformEndAttrsUnion } from '@/types';

type ICircleShapeProps = IRectLikeShapeProps;

/**
 * Circle/Ellipse shape component with selection and transformation support.
 * Uses width/height to create an ellipse (circle when width === height).
 */
export const CircleShape = memo(
  forwardRef<Konva.Ellipse, ICircleShapeProps>(
    (
      {
        id,
        x,
        y,
        width,
        height,
        fill,
        stroke = DEFAULT_SHAPE_STROKE,
        strokeWidth = DEFAULT_SHAPE_STROKE_WIDTH,
        opacity = 1,
        rotation = 0,
        isSelected = false,
        draggable = true,
        onSelect,
        onDragStart,
        onDragEnd,
        onDragMove,
        dragBoundFunc,
        onTransformEnd,
      },
      ref
    ): ReactElement => {
      const [cacheRef] = useKonvaCache<Konva.Ellipse>(ref, !isSelected, [
        fill,
        stroke,
        strokeWidth,
        width,
        height,
        opacity,
      ]);
      const radiusX = width / 2;
      const radiusY = height / 2;

      const handleDragEnd = useShapeDragHandler(onDragEnd, {
        offsetX: radiusX,
        offsetY: radiusY,
      });
      const handleTransformEnd = useShapeTransformHandler(
        'ellipse',
        onTransformEnd as ((attrs: ITransformEndAttrsUnion) => void) | undefined
      );

      return (
        <Ellipse
          ref={cacheRef}
          id={id}
          name='shape circle'
          // Ellipse uses center position, so offset from stored top-left
          x={x + radiusX}
          y={y + radiusY}
          radiusX={radiusX}
          radiusY={radiusY}
          fill={fill}
          stroke={isSelected ? '#3b82f6' : stroke}
          strokeWidth={isSelected ? 2 : strokeWidth}
          opacity={opacity}
          rotation={rotation}
          draggable={draggable}
          onClick={onSelect}
          onTap={onSelect}
          onDragStart={onDragStart}
          onDragEnd={handleDragEnd}
          onDragMove={onDragMove}
          dragBoundFunc={dragBoundFunc}
          onTransformEnd={handleTransformEnd}
          {...getShapeShadowProps(isSelected, { includeShadowForStrokeEnabled: true })}
          perfectDrawEnabled={false}
        />
      );
    }
  )
);

CircleShape.displayName = 'CircleShape';

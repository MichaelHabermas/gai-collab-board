import { Rect } from 'react-konva';
import { forwardRef, memo } from 'react';
import type { ReactElement } from 'react';
import Konva from 'konva';
import { useShapeDragHandler } from '@/hooks/useShapeDragHandler';
import { useShapeTransformHandler } from '@/hooks/useShapeTransformHandler';
import { getShapeShadowProps } from '@/lib/shapeShadowProps';
import type { IRectLikeShapeProps, ITransformEndAttrsUnion } from '@/types';

type IRectangleShapeProps = IRectLikeShapeProps;

/**
 * Rectangle shape component with selection and transformation support.
 */
export const RectangleShape = memo(
  forwardRef<Konva.Rect, IRectangleShapeProps>(
    (
      {
        id,
        x,
        y,
        width,
        height,
        fill,
        stroke = '#1e293b',
        strokeWidth = 2,
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
      const handleDragEnd = useShapeDragHandler(onDragEnd);
      const handleTransformEnd = useShapeTransformHandler(
        'rect',
        onTransformEnd as ((attrs: ITransformEndAttrsUnion) => void) | undefined
      );

      return (
        <Rect
          ref={ref}
          id={id}
          name='shape rectangle'
          x={x}
          y={y}
          width={width}
          height={height}
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

RectangleShape.displayName = 'RectangleShape';

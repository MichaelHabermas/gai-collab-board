import { Rect } from 'react-konva';
import { forwardRef, useCallback, memo } from 'react';
import type { ReactElement } from 'react';
import Konva from 'konva';
import { useShapeDragHandler } from '@/hooks/useShapeDragHandler';
import { getShapeShadowProps } from '@/lib/shapeShadowProps';
import type { IRectLikeShapeProps } from '@/types';

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
        dragBoundFunc,
        onTransformEnd,
      },
      ref
    ): ReactElement => {
      const handleDragEnd = useShapeDragHandler(onDragEnd);

      // Handle transform end
      const handleTransformEnd = useCallback(
        (e: Konva.KonvaEventObject<Event>) => {
          const node = e.target as Konva.Rect;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();

          // Reset scale and apply to width/height
          node.scaleX(1);
          node.scaleY(1);

          onTransformEnd?.({
            x: node.x(),
            y: node.y(),
            width: Math.max(10, node.width() * scaleX),
            height: Math.max(10, node.height() * scaleY),
            rotation: node.rotation(),
          });
        },
        [onTransformEnd]
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

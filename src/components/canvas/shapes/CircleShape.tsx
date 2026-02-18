import { Ellipse } from 'react-konva';
import { forwardRef, useCallback, memo } from 'react';
import type { ReactElement } from 'react';
import Konva from 'konva';
import { useShapeDragHandler } from '@/hooks/useShapeDragHandler';
import { getShapeShadowProps } from '@/lib/shapeShadowProps';
import type { IRectLikeShapeProps } from '@/types';

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
      // Calculate radii from width/height
      const radiusX = width / 2;
      const radiusY = height / 2;

      // Ellipse x,y is center, but persisted coordinates are top-left.
      const handleDragEnd = useShapeDragHandler(onDragEnd, {
        offsetX: radiusX,
        offsetY: radiusY,
      });

      // Handle transform end
      const handleTransformEnd = useCallback(
        (e: Konva.KonvaEventObject<Event>) => {
          const node = e.target as Konva.Ellipse;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();

          // Reset scale
          node.scaleX(1);
          node.scaleY(1);

          const newRadiusX = Math.max(10, node.radiusX() * scaleX);
          const newRadiusY = Math.max(10, node.radiusY() * scaleY);

          onTransformEnd?.({
            x: node.x() - newRadiusX,
            y: node.y() - newRadiusY,
            width: newRadiusX * 2,
            height: newRadiusY * 2,
            rotation: node.rotation(),
          });
        },
        [onTransformEnd]
      );

      return (
        <Ellipse
          ref={ref}
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

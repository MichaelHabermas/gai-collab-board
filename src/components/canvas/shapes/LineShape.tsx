import { Line } from 'react-konva';
import { forwardRef, useCallback, memo } from 'react';
import type { ReactElement } from 'react';
import Konva from 'konva';
import { useShapeDragHandler } from '@/hooks/useShapeDragHandler';
import { getShapeShadowProps } from '@/lib/shapeShadowProps';
import type { ILineLikeShapeProps } from '@/types';

type ILineShapeProps = ILineLikeShapeProps;

/**
 * Line shape component with selection and transformation support.
 * Points are relative to the shape's x,y position.
 */
export const LineShape = memo(
  forwardRef<Konva.Line, ILineShapeProps>(
    (
      {
        id,
        x,
        y,
        points,
        stroke,
        strokeWidth = 3,
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
          const node = e.target as Konva.Line;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();

          // Scale points
          const currentPoints = node.points();
          const scaledPoints = currentPoints.map((p, i) => (i % 2 === 0 ? p * scaleX : p * scaleY));

          // Reset scale
          node.scaleX(1);
          node.scaleY(1);

          onTransformEnd?.({
            x: node.x(),
            y: node.y(),
            points: scaledPoints,
            rotation: node.rotation(),
          });
        },
        [onTransformEnd]
      );

      return (
        <Line
          ref={ref}
          id={id}
          name='shape line'
          x={x}
          y={y}
          points={points}
          stroke={isSelected ? '#3b82f6' : stroke}
          strokeWidth={isSelected ? strokeWidth + 1 : strokeWidth}
          opacity={opacity}
          rotation={rotation}
          lineCap='round'
          lineJoin='round'
          {...getShapeShadowProps(isSelected)}
          hitStrokeWidth={Math.max(20, strokeWidth * 3)} // Larger hit area for easier selection
          draggable={draggable}
          onClick={onSelect}
          onTap={onSelect}
          onDragStart={onDragStart}
          onDragEnd={handleDragEnd}
          dragBoundFunc={dragBoundFunc}
          onTransformEnd={handleTransformEnd}
          perfectDrawEnabled={false}
        />
      );
    }
  )
);

LineShape.displayName = 'LineShape';

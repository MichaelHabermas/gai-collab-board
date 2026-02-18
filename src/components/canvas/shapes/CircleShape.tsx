import { Ellipse } from 'react-konva';
import { forwardRef, useCallback, memo } from 'react';
import type { ReactElement } from 'react';
import Konva from 'konva';

interface ICircleShapeProps {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  rotation?: number;
  isSelected?: boolean;
  draggable?: boolean;
  onSelect?: () => void;
  onDragStart?: () => void;
  onDragEnd?: (x: number, y: number) => void;
  dragBoundFunc?: (pos: { x: number; y: number }) => { x: number; y: number };
  onTransformEnd?: (attrs: {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
  }) => void;
}

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

      // Handle drag end - report center position adjusted to top-left for consistency
      const handleDragEnd = useCallback(
        (e: Konva.KonvaEventObject<DragEvent>) => {
          // Ellipse x,y is center, but we store as top-left
          onDragEnd?.(e.target.x() - radiusX, e.target.y() - radiusY);
        },
        [onDragEnd, radiusX, radiusY]
      );

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
          shadowColor='rgba(0, 0, 0, 0.1)'
          shadowBlur={isSelected ? 8 : 4}
          shadowOpacity={0.3}
          shadowOffsetX={2}
          shadowOffsetY={2}
        />
      );
    }
  )
);

CircleShape.displayName = 'CircleShape';

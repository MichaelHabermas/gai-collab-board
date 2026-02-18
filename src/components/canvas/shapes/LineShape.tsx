import { Line } from 'react-konva';
import { forwardRef, useCallback, memo } from 'react';
import type { ReactElement } from 'react';
import Konva from 'konva';
import {
  SHADOW_BLUR_DEFAULT,
  SHADOW_BLUR_SELECTED,
  SHADOW_COLOR,
  SHADOW_OPACITY,
  SHADOW_OFFSET_X,
  SHADOW_OFFSET_Y,
} from '@/lib/canvasShadows';

interface ILineShapeProps {
  id: string;
  x: number;
  y: number;
  points: number[];
  stroke: string;
  strokeWidth?: number;
  opacity?: number;
  rotation?: number;
  isSelected?: boolean;
  draggable?: boolean;
  onSelect?: () => void;
  onDragStart?: () => void;
  onDragEnd?: (x: number, y: number) => void;
  dragBoundFunc?: (pos: { x: number; y: number }) => { x: number; y: number };
  onTransformEnd?: (attrs: { x: number; y: number; points: number[]; rotation: number }) => void;
}

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
      // Handle drag end
      const handleDragEnd = useCallback(
        (e: Konva.KonvaEventObject<DragEvent>) => {
          onDragEnd?.(e.target.x(), e.target.y());
        },
        [onDragEnd]
      );

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
          shadowColor={SHADOW_COLOR}
          shadowBlur={isSelected ? SHADOW_BLUR_SELECTED : SHADOW_BLUR_DEFAULT}
          shadowOpacity={SHADOW_OPACITY}
          shadowOffsetX={SHADOW_OFFSET_X}
          shadowOffsetY={SHADOW_OFFSET_Y}
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

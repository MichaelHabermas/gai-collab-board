import { Line } from 'react-konva';
import { forwardRef, memo } from 'react';
import type { ReactElement } from 'react';
import Konva from 'konva';
import { useLineLikeShape } from '@/hooks/useLineLikeShape';
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
        onDragMove,
        dragBoundFunc,
        onTransformEnd,
      },
      ref
    ): ReactElement => {
      const { offset, handleDragEnd, handleTransformEnd } = useLineLikeShape({
        points,
        onDragEnd,
        onTransformEnd,
      });

      return (
        <Line
          ref={ref}
          id={id}
          name='shape line'
          x={x + offset.x}
          y={y + offset.y}
          offsetX={offset.x}
          offsetY={offset.y}
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
          onDragMove={onDragMove}
          dragBoundFunc={dragBoundFunc}
          onTransformEnd={handleTransformEnd}
          perfectDrawEnabled={false}
        />
      );
    }
  )
);

LineShape.displayName = 'LineShape';

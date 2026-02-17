import { Arrow, Line } from 'react-konva';
import { forwardRef, useCallback, memo } from 'react';
import type { ReactElement } from 'react';
import Konva from 'konva';

interface IConnectorProps {
  id: string;
  x: number;
  y: number;
  points: number[];
  stroke: string;
  strokeWidth?: number;
  rotation?: number;
  isSelected?: boolean;
  draggable?: boolean;
  hasArrow?: boolean;
  onSelect?: () => void;
  onDragStart?: () => void;
  onDragEnd?: (x: number, y: number) => void;
  onTransformEnd?: (attrs: { x: number; y: number; points: number[]; rotation: number }) => void;
}

/**
 * Connector component - a line or arrow that can connect objects.
 * Points are relative to the connector's x,y position.
 */
export const Connector = memo(
  forwardRef<Konva.Arrow | Konva.Line, IConnectorProps>(
    (
      {
        id,
        x,
        y,
        points,
        stroke,
        strokeWidth = 2,
        rotation = 0,
        isSelected = false,
        draggable = true,
        hasArrow = true,
        onSelect,
        onDragStart,
        onDragEnd,
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
          const node = e.target as Konva.Arrow | Konva.Line;
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

      const commonProps = {
        ref: ref as React.Ref<Konva.Arrow>,
        id,
        name: 'shape connector',
        x,
        y,
        points,
        stroke: isSelected ? '#3b82f6' : stroke,
        strokeWidth: isSelected ? strokeWidth + 1 : strokeWidth,
        rotation,
        lineCap: 'round' as const,
        lineJoin: 'round' as const,
        hitStrokeWidth: Math.max(20, strokeWidth * 3),
        draggable,
        onClick: onSelect,
        onTap: onSelect,
        onDragStart,
        onDragEnd: handleDragEnd,
        onTransformEnd: handleTransformEnd,
      };

      if (hasArrow) {
        return (
          <Arrow
            {...commonProps}
            pointerLength={10}
            pointerWidth={10}
            fill={isSelected ? '#3b82f6' : stroke}
          />
        );
      }

      return <Line {...commonProps} />;
    }
  )
);

Connector.displayName = 'Connector';

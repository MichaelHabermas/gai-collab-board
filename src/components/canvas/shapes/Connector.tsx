import { Arrow, Line } from 'react-konva';
import { forwardRef, useCallback, memo, type Ref } from 'react';
import type { ReactElement } from 'react';
import Konva from 'konva';
import { useShapeDragHandler } from '@/hooks/useShapeDragHandler';
import { getShapeShadowProps } from '@/lib/shapeShadowProps';
import type { ILineLikeShapeProps } from '@/types';

interface IConnectorProps extends ILineLikeShapeProps {
  hasArrow?: boolean;
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
        opacity = 1,
        rotation = 0,
        isSelected = false,
        draggable = true,
        hasArrow = true,
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
        ref: ref as Ref<Konva.Arrow>,
        id,
        name: 'shape connector',
        x,
        y,
        points,
        stroke: isSelected ? '#3b82f6' : stroke,
        strokeWidth: isSelected ? strokeWidth + 1 : strokeWidth,
        opacity,
        rotation,
        lineCap: 'round' as const,
        lineJoin: 'round' as const,
        ...getShapeShadowProps(isSelected),
        hitStrokeWidth: Math.max(20, strokeWidth * 3),
        draggable,
        onClick: onSelect,
        onTap: onSelect,
        onDragStart,
        onDragEnd: handleDragEnd,
        dragBoundFunc,
        onTransformEnd: handleTransformEnd,
        perfectDrawEnabled: false,
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

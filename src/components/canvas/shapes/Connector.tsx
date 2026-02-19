import { Arrow, Line } from 'react-konva';
import { forwardRef, memo, type Ref } from 'react';
import type { ReactElement } from 'react';
import Konva from 'konva';
import { useLineLikeShape } from '@/hooks/useLineLikeShape';
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

      const commonProps = {
        ref: ref as Ref<Konva.Arrow>,
        id,
        name: 'shape connector',
        x: x + offset.x,
        y: y + offset.y,
        offsetX: offset.x,
        offsetY: offset.y,
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
        onDragMove,
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

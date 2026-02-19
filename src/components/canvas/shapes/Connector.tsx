import { Arrow, Group, Line } from 'react-konva';
import { forwardRef, memo, type Ref } from 'react';
import type { ReactElement } from 'react';
import Konva from 'konva';
import { useLineLikeShape } from '@/hooks/useLineLikeShape';
import { getShapeShadowProps } from '@/lib/shapeShadowProps';
import { getStrokeDash } from '@/lib/strokePatterns';
import type { ILineLikeShapeProps } from '@/types';
import type { ArrowheadMode, StrokeStyle } from '@/types';

interface IConnectorProps extends ILineLikeShapeProps {
  hasArrow?: boolean;
  /** Which end(s) show arrowheads: 'none' | 'start' | 'end' | 'both'. Overrides hasArrow when set. */
  arrowheads?: ArrowheadMode;
  /** Stroke dash style: 'solid' | 'dashed' | 'dotted'. */
  strokeStyle?: StrokeStyle;
}

const POINTER_LENGTH = 10;
const POINTER_WIDTH = 10;

/**
 * Connector component - a line or arrow that can connect objects.
 * Points are relative to the connector's x,y position.
 * Supports arrowhead modes (none/start/end/both) and stroke dash styles.
 */
export const Connector = memo(
  forwardRef<Konva.Arrow | Konva.Line | Konva.Group, IConnectorProps>(
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
        arrowheads,
        strokeStyle,
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

      // Resolve arrowhead mode: explicit arrowheads prop takes precedence over hasArrow
      const mode: ArrowheadMode = arrowheads ?? (hasArrow ? 'end' : 'none');
      const showEndArrow = mode === 'end' || mode === 'both';
      const showStartArrow = mode === 'start' || mode === 'both';

      const resolvedStroke = isSelected ? '#3b82f6' : stroke;
      const resolvedStrokeWidth = isSelected ? strokeWidth + 1 : strokeWidth;
      const dash = getStrokeDash(strokeStyle);

      const commonProps = {
        id,
        name: 'shape connector',
        x: x + offset.x,
        y: y + offset.y,
        offsetX: offset.x,
        offsetY: offset.y,
        points,
        stroke: resolvedStroke,
        strokeWidth: resolvedStrokeWidth,
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
        ...(dash ? { dash } : {}),
      };

      // Simple case: end arrow only (most common — use Konva Arrow directly)
      if (showEndArrow && !showStartArrow) {
        return (
          <Arrow
            {...commonProps}
            ref={ref as Ref<Konva.Arrow>}
            pointerLength={POINTER_LENGTH}
            pointerWidth={POINTER_WIDTH}
            fill={resolvedStroke}
          />
        );
      }

      // Start arrow only: reverse the points so Konva Arrow draws at what was the start
      if (showStartArrow && !showEndArrow) {
        const reversedPoints = [...points].reverse();
        // Reverse pairs: [x0,y0,x1,y1] → [x1,y1,x0,y0]
        const flippedPoints: number[] = [];
        for (let i = 0; i < reversedPoints.length; i += 2) {
          flippedPoints.push(reversedPoints[i + 1] ?? 0, reversedPoints[i] ?? 0);
        }
        // Actually, for a 2-point connector [0,0,dx,dy] we need [dx,dy,0,0]
        const startOnlyPoints: number[] = [];
        for (let i = points.length - 2; i >= 0; i -= 2) {
          startOnlyPoints.push(points[i] ?? 0, points[i + 1] ?? 0);
        }
        return (
          <Arrow
            {...commonProps}
            ref={ref as Ref<Konva.Arrow>}
            points={startOnlyPoints}
            pointerLength={POINTER_LENGTH}
            pointerWidth={POINTER_WIDTH}
            fill={resolvedStroke}
          />
        );
      }

      // Both arrows: use a Group with two Arrow shapes
      if (showStartArrow && showEndArrow) {
        const startOnlyPoints: number[] = [];
        for (let i = points.length - 2; i >= 0; i -= 2) {
          startOnlyPoints.push(points[i] ?? 0, points[i + 1] ?? 0);
        }

        const sharedArrowProps = {
          stroke: resolvedStroke,
          strokeWidth: resolvedStrokeWidth,
          lineCap: 'round' as const,
          lineJoin: 'round' as const,
          pointerLength: POINTER_LENGTH,
          pointerWidth: POINTER_WIDTH,
          fill: resolvedStroke,
          perfectDrawEnabled: false,
          ...(dash ? { dash } : {}),
        };

        return (
          <Group
            ref={ref as Ref<Konva.Group>}
            id={id}
            name='shape connector'
            x={commonProps.x}
            y={commonProps.y}
            offsetX={commonProps.offsetX}
            offsetY={commonProps.offsetY}
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
          >
            {/* End arrow (normal direction) */}
            <Arrow
              points={points}
              {...sharedArrowProps}
              hitStrokeWidth={Math.max(20, strokeWidth * 3)}
            />
            {/* Start arrow (reversed direction) — only draws the arrowhead visually */}
            <Arrow points={startOnlyPoints} {...sharedArrowProps} listening={false} />
          </Group>
        );
      }

      // No arrows: plain Line
      return <Line {...commonProps} ref={ref as Ref<Konva.Line>} />;
    }
  )
);

Connector.displayName = 'Connector';

import { Circle } from 'react-konva';
import { memo, useCallback, type ReactElement } from 'react';
import Konva from 'konva';
import { getAnchorPosition, isConnectableShapeType } from '@/lib/connectorAnchors';
import type { IBoardObject, ConnectorAnchor } from '@/types';

const ANCHORS: ConnectorAnchor[] = ['top', 'right', 'bottom', 'left'];

const NODE_RADIUS = 6;
const NODE_FILL = '#3b82f6';
const NODE_STROKE = '#1e40af';
const NODE_STROKE_WIDTH = 1.5;

interface IConnectionNodesLayerProps {
  shapes: IBoardObject[];
  onNodeClick: (shapeId: string, anchor: ConnectorAnchor) => void;
}

/**
 * Renders connection nodes (anchor points) on connectable shapes for the connector tool.
 * Each node is a small circle; clicking it triggers onNodeClick(shapeId, anchor).
 * Stop propagation so the underlying shape is not selected.
 */
export const ConnectionNodesLayer = memo(
  ({ shapes, onNodeClick }: IConnectionNodesLayerProps): ReactElement => {
    const handleNodeClick = useCallback(
      (
        e: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
        shapeId: string,
        anchor: ConnectorAnchor
      ) => {
        e.cancelBubble = true;
        onNodeClick(shapeId, anchor);
      },
      [onNodeClick]
    );

    const connectableShapes = shapes.filter((s): s is IBoardObject =>
      isConnectableShapeType(s.type)
    );

    return (
      <>
        {connectableShapes.flatMap((shape) =>
          ANCHORS.map((anchor) => {
            const pos = getAnchorPosition(shape, anchor);
            return (
              <Circle
                key={`${shape.id}-${anchor}`}
                x={pos.x}
                y={pos.y}
                radius={NODE_RADIUS}
                fill={NODE_FILL}
                stroke={NODE_STROKE}
                strokeWidth={NODE_STROKE_WIDTH}
                listening={true}
                onClick={(e) => handleNodeClick(e, shape.id, anchor)}
                onTap={(e) => handleNodeClick(e, shape.id, anchor)}
                name='connector-node'
              />
            );
          })
        )}
      </>
    );
  }
);

ConnectionNodesLayer.displayName = 'ConnectionNodesLayer';

import { Circle } from 'react-konva';
import { memo, useCallback, useMemo, type ReactElement } from 'react';
import { getAnchorPosition, isConnectableShapeType } from '@/lib/connectorAnchors';
import { useObjectsStore } from '@/stores/objectsStore';
import type { IBoardObject, ConnectorAnchor, IKonvaMouseEvent, IKonvaTouchEvent } from '@/types';

const ANCHORS: ConnectorAnchor[] = ['top', 'right', 'bottom', 'left'];

const NODE_RADIUS = 6;
const NODE_FILL = '#3b82f6';
const NODE_STROKE = '#1e40af';
const NODE_STROKE_WIDTH = 1.5;

interface IConnectionNodesLayerProps {
  shapeIds: string[];
  onNodeClick: (shapeId: string, anchor: ConnectorAnchor) => void;
}

/**
 * Renders connection nodes (anchor points) on connectable shapes for the connector tool.
 * Reads shape data from the Zustand store so re-renders are driven by the visible ID set,
 * not by every object mutation.
 */
export const ConnectionNodesLayer = memo(
  ({ shapeIds, onNodeClick }: IConnectionNodesLayerProps): ReactElement => {
    const objectsRecord = useObjectsStore((s) => s.objects);

    const handleNodeClick = useCallback(
      (e: IKonvaMouseEvent | IKonvaTouchEvent, shapeId: string, anchor: ConnectorAnchor) => {
        e.cancelBubble = true;
        onNodeClick(shapeId, anchor);
      },
      [onNodeClick]
    );

    const connectableShapes = useMemo(
      () =>
        shapeIds
          .map((id) => objectsRecord[id])
          .filter((s): s is IBoardObject => s != null && isConnectableShapeType(s.type)),
      [shapeIds, objectsRecord]
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

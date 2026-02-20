import { useState, useCallback } from 'react';
import type { IBoardObject, ConnectorAnchor, ToolMode, ICreateObjectParams } from '@/types';
import { getAnchorPosition } from '@/lib/connectorAnchors';

interface IUseConnectorCreationParams {
  objects: IBoardObject[];
  activeColor: string;
  onObjectCreate?: (params: Omit<ICreateObjectParams, 'createdBy'>) => Promise<IBoardObject | null>;
  setActiveTool: (tool: ToolMode) => void;
  activeToolRef: React.MutableRefObject<ToolMode>;
}

interface IConnectorFrom {
  shapeId: string;
  anchor: ConnectorAnchor;
}

interface IUseConnectorCreationReturn {
  connectorFrom: IConnectorFrom | null;
  handleConnectorNodeClick: (shapeId: string, anchor: ConnectorAnchor) => void;
  clearConnector: () => void;
}

export function useConnectorCreation({
  objects,
  activeColor,
  onObjectCreate,
  setActiveTool,
  activeToolRef,
}: IUseConnectorCreationParams): IUseConnectorCreationReturn {
  const [connectorFrom, setConnectorFrom] = useState<IConnectorFrom | null>(null);

  const clearConnector = () => setConnectorFrom(null);

  const handleConnectorNodeClick = useCallback(
    (shapeId: string, anchor: ConnectorAnchor) => {
      if (!connectorFrom) {
        setConnectorFrom({ shapeId, anchor });
        return;
      }

      if (connectorFrom.shapeId === shapeId) {
        setConnectorFrom(null);
        return;
      }

      const fromObj = objects.find((o) => o.id === connectorFrom.shapeId);
      const toObj = objects.find((o) => o.id === shapeId);
      if (!fromObj || !toObj || !onObjectCreate) {
        setConnectorFrom(null);
        return;
      }

      const fromPos = getAnchorPosition(fromObj, connectorFrom.anchor);
      const toPos = getAnchorPosition(toObj, anchor);
      onObjectCreate({
        type: 'connector',
        x: fromPos.x,
        y: fromPos.y,
        width: 0,
        height: 0,
        points: [0, 0, toPos.x - fromPos.x, toPos.y - fromPos.y],
        fill: 'transparent',
        stroke: activeColor,
        strokeWidth: 2,
        rotation: 0,
        fromObjectId: connectorFrom.shapeId,
        toObjectId: shapeId,
        fromAnchor: connectorFrom.anchor,
        toAnchor: anchor,
      })
        .then(() => {
          setConnectorFrom(null);
          setActiveTool('select');
          activeToolRef.current = 'select';
        })
        .catch(() => {
          setConnectorFrom(null);
        });
    },
    [connectorFrom, objects, onObjectCreate, activeColor, setActiveTool, activeToolRef]
  );

  return { connectorFrom, handleConnectorNodeClick, clearConnector };
}

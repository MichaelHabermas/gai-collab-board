/**
 * Connector controller: two-click flow, first stores from + highlight, second creates connector.
 * No React state. Replaces useConnectorCreation. See docs/IMPERATIVE-KONVA-MIGRATION-V5.md Epic 3.
 */

import type { ConnectorAnchor, ToolMode, IBoardObject, ICreateObjectParams } from '@/types';
import { getAnchorPosition } from '@/lib/connectorAnchors';

export interface IConnectorFrom {
  shapeId: string;
  anchor: ConnectorAnchor;
}

export interface IConnectorOverlay {
  highlightAnchor(shapeId: string, anchor: ConnectorAnchor): void;
  clearHighlight(): void;
}

export interface IConnectorControllerConfig {
  overlay: IConnectorOverlay;
  getObjectsRecord: () => Record<string, IBoardObject>;
  getColor: () => string;
  onObjectCreate: (params: Omit<ICreateObjectParams, 'createdBy'>) => Promise<IBoardObject | null>;
  setActiveTool: (tool: ToolMode) => void;
}

export interface IConnectorController {
  onConnectorNodeClick: (shapeId: string, anchor: ConnectorAnchor) => void;
  clearConnector: () => void;
}

export function createConnectorController(
  config: IConnectorControllerConfig
): IConnectorController {
  const { overlay, getObjectsRecord, getColor, onObjectCreate, setActiveTool } = config;

  let from: IConnectorFrom | null = null;

  function clearConnector(): void {
    from = null;
    overlay.clearHighlight();
  }

  function onConnectorNodeClick(shapeId: string, anchor: ConnectorAnchor): void {
    if (!from) {
      from = { shapeId, anchor };
      overlay.highlightAnchor(shapeId, anchor);
      return;
    }

    if (from.shapeId === shapeId) {
      clearConnector();
      return;
    }

    const objectsRecord = getObjectsRecord();
    const fromObj = objectsRecord[from.shapeId];
    const toObj = objectsRecord[shapeId];
    if (!fromObj || !toObj) {
      clearConnector();
      return;
    }

    const fromPos = getAnchorPosition(fromObj, from.anchor);
    const toPos = getAnchorPosition(toObj, anchor);

    onObjectCreate({
      type: 'connector',
      x: fromPos.x,
      y: fromPos.y,
      width: 0,
      height: 0,
      points: [0, 0, toPos.x - fromPos.x, toPos.y - fromPos.y],
      fill: 'transparent',
      stroke: getColor(),
      strokeWidth: 2,
      rotation: 0,
      fromObjectId: from.shapeId,
      toObjectId: shapeId,
      fromAnchor: from.anchor,
      toAnchor: anchor,
    })
      .then(() => {
        clearConnector();
        setActiveTool('select');
      })
      .catch(() => {
        clearConnector();
      });
  }

  return {
    onConnectorNodeClick,
    clearConnector,
  };
}

import { Timestamp } from 'firebase/firestore';
import { UserRole } from './user';

export type ShapeType = 'sticky' | 'rectangle' | 'circle' | 'line' | 'text' | 'frame' | 'connector';

export type ConnectorAnchor = 'top' | 'right' | 'bottom' | 'left';

export interface IBoardObject {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  text?: string;
  fontSize?: number;
  /** Opacity 0–1; default 1 when undefined for backward compatibility */
  opacity?: number;
  // For lines and connectors
  points?: number[];
  // For connectors - object IDs and anchors to connect
  fromObjectId?: string;
  toObjectId?: string;
  fromAnchor?: ConnectorAnchor;
  toAnchor?: ConnectorAnchor;
  // For circles
  radius?: number;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface IBoard {
  id: string;
  name: string;
  ownerId: string;
  members: Record<string, UserRole>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

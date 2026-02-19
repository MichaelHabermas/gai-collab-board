import { Timestamp } from 'firebase/firestore';
import { UserRole } from './user';

export type ShapeType = 'sticky' | 'rectangle' | 'circle' | 'line' | 'text' | 'frame' | 'connector';

export type ConnectorAnchor = 'top' | 'right' | 'bottom' | 'left';

/** Arrowhead mode for connectors: which end(s) display arrowheads. */
export type ArrowheadMode = 'none' | 'start' | 'end' | 'both';

/** Stroke dash style for connectors. */
export type StrokeStyle = 'solid' | 'dashed' | 'dotted';

/** Parameters for creating a new board object. Used by objectService and toolExecutor. */
export interface ICreateObjectParams {
  type: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  text?: string;
  textFill?: string;
  fontSize?: number;
  opacity?: number;
  rotation?: number;
  points?: number[];
  fromObjectId?: string;
  toObjectId?: string;
  fromAnchor?: ConnectorAnchor;
  toAnchor?: ConnectorAnchor;
  /** Arrowhead mode for connectors; default 'end' when undefined */
  arrowheads?: ArrowheadMode;
  /** Stroke dash style for connectors; default 'solid' when undefined */
  strokeStyle?: StrokeStyle;
  /** ID of the containing frame, or undefined if top-level. */
  parentFrameId?: string;
  createdBy: string;
}

/** Partial updates for an existing board object (no id, createdBy, createdAt). */
export type IUpdateObjectParams = Partial<Omit<IBoardObject, 'id' | 'createdBy' | 'createdAt'>>;

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
  /** Text font color for objects that support independent text styling (e.g. sticky notes). */
  textFill?: string;
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
  /** Arrowhead mode for connectors; default 'end' when undefined */
  arrowheads?: ArrowheadMode;
  /** Stroke dash style for connectors; default 'solid' when undefined */
  strokeStyle?: StrokeStyle;
  // For circles
  radius?: number;
  /** ID of the containing frame, or undefined if top-level. */
  parentFrameId?: string;
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

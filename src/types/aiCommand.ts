/**
 * AI Command types — Constitution Article IV.
 * Typed discriminated union for programmatic AI CRUD operations.
 * This is a public contract; breaking changes require a version bump.
 */

import type { ShapeType, ConnectorAnchor, ArrowheadMode, StrokeStyle } from './board';
import type { IAIBoardElement } from '@/lib/boardStateManager';

export type AICommandAction = 'CREATE' | 'UPDATE' | 'DELETE';

export interface ICreateCommandPayload {
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
  arrowheads?: ArrowheadMode;
  strokeStyle?: StrokeStyle;
  parentFrameId?: string;
}

export interface IUpdateCommandPayload {
  objectId: string;
  updates: {
    type?: ShapeType;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    fill?: string;
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
    arrowheads?: ArrowheadMode;
    strokeStyle?: StrokeStyle;
    parentFrameId?: string;
    radius?: number;
    cornerRadius?: number;
  };
}

export interface IDeleteCommandPayload {
  objectId: string;
}

export type AICommand =
  | { action: 'CREATE'; payload: ICreateCommandPayload }
  | { action: 'UPDATE'; payload: IUpdateCommandPayload }
  | { action: 'DELETE'; payload: IDeleteCommandPayload };

export interface ICommandResult {
  success: boolean;
  action: AICommandAction;
  objectId?: string;
  error?: string;
}

export interface IVersionedAIState {
  version: number;
  elements: IAIBoardElement[];
  elementCount: number;
}

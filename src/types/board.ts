import { Timestamp } from 'firebase/firestore';
import { UserRole } from './user';

export type ShapeType = 'sticky' | 'rectangle' | 'circle' | 'line' | 'text' | 'frame' | 'connector';

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

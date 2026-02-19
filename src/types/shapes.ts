import type { IPosition } from './geometry';
import type {
  ITransformEndLineAttrs,
  ITransformEndRectAttrs,
  ITransformEndTextAttrs,
} from './transform';
import type { IKonvaDragEvent } from './konva';

export type IDragBoundFunc = (pos: IPosition) => IPosition;

export interface IBaseShapeProps {
  id: string;
  x: number;
  y: number;
  opacity?: number;
  rotation?: number;
  isSelected?: boolean;
  draggable?: boolean;
  onSelect?: () => void;
  onDragStart?: () => void;
  onDragEnd?: (x: number, y: number) => void;
  onDragMove?: (e: IKonvaDragEvent) => void;
  dragBoundFunc?: IDragBoundFunc;
}

export interface IRectLikeShapeProps extends IBaseShapeProps {
  width: number;
  height: number;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  onTransformEnd?: (attrs: ITransformEndRectAttrs) => void;
}

export interface ILineLikeShapeProps extends IBaseShapeProps {
  points: number[];
  stroke: string;
  strokeWidth?: number;
  onTransformEnd?: (attrs: ITransformEndLineAttrs) => void;
}

export interface ITextLikeShapeProps extends IBaseShapeProps {
  text: string;
  fontSize?: number;
  fill?: string;
  width?: number;
  onTextChange?: (text: string) => void;
  onTransformEnd?: (attrs: ITransformEndTextAttrs) => void;
}

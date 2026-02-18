export interface ITransformEndRectAttrs {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

export interface ITransformEndLineAttrs {
  x: number;
  y: number;
  points: number[];
  rotation: number;
}

export interface ITransformEndTextAttrs {
  x: number;
  y: number;
  width: number;
  fontSize: number;
  rotation: number;
}

export type ITransformEndAttrs = ITransformEndRectAttrs | ITransformEndLineAttrs;

export type ITransformEndAttrsUnion =
  | ITransformEndRectAttrs
  | ITransformEndLineAttrs
  | ITransformEndTextAttrs;

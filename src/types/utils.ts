export interface IPosition {
  x: number;
  y: number;
}

export interface IDimensions {
  width: number;
  height: number;
}

export interface ISize extends IPosition, IDimensions {}

export interface ITransform extends ISize {
  rotation: number;
}

export interface IScaleTransform extends ITransform {
  scaleX: number;
  scaleY: number;
}

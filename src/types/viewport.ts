export interface IViewportPosition {
  x: number;
  y: number;
}

export interface IViewportScale {
  x: number;
  y: number;
}

export interface IPersistedViewport {
  position: IViewportPosition;
  scale: IViewportScale;
}

export interface IViewportState {
  position: IViewportPosition;
  scale: IViewportScale;
  width: number;
  height: number;
}

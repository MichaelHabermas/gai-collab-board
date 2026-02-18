/**
 * Viewport state and persistence. Position and scale use IPosition for consistency.
 */

import type { IPosition } from './geometry';

/** Viewport position (same shape as IPosition; domain alias). */
export type IViewportPosition = IPosition;

/** Viewport scale x/y (same shape as IPosition; domain alias). */
export type IViewportScale = IPosition;

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

/** Result of fitting bounds in viewport (scale + position). */
export interface IViewportFitResult {
  scale: number;
  position: IPosition;
}

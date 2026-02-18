/**
 * Re-exports geometry types for backward compatibility.
 * New code should import from ./geometry or from barrel.
 */

export type {
  IPosition,
  IDimensions,
  ISize,
  IBounds,
  ITransform,
  IScaleTransform,
} from './geometry';

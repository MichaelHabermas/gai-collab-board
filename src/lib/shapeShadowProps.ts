import {
  SHADOW_BLUR_DEFAULT,
  SHADOW_BLUR_SELECTED,
  SHADOW_COLOR,
  SHADOW_FOR_STROKE_ENABLED,
  SHADOW_OFFSET_X,
  SHADOW_OFFSET_Y,
  SHADOW_OPACITY,
} from './canvasShadows';

interface IGetShapeShadowPropsOptions {
  includeShadowForStrokeEnabled?: boolean;
}

interface IShapeShadowProps {
  shadowColor: string;
  shadowBlur: number;
  shadowOpacity: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  shadowForStrokeEnabled?: boolean;
}

export const getShapeShadowProps = (
  isSelected: boolean,
  options?: IGetShapeShadowPropsOptions
): IShapeShadowProps => {
  const includeShadowForStrokeEnabled = options?.includeShadowForStrokeEnabled ?? false;

  return {
    shadowColor: SHADOW_COLOR,
    shadowBlur: isSelected ? SHADOW_BLUR_SELECTED : SHADOW_BLUR_DEFAULT,
    shadowOpacity: SHADOW_OPACITY,
    shadowOffsetX: SHADOW_OFFSET_X,
    shadowOffsetY: SHADOW_OFFSET_Y,
    shadowForStrokeEnabled: includeShadowForStrokeEnabled ? SHADOW_FOR_STROKE_ENABLED : undefined,
  };
};

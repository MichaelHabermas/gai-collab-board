import type { IBoardObject, ConnectorAnchor, IPosition } from '@/types';

const CONNECTABLE_SHAPE_TYPES = ['rectangle', 'circle', 'sticky', 'frame'] as const;

export type ConnectableShapeType = (typeof CONNECTABLE_SHAPE_TYPES)[number];

export function isConnectableShapeType(type: IBoardObject['type']): type is ConnectableShapeType {
  return CONNECTABLE_SHAPE_TYPES.includes(type as ConnectableShapeType);
}

/**
 * Rotate a point (px, py) around origin by angle degrees.
 */
function rotatePoint(px: number, py: number, angleDeg: number): IPosition {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: px * cos - py * sin,
    y: px * sin + py * cos,
  };
}

/**
 * Returns canvas coordinates of the given anchor for a shape.
 * Rect-like (rectangle, sticky, frame): edge midpoints in top-left local coords, rotated around (0,0) to match Konva.
 * Circle/ellipse: four cardinal points on the ellipse, rotation around center (Ellipse node uses center position).
 */
export function getAnchorPosition(
  obj: Pick<IBoardObject, 'x' | 'y' | 'width' | 'height' | 'rotation' | 'type'>,
  anchor: ConnectorAnchor
): IPosition {
  const { x, y, width, height, rotation = 0 } = obj;
  const cx = x + width / 2;
  const cy = y + height / 2;

  if (obj.type === 'circle') {
    const radiusX = width / 2;
    const radiusY = height / 2;
    const local = ((): IPosition => {
      switch (anchor) {
        case 'top':
          return { x: 0, y: -radiusY };
        case 'right':
          return { x: radiusX, y: 0 };
        case 'bottom':
          return { x: 0, y: radiusY };
        case 'left':
          return { x: -radiusX, y: 0 };
        default:
          return { x: 0, y: -radiusY };
      }
    })();
    const rotated = rotatePoint(local.x, local.y, rotation);
    return { x: cx + rotated.x, y: cy + rotated.y };
  }

  // Rect-like: rectangle, sticky, frame — Konva rotates around (x,y) top-left; use top-left-origin local coords
  const local = ((): IPosition => {
    switch (anchor) {
      case 'right':
        return { x: width, y: height / 2 };
      case 'bottom':
        return { x: width / 2, y: height };
      case 'left':
        return { x: 0, y: height / 2 };
      case 'top':
      default:
        return { x: width / 2, y: 0 };
    }
  })();
  const rotated = rotatePoint(local.x, local.y, rotation);
  return { x: x + rotated.x, y: y + rotated.y };
}

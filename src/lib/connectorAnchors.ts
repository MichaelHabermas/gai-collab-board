import type { IBoardObject, ConnectorAnchor } from '@/types';

const CONNECTABLE_SHAPE_TYPES = ['rectangle', 'circle', 'sticky', 'frame'] as const;

export type ConnectableShapeType = (typeof CONNECTABLE_SHAPE_TYPES)[number];

export function isConnectableShapeType(type: IBoardObject['type']): type is ConnectableShapeType {
  return CONNECTABLE_SHAPE_TYPES.includes(type as ConnectableShapeType);
}

/**
 * Rotate a point (px, py) around origin by angle degrees.
 */
function rotatePoint(px: number, py: number, angleDeg: number): { x: number; y: number } {
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
 * Rect-like (rectangle, sticky, frame): four edge midpoints, then rotation around center.
 * Circle/ellipse: four cardinal points on the ellipse, then rotation around center.
 */
export function getAnchorPosition(
  obj: Pick<IBoardObject, 'x' | 'y' | 'width' | 'height' | 'rotation' | 'type'>,
  anchor: ConnectorAnchor
): { x: number; y: number } {
  const { x, y, width, height, rotation = 0 } = obj;
  const cx = x + width / 2;
  const cy = y + height / 2;

  if (obj.type === 'circle') {
    const radiusX = width / 2;
    const radiusY = height / 2;
    const local = ((): { x: number; y: number } => {
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

  // Rect-like: rectangle, sticky, frame — edge midpoints in center-relative coords
  const w2 = width / 2;
  const h2 = height / 2;
  const local = ((): { x: number; y: number } => {
    switch (anchor) {
      case 'top':
        return { x: 0, y: -h2 };
      case 'right':
        return { x: w2, y: 0 };
      case 'bottom':
        return { x: 0, y: h2 };
      case 'left':
        return { x: -w2, y: 0 };
      default:
        return { x: 0, y: -h2 };
    }
  })();
  const rotated = rotatePoint(local.x, local.y, rotation);
  return { x: cx + rotated.x, y: cy + rotated.y };
}

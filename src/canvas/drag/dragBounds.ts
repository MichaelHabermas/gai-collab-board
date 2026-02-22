import Konva from 'konva';
import { snapPositionToGrid } from '@/lib/snapToGrid';

const GRID_SIZE = 20;

export interface IDragConfig {
  snapToGridEnabled: () => boolean;
}

export function createDragBoundFunc(
  _objectId: string,
  config: IDragConfig
): (pos: Konva.Vector2d) => Konva.Vector2d {
  return (pos) => {
    if (config.snapToGridEnabled()) {
      return snapPositionToGrid(pos.x, pos.y, GRID_SIZE);
    }

    return pos;
  };
}

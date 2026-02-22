import Konva from 'konva';
import type { IBoardObject } from '@/types';
import type { IAlignmentCandidate, IAlignmentGuides } from '@/types';
import {
  computeAlignmentGuidesWithCandidates,
  computeSnappedPositionFromGuides,
  getAlignmentPositions,
} from '@/lib/alignmentGuides';

export interface IOverlayManagerGuides {
  updateGuides(guides: IAlignmentGuides): void;
}

export function buildGuideCandidates(
  visibleIds: string[],
  draggedIds: Set<string>,
  objects: Record<string, IBoardObject>
): IAlignmentCandidate[] {
  const candidates: IAlignmentCandidate[] = [];

  for (const id of visibleIds) {
    if (draggedIds.has(id)) continue;

    const obj = objects[id];
    if (!obj) continue;

    const bounds = {
      x1: obj.x,
      y1: obj.y,
      x2: obj.x + obj.width,
      y2: obj.y + obj.height,
    };

    candidates.push({
      id: obj.id,
      bounds,
      positions: getAlignmentPositions(bounds),
    });
  }

  return candidates;
}

export function onDragMove(
  e: Konva.KonvaEventObject<DragEvent>,
  guideCandidateBounds: IAlignmentCandidate[],
  overlayManager: IOverlayManagerGuides
): void {
  const node = e.target;
  const width = node.width() * node.scaleX();
  const height = node.height() * node.scaleY();
  const pos = node.position();

  const dragged = {
    x1: pos.x,
    y1: pos.y,
    x2: pos.x + width,
    y2: pos.y + height,
  };

  const guides = computeAlignmentGuidesWithCandidates(dragged, guideCandidateBounds);
  const snapped = computeSnappedPositionFromGuides(guides, pos, width, height);

  if (snapped.x !== pos.x || snapped.y !== pos.y) {
    node.position(snapped);
  }

  overlayManager.updateGuides(guides);
}

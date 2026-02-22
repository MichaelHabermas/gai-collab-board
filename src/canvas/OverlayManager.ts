/**
 * OverlayManager: imperative overlay layer for marquee, guides, drawing preview,
 * cursors, and connection anchors. Replaces SelectionLayer, AlignmentGuidesLayer,
 * CursorLayer, ConnectionNodesLayer, and drawing preview from useShapeDrawing.
 * See docs/IMPERATIVE-KONVA-MIGRATION-V5.md §10 (Epic 4).
 */

import Konva from 'konva';
import type {
  ISelectionRect,
  IAlignmentGuides,
  IBoardObject,
  ConnectorAnchor,
  ToolMode,
  Cursors,
} from '@/types';
import type { IDrawingState } from '@/canvas/events/DrawingController';

const GUIDE_EXTENT = 50000;
const GUIDE_STROKE_WIDTH = 1;
const GUIDE_DASH = [4, 4];
const GUIDE_COLOR = '#3b82f6';

const MARQUEE_FILL = 'rgba(59, 130, 246, 0.1)';
const MARQUEE_STROKE = '#3b82f6';
const MARQUEE_STROKE_WIDTH = 1;
const MARQUEE_DASH = [4, 4];

export class OverlayManager {
  private overlayLayer: Konva.Layer | null;
  private guidesGroup: Konva.Group | null = null;
  private marqueeRect: Konva.Rect | null = null;

  constructor(layer: Konva.Layer) {
    this.overlayLayer = layer;
  }

  getLayer(): Konva.Layer | null {
    return this.overlayLayer;
  }

  // ── Marquee (replaces SelectionLayer.tsx) ──
  showMarquee(): void {
    // No-op: callers use updateMarquee(rect) with visible true.
  }

  updateMarquee(rect: ISelectionRect): void {
    const layer = this.overlayLayer;
    if (!layer) {
      return;
    }

    if (!rect.visible) {
      if (this.marqueeRect) {
        this.marqueeRect.destroy();
        this.marqueeRect = null;
      }

      layer.batchDraw();
      return;
    }

    const x = Math.min(rect.x1, rect.x2);
    const y = Math.min(rect.y1, rect.y2);
    const width = Math.abs(rect.x2 - rect.x1);
    const height = Math.abs(rect.y2 - rect.y1);

    if (this.marqueeRect) {
      this.marqueeRect.setAttrs({ x, y, width, height });
    } else {
      const node = new Konva.Rect({
        x,
        y,
        width,
        height,
        fill: MARQUEE_FILL,
        stroke: MARQUEE_STROKE,
        strokeWidth: MARQUEE_STROKE_WIDTH,
        dash: MARQUEE_DASH,
        listening: false,
        name: 'marquee-rect',
      });
      layer.add(node);
      this.marqueeRect = node;
    }

    layer.batchDraw();
  }

  hideMarquee(): void {
    const layer = this.overlayLayer;
    if (this.marqueeRect) {
      this.marqueeRect.destroy();
      this.marqueeRect = null;
    }

    if (layer) {
      layer.batchDraw();
    }
  }

  // ── Alignment Guides (replaces AlignmentGuidesLayer.tsx) ──
  updateGuides(guides: IAlignmentGuides | null): void {
    const layer = this.overlayLayer;
    if (!layer) {
      return;
    }

    if (this.guidesGroup) {
      this.guidesGroup.destroy();
      this.guidesGroup = null;
    }

    if (!guides) {
      layer.batchDraw();
      return;
    }

    const { horizontal, vertical } = guides;
    if (horizontal.length === 0 && vertical.length === 0) {
      layer.batchDraw();
      return;
    }

    const group = new Konva.Group({ listening: false, name: 'alignment-guides' });

    for (const x of vertical) {
      const line = new Konva.Line({
        points: [x, -GUIDE_EXTENT, x, GUIDE_EXTENT],
        stroke: GUIDE_COLOR,
        strokeWidth: GUIDE_STROKE_WIDTH,
        dash: GUIDE_DASH,
        listening: false,
      });
      group.add(line);
    }

    for (const y of horizontal) {
      const line = new Konva.Line({
        points: [-GUIDE_EXTENT, y, GUIDE_EXTENT, y],
        stroke: GUIDE_COLOR,
        strokeWidth: GUIDE_STROKE_WIDTH,
        dash: GUIDE_DASH,
        listening: false,
      });
      group.add(line);
    }

    layer.add(group);
    this.guidesGroup = group;
    layer.batchDraw();
  }

  // ── Drawing Preview (replaces useShapeDrawing renderDrawingPreview) ──
  showDrawingPreview(_tool: ToolMode, _color: string): void {
    // Stub.
  }

  updateDrawingPreview(_state: IDrawingState, _tool: ToolMode, _color: string): void {
    // Stub.
  }

  hideDrawingPreview(): void {
    // Stub.
  }

  // ── Remote Cursors (replaces CursorLayer.tsx) ──
  updateCursors(_cursors: Cursors, _currentUid: string): void {
    // Stub.
  }

  // ── Connection Anchors (replaces ConnectionNodesLayer.tsx) ──
  updateConnectionNodes(
    _shapeIds: string[],
    _objectsRecord: Record<string, IBoardObject>,
    _onNodeClick: (shapeId: string, anchor: ConnectorAnchor) => void
  ): void {
    // Stub.
  }

  highlightAnchor(_shapeId: string, _anchor: ConnectorAnchor): void {
    // Stub.
  }

  clearConnectionNodes(): void {
    // Stub.
  }

  destroy(): void {
    if (this.marqueeRect) {
      this.marqueeRect.destroy();
      this.marqueeRect = null;
    }

    if (this.guidesGroup) {
      this.guidesGroup.destroy();
      this.guidesGroup = null;
    }

    this.overlayLayer = null;
  }
}

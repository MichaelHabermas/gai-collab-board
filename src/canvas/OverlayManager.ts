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
  ICursorData,
} from '@/types';
import type { IDrawingState } from '@/canvas/events/DrawingController';
import { DEFAULT_SHAPE_STROKE_WIDTH } from '@/lib/boardObjectDefaults';
import { getAnchorPosition, isConnectableShapeType } from '@/lib/connectorAnchors';

const GUIDE_EXTENT = 50000;
const GUIDE_STROKE_WIDTH = 1;
const GUIDE_DASH = [4, 4];
const GUIDE_COLOR = '#3b82f6';

const MARQUEE_FILL = 'rgba(59, 130, 246, 0.1)';
const MARQUEE_STROKE = '#3b82f6';
const MARQUEE_STROKE_WIDTH = 1;
const MARQUEE_DASH = [4, 4];

const PREVIEW_DASH = [5, 5];
const PREVIEW_STROKE = GUIDE_COLOR;
const PREVIEW_LINE_STROKE_WIDTH = 3;
const FRAME_PREVIEW_FILL = 'rgba(241, 245, 249, 0.3)';
const FRAME_PREVIEW_CORNER_RADIUS = 6;

const CURSOR_RADIUS = 6;
const CURSOR_STROKE = '#ffffff';
const CURSOR_STROKE_WIDTH = 2;
const CURSOR_SHADOW_COLOR = 'rgba(0, 0, 0, 0.3)';
const CURSOR_SHADOW_BLUR = 4;
const CURSOR_LABEL_FONT = 'Inter, system-ui, sans-serif';
const CURSOR_LABEL_FONT_SIZE = 12;
const CURSOR_LABEL_PADDING = 4;

const ANCHORS: ConnectorAnchor[] = ['top', 'right', 'bottom', 'left'];
const NODE_RADIUS = 6;
const NODE_FILL = '#3b82f6';
const NODE_STROKE = '#1e40af';
const NODE_STROKE_WIDTH = 1.5;
const NODE_HIT_STROKE_WIDTH = 40;
const NODE_HIGHLIGHT_STROKE = '#60a5fa';

export class OverlayManager {
  private overlayLayer: Konva.Layer | null;
  private guidesGroup: Konva.Group | null = null;
  private marqueeRect: Konva.Rect | null = null;
  private drawingPreviewNode: Konva.Rect | Konva.Line | null = null;
  private drawingPreviewTool: ToolMode | null = null;
  private cursorsGroup: Konva.Group | null = null;
  private connectionNodesGroup: Konva.Group | null = null;
  private highlightedAnchor: { shapeId: string; anchor: ConnectorAnchor } | null = null;
  private lastConnectionNodesArgs: {
    shapeIds: string[];
    objectsRecord: Record<string, IBoardObject>;
    onNodeClick: (shapeId: string, anchor: ConnectorAnchor) => void;
  } | null = null;

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
  showDrawingPreview(tool: ToolMode, color: string): void {
    const layer = this.overlayLayer;
    if (!layer) {
      return;
    }

    this.removeDrawingPreviewNode();
    this.drawingPreviewTool = tool;
    const node = this.createDrawingPreviewNode(tool, color, {
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
    });
    if (node) {
      layer.add(node);
      this.drawingPreviewNode = node;
    }

    layer.batchDraw();
  }

  updateDrawingPreview(state: IDrawingState, tool: ToolMode, color: string): void {
    const layer = this.overlayLayer;
    if (!layer) {
      return;
    }

    const toolChanged = this.drawingPreviewTool !== tool;
    if (toolChanged || !this.drawingPreviewNode) {
      this.removeDrawingPreviewNode();
      this.drawingPreviewTool = tool;
      const node = this.createDrawingPreviewNode(tool, color, state);
      if (node) {
        layer.add(node);
        this.drawingPreviewNode = node;
      }
    } else if (this.drawingPreviewNode) {
      this.applyDrawingPreviewGeometry(this.drawingPreviewNode, tool, state, color);
    }

    layer.batchDraw();
  }

  hideDrawingPreview(): void {
    this.removeDrawingPreviewNode();
    this.drawingPreviewTool = null;
    if (this.overlayLayer) {
      this.overlayLayer.batchDraw();
    }
  }

  private removeDrawingPreviewNode(): void {
    if (this.drawingPreviewNode) {
      this.drawingPreviewNode.destroy();
      this.drawingPreviewNode = null;
    }
  }

  private createDrawingPreviewNode(
    tool: ToolMode,
    color: string,
    state: IDrawingState
  ): Konva.Rect | Konva.Line | null {
    const { startX, startY, currentX, currentY } = state;
    const x = Math.min(startX, currentX);
    const y = Math.min(startY, currentY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);
    const baseRectAttrs = {
      fill: color,
      stroke: PREVIEW_STROKE,
      strokeWidth: DEFAULT_SHAPE_STROKE_WIDTH,
      dash: PREVIEW_DASH,
      listening: false,
      name: 'drawing-preview',
    };

    if (tool === 'rectangle') {
      return new Konva.Rect({ ...baseRectAttrs, x, y, width, height });
    }

    if (tool === 'circle') {
      return new Konva.Rect({
        ...baseRectAttrs,
        x,
        y,
        width,
        height,
        cornerRadius: Math.min(width, height) / 2,
      });
    }

    if (tool === 'line') {
      return new Konva.Line({
        points: [startX, startY, currentX, currentY],
        stroke: color,
        strokeWidth: PREVIEW_LINE_STROKE_WIDTH,
        dash: PREVIEW_DASH,
        listening: false,
        name: 'drawing-preview',
      });
    }

    if (tool === 'frame') {
      return new Konva.Rect({
        ...baseRectAttrs,
        fill: FRAME_PREVIEW_FILL,
        x,
        y,
        width,
        height,
        cornerRadius: FRAME_PREVIEW_CORNER_RADIUS,
      });
    }

    return null;
  }

  private applyDrawingPreviewGeometry(
    node: Konva.Rect | Konva.Line,
    tool: ToolMode,
    state: IDrawingState,
    _color: string
  ): void {
    const { startX, startY, currentX, currentY } = state;
    const x = Math.min(startX, currentX);
    const y = Math.min(startY, currentY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);

    if (tool === 'line' && node instanceof Konva.Line) {
      node.setAttrs({ points: [startX, startY, currentX, currentY] });
    } else if (node instanceof Konva.Rect) {
      const attrs: { x: number; y: number; width: number; height: number; cornerRadius?: number } =
        {
          x,
          y,
          width,
          height,
        };
      if (tool === 'circle') {
        attrs.cornerRadius = Math.min(width, height) / 2;
      }

      if (tool === 'frame') {
        attrs.cornerRadius = FRAME_PREVIEW_CORNER_RADIUS;
      }

      node.setAttrs(attrs);
    }
  }

  // ── Remote Cursors (replaces CursorLayer.tsx) ──
  updateCursors(cursors: Cursors, currentUid: string): void {
    const layer = this.overlayLayer;
    if (!layer) {
      return;
    }

    if (this.cursorsGroup) {
      this.cursorsGroup.destroy();
      this.cursorsGroup = null;
    }

    const otherCursors: ICursorData[] = Object.values(cursors).filter(
      (cursor) => cursor.uid !== currentUid
    );

    if (otherCursors.length === 0) {
      layer.batchDraw();
      return;
    }

    const group = new Konva.Group({ listening: false, name: 'cursors' });
    for (const cursor of otherCursors) {
      const cursorGroup = new Konva.Group({ x: cursor.x, y: cursor.y, listening: false });
      const circle = new Konva.Circle({
        radius: CURSOR_RADIUS,
        fill: cursor.color,
        stroke: CURSOR_STROKE,
        strokeWidth: CURSOR_STROKE_WIDTH,
        shadowColor: CURSOR_SHADOW_COLOR,
        shadowBlur: CURSOR_SHADOW_BLUR,
        shadowOffsetX: 1,
        shadowOffsetY: 1,
        listening: false,
      });
      cursorGroup.add(circle);
      const labelBg = new Konva.Text({
        text: cursor.displayName,
        x: 10,
        y: -6,
        fontSize: CURSOR_LABEL_FONT_SIZE,
        fontFamily: CURSOR_LABEL_FONT,
        fill: cursor.color,
        padding: CURSOR_LABEL_PADDING,
        listening: false,
      });
      cursorGroup.add(labelBg);
      const labelFg = new Konva.Text({
        text: cursor.displayName,
        x: 12,
        y: -4,
        fontSize: CURSOR_LABEL_FONT_SIZE,
        fontFamily: CURSOR_LABEL_FONT,
        fill: CURSOR_STROKE,
        padding: CURSOR_LABEL_PADDING,
        cornerRadius: 4,
        listening: false,
      });
      cursorGroup.add(labelFg);
      group.add(cursorGroup);
    }
    layer.add(group);
    this.cursorsGroup = group;
    layer.batchDraw();
  }

  // ── Connection Anchors (replaces ConnectionNodesLayer.tsx) ──
  updateConnectionNodes(
    shapeIds: string[],
    objectsRecord: Record<string, IBoardObject>,
    onNodeClick: (shapeId: string, anchor: ConnectorAnchor) => void
  ): void {
    const layer = this.overlayLayer;
    if (!layer) {
      return;
    }

    this.lastConnectionNodesArgs = { shapeIds, objectsRecord, onNodeClick };

    if (this.connectionNodesGroup) {
      this.connectionNodesGroup.destroy();
      this.connectionNodesGroup = null;
    }

    const connectableShapes = shapeIds
      .map((id) => objectsRecord[id])
      .filter((s): s is IBoardObject => s != null && isConnectableShapeType(s.type));

    if (connectableShapes.length === 0) {
      layer.batchDraw();
      return;
    }

    const group = new Konva.Group({ listening: true, name: 'connection-nodes' });
    for (const shape of connectableShapes) {
      for (const anchor of ANCHORS) {
        const pos = getAnchorPosition(shape, anchor);
        const isHighlighted =
          this.highlightedAnchor?.shapeId === shape.id && this.highlightedAnchor?.anchor === anchor;
        const circle = new Konva.Circle({
          x: pos.x,
          y: pos.y,
          radius: NODE_RADIUS,
          fill: NODE_FILL,
          stroke: isHighlighted ? NODE_HIGHLIGHT_STROKE : NODE_STROKE,
          strokeWidth: NODE_STROKE_WIDTH,
          hitStrokeWidth: NODE_HIT_STROKE_WIDTH,
          listening: true,
          name: 'connector-node',
        });
        circle.on('click tap', () => {
          onNodeClick(shape.id, anchor);
        });
        group.add(circle);
      }
    }
    layer.add(group);
    this.connectionNodesGroup = group;
    layer.batchDraw();
  }

  highlightAnchor(shapeId: string, anchor: ConnectorAnchor): void {
    this.highlightedAnchor = { shapeId, anchor };
    if (this.lastConnectionNodesArgs) {
      this.updateConnectionNodes(
        this.lastConnectionNodesArgs.shapeIds,
        this.lastConnectionNodesArgs.objectsRecord,
        this.lastConnectionNodesArgs.onNodeClick
      );
    }
  }

  clearConnectionNodes(): void {
    const layer = this.overlayLayer;
    if (this.connectionNodesGroup) {
      this.connectionNodesGroup.destroy();
      this.connectionNodesGroup = null;
    }

    this.highlightedAnchor = null;
    this.lastConnectionNodesArgs = null;
    if (layer) {
      layer.batchDraw();
    }
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

    this.removeDrawingPreviewNode();
    this.drawingPreviewTool = null;

    if (this.cursorsGroup) {
      this.cursorsGroup.destroy();
      this.cursorsGroup = null;
    }

    if (this.connectionNodesGroup) {
      this.connectionNodesGroup.destroy();
      this.connectionNodesGroup = null;
    }

    this.highlightedAnchor = null;
    this.lastConnectionNodesArgs = null;

    this.overlayLayer = null;
  }
}

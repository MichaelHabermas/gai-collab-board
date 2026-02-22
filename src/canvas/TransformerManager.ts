/**
 * Transformer Manager — imperative Konva.Transformer lifecycle + transform-end attrs.
 * Port of TransformHandler.tsx config and transform-end logic.
 */

import Konva from 'konva';
import type { ITransformEndAttrs } from '@/types';
import { getPointsCenter, scaleLinePointsLengthOnly } from '@/lib/lineTransform';

const MIN_SIZE = 10;

function isGroupNode(node: Konva.Node): node is Konva.Group {
  return node.getClassName() === 'Group';
}

function isEllipseNode(node: Konva.Node): node is Konva.Ellipse {
  return node.getClassName() === 'Ellipse';
}

function isLineLikeNode(node: Konva.Node): node is Konva.Line {
  const className = node.getClassName();
  return className === 'Line' || className === 'Arrow';
}

function isRectNode(node: Konva.Node | null | undefined): node is Konva.Rect {
  if (!node) {
    return false;
  }

  return node.getClassName() === 'Rect';
}

export class TransformerManager {
  private readonly selectionLayer: Konva.Layer;
  private readonly transformer: Konva.Transformer;
  private transformEndHandler: (() => void) | null = null;

  constructor(selectionLayer: Konva.Layer) {
    this.selectionLayer = selectionLayer;
    this.transformer = new Konva.Transformer({
      // Exact config from TransformHandler.tsx
      flipEnabled: false,
      rotateEnabled: true,
      rotationSnaps: [0, 45, 90, 135, 180, 225, 270, 315],
      rotationSnapTolerance: 5,
      enabledAnchors: [
        'top-left',
        'top-center',
        'top-right',
        'middle-right',
        'bottom-right',
        'bottom-center',
        'bottom-left',
        'middle-left',
      ],
      anchorSize: 8,
      anchorCornerRadius: 2,
      anchorStroke: '#3b82f6',
      anchorFill: '#ffffff',
      anchorStrokeWidth: 1,
      borderStroke: '#3b82f6',
      borderStrokeWidth: 1,
      borderDash: [3, 3],
      boundBoxFunc: (oldBox, newBox) => {
        if (Math.abs(newBox.width) < MIN_SIZE || Math.abs(newBox.height) < MIN_SIZE) {
          return oldBox;
        }

        return newBox;
      },
    });

    this.selectionLayer.add(this.transformer);
  }

  /** Update which nodes the transformer attaches to. */
  syncNodes(selectedIds: string[], activeLayer: Konva.Layer): void {
    if (!selectedIds.length) {
      this.transformer.nodes([]);
      this.selectionLayer.batchDraw();
      return;
    }

    const nodes = selectedIds
      .map((id) => activeLayer.findOne(`#${id}`))
      .filter((node): node is Konva.Node => Boolean(node));

    this.transformer.nodes(nodes);
    this.selectionLayer.batchDraw();
  }

  /** Shape-aware attr extraction on transform end. */
  handleTransformEnd(onTransformEnd: (id: string, attrs: ITransformEndAttrs) => void): void {
    if (this.transformEndHandler) {
      this.transformer.off('transformend', this.transformEndHandler);
    }

    const handler = () => {
      const nodes = this.transformer.nodes();
      for (const node of nodes) {
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();

        let attrs: ITransformEndAttrs;

        if (isGroupNode(node)) {
          const name = node.name();
          const isSticky = name.includes('sticky');
          const { width: contentWidth, height: contentHeight } = node.getClientRect({
            skipTransform: true,
          });

          let width: number;
          let height: number;
          if (isSticky) {
            const firstRect = node.findOne('Rect');
            if (isRectNode(firstRect)) {
              width = Math.max(MIN_SIZE, firstRect.width() * scaleX);
              height = Math.max(MIN_SIZE, firstRect.height() * scaleY);
            } else {
              width = Math.max(MIN_SIZE, contentWidth * scaleX);
              height = Math.max(MIN_SIZE, contentHeight * scaleY);
            }
          } else {
            width = Math.max(MIN_SIZE, contentWidth * scaleX);
            height = Math.max(MIN_SIZE, contentHeight * scaleY);
          }

          node.scaleX(1);
          node.scaleY(1);

          attrs = {
            x: node.x(),
            y: node.y(),
            width,
            height,
            rotation: node.rotation(),
          };
        } else if (isEllipseNode(node)) {
          const minRadius = MIN_SIZE / 2;
          const rx = Math.max(minRadius, node.radiusX() * scaleX);
          const ry = Math.max(minRadius, node.radiusY() * scaleY);
          node.scaleX(1);
          node.scaleY(1);

          attrs = {
            x: node.x() - rx,
            y: node.y() - ry,
            width: rx * 2,
            height: ry * 2,
            rotation: node.rotation(),
          };
        } else if (isLineLikeNode(node)) {
          const currentPoints = node.points();
          const { points } = scaleLinePointsLengthOnly(currentPoints, scaleX, scaleY);
          node.scaleX(1);
          node.scaleY(1);
          const center = getPointsCenter(points);

          attrs = {
            x: node.x() - center.x,
            y: node.y() - center.y,
            points,
            rotation: node.rotation(),
          };
        } else {
          const width = Math.max(MIN_SIZE, node.width() * scaleX);
          const height = Math.max(MIN_SIZE, node.height() * scaleY);
          node.scaleX(1);
          node.scaleY(1);

          attrs = {
            x: node.x(),
            y: node.y(),
            width,
            height,
            rotation: node.rotation(),
          };
        }

        onTransformEnd(node.id(), attrs);
      }
    };

    this.transformEndHandler = handler;
    this.transformer.on('transformend', handler);
  }

  destroy(): void {
    if (this.transformEndHandler) {
      this.transformer.off('transformend', this.transformEndHandler);
      this.transformEndHandler = null;
    }

    this.transformer.destroy();
  }
}

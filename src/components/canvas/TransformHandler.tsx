import { Transformer } from 'react-konva';
import { useRef, useEffect, memo } from 'react';
import type { ReactElement } from 'react';
import Konva from 'konva';

/** Attrs sent for rect-like shapes (rectangle, group/sticky, ellipse/circle). */
export interface ITransformEndRectAttrs {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

/** Attrs sent for line-like shapes (line, connector). */
export interface ITransformEndLineAttrs {
  x: number;
  y: number;
  points: number[];
  rotation: number;
}

export type ITransformEndAttrs = ITransformEndRectAttrs | ITransformEndLineAttrs;

interface ITransformHandlerProps {
  selectedIds: string[];
  layerRef: React.RefObject<Konva.Layer | null>;
  onTransformEnd?: (id: string, attrs: ITransformEndAttrs) => void;
}

const MIN_SIZE = 10;

/**
 * TransformHandler component - manages the Konva Transformer for selected shapes.
 * Attaches to selected nodes and handles resize/rotate with shape-specific attrs.
 */
export const TransformHandler = memo(
  ({ selectedIds, layerRef, onTransformEnd }: ITransformHandlerProps): ReactElement | null => {
    const transformerRef = useRef<Konva.Transformer>(null);

    // Update transformer nodes when selection changes
    useEffect(() => {
      if (!transformerRef.current || !layerRef.current) return;

      // Find all selected nodes
      const nodes = selectedIds
        .map((id) => layerRef.current?.findOne(`#${id}`))
        .filter((node): node is Konva.Node => node !== undefined && node !== null);

      transformerRef.current.nodes(nodes);
      transformerRef.current.getLayer()?.batchDraw();
    }, [selectedIds, layerRef]);

    // Handle transform end with shape-aware attrs
    const handleTransformEnd = () => {
      if (!transformerRef.current || !onTransformEnd) return;

      const nodes = transformerRef.current.nodes();

      nodes.forEach((node) => {
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        const className = node.getClassName();

        let attrs: ITransformEndAttrs;

        if (className === 'Group') {
          // StickyNote and other Group-based shapes: use getClientRect (skipTransform) then apply scale
          const rect = node.getClientRect({ skipTransform: true });
          const width = Math.max(MIN_SIZE, rect.width * scaleX);
          const height = Math.max(MIN_SIZE, rect.height * scaleY);
          node.scaleX(1);
          node.scaleY(1);
          attrs = {
            x: node.x(),
            y: node.y(),
            width,
            height,
            rotation: node.rotation(),
          };
        } else if (className === 'Ellipse') {
          // Oval: store top-left and size; node uses center and radii
          const ellipse = node as Konva.Ellipse;
          const rx = Math.max(MIN_SIZE / 2, ellipse.radiusX() * scaleX);
          const ry = Math.max(MIN_SIZE / 2, ellipse.radiusY() * scaleY);
          node.scaleX(1);
          node.scaleY(1);
          attrs = {
            x: node.x() - rx,
            y: node.y() - ry,
            width: rx * 2,
            height: ry * 2,
            rotation: node.rotation(),
          };
        } else if (className === 'Line' || className === 'Arrow') {
          // Line / Connector: persist scaled points, not width/height
          const lineNode = node as Konva.Line;
          const currentPoints = lineNode.points();
          const scaledPoints = currentPoints.map((p, i) =>
            i % 2 === 0 ? p * scaleX : p * scaleY
          );
          node.scaleX(1);
          node.scaleY(1);
          attrs = {
            x: node.x(),
            y: node.y(),
            points: scaledPoints,
            rotation: node.rotation(),
          };
        } else {
          // Rect and any other (Rectangle, Text, Frame, etc.)
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
      });
    };

    if (selectedIds.length === 0) {
      return null;
    }

    return (
      <Transformer
        ref={transformerRef}
        flipEnabled={false}
        rotateEnabled={true}
        rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
        rotationSnapTolerance={5}
        enabledAnchors={[
          'top-left',
          'top-center',
          'top-right',
          'middle-right',
          'bottom-right',
          'bottom-center',
          'bottom-left',
          'middle-left',
        ]}
        boundBoxFunc={(oldBox, newBox) => {
          // Limit minimum size
          if (Math.abs(newBox.width) < MIN_SIZE || Math.abs(newBox.height) < MIN_SIZE) {
            return oldBox;
          }
          return newBox;
        }}
        onTransformEnd={handleTransformEnd}
        anchorSize={8}
        anchorCornerRadius={2}
        anchorStroke='#3b82f6'
        anchorFill='#ffffff'
        anchorStrokeWidth={1}
        borderStroke='#3b82f6'
        borderStrokeWidth={1}
        borderDash={[3, 3]}
      />
    );
  }
);

TransformHandler.displayName = 'TransformHandler';

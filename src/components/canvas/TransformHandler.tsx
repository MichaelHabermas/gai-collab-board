import { Transformer } from 'react-konva';
import { useRef, useEffect, memo } from 'react';
import type { ReactElement } from 'react';
import Konva from 'konva';

interface ITransformHandlerProps {
  selectedIds: string[];
  layerRef: React.RefObject<Konva.Layer | null>;
  onTransformEnd?: (
    id: string,
    attrs: {
      x: number;
      y: number;
      width: number;
      height: number;
      rotation: number;
      scaleX?: number;
      scaleY?: number;
    }
  ) => void;
}

const MIN_SIZE = 10;

/**
 * TransformHandler component - manages the Konva Transformer for selected shapes.
 * Attaches to selected nodes and handles resize/rotate operations.
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

    // Handle transform end
    const handleTransformEnd = () => {
      if (!transformerRef.current || !onTransformEnd) return;

      const nodes = transformerRef.current.nodes();

      nodes.forEach((node) => {
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();

        // Calculate new dimensions
        const attrs = {
          x: node.x(),
          y: node.y(),
          width: Math.max(MIN_SIZE, node.width() * scaleX),
          height: Math.max(MIN_SIZE, node.height() * scaleY),
          rotation: node.rotation(),
          scaleX: 1,
          scaleY: 1,
        };

        // Reset scale
        node.scaleX(1);
        node.scaleY(1);

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

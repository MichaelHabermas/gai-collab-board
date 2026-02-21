import { Transformer } from 'react-konva';
import { useRef, useEffect, memo } from 'react';
import type { ReactElement, RefObject } from 'react';
import Konva from 'konva';
import type { ITransformEndAttrs } from '@/types';
import { isKonvaGroup, isKonvaRect, isKonvaEllipse, isKonvaLine } from '@/types/guards';
import { getPointsCenter, scaleLinePointsLengthOnly } from '@/lib/lineTransform';
export type { ITransformEndRectAttrs, ITransformEndLineAttrs, ITransformEndAttrs } from '@/types';

interface ITransformHandlerProps {
  selectedIds: string[];
  layerRef: RefObject<Konva.Layer | null>;
  requestBatchDraw: (layer: Konva.Layer | null) => void;
  /** IDs to exclude from transform (e.g. linked connectors); they stay selected but get no handles */
  excludedFromTransformIds?: string[];
  onTransformEnd?: (id: string, attrs: ITransformEndAttrs) => void;
}

const MIN_SIZE = 10;

/**
 * TransformHandler component - manages the Konva Transformer for selected shapes.
 * Attaches to selected nodes and handles resize/rotate with shape-specific attrs.
 */
export const TransformHandler = memo(
  ({
    selectedIds,
    layerRef,
    requestBatchDraw,
    excludedFromTransformIds,
    onTransformEnd,
  }: ITransformHandlerProps): ReactElement | null => {
    const transformerRef = useRef<Konva.Transformer>(null);

    const transformableIds =
      excludedFromTransformIds?.length && excludedFromTransformIds.length > 0
        ? selectedIds.filter((id) => !excludedFromTransformIds.includes(id))
        : selectedIds;

    // Update transformer nodes when selection changes
    useEffect(() => {
      if (!transformerRef.current || !layerRef.current) return;

      const nodes = transformableIds
        .map((id) => layerRef.current?.findOne(`#${id}`))
        .filter((node): node is Konva.Node => node !== undefined && node !== null);

      transformerRef.current.nodes(nodes);
      requestBatchDraw(transformerRef.current.getLayer() ?? null);
    }, [transformableIds, layerRef, requestBatchDraw]);

    // Handle transform end with shape-aware attrs
    const handleTransformEnd = () => {
      if (!transformerRef.current || !onTransformEnd) return;

      const nodes = transformerRef.current.nodes();

      nodes.forEach((node) => {
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        const className = node.getClassName();

        let attrs: ITransformEndAttrs;

        if (isKonvaGroup(node)) {
          // StickyNote: use first Rect (note body) so shadow/fold don't inflate size. Frame/others: use getClientRect.
          const name = node.name() ?? '';
          const isSticky = name.includes('sticky');
          const groupNode = node;
          const contentRect = node.getClientRect({ skipTransform: true });
          let width: number;
          let height: number;
          if (isSticky) {
            const firstRect = groupNode.findOne('Rect');
            if (firstRect && isKonvaRect(firstRect)) {
              const r = firstRect;
              width = Math.max(MIN_SIZE, r.width() * scaleX);
              height = Math.max(MIN_SIZE, r.height() * scaleY);
            } else {
              width = Math.max(MIN_SIZE, contentRect.width * scaleX);
              height = Math.max(MIN_SIZE, contentRect.height * scaleY);
            }
          } else {
            width = Math.max(MIN_SIZE, contentRect.width * scaleX);
            height = Math.max(MIN_SIZE, contentRect.height * scaleY);
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
        } else if (isKonvaEllipse(node)) {
          // Oval: store top-left and size; node uses center and radii
          const ellipse = node;
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
        } else if (isKonvaLine(node)) {
          // Line / Connector: length-only scaling so only length changes, not width
          const lineNode = node;
          const currentPoints = lineNode.points();
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

    if (selectedIds.length === 0 || transformableIds.length === 0) {
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

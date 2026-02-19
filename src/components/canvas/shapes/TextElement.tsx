import { Text } from 'react-konva';
import { forwardRef, useCallback, useRef, useState, memo } from 'react';
import type { ReactElement } from 'react';
import Konva from 'konva';
import { useShapeDragHandler } from '@/hooks/useShapeDragHandler';
import { useShapeTransformHandler } from '@/hooks/useShapeTransformHandler';
import { getShapeShadowProps } from '@/lib/shapeShadowProps';
import { getOverlayRectFromLocalCorners } from '@/lib/canvasOverlayPosition';
import { attachOverlayRepositionLifecycle } from '@/lib/canvasTextEditOverlay';
import type { ITextLikeShapeProps, ITransformEndAttrsUnion } from '@/types';

type ITextElementProps = ITextLikeShapeProps;

/**
 * TextElement component - standalone editable text on the canvas.
 * Double-click to edit text using an HTML textarea overlay.
 */
export const TextElement = memo(
  forwardRef<Konva.Text, ITextElementProps>(
    (
      {
        id,
        x,
        y,
        text,
        fontSize = 16,
        fill = '#1f2937',
        width,
        opacity = 1,
        rotation = 0,
        isSelected = false,
        draggable = true,
        onSelect,
        onDragStart,
        onDragEnd,
        onDragMove,
        dragBoundFunc,
        onTextChange,
        onTransformEnd,
      },
      ref
    ): ReactElement => {
      const [isEditing, setIsEditing] = useState(false);
      const textRef = useRef<Konva.Text>(null);

      // Handle double-click to start editing. Position overlay from node's transformed rect
      // so it stays aligned for any rotation/zoom.
      const handleDblClick = useCallback(() => {
        if (!onTextChange) return;

        const textNode = textRef.current;
        if (!textNode) return;

        const stage = textNode.getStage();
        if (!stage) return;

        setIsEditing(true);

        requestAnimationFrame(() => {
          const transform = textNode.getAbsoluteTransform();
          const w = width ?? textNode.width();
          const h = textNode.height();

          const localCorners = [
            { x: 0, y: 0 },
            { x: w, y: 0 },
            { x: w, y: h },
            { x: 0, y: h },
          ];
          const overlayRect = getOverlayRectFromLocalCorners(stage, transform, localCorners);
          const areaWidth = Math.max(100, overlayRect.width);

          const textarea = document.createElement('textarea');
          textarea.className = 'sticky-note-edit-overlay';
          document.body.appendChild(textarea);

          textarea.value = text;
          textarea.style.position = 'fixed';
          textarea.style.top = `${overlayRect.top}px`;
          textarea.style.left = `${overlayRect.left}px`;
          textarea.style.width = `${areaWidth}px`;
          textarea.style.minWidth = '100px';
          textarea.style.height = `${overlayRect.height}px`;
          textarea.style.fontSize = `${fontSize * overlayRect.avgScale}px`;
          textarea.style.border = 'none';
          textarea.style.padding = '0px';
          textarea.style.margin = '0px';
          textarea.style.overflow = 'hidden';
          textarea.style.background = 'transparent';
          textarea.style.outline = 'none';
          textarea.style.resize = 'none';
          textarea.style.fontFamily = 'Inter, system-ui, sans-serif';
          textarea.style.lineHeight = '1.4';
          textarea.style.zIndex = '1000';

          const cleanupReposition = attachOverlayRepositionLifecycle({
            stage,
            node: textNode,
            localCorners,
            overlayElement: textarea,
            applyStyle: (el, rect) => {
              const w = Math.max(100, rect.width);
              el.style.top = `${rect.top}px`;
              el.style.left = `${rect.left}px`;
              el.style.width = `${w}px`;
              el.style.height = `${rect.height}px`;
              el.style.fontSize = `${fontSize * rect.avgScale}px`;
            },
          });

          textarea.focus();
          textarea.select();

          const removeTextarea = () => {
            cleanupReposition();
            if (document.body.contains(textarea)) {
              document.body.removeChild(textarea);
            }

            setIsEditing(false);
          };

          const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
              removeTextarea();
            }

            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onTextChange(textarea.value);
              removeTextarea();
            }
          };

          const handleBlur = () => {
            onTextChange(textarea.value);
            removeTextarea();
          };

          textarea.addEventListener('keydown', handleKeyDown);
          textarea.addEventListener('blur', handleBlur);
        });
      }, [text, width, fontSize, onTextChange]);

      const handleDragEnd = useShapeDragHandler(onDragEnd);

      // Handle transform end
      const handleTransformEnd = useShapeTransformHandler(
        'text',
        onTransformEnd as ((attrs: ITransformEndAttrsUnion) => void) | undefined,
        { fontSize }
      );

      // Combine refs
      const setRefs = useCallback(
        (node: Konva.Text | null) => {
          textRef.current = node;
          if (ref) {
            if (typeof ref === 'function') {
              ref(node);
            } else {
              ref.current = node;
            }
          }
        },
        [ref]
      );

      return (
        <Text
          ref={setRefs}
          id={id}
          name='shape text'
          x={x}
          y={y}
          text={text || 'Double-click to edit'}
          fontSize={fontSize}
          fontFamily='Inter, system-ui, sans-serif'
          fill={fill}
          width={width}
          opacity={opacity}
          rotation={rotation}
          lineHeight={1.4}
          {...getShapeShadowProps(isSelected)}
          draggable={draggable && !isEditing}
          onClick={onSelect}
          onTap={onSelect}
          onDblClick={handleDblClick}
          onDblTap={handleDblClick}
          onDragStart={onDragStart}
          onDragEnd={handleDragEnd}
          onDragMove={onDragMove}
          dragBoundFunc={dragBoundFunc}
          onTransformEnd={handleTransformEnd}
          visible={!isEditing}
          perfectDrawEnabled={false}
        />
      );
    }
  )
);

TextElement.displayName = 'TextElement';

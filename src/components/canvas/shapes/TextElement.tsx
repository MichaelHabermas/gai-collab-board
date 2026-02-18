import { Text } from 'react-konva';
import { forwardRef, useCallback, useRef, useState, useMemo, memo } from 'react';
import type { ReactElement } from 'react';
import Konva from 'konva';
import { useTheme } from '@/hooks/useTheme';

interface ITextElementProps {
  id: string;
  x: number;
  y: number;
  text: string;
  fontSize?: number;
  fill?: string;
  width?: number;
  opacity?: number;
  rotation?: number;
  isSelected?: boolean;
  draggable?: boolean;
  onSelect?: () => void;
  onDragStart?: () => void;
  onDragEnd?: (x: number, y: number) => void;
  dragBoundFunc?: (pos: { x: number; y: number }) => { x: number; y: number };
  onTextChange?: (text: string) => void;
  onTransformEnd?: (attrs: {
    x: number;
    y: number;
    width: number;
    fontSize: number;
    rotation: number;
  }) => void;
}

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
        dragBoundFunc,
        onTextChange,
        onTransformEnd,
      },
      ref
    ): ReactElement => {
      const [isEditing, setIsEditing] = useState(false);
      const textRef = useRef<Konva.Text>(null);
      const { theme } = useTheme();
      const selectionColor = useMemo(
        () =>
          (typeof document !== 'undefined'
            ? getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim()
            : '') || '#3b82f6',
        [theme]
      );

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
          const stageBox = stage.container().getBoundingClientRect();
          const stagePos = stage.position();
          const scaleX = stage.scaleX();
          const scaleY = stage.scaleY();
          const transform = textNode.getAbsoluteTransform();
          const w = width ?? textNode.width();
          const h = textNode.height();

          const localCorners = [
            { x: 0, y: 0 },
            { x: w, y: 0 },
            { x: w, y: h },
            { x: 0, y: h },
          ];
          const screenPoints = localCorners.map((p) => {
            const stagePt = transform.point(p);
            return {
              x: stageBox.left + (stagePt.x + stagePos.x) * scaleX,
              y: stageBox.top + (stagePt.y + stagePos.y) * scaleY,
            };
          });
          const left = Math.min(...screenPoints.map((p) => p.x));
          const top = Math.min(...screenPoints.map((p) => p.y));
          const right = Math.max(...screenPoints.map((p) => p.x));
          const bottom = Math.max(...screenPoints.map((p) => p.y));
          const areaWidth = Math.max(100, right - left);
          const areaHeight = Math.max(1, bottom - top);
          const avgScale = (scaleX + scaleY) / 2;

          const textarea = document.createElement('textarea');
          textarea.className = 'sticky-note-edit-overlay';
          document.body.appendChild(textarea);

          textarea.value = text;
          textarea.style.position = 'fixed';
          textarea.style.top = `${top}px`;
          textarea.style.left = `${left}px`;
          textarea.style.width = `${areaWidth}px`;
          textarea.style.minWidth = '100px';
          textarea.style.height = `${areaHeight}px`;
          textarea.style.fontSize = `${fontSize * avgScale}px`;
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

          textarea.focus();
          textarea.select();

          const removeTextarea = () => {
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

      // Handle drag end
      const handleDragEnd = useCallback(
        (e: Konva.KonvaEventObject<DragEvent>) => {
          onDragEnd?.(e.target.x(), e.target.y());
        },
        [onDragEnd]
      );

      // Handle transform end
      const handleTransformEnd = useCallback(
        (e: Konva.KonvaEventObject<Event>) => {
          const node = e.target as Konva.Text;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();

          // Reset scale and apply to font size/width
          node.scaleX(1);
          node.scaleY(1);

          const newFontSize = Math.max(8, fontSize * Math.max(scaleX, scaleY));

          onTransformEnd?.({
            x: node.x(),
            y: node.y(),
            width: Math.max(50, node.width() * scaleX),
            fontSize: newFontSize,
            rotation: node.rotation(),
          });
        },
        [fontSize, onTransformEnd]
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
          fill={isSelected ? selectionColor : fill}
          width={width}
          opacity={opacity}
          rotation={rotation}
          lineHeight={1.4}
          draggable={draggable && !isEditing}
          onClick={onSelect}
          onTap={onSelect}
          onDblClick={handleDblClick}
          onDblTap={handleDblClick}
          onDragStart={onDragStart}
          onDragEnd={handleDragEnd}
          dragBoundFunc={dragBoundFunc}
          onTransformEnd={handleTransformEnd}
          visible={!isEditing}
        />
      );
    }
  )
);

TextElement.displayName = 'TextElement';

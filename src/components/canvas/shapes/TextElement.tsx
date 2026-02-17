import { Text } from 'react-konva';
import { forwardRef, useCallback, useRef, useState, memo } from 'react';
import type { ReactElement } from 'react';
import Konva from 'konva';

interface ITextElementProps {
  id: string;
  x: number;
  y: number;
  text: string;
  fontSize?: number;
  fill?: string;
  width?: number;
  rotation?: number;
  isSelected?: boolean;
  draggable?: boolean;
  onSelect?: () => void;
  onDragStart?: () => void;
  onDragEnd?: (x: number, y: number) => void;
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
        rotation = 0,
        isSelected = false,
        draggable = true,
        onSelect,
        onDragStart,
        onDragEnd,
        onTextChange,
        onTransformEnd,
      },
      ref
    ): ReactElement => {
      const [isEditing, setIsEditing] = useState(false);
      const textRef = useRef<Konva.Text>(null);

      // Handle double-click to start editing
      const handleDblClick = useCallback(() => {
        if (!onTextChange) return;

        const textNode = textRef.current;
        if (!textNode) return;

        const stage = textNode.getStage();
        if (!stage) return;

        setIsEditing(true);

        // Get absolute position for textarea
        const textPosition = textNode.absolutePosition();
        const stageBox = stage.container().getBoundingClientRect();
        const scale = stage.scaleX();

        const areaPosition = {
          x: stageBox.left + textPosition.x * scale,
          y: stageBox.top + textPosition.y * scale,
        };

        // Create textarea for editing
        const textarea = document.createElement('textarea');
        document.body.appendChild(textarea);

        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.top = `${areaPosition.y}px`;
        textarea.style.left = `${areaPosition.x}px`;
        textarea.style.width = `${(width || textNode.width()) * scale}px`;
        textarea.style.minWidth = '100px';
        textarea.style.fontSize = `${fontSize * scale}px`;
        textarea.style.border = 'none';
        textarea.style.padding = '0px';
        textarea.style.margin = '0px';
        textarea.style.overflow = 'hidden';
        textarea.style.background = 'transparent';
        textarea.style.outline = 'none';
        textarea.style.resize = 'none';
        textarea.style.fontFamily = 'Inter, system-ui, sans-serif';
        textarea.style.lineHeight = '1.4';
        textarea.style.color = fill;
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
      }, [text, width, fontSize, fill, onTextChange]);

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
          fill={isSelected ? '#3b82f6' : fill}
          width={width}
          rotation={rotation}
          lineHeight={1.4}
          draggable={draggable && !isEditing}
          onClick={onSelect}
          onTap={onSelect}
          onDblClick={handleDblClick}
          onDblTap={handleDblClick}
          onDragStart={onDragStart}
          onDragEnd={handleDragEnd}
          onTransformEnd={handleTransformEnd}
          visible={!isEditing}
        />
      );
    }
  )
);

TextElement.displayName = 'TextElement';

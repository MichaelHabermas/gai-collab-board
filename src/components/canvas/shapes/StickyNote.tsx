import { Group, Rect, Text } from 'react-konva';
import { forwardRef, useState, useRef, useCallback, useEffect, memo } from 'react';
import type { ReactElement } from 'react';
import Konva from 'konva';

// Sticky note color palette
export const STICKY_COLORS = {
  yellow: '#fef08a',
  pink: '#fda4af',
  blue: '#93c5fd',
  green: '#86efac',
  purple: '#c4b5fd',
  orange: '#fed7aa',
} as const;

export type StickyColor = keyof typeof STICKY_COLORS;

interface IStickyNoteProps {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fill: string;
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
    height: number;
    rotation: number;
  }) => void;
}

/**
 * StickyNote component - a draggable sticky note with editable text.
 * Double-click to edit text using an HTML textarea overlay.
 */
export const StickyNote = memo(
  forwardRef<Konva.Group, IStickyNoteProps>(
    (
      {
        id,
        x,
        y,
        width,
        height,
        text,
        fill,
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
      const groupRef = useRef<Konva.Group>(null);

      // Handle double-click to start editing
      const handleDblClick = useCallback(() => {
        if (!onTextChange) return;

        const group = groupRef.current;
        if (!group) return;

        const stage = group.getStage();
        if (!stage) return;

        setIsEditing(true);

        // Get absolute position for textarea
        const textNode = textRef.current;
        if (!textNode) return;

        const textPosition = textNode.absolutePosition();
        const stageBox = stage.container().getBoundingClientRect();
        const scale = stage.scaleX();
        const stagePos = stage.position();

        // Account for stage pan/zoom offset
        const areaPosition = {
          x: stageBox.left + (textPosition.x + stagePos.x) * scale,
          y: stageBox.top + (textPosition.y + stagePos.y) * scale,
        };

        // Create textarea for editing
        const textarea = document.createElement('textarea');
        document.body.appendChild(textarea);

        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.top = `${areaPosition.y}px`;
        textarea.style.left = `${areaPosition.x}px`;
        textarea.style.width = `${(width - 16) * scale}px`;
        textarea.style.height = `${(height - 16) * scale}px`;
        textarea.style.fontSize = `${14 * scale}px`;
        textarea.style.border = 'none';
        textarea.style.padding = '0px';
        textarea.style.margin = '0px';
        textarea.style.overflow = 'hidden';
        textarea.style.background = 'transparent';
        textarea.style.outline = 'none';
        textarea.style.resize = 'none';
        textarea.style.fontFamily = 'Inter, system-ui, sans-serif';
        textarea.style.lineHeight = '1.4';
        textarea.style.color = '#1f2937';
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
      }, [text, width, height, onTextChange]);

      // Handle drag end
      const handleDragEnd = useCallback(
        (e: Konva.KonvaEventObject<DragEvent>) => {
          onDragEnd?.(e.target.x(), e.target.y());
        },
        [onDragEnd]
      );

      // Handle transform end (resize/rotate)
      const handleTransformEnd = useCallback(() => {
        const node = groupRef.current;
        if (!node) return;

        const scaleX = node.scaleX();
        const scaleY = node.scaleY();

        // Reset scale and apply to width/height
        node.scaleX(1);
        node.scaleY(1);

        onTransformEnd?.({
          x: node.x(),
          y: node.y(),
          width: Math.max(80, width * scaleX),
          height: Math.max(80, height * scaleY),
          rotation: node.rotation(),
        });
      }, [width, height, onTransformEnd]);

      // Combine refs
      useEffect(() => {
        if (ref) {
          if (typeof ref === 'function') {
            ref(groupRef.current);
          } else {
            ref.current = groupRef.current;
          }
        }
      }, [ref]);

      return (
        <Group
          ref={groupRef}
          id={id}
          name='shape sticky'
          x={x}
          y={y}
          rotation={rotation}
          draggable={draggable && !isEditing}
          onClick={onSelect}
          onTap={onSelect}
          onDblClick={handleDblClick}
          onDblTap={handleDblClick}
          onDragStart={onDragStart}
          onDragEnd={handleDragEnd}
          onTransformEnd={handleTransformEnd}
        >
          {/* Background with shadow */}
          <Rect
            width={width}
            height={height}
            fill={fill}
            shadowColor='rgba(0, 0, 0, 0.15)'
            shadowBlur={isSelected ? 12 : 8}
            shadowOpacity={isSelected ? 0.3 : 0.2}
            shadowOffsetX={isSelected ? 0 : 3}
            shadowOffsetY={isSelected ? 0 : 3}
            cornerRadius={4}
            stroke={isSelected ? '#3b82f6' : undefined}
            strokeWidth={isSelected ? 2 : 0}
          />

          {/* Fold effect in corner */}
          <Rect
            x={width - 20}
            y={0}
            width={20}
            height={20}
            fill='rgba(0, 0, 0, 0.05)'
            listening={false}
          />

          {/* Text content */}
          <Text
            ref={textRef}
            text={text}
            x={8}
            y={8}
            width={width - 16}
            height={height - 16}
            fontSize={14}
            fontFamily='Inter, system-ui, sans-serif'
            fill='#1f2937'
            lineHeight={1.4}
            wrap='word'
            ellipsis
            visible={!isEditing}
            listening={false}
          />
        </Group>
      );
    }
  )
);

StickyNote.displayName = 'StickyNote';

import { Group, Rect, Text } from 'react-konva';
import { forwardRef, useState, useRef, useCallback, useEffect, useMemo, memo } from 'react';
import type { ReactElement } from 'react';
import Konva from 'konva';
import { useTheme } from '@/hooks/useTheme';
import { useShapeDragHandler } from '@/hooks/useShapeDragHandler';
import {
  STICKY_NOTE_SHADOW_BLUR_DEFAULT,
  STICKY_NOTE_SHADOW_BLUR_SELECTED,
  STICKY_NOTE_SHADOW_COLOR,
  STICKY_NOTE_SHADOW_OFFSET_DEFAULT,
  STICKY_NOTE_SHADOW_OFFSET_SELECTED,
  STICKY_NOTE_SHADOW_OPACITY_DEFAULT,
  STICKY_NOTE_SHADOW_OPACITY_SELECTED,
} from '@/lib/canvasShadows';
import { getOverlayRectFromLocalCorners } from '@/lib/canvasOverlayPosition';
import { attachOverlayRepositionLifecycle } from '@/lib/canvasTextEditOverlay';
import type { IDragBoundFunc, ITransformEndRectAttrs, IKonvaDragEvent } from '@/types';

const DEFAULT_STICKY_FONT_SIZE = 14;
const DEFAULT_STICKY_TEXT_COLOR = '#000000';

interface IStickyNoteProps {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fill: string;
  textFill?: string;
  fontSize?: number;
  opacity?: number;
  rotation?: number;
  isSelected?: boolean;
  draggable?: boolean;
  onSelect?: () => void;
  onDragStart?: () => void;
  onDragEnd?: (x: number, y: number) => void;
  onDragMove?: (e: IKonvaDragEvent) => void;
  dragBoundFunc?: IDragBoundFunc;
  onTextChange?: (text: string) => void;
  onTransformEnd?: (attrs: ITransformEndRectAttrs) => void;
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
        textFill,
        fontSize = DEFAULT_STICKY_FONT_SIZE,
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
        onTransformEnd: _onTransformEnd,
      },
      ref
    ): ReactElement => {
      const [isEditing, setIsEditing] = useState(false);
      const textRef = useRef<Konva.Text>(null);
      const groupRef = useRef<Konva.Group>(null);
      const { theme } = useTheme();
      const selectionColor = useMemo(
        () =>
          (theme &&
            (typeof document !== 'undefined'
              ? getComputedStyle(document.documentElement)
                  .getPropertyValue('--color-primary')
                  .trim()
              : '')) ||
          '#3b82f6',
        [theme]
      );
      const textFillColor = useMemo(() => {
        if (textFill && textFill !== '') {
          return textFill;
        }

        return DEFAULT_STICKY_TEXT_COLOR;
      }, [textFill]);

      // Handle double-click to start editing. Position textarea from Group's screen rect
      // so it stays aligned for any rotation/zoom (avoids text "jumping" out of the note).
      const handleDblClick = useCallback(() => {
        if (!onTextChange) return;

        const group = groupRef.current;
        if (!group) return;

        const stage = group.getStage();
        if (!stage) return;

        setIsEditing(true);

        // Defer overlay by one frame so Konva Text is hidden and stage has redrawn first.
        requestAnimationFrame(() => {
          const transform = group.getAbsoluteTransform();

          // Text content rect in group-local coords (same padding as Konva Text: 8px)
          const padding = 8;
          const localCorners = [
            { x: padding, y: padding },
            { x: width - padding, y: padding },
            { x: width - padding, y: height - padding },
            { x: padding, y: height - padding },
          ];

          const overlayRect = getOverlayRectFromLocalCorners(stage, transform, localCorners);

          const textarea = document.createElement('textarea');
          textarea.className = 'sticky-note-edit-overlay';
          textarea.setAttribute('data-testid', 'sticky-note-edit-overlay');
          document.body.appendChild(textarea);

          textarea.value = text;
          textarea.style.position = 'fixed';
          textarea.style.top = `${overlayRect.top}px`;
          textarea.style.left = `${overlayRect.left}px`;
          textarea.style.width = `${overlayRect.width}px`;
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
          textarea.style.color = textFillColor;
          textarea.style.zIndex = '1000';

          const cleanupReposition = attachOverlayRepositionLifecycle({
            stage,
            node: group,
            localCorners,
            overlayElement: textarea,
            applyStyle: (el, rect) => {
              el.style.top = `${rect.top}px`;
              el.style.left = `${rect.left}px`;
              el.style.width = `${rect.width}px`;
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
      }, [text, width, height, fontSize, onTextChange, textFillColor]);

      const handleDragEnd = useShapeDragHandler(onDragEnd);

      // Transform end (resize/rotate) is handled only by TransformHandler; no duplicate handler here.

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

      // Cache as bitmap when idle (not selected, not editing) for faster redraws.
      // Invalidates when any visual prop changes.
      useEffect(() => {
        const group = groupRef.current;
        if (!group || typeof group.cache !== 'function') return;

        if (isSelected || isEditing) {
          group.clearCache();
        } else {
          const frame = requestAnimationFrame(() => {
            const g = groupRef.current;
            if (g && typeof g.cache === 'function') {
              g.cache({ pixelRatio: 2 });
            }
          });

          return () => cancelAnimationFrame(frame);
        }
      }, [isSelected, isEditing, fill, text, width, height, fontSize, textFillColor, opacity]);

      return (
        <Group
          ref={groupRef}
          id={id}
          name='shape sticky'
          x={x}
          y={y}
          opacity={opacity}
          rotation={rotation}
          draggable={draggable && !isEditing}
          onClick={onSelect}
          onTap={onSelect}
          onDblClick={handleDblClick}
          onDblTap={handleDblClick}
          onDragStart={onDragStart}
          onDragEnd={handleDragEnd}
          onDragMove={onDragMove}
          dragBoundFunc={dragBoundFunc}
        >
          {/* Background with shadow */}
          <Rect
            width={width}
            height={height}
            fill={fill}
            shadowColor={STICKY_NOTE_SHADOW_COLOR}
            shadowBlur={
              isSelected ? STICKY_NOTE_SHADOW_BLUR_SELECTED : STICKY_NOTE_SHADOW_BLUR_DEFAULT
            }
            shadowOpacity={
              isSelected ? STICKY_NOTE_SHADOW_OPACITY_SELECTED : STICKY_NOTE_SHADOW_OPACITY_DEFAULT
            }
            shadowOffsetX={
              isSelected ? STICKY_NOTE_SHADOW_OFFSET_SELECTED : STICKY_NOTE_SHADOW_OFFSET_DEFAULT
            }
            shadowOffsetY={
              isSelected ? STICKY_NOTE_SHADOW_OFFSET_SELECTED : STICKY_NOTE_SHADOW_OFFSET_DEFAULT
            }
            cornerRadius={4}
            stroke={isSelected ? selectionColor : undefined}
            strokeWidth={isSelected ? 2 : 0}
            shadowForStrokeEnabled={false}
            perfectDrawEnabled={false}
          />

          {/* Fold effect in corner */}
          <Rect
            x={width - 20}
            y={0}
            width={20}
            height={20}
            fill='rgba(0, 0, 0, 0.05)'
            listening={false}
            perfectDrawEnabled={false}
          />

          {/* Text content */}
          <Text
            ref={textRef}
            text={text}
            x={8}
            y={8}
            width={width - 16}
            height={height - 16}
            fontSize={fontSize}
            fontFamily='Inter, system-ui, sans-serif'
            fill={textFillColor}
            lineHeight={1.4}
            wrap='word'
            ellipsis
            visible={!isEditing}
            listening={false}
            perfectDrawEnabled={false}
          />
        </Group>
      );
    }
  )
);

StickyNote.displayName = 'StickyNote';

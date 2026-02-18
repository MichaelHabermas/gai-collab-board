import { Group, Rect, Text } from 'react-konva';
import { forwardRef, useCallback, useRef, useState, useEffect, useMemo, memo } from 'react';
import type { ReactElement } from 'react';
import Konva from 'konva';
import { useTheme } from '@/hooks/useTheme';
import {
  SHADOW_BLUR_DEFAULT,
  SHADOW_BLUR_SELECTED,
  SHADOW_COLOR,
  SHADOW_FOR_STROKE_ENABLED,
  SHADOW_OPACITY,
  SHADOW_OFFSET_X,
  SHADOW_OFFSET_Y,
} from '@/lib/canvasShadows';
import { getOverlayRectFromLocalCorners } from '@/lib/canvasOverlayPosition';

interface IFrameProps {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
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
    height: number;
    rotation: number;
  }) => void;
}

const TITLE_HEIGHT = 32;
const TITLE_PADDING = 12;

/**
 * Frame component - a container with a title for grouping content.
 * Features a title bar at the top and a semi-transparent body.
 */
export const Frame = memo(
  forwardRef<Konva.Group, IFrameProps>(
    (
      {
        id,
        x,
        y,
        width,
        height,
        text,
        fill = 'rgba(241, 245, 249, 0.5)',
        stroke = '#94a3b8',
        strokeWidth = 2,
        opacity = 1,
        rotation = 0,
        isSelected = false,
        draggable = true,
        onSelect,
        onDragStart,
        onDragEnd,
        dragBoundFunc,
        onTextChange,
        onTransformEnd: _onTransformEnd,
      },
      ref
    ): ReactElement => {
      const [isEditing, setIsEditing] = useState(false);
      const groupRef = useRef<Konva.Group>(null);
      const textRef = useRef<Konva.Text>(null);
      const { theme } = useTheme();
      const selectionColor = useMemo(
        () =>
          (typeof document !== 'undefined'
            ? getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim()
            : '') || '#3b82f6',
        [theme]
      );
      const titleTextFill = useMemo(
        () =>
          (typeof document !== 'undefined'
            ? getComputedStyle(document.documentElement)
                .getPropertyValue('--color-muted-foreground')
                .trim()
            : '') || '#475569',
        [theme]
      );

      // Handle double-click on title to edit. Position overlay from Group's transformed rect.
      const handleTitleDblClick = useCallback(() => {
        if (!onTextChange) return;

        const group = groupRef.current;
        if (!group) return;

        const stage = group.getStage();
        if (!stage) return;

        setIsEditing(true);

        requestAnimationFrame(() => {
          const transform = group.getAbsoluteTransform();
          const titleTop = (TITLE_HEIGHT - 14) / 2;
          const titleHeight = 14;
          const localCorners = [
            { x: TITLE_PADDING, y: titleTop },
            { x: width - TITLE_PADDING, y: titleTop },
            { x: width - TITLE_PADDING, y: titleTop + titleHeight },
            { x: TITLE_PADDING, y: titleTop + titleHeight },
          ];
          const overlayRect = getOverlayRectFromLocalCorners(stage, transform, localCorners);

          const input = document.createElement('input');
          input.className = 'sticky-note-edit-overlay';
          input.type = 'text';
          document.body.appendChild(input);

          input.value = text;
          input.style.position = 'fixed';
          input.style.top = `${overlayRect.top}px`;
          input.style.left = `${overlayRect.left}px`;
          input.style.width = `${overlayRect.width}px`;
          input.style.height = `${overlayRect.height}px`;
          input.style.fontSize = `${14 * overlayRect.avgScale}px`;
          input.style.fontWeight = '600';
          input.style.border = 'none';
          input.style.padding = '0px';
          input.style.margin = '0px';
          input.style.background = 'transparent';
          input.style.outline = 'none';
          input.style.fontFamily = 'Inter, system-ui, sans-serif';
          input.style.zIndex = '1000';

          input.focus();
          input.select();

          const removeInput = () => {
            if (document.body.contains(input)) {
              document.body.removeChild(input);
            }
            setIsEditing(false);
          };

          const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
              removeInput();
            }
            if (e.key === 'Enter') {
              e.preventDefault();
              onTextChange(input.value);
              removeInput();
            }
          };

          const handleBlur = () => {
            onTextChange(input.value);
            removeInput();
          };

          input.addEventListener('keydown', handleKeyDown);
          input.addEventListener('blur', handleBlur);
        });
      }, [text, width, onTextChange]);

      // Handle drag end
      const handleDragEnd = useCallback(
        (e: Konva.KonvaEventObject<DragEvent>) => {
          onDragEnd?.(e.target.x(), e.target.y());
        },
        [onDragEnd]
      );

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

      return (
        <Group
          ref={groupRef}
          id={id}
          name='shape frame'
          x={x}
          y={y}
          opacity={opacity}
          rotation={rotation}
          draggable={draggable && !isEditing}
          onClick={onSelect}
          onTap={onSelect}
          onDragStart={onDragStart}
          onDragEnd={handleDragEnd}
          dragBoundFunc={dragBoundFunc}
        >
          {/* Title bar background */}
          <Rect
            x={0}
            y={0}
            width={width}
            height={TITLE_HEIGHT}
            fill='#f1f5f9'
            stroke={isSelected ? selectionColor : stroke}
            strokeWidth={isSelected ? 2 : strokeWidth}
            cornerRadius={[6, 6, 0, 0]}
            shadowColor={SHADOW_COLOR}
            shadowBlur={isSelected ? SHADOW_BLUR_SELECTED : SHADOW_BLUR_DEFAULT}
            shadowOpacity={SHADOW_OPACITY}
            shadowOffsetX={SHADOW_OFFSET_X}
            shadowOffsetY={SHADOW_OFFSET_Y}
            shadowForStrokeEnabled={SHADOW_FOR_STROKE_ENABLED}
            onDblClick={handleTitleDblClick}
            onDblTap={handleTitleDblClick}
            perfectDrawEnabled={false}
          />

          {/* Title text */}
          <Text
            ref={textRef}
            x={TITLE_PADDING}
            y={(TITLE_HEIGHT - 14) / 2}
            text={text || 'Frame'}
            fontSize={14}
            fontFamily='Inter, system-ui, sans-serif'
            fontStyle='600'
            fill={titleTextFill}
            width={width - TITLE_PADDING * 2}
            ellipsis
            listening={false}
            visible={!isEditing}
            perfectDrawEnabled={false}
          />

          {/* Frame body */}
          <Rect
            x={0}
            y={TITLE_HEIGHT}
            width={width}
            height={height - TITLE_HEIGHT}
            fill={fill}
            stroke={isSelected ? selectionColor : stroke}
            strokeWidth={isSelected ? 2 : strokeWidth}
            cornerRadius={[0, 0, 6, 6]}
            dash={[4, 4]}
            shadowColor={SHADOW_COLOR}
            shadowBlur={isSelected ? SHADOW_BLUR_SELECTED : SHADOW_BLUR_DEFAULT}
            shadowOpacity={SHADOW_OPACITY}
            shadowOffsetX={SHADOW_OFFSET_X}
            shadowOffsetY={SHADOW_OFFSET_Y}
            shadowForStrokeEnabled={SHADOW_FOR_STROKE_ENABLED}
            perfectDrawEnabled={false}
          />
        </Group>
      );
    }
  )
);

Frame.displayName = 'Frame';

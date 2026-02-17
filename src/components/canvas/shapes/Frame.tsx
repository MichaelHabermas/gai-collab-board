import { Group, Rect, Text } from 'react-konva';
import { forwardRef, useCallback, useRef, useState, useEffect, memo } from 'react';
import type { ReactElement } from 'react';
import Konva from 'konva';

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
      const groupRef = useRef<Konva.Group>(null);
      const textRef = useRef<Konva.Text>(null);

      // Handle double-click on title to edit
      const handleTitleDblClick = useCallback(() => {
        if (!onTextChange) return;

        const group = groupRef.current;
        if (!group) return;

        const stage = group.getStage();
        if (!stage) return;

        setIsEditing(true);

        const textNode = textRef.current;
        if (!textNode) return;

        const textPosition = textNode.absolutePosition();
        const stageBox = stage.container().getBoundingClientRect();
        const scale = stage.scaleX();

        const areaPosition = {
          x: stageBox.left + textPosition.x * scale,
          y: stageBox.top + textPosition.y * scale,
        };

        // Create input for editing
        const input = document.createElement('input');
        document.body.appendChild(input);

        input.value = text;
        input.type = 'text';
        input.style.position = 'fixed';
        input.style.top = `${areaPosition.y}px`;
        input.style.left = `${areaPosition.x}px`;
        input.style.width = `${(width - TITLE_PADDING * 2) * scale}px`;
        input.style.fontSize = `${14 * scale}px`;
        input.style.fontWeight = '600';
        input.style.border = 'none';
        input.style.padding = '0px';
        input.style.margin = '0px';
        input.style.background = 'transparent';
        input.style.outline = 'none';
        input.style.fontFamily = 'Inter, system-ui, sans-serif';
        input.style.color = '#475569';
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
      }, [text, width, onTextChange]);

      // Handle drag end
      const handleDragEnd = useCallback(
        (e: Konva.KonvaEventObject<DragEvent>) => {
          onDragEnd?.(e.target.x(), e.target.y());
        },
        [onDragEnd]
      );

      // Handle transform end
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
          width: Math.max(100, width * scaleX),
          height: Math.max(100, height * scaleY),
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
          name='shape frame'
          x={x}
          y={y}
          rotation={rotation}
          draggable={draggable && !isEditing}
          onClick={onSelect}
          onTap={onSelect}
          onDragStart={onDragStart}
          onDragEnd={handleDragEnd}
          onTransformEnd={handleTransformEnd}
        >
          {/* Title bar background */}
          <Rect
            x={0}
            y={0}
            width={width}
            height={TITLE_HEIGHT}
            fill='#f1f5f9'
            stroke={isSelected ? '#3b82f6' : stroke}
            strokeWidth={isSelected ? 2 : strokeWidth}
            cornerRadius={[6, 6, 0, 0]}
            onDblClick={handleTitleDblClick}
            onDblTap={handleTitleDblClick}
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
            fill='#475569'
            width={width - TITLE_PADDING * 2}
            ellipsis
            listening={false}
            visible={!isEditing}
          />

          {/* Frame body */}
          <Rect
            x={0}
            y={TITLE_HEIGHT}
            width={width}
            height={height - TITLE_HEIGHT}
            fill={fill}
            stroke={isSelected ? '#3b82f6' : stroke}
            strokeWidth={isSelected ? 2 : strokeWidth}
            cornerRadius={[0, 0, 6, 6]}
            dash={[4, 4]}
          />
        </Group>
      );
    }
  )
);

Frame.displayName = 'Frame';

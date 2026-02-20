import { Group, Rect, Text } from 'react-konva';
import { forwardRef, useCallback, useRef, useState, useEffect, useMemo, memo } from 'react';
import type { ReactElement } from 'react';
import Konva from 'konva';
import { useTheme } from '@/hooks/useTheme';
import { useShapeDragHandler } from '@/hooks/useShapeDragHandler';
import { getOverlayRectFromLocalCorners } from '@/lib/canvasOverlayPosition';
import { attachOverlayRepositionLifecycle } from '@/lib/canvasTextEditOverlay';
import { useObjectsStore, selectFrameChildCount } from '@/stores/objectsStore';
import type { IDragBoundFunc, ITransformEndRectAttrs, IKonvaDragEvent } from '@/types';

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
  /** When true, this frame is the current drop target during a drag operation. */
  isDropTarget?: boolean;
  onSelect?: () => void;
  onDragStart?: () => void;
  onDragEnd?: (x: number, y: number) => void;
  onDragMove?: (e: IKonvaDragEvent) => void;
  dragBoundFunc?: IDragBoundFunc;
  onTextChange?: (text: string) => void;
  onTransformEnd?: (attrs: ITransformEndRectAttrs) => void;
  /** Called when the user double-clicks the frame body to "enter" the frame. */
  onEnterFrame?: () => void;
}

const TITLE_HEIGHT = 32;
const TITLE_PADDING = 12;
const CHEVRON_WIDTH = 14;
const DEFAULT_STROKE = 'rgba(148, 163, 184, 0.6)';
const HOVER_STROKE = 'rgba(148, 163, 184, 1.0)';
const DROP_TARGET_STROKE = '#3b82f6';

/**
 * Frame component - a container with a title for grouping content.
 * Features a gradient title bar, child count badge, hover states,
 * drop zone feedback, and improved title editing.
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
        stroke: _stroke,
        strokeWidth = 2,
        opacity = 1,
        rotation = 0,
        isSelected = false,
        isDropTarget = false,
        draggable = true,
        onSelect,
        onDragStart,
        onDragEnd,
        onDragMove,
        dragBoundFunc,
        onTextChange,
        onTransformEnd: _onTransformEnd,
        onEnterFrame,
      },
      ref
    ): ReactElement => {
      const [isEditing, setIsEditing] = useState(false);
      const [isHovered, setIsHovered] = useState(false);
      const groupRef = useRef<Konva.Group>(null);
      const textRef = useRef<Konva.Text>(null);
      const { theme } = useTheme();

      // Subscribe to child count from store — only re-renders when count changes.
      // Memoize the selector so Zustand sees a stable reference (prevents false re-renders).
      const childCountSelector = useMemo(() => selectFrameChildCount(id), [id]);
      const childCount = useObjectsStore(childCountSelector);

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
      const titleTextFill = useMemo(
        () =>
          (theme &&
            (typeof document !== 'undefined'
              ? getComputedStyle(document.documentElement)
                  .getPropertyValue('--color-muted-foreground')
                  .trim()
              : '')) ||
          '#475569',
        [theme]
      );

      // Compute display text with chevron and child count
      const displayText = useMemo(() => {
        const title = text || 'Frame';
        const badge = childCount > 0 ? ` (${childCount})` : '';
        return `▸ ${title}${badge}`;
      }, [text, childCount]);

      // Resolve stroke color based on state priority: drop target > selected > hover > default
      const resolvedStroke = useMemo(() => {
        if (isDropTarget) return DROP_TARGET_STROKE;

        if (isSelected) return selectionColor;

        if (isHovered) return HOVER_STROKE;

        return DEFAULT_STROKE;
      }, [isDropTarget, isSelected, isHovered, selectionColor]);

      const resolvedStrokeWidth = isSelected || isDropTarget ? 2 : strokeWidth;

      // ── Hover handlers ──────────────────────────────────────────
      const handleMouseEnter = useCallback(() => {
        setIsHovered(true);
      }, []);

      const handleMouseLeave = useCallback(() => {
        setIsHovered(false);
        const group = groupRef.current;
        const stage = group?.getStage();
        if (stage) {
          stage.container().style.cursor = 'default';
        }
      }, []);

      const handleTitleMouseEnter = useCallback(() => {
        const group = groupRef.current;
        const stage = group?.getStage();
        if (stage) {
          stage.container().style.cursor = 'text';
        }
      }, []);

      const handleBodyMouseEnter = useCallback(() => {
        const group = groupRef.current;
        const stage = group?.getStage();
        if (stage) {
          stage.container().style.cursor = 'move';
        }
      }, []);

      // ── Title editing ───────────────────────────────────────────
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
            { x: TITLE_PADDING + CHEVRON_WIDTH, y: titleTop },
            { x: width - TITLE_PADDING, y: titleTop },
            { x: width - TITLE_PADDING, y: titleTop + titleHeight },
            { x: TITLE_PADDING + CHEVRON_WIDTH, y: titleTop + titleHeight },
          ];
          const overlayRect = getOverlayRectFromLocalCorners(stage, transform, localCorners);

          const input = document.createElement('input');
          input.className = 'frame-title-edit-overlay';
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
          input.style.borderBottom = '1px solid rgba(59, 130, 246, 0.3)';
          input.style.padding = '0px';
          input.style.margin = '0px';
          input.style.background = '#f8fafc';
          input.style.outline = 'none';
          input.style.fontFamily = 'Inter, system-ui, sans-serif';
          input.style.zIndex = '1000';
          input.style.color = titleTextFill;
          // Fade-in transition
          input.style.opacity = '0';
          input.style.transition = 'opacity 0.1s ease-in';

          const cleanupReposition = attachOverlayRepositionLifecycle({
            stage,
            node: group,
            localCorners,
            overlayElement: input,
            applyStyle: (el, rect) => {
              el.style.top = `${rect.top}px`;
              el.style.left = `${rect.left}px`;
              el.style.width = `${rect.width}px`;
              el.style.height = `${rect.height}px`;
              el.style.fontSize = `${14 * rect.avgScale}px`;
            },
          });

          input.focus();
          input.select();

          // Trigger fade-in after DOM insertion
          requestAnimationFrame(() => {
            input.style.opacity = '1';
          });

          const removeInput = () => {
            cleanupReposition();
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
      }, [text, width, onTextChange, titleTextFill]);

      // ── Double-click body to enter frame ────────────────────────
      const handleBodyDblClick = useCallback(() => {
        onEnterFrame?.();
      }, [onEnterFrame]);

      const handleDragEnd = useShapeDragHandler(onDragEnd);

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

      // Title bar gradient colors — lighten on hover
      const titleGradientTop = isHovered ? '#ffffff' : '#f8fafc';
      const titleGradientBottom = isDropTarget ? 'rgba(59, 130, 246, 0.15)' : '#f1f5f9';

      // Body dash — solid when drop target, dashed otherwise
      const bodyDash = isDropTarget ? undefined : [8, 4];

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
          onDragMove={onDragMove}
          dragBoundFunc={dragBoundFunc}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Title bar background with gradient */}
          <Rect
            x={0}
            y={0}
            width={width}
            height={TITLE_HEIGHT}
            fillLinearGradientStartPoint={{ x: 0, y: 0 }}
            fillLinearGradientEndPoint={{ x: 0, y: TITLE_HEIGHT }}
            fillLinearGradientColorStops={[0, titleGradientTop, 1, titleGradientBottom]}
            stroke={resolvedStroke}
            strokeWidth={resolvedStrokeWidth}
            cornerRadius={[8, 8, 0, 0]}
            onDblClick={handleTitleDblClick}
            onDblTap={handleTitleDblClick}
            onMouseEnter={handleTitleMouseEnter}
            perfectDrawEnabled={false}
          />

          {/* Title text with chevron and child count */}
          <Text
            ref={textRef}
            x={TITLE_PADDING}
            y={(TITLE_HEIGHT - 14) / 2}
            text={displayText}
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
            stroke={resolvedStroke}
            strokeWidth={resolvedStrokeWidth}
            cornerRadius={[0, 0, 8, 8]}
            dash={bodyDash}
            shadowColor={isSelected ? selectionColor : undefined}
            shadowBlur={isSelected ? 8 : 0}
            shadowOpacity={isSelected ? 0.3 : 0}
            shadowEnabled={isSelected}
            onDblClick={handleBodyDblClick}
            onDblTap={handleBodyDblClick}
            onMouseEnter={handleBodyMouseEnter}
            perfectDrawEnabled={false}
          />

          {/* Drop target hint text */}
          {isDropTarget && (
            <Text
              x={0}
              y={TITLE_HEIGHT}
              width={width}
              height={height - TITLE_HEIGHT}
              text='Drop to add'
              fontSize={13}
              fontFamily='Inter, system-ui, sans-serif'
              fill='rgba(59, 130, 246, 0.5)'
              align='center'
              verticalAlign='middle'
              listening={false}
              perfectDrawEnabled={false}
            />
          )}
        </Group>
      );
    }
  )
);

Frame.displayName = 'Frame';

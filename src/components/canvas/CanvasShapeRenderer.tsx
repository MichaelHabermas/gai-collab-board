import { Rect } from 'react-konva';
import { memo, useMemo, type ReactElement } from 'react';
import type { ICanvasShapeRendererProps } from '@/types';
import { getAnchorPosition } from '@/lib/connectorAnchors';
import {
  StickyNote,
  RectangleShape,
  CircleShape,
  LineShape,
  Connector,
  TextElement,
  Frame,
} from './shapes';

/**
 * Renders a single canvas object by type. Used by BoardCanvas to keep the shape switch isolated.
 */
export const CanvasShapeRenderer = memo(
  ({
    object: obj,
    isSelected,
    canEdit,
    objectsById,
    selectionColor,
    groupDragOffset,
    frameDragOffset,
    dropTargetFrameId,
    onEnterFrame,
    getSelectHandler,
    getDragEndHandler,
    getTextChangeHandler,
    getDragBoundFunc,
    onDragMove,
    handleObjectSelect,
    handleObjectDragEnd,
  }: ICanvasShapeRendererProps): ReactElement => {
    const offset =
      obj.parentFrameId && frameDragOffset?.frameId === obj.parentFrameId
        ? frameDragOffset
        : isSelected && groupDragOffset
          ? groupDragOffset
          : null;
    const displayX = obj.x + (offset?.dx ?? 0);
    const displayY = obj.y + (offset?.dy ?? 0);

    // Stable wrapper for circle's center-based drag bound (avoids new fn ref every render)
    const circleDragBoundFunc = useMemo(() => {
      const boundFunc = getDragBoundFunc(obj.id, obj.width, obj.height);
      if (!boundFunc) return undefined;

      const halfW = obj.width / 2;
      const halfH = obj.height / 2;

      return (pos: { x: number; y: number }) => {
        const topLeft = boundFunc({ x: pos.x - halfW, y: pos.y - halfH });

        return { x: topLeft.x + halfW, y: topLeft.y + halfH };
      };
    }, [getDragBoundFunc, obj.id, obj.width, obj.height]);

    switch (obj.type) {
      case 'sticky':
        return (
          <StickyNote
            key={obj.id}
            id={obj.id}
            x={displayX}
            y={displayY}
            width={obj.width}
            height={obj.height}
            text={obj.text || ''}
            fill={obj.fill}
            textFill={obj.textFill}
            fontSize={obj.fontSize}
            opacity={obj.opacity ?? 1}
            rotation={obj.rotation}
            isSelected={isSelected}
            draggable={canEdit}
            onSelect={getSelectHandler(obj.id)}
            onDragEnd={getDragEndHandler(obj.id)}
            onDragMove={canEdit ? onDragMove : undefined}
            dragBoundFunc={canEdit ? getDragBoundFunc(obj.id, obj.width, obj.height) : undefined}
            onTextChange={canEdit ? getTextChangeHandler(obj.id) : undefined}
          />
        );

      case 'rectangle':
        return (
          <RectangleShape
            key={obj.id}
            id={obj.id}
            x={displayX}
            y={displayY}
            width={obj.width}
            height={obj.height}
            fill={obj.fill}
            stroke={obj.stroke}
            strokeWidth={obj.strokeWidth}
            opacity={obj.opacity ?? 1}
            rotation={obj.rotation}
            isSelected={isSelected}
            draggable={canEdit}
            onSelect={getSelectHandler(obj.id)}
            onDragEnd={getDragEndHandler(obj.id)}
            onDragMove={canEdit ? onDragMove : undefined}
            dragBoundFunc={getDragBoundFunc(obj.id, obj.width, obj.height)}
          />
        );

      case 'circle':
        return (
          <CircleShape
            key={obj.id}
            id={obj.id}
            x={displayX}
            y={displayY}
            width={obj.width}
            height={obj.height}
            fill={obj.fill}
            stroke={obj.stroke}
            strokeWidth={obj.strokeWidth}
            opacity={obj.opacity ?? 1}
            rotation={obj.rotation}
            isSelected={isSelected}
            draggable={canEdit}
            onSelect={getSelectHandler(obj.id)}
            onDragEnd={getDragEndHandler(obj.id)}
            onDragMove={canEdit ? onDragMove : undefined}
            dragBoundFunc={circleDragBoundFunc}
          />
        );

      case 'line':
        return (
          <LineShape
            key={obj.id}
            id={obj.id}
            x={displayX}
            y={displayY}
            points={obj.points || [0, 0, 100, 100]}
            stroke={obj.stroke || obj.fill}
            strokeWidth={obj.strokeWidth}
            opacity={obj.opacity ?? 1}
            rotation={obj.rotation}
            isSelected={isSelected}
            draggable={canEdit}
            onSelect={getSelectHandler(obj.id)}
            onDragEnd={getDragEndHandler(obj.id)}
            onDragMove={canEdit ? onDragMove : undefined}
            dragBoundFunc={getDragBoundFunc(obj.id, obj.width, obj.height)}
          />
        );

      case 'connector': {
        const fromObj = obj.fromObjectId != null ? objectsById.get(obj.fromObjectId) : undefined;
        const toObj = obj.toObjectId != null ? objectsById.get(obj.toObjectId) : undefined;
        if (fromObj && toObj && obj.fromAnchor != null && obj.toAnchor != null) {
          const fromPos = getAnchorPosition(fromObj, obj.fromAnchor);
          const toPos = getAnchorPosition(toObj, obj.toAnchor);
          const x = fromPos.x + (offset?.dx ?? 0);
          const y = fromPos.y + (offset?.dy ?? 0);
          const points: [number, number, number, number] = [
            0,
            0,
            toPos.x - fromPos.x,
            toPos.y - fromPos.y,
          ];
          return (
            <Connector
              key={obj.id}
              id={obj.id}
              x={x}
              y={y}
              points={points}
              stroke={obj.stroke || obj.fill}
              strokeWidth={obj.strokeWidth}
              opacity={obj.opacity ?? 1}
              rotation={obj.rotation}
              isSelected={isSelected}
              draggable={false}
              hasArrow={true}
              arrowheads={obj.arrowheads}
              strokeStyle={obj.strokeStyle}
              onSelect={getSelectHandler(obj.id)}
              onDragEnd={getDragEndHandler(obj.id)}
            />
          );
        }

        const points = obj.points || [0, 0, 100, 100];
        return (
          <Connector
            key={obj.id}
            id={obj.id}
            x={displayX}
            y={displayY}
            points={points}
            stroke={obj.stroke || obj.fill}
            strokeWidth={obj.strokeWidth}
            opacity={obj.opacity ?? 1}
            rotation={obj.rotation}
            isSelected={isSelected}
            draggable={canEdit}
            hasArrow={true}
            arrowheads={obj.arrowheads}
            strokeStyle={obj.strokeStyle}
            onSelect={getSelectHandler(obj.id)}
            onDragEnd={getDragEndHandler(obj.id)}
            onDragMove={canEdit ? onDragMove : undefined}
            dragBoundFunc={getDragBoundFunc(obj.id, obj.width, obj.height)}
          />
        );
      }

      case 'text':
        return (
          <TextElement
            key={obj.id}
            id={obj.id}
            x={displayX}
            y={displayY}
            text={obj.text || ''}
            fontSize={obj.fontSize}
            fill={obj.fill}
            width={obj.width}
            opacity={obj.opacity ?? 1}
            rotation={obj.rotation}
            isSelected={isSelected}
            draggable={canEdit}
            onSelect={getSelectHandler(obj.id)}
            onDragEnd={getDragEndHandler(obj.id)}
            onDragMove={canEdit ? onDragMove : undefined}
            dragBoundFunc={getDragBoundFunc(obj.id, obj.width, obj.height)}
            onTextChange={canEdit ? getTextChangeHandler(obj.id) : undefined}
          />
        );

      case 'frame':
        return (
          <Frame
            key={obj.id}
            id={obj.id}
            x={displayX}
            y={displayY}
            width={obj.width}
            height={obj.height}
            text={obj.text || 'Frame'}
            fill={obj.fill}
            stroke={obj.stroke}
            strokeWidth={obj.strokeWidth}
            opacity={obj.opacity ?? 1}
            rotation={obj.rotation}
            isSelected={isSelected}
            isDropTarget={dropTargetFrameId === obj.id}
            draggable={canEdit}
            onSelect={getSelectHandler(obj.id)}
            onDragEnd={getDragEndHandler(obj.id)}
            onDragMove={canEdit ? onDragMove : undefined}
            dragBoundFunc={getDragBoundFunc(obj.id, obj.width, obj.height)}
            onTextChange={canEdit ? getTextChangeHandler(obj.id) : undefined}
            onEnterFrame={onEnterFrame ? () => onEnterFrame(obj.id) : undefined}
          />
        );

      default:
        return (
          <Rect
            key={obj.id}
            id={obj.id}
            name='shape'
            x={displayX}
            y={displayY}
            width={obj.width}
            height={obj.height}
            fill={obj.fill}
            stroke={isSelected ? selectionColor : obj.stroke}
            strokeWidth={isSelected ? 2 : obj.strokeWidth}
            rotation={obj.rotation}
            draggable={canEdit}
            onClick={() => handleObjectSelect(obj.id)}
            onTap={() => handleObjectSelect(obj.id)}
            onDragEnd={(e) => handleObjectDragEnd(obj.id, e.target.x(), e.target.y())}
          />
        );
    }
  }
);

CanvasShapeRenderer.displayName = 'CanvasShapeRenderer';

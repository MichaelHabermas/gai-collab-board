import { Rect } from 'react-konva';
import { memo, type ReactElement } from 'react';
import type { IBoardObject } from '@/types';
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

export interface ICanvasShapeRendererProps {
  object: IBoardObject;
  isSelected: boolean;
  canEdit: boolean;
  objectsById: Map<string, IBoardObject>;
  selectionColor: string;
  getSelectHandler: (id: string) => () => void;
  getDragEndHandler: (id: string) => (x: number, y: number) => void;
  getTextChangeHandler: (id: string) => (text: string) => void;
  getDragBoundFunc: (
    id: string,
    width: number,
    height: number
  ) => ((pos: { x: number; y: number }) => { x: number; y: number }) | undefined;
  handleObjectSelect: (id: string) => void;
  handleObjectDragEnd: (id: string, x: number, y: number) => void;
}

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
    getSelectHandler,
    getDragEndHandler,
    getTextChangeHandler,
    getDragBoundFunc,
    handleObjectSelect,
    handleObjectDragEnd,
  }: ICanvasShapeRendererProps): ReactElement => {
    switch (obj.type) {
      case 'sticky':
        return (
          <StickyNote
            key={obj.id}
            id={obj.id}
            x={obj.x}
            y={obj.y}
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
            dragBoundFunc={canEdit ? getDragBoundFunc(obj.id, obj.width, obj.height) : undefined}
            onTextChange={canEdit ? getTextChangeHandler(obj.id) : undefined}
          />
        );

      case 'rectangle':
        return (
          <RectangleShape
            key={obj.id}
            id={obj.id}
            x={obj.x}
            y={obj.y}
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
            dragBoundFunc={getDragBoundFunc(obj.id, obj.width, obj.height)}
          />
        );

      case 'circle': {
        const boundFunc = getDragBoundFunc(obj.id, obj.width, obj.height);
        return (
          <CircleShape
            key={obj.id}
            id={obj.id}
            x={obj.x}
            y={obj.y}
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
            dragBoundFunc={
              boundFunc
                ? (pos) => {
                    const topLeft = boundFunc({
                      x: pos.x - obj.width / 2,
                      y: pos.y - obj.height / 2,
                    });
                    return {
                      x: topLeft.x + obj.width / 2,
                      y: topLeft.y + obj.height / 2,
                    };
                  }
                : undefined
            }
          />
        );
      }

      case 'line':
        return (
          <LineShape
            key={obj.id}
            id={obj.id}
            x={obj.x}
            y={obj.y}
            points={obj.points || [0, 0, 100, 100]}
            stroke={obj.stroke || obj.fill}
            strokeWidth={obj.strokeWidth}
            opacity={obj.opacity ?? 1}
            rotation={obj.rotation}
            isSelected={isSelected}
            draggable={canEdit}
            onSelect={getSelectHandler(obj.id)}
            onDragEnd={getDragEndHandler(obj.id)}
            dragBoundFunc={getDragBoundFunc(obj.id, obj.width, obj.height)}
          />
        );

      case 'connector': {
        const fromObj = obj.fromObjectId != null ? objectsById.get(obj.fromObjectId) : undefined;
        const toObj = obj.toObjectId != null ? objectsById.get(obj.toObjectId) : undefined;
        if (fromObj && toObj && obj.fromAnchor != null && obj.toAnchor != null) {
          const fromPos = getAnchorPosition(fromObj, obj.fromAnchor);
          const toPos = getAnchorPosition(toObj, obj.toAnchor);
          const x = fromPos.x;
          const y = fromPos.y;
          const points: [number, number, number, number] = [0, 0, toPos.x - x, toPos.y - y];
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
              onSelect={getSelectHandler(obj.id)}
              onDragEnd={getDragEndHandler(obj.id)}
            />
          );
        }
        const x = obj.x;
        const y = obj.y;
        const points = obj.points || [0, 0, 100, 100];
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
            draggable={canEdit}
            hasArrow={true}
            onSelect={getSelectHandler(obj.id)}
            onDragEnd={getDragEndHandler(obj.id)}
            dragBoundFunc={getDragBoundFunc(obj.id, obj.width, obj.height)}
          />
        );
      }

      case 'text':
        return (
          <TextElement
            key={obj.id}
            id={obj.id}
            x={obj.x}
            y={obj.y}
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
            dragBoundFunc={getDragBoundFunc(obj.id, obj.width, obj.height)}
            onTextChange={canEdit ? getTextChangeHandler(obj.id) : undefined}
          />
        );

      case 'frame':
        return (
          <Frame
            key={obj.id}
            id={obj.id}
            x={obj.x}
            y={obj.y}
            width={obj.width}
            height={obj.height}
            text={obj.text || 'Frame'}
            fill={obj.fill}
            stroke={obj.stroke}
            strokeWidth={obj.strokeWidth}
            opacity={obj.opacity ?? 1}
            rotation={obj.rotation}
            isSelected={isSelected}
            draggable={canEdit}
            onSelect={getSelectHandler(obj.id)}
            onDragEnd={getDragEndHandler(obj.id)}
            dragBoundFunc={getDragBoundFunc(obj.id, obj.width, obj.height)}
            onTextChange={canEdit ? getTextChangeHandler(obj.id) : undefined}
          />
        );

      default:
        return (
          <Rect
            key={obj.id}
            id={obj.id}
            name='shape'
            x={obj.x}
            y={obj.y}
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

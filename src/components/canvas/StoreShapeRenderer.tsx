import { memo, useMemo, type ReactElement } from 'react';
import { useObjectsStore, selectObject } from '@/stores/objectsStore';
import { useSelectionStore } from '@/stores/selectionStore';
import { CanvasShapeRenderer } from './CanvasShapeRenderer';
import type { IBoardObject, IKonvaDragEvent } from '@/types';
import type { IGroupDragOffset, IFrameDragOffset } from '@/types/canvas';

type IDragBoundFunc = (pos: { x: number; y: number }) => { x: number; y: number };

interface IStoreShapeRendererProps {
  id: string;
  canEdit: boolean;
  selectionColor: string;
  groupDragOffset?: IGroupDragOffset | null;
  frameDragOffset?: IFrameDragOffset | null;
  dropTargetFrameId?: string | null;
  onEnterFrame?: (frameId: string) => void;
  getSelectHandler: (id: string) => () => void;
  getDragEndHandler: (id: string) => (x: number, y: number) => void;
  getTextChangeHandler: (id: string) => (text: string) => void;
  getDragBoundFunc: (id: string, width: number, height: number) => IDragBoundFunc | undefined;
  onDragMove?: (e: IKonvaDragEvent) => void;
  handleObjectSelect: (id: string) => void;
  handleObjectDragEnd: (id: string, x: number, y: number) => void;
}

/**
 * Per-shape Zustand subscriber. Only re-renders when this specific object
 * changes in the store, or when selection/drag state changes.
 *
 * For connectors with linked endpoints, also subscribes to the from/to
 * objects so the connector re-renders when its anchors move.
 */
export const StoreShapeRenderer = memo(
  ({
    id,
    canEdit,
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
  }: IStoreShapeRendererProps): ReactElement | null => {
    // Per-shape subscription: only re-renders when THIS object changes.
    const object = useObjectsStore(selectObject(id));
    const isSelected = useSelectionStore((s) => s.selectedIds.includes(id));

    if (!object) return null;

    return (
      <CanvasShapeRendererWithConnectorLookup
        object={object}
        isSelected={isSelected}
        canEdit={canEdit}
        selectionColor={selectionColor}
        groupDragOffset={groupDragOffset}
        frameDragOffset={frameDragOffset}
        dropTargetFrameId={dropTargetFrameId}
        onEnterFrame={onEnterFrame}
        getSelectHandler={getSelectHandler}
        getDragEndHandler={getDragEndHandler}
        getTextChangeHandler={getTextChangeHandler}
        getDragBoundFunc={getDragBoundFunc}
        onDragMove={onDragMove}
        handleObjectSelect={handleObjectSelect}
        handleObjectDragEnd={handleObjectDragEnd}
      />
    );
  }
);

StoreShapeRenderer.displayName = 'StoreShapeRenderer';

// ── Inner component that handles connector endpoint subscriptions ────

interface IInnerProps {
  object: IBoardObject;
  isSelected: boolean;
  canEdit: boolean;
  selectionColor: string;
  groupDragOffset?: IGroupDragOffset | null;
  frameDragOffset?: IFrameDragOffset | null;
  dropTargetFrameId?: string | null;
  onEnterFrame?: (frameId: string) => void;
  getSelectHandler: (id: string) => () => void;
  getDragEndHandler: (id: string) => (x: number, y: number) => void;
  getTextChangeHandler: (id: string) => (text: string) => void;
  getDragBoundFunc: (id: string, width: number, height: number) => IDragBoundFunc | undefined;
  onDragMove?: (e: IKonvaDragEvent) => void;
  handleObjectSelect: (id: string) => void;
  handleObjectDragEnd: (id: string, x: number, y: number) => void;
}

const CanvasShapeRendererWithConnectorLookup = memo((props: IInnerProps): ReactElement => {
  const { object } = props;

  // For linked connectors, subscribe to from/to objects so we re-render
  // when the connected shapes move. For non-connectors these are undefined (no extra subscription).
  const fromObj = useObjectsStore(
    object.fromObjectId != null ? selectObject(object.fromObjectId) : _selectUndefined
  );
  const toObj = useObjectsStore(
    object.toObjectId != null ? selectObject(object.toObjectId) : _selectUndefined
  );

  // Build a minimal objectsById Map containing only the objects this shape needs.
  const objectsById = useMemo(() => {
    const map = new Map<string, IBoardObject>();
    if (fromObj) map.set(fromObj.id, fromObj);

    if (toObj) map.set(toObj.id, toObj);

    return map;
  }, [fromObj, toObj]);

  return <CanvasShapeRenderer {...props} objectsById={objectsById} />;
});

CanvasShapeRendererWithConnectorLookup.displayName = 'CanvasShapeRendererWithConnectorLookup';

/** Stable selector that always returns undefined (avoids creating a new function per render). */
const _selectUndefined = (): undefined => undefined;

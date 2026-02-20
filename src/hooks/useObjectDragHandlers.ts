/**
 * Drag, selection, transform, and text editing handlers for board objects.
 * Includes handler map caching (stable per-object callbacks), alignment guide
 * computation, and spatial index drag exemptions.
 */

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import type {
  IBoardObject,
  IPosition,
  ITransformEndAttrs,
  IAlignmentGuides,
  IAlignmentCandidate,
  IKonvaDragEvent,
} from '@/types';
import { useObjectsStore, spatialIndex } from '@/stores/objectsStore';
import { useDragOffsetStore } from '@/stores/dragOffsetStore';
import { getSelectionBounds } from '@/lib/canvasBounds';
import {
  computeAlignmentGuidesWithCandidates,
  computeSnappedPositionFromGuides,
} from '@/lib/alignmentGuides';
import {
  applySnapPositionToNode,
  snapPositionToGrid,
  snapResizeRectToGrid,
} from '@/lib/snapToGrid';
import { getWidthHeightFromPoints } from '@/lib/lineTransform';
import {
  resolveParentFrameIdFromFrames,
  findContainingFrame,
} from '@/hooks/useFrameContainment';
import { useAlignmentGuideCache } from '@/hooks/useAlignmentGuideCache';
import { perfTime } from '@/lib/perfTimer';
import { queueWrite } from '@/lib/writeQueue';

const GRID_SIZE = 20;
const DROP_TARGET_THROTTLE_MS = 100;

export interface IUseObjectDragHandlersConfig {
  objects: IBoardObject[];
  objectsById: Map<string, IBoardObject>;
  selectedIds: ReadonlySet<string>;
  setSelectedIds: (ids: string[]) => void;
  toggleSelectedId: (id: string) => void;
  snapToGridEnabled: boolean;
  canEdit: boolean;
  onObjectUpdate?: (objectId: string, updates: Partial<IBoardObject>) => void;
  onObjectsUpdate?: (updates: Array<{ objectId: string; updates: Partial<IBoardObject> }>) => void;
  visibleShapeIds: string[];
  visibleObjectIdsKey: string;
}

export interface IUseObjectDragHandlersReturn {
  handleObjectSelect: (objectId: string, e?: { evt: MouseEvent }) => void;
  handleObjectDragEnd: (objectId: string, x: number, y: number) => void;
  handleDragMove: (e: IKonvaDragEvent) => void;
  handleSelectionDragStart: (bounds: { x1: number; y1: number; x2: number; y2: number }) => void;
  handleSelectionDragMove: (e: IKonvaDragEvent) => void;
  handleSelectionDragEnd: () => void;
  handleEnterFrame: (frameId: string) => void;
  handleTransformEnd: (objectId: string, attrs: ITransformEndAttrs) => void;
  handleTextChange: (objectId: string, text: string) => void;
  getSelectHandler: (objectId: string) => () => void;
  getDragEndHandler: (objectId: string) => (x: number, y: number) => void;
  getTextChangeHandler: (objectId: string) => (text: string) => void;
  getDragBoundFunc: (objectId: string, width: number, height: number) => (pos: IPosition) => IPosition;
  selectionBounds: { x1: number; y1: number; x2: number; y2: number } | null;
  alignmentGuides: IAlignmentGuides | null;
  isHoveringSelectionHandleEffective: boolean;
  setIsHoveringSelectionHandle: (v: boolean) => void;
  onDragMoveProp: ((e: IKonvaDragEvent) => void) | undefined;
}

export function useObjectDragHandlers(config: IUseObjectDragHandlersConfig): IUseObjectDragHandlersReturn {
  const {
    objects,
    objectsById,
    selectedIds,
    setSelectedIds,
    toggleSelectedId,
    snapToGridEnabled,
    canEdit,
    onObjectUpdate,
    onObjectsUpdate,
    visibleShapeIds,
    visibleObjectIdsKey,
  } = config;

  // --- Refs ---
  const selectionDragBoundsRef = useRef<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const groupDragOffsetRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const dragExemptionSetRef = useRef(false);
  const lastDropTargetCheckRef = useRef(0);
  const framesRef = useRef<IBoardObject[]>([]);

  // --- State ---
  const [alignmentGuides, setAlignmentGuides] = useState<IAlignmentGuides | null>(null);
  const [isHoveringSelectionHandle, setIsHoveringSelectionHandle] = useState(false);

  // --- Drag offset store (stable selectors) ---
  const setFrameDragOffset = useDragOffsetStore((s) => s.setFrameDragOffset);
  const setDropTargetFrameId = useDragOffsetStore((s) => s.setDropTargetFrameId);
  const setGroupDragOffset = useDragOffsetStore((s) => s.setGroupDragOffset);
  const clearDragState = useDragOffsetStore((s) => s.clearDragState);

  // --- Cache frames list so we don't re-filter on every mousemove ---
  useEffect(() => {
    framesRef.current = objects.filter((o) => o.type === 'frame');
  }, [objects]);

  // --- Alignment guides throttling ---
  const alignmentGuidesRafIdRef = useRef<number>(0);
  const setGuidesThrottledRef = useRef<(g: IAlignmentGuides) => void>(() => {});
  const setGuidesThrottled = useCallback((guides: IAlignmentGuides) => {
    const prev = alignmentGuidesRafIdRef.current;
    if (prev !== 0) {
      cancelAnimationFrame(prev);
    }

    alignmentGuidesRafIdRef.current = requestAnimationFrame(() => {
      setAlignmentGuides(guides);
      alignmentGuidesRafIdRef.current = 0;
    });
  }, []);

  useEffect(() => {
    setGuidesThrottledRef.current = setGuidesThrottled;
  }, [setGuidesThrottled]);

  // --- Alignment guide cache ---
  const { guideCandidateBoundsRef, dragBoundFuncCacheRef } = useAlignmentGuideCache({
    visibleShapeIds,
    visibleObjectIdsKey,
    snapToGridEnabled,
  });

  // --- Selection bounds ---
  const selectionBounds = useMemo(() => {
    if (selectedIds.size < 2) {
      return null;
    }

    return getSelectionBounds(objects, selectedIds);
  }, [objects, selectedIds]);

  const isHoveringSelectionHandleEffective = selectionBounds != null && isHoveringSelectionHandle;

  // --- Core handlers ---

  const handleObjectSelect = useCallback(
    (objectId: string, e?: { evt: MouseEvent }) => {
      const metaPressed = e?.evt.shiftKey || e?.evt.ctrlKey || e?.evt.metaKey;

      if (metaPressed) {
        toggleSelectedId(objectId);
      } else {
        setSelectedIds([objectId]);
      }
    },
    [setSelectedIds, toggleSelectedId]
  );

  const handleObjectDragEnd = useCallback(
    (objectId: string, x: number, y: number) => {
      setAlignmentGuides(null);
      const draggedObj = objectsById.get(objectId);
      if (!draggedObj) return;

      const multiSelected = selectedIds.size > 1 && selectedIds.has(objectId) && onObjectsUpdate;

      if (multiSelected) {
        const updates = perfTime(
          'handleObjectDragEnd:multi',
          { selected: selectedIds.size, objects: objects.length },
          () => {
            const dx = x - draggedObj.x;
            const dy = y - draggedObj.y;
            const batch: Array<{ objectId: string; updates: Partial<IBoardObject> }> = [];
            const frames = objects.filter((o) => o.type === 'frame');
            const childIndex = useObjectsStore.getState().frameChildrenIndex;
            const movedIds = new Set<string>(selectedIds);

            for (const id of selectedIds) {
              const obj = objectsById.get(id);
              if (!obj) continue;

              let newX = obj.x + dx;
              let newY = obj.y + dy;
              if (snapToGridEnabled) {
                const snapped = snapPositionToGrid(newX, newY, GRID_SIZE);
                newX = snapped.x;
                newY = snapped.y;
              }

              const objUpdates: Partial<IBoardObject> = { x: newX, y: newY };

              if (obj.type === 'frame') {
                const childIds = childIndex.get(obj.id);
                if (childIds) {
                  for (const childId of childIds) {
                    if (movedIds.has(childId)) continue;

                    const child = objectsById.get(childId);
                    if (!child) continue;

                    let cx = child.x + dx;
                    let cy = child.y + dy;
                    if (snapToGridEnabled) {
                      const snapped = snapPositionToGrid(cx, cy, GRID_SIZE);
                      cx = snapped.x;
                      cy = snapped.y;
                    }

                    batch.push({ objectId: childId, updates: { x: cx, y: cy } });
                    movedIds.add(childId);
                  }
                }
              }

              if (obj.type !== 'frame' && obj.type !== 'connector') {
                const newBounds = {
                  x1: newX,
                  y1: newY,
                  x2: newX + obj.width,
                  y2: newY + obj.height,
                };
                const newParent = resolveParentFrameIdFromFrames(obj, newBounds, frames);
                if (newParent !== obj.parentFrameId) {
                  objUpdates.parentFrameId = newParent ?? '';
                }
              }

              batch.push({ objectId: id, updates: objUpdates });
            }

            return batch;
          }
        );

        if (updates.length > 0) {
          onObjectsUpdate(updates);
        }

        spatialIndex.clearDragging();
        dragExemptionSetRef.current = false;

        return;
      }

      // Single object drag
      let finalX = x;
      let finalY = y;
      if (snapToGridEnabled) {
        const snapped = snapPositionToGrid(x, y, GRID_SIZE);
        finalX = snapped.x;
        finalY = snapped.y;
      }

      const singleUpdates: Partial<IBoardObject> = { x: finalX, y: finalY };

      // Frame drag: move children with it
      if (draggedObj.type === 'frame' && onObjectsUpdate) {
        const dx = finalX - draggedObj.x;
        const dy = finalY - draggedObj.y;
        const childIds = useObjectsStore.getState().frameChildrenIndex.get(draggedObj.id);
        if (childIds && childIds.size > 0) {
          const batchUpdates: Array<{ objectId: string; updates: Partial<IBoardObject> }> = [
            { objectId, updates: singleUpdates },
          ];
          for (const childId of childIds) {
            const child = objectsById.get(childId);
            if (!child) continue;

            let cx = child.x + dx;
            let cy = child.y + dy;
            if (snapToGridEnabled) {
              const snapped = snapPositionToGrid(cx, cy, GRID_SIZE);
              cx = snapped.x;
              cy = snapped.y;
            }

            batchUpdates.push({ objectId: childId, updates: { x: cx, y: cy } });
          }
          onObjectsUpdate(batchUpdates);
          spatialIndex.clearDragging();
          dragExemptionSetRef.current = false;

          return;
        }
      }

      // Non-frame single drag: resolve reparenting
      if (draggedObj.type !== 'frame' && draggedObj.type !== 'connector') {
        const newBounds = {
          x1: finalX,
          y1: finalY,
          x2: finalX + draggedObj.width,
          y2: finalY + draggedObj.height,
        };
        const singleFrames = objects.filter((o) => o.type === 'frame');
        const newParent = resolveParentFrameIdFromFrames(draggedObj, newBounds, singleFrames);
        if (newParent !== draggedObj.parentFrameId) {
          singleUpdates.parentFrameId = newParent ?? '';
        }

        // Auto-expand frame if child falls outside its bounds
        const targetFrameId = newParent ?? draggedObj.parentFrameId;
        if (targetFrameId && onObjectsUpdate) {
          const frame = objectsById.get(targetFrameId);
          if (frame) {
            const PADDING = 20;
            const TITLE_HEIGHT = 32;
            const childRight = finalX + draggedObj.width + PADDING;
            const childBottom = finalY + draggedObj.height + PADDING;
            const childLeft = finalX - PADDING;
            const childTop = finalY - PADDING;
            const frameRight = frame.x + frame.width;
            const frameBottom = frame.y + frame.height;
            const frameContentTop = frame.y + TITLE_HEIGHT;

            if (
              childRight > frameRight ||
              childBottom > frameBottom ||
              childLeft < frame.x ||
              childTop < frameContentTop
            ) {
              const newFrameX = Math.min(frame.x, childLeft);
              const newFrameY = Math.min(frame.y, childTop - TITLE_HEIGHT);
              const newFrameRight = Math.max(frameRight, childRight);
              const newFrameBottom = Math.max(frameBottom, childBottom);

              onObjectsUpdate([
                { objectId, updates: singleUpdates },
                {
                  objectId: targetFrameId,
                  updates: {
                    x: newFrameX,
                    y: newFrameY,
                    width: newFrameRight - newFrameX,
                    height: newFrameBottom - newFrameY,
                  },
                },
              ]);
              spatialIndex.clearDragging();
              dragExemptionSetRef.current = false;

              return;
            }
          }
        }
      }

      onObjectUpdate?.(objectId, singleUpdates);
      spatialIndex.clearDragging();
      dragExemptionSetRef.current = false;
    },
    [onObjectUpdate, onObjectsUpdate, snapToGridEnabled, selectedIds, objectsById, objects]
  );

  // --- Selection drag handlers ---

  const handleSelectionDragStart = useCallback(
    (bounds: { x1: number; y1: number; x2: number; y2: number }) => {
      setAlignmentGuides(null);
      selectionDragBoundsRef.current = bounds;

      const dragIds = new Set<string>(selectedIds);
      const childIndex = useObjectsStore.getState().frameChildrenIndex;
      for (const sid of selectedIds) {
        const obj = objectsById.get(sid);
        if (obj?.type === 'frame') {
          const children = childIndex.get(sid);
          if (children) for (const cid of children) dragIds.add(cid);
        }
      }

      spatialIndex.setDragging(dragIds);
    },
    [selectedIds, objectsById]
  );

  const handleSelectionDragMove = useCallback((e: IKonvaDragEvent) => {
    const b = selectionDragBoundsRef.current;
    if (!b) {
      return;
    }

    const offset = {
      dx: e.target.x() - b.x1,
      dy: e.target.y() - b.y1,
    };
    groupDragOffsetRef.current = offset;
    setGroupDragOffset(offset);
  }, [setGroupDragOffset]);

  const handleSelectionDragEnd = useCallback(() => {
    const b = selectionDragBoundsRef.current;
    if (!b || !onObjectsUpdate) {
      selectionDragBoundsRef.current = null;
      setGroupDragOffset(null);
      spatialIndex.clearDragging();

      return;
    }

    const updates = perfTime(
      'handleSelectionDragEnd',
      { selected: selectedIds.size, objects: objects.length },
      () => {
        const { dx, dy } = groupDragOffsetRef.current;
        const batch: Array<{ objectId: string; updates: Partial<IBoardObject> }> = [];
        const movedIds = new Set(selectedIds);
        const frames = objects.filter((o) => o.type === 'frame');
        const childIndex = useObjectsStore.getState().frameChildrenIndex;

        const groupNewLeft = b.x1 + dx;
        const groupNewTop = b.y1 + dy;
        const snappedGroup = snapToGridEnabled
          ? snapPositionToGrid(groupNewLeft, groupNewTop, GRID_SIZE)
          : { x: groupNewLeft, y: groupNewTop };
        const snapOffsetX = snappedGroup.x - groupNewLeft;
        const snapOffsetY = snappedGroup.y - groupNewTop;

        for (const id of selectedIds) {
          const obj = objectsById.get(id);
          if (!obj) continue;

          const newX = obj.x + dx + snapOffsetX;
          const newY = obj.y + dy + snapOffsetY;

          const objUpdates: Partial<IBoardObject> = { x: newX, y: newY };

          if (obj.type === 'frame') {
            const childIds = childIndex.get(obj.id);
            if (childIds) {
              for (const childId of childIds) {
                if (movedIds.has(childId)) continue;

                const child = objectsById.get(childId);
                if (!child) continue;

                const cx = child.x + dx + snapOffsetX;
                const cy = child.y + dy + snapOffsetY;

                batch.push({ objectId: childId, updates: { x: cx, y: cy } });
                movedIds.add(childId);
              }
            }
          }

          if (obj.type !== 'frame' && obj.type !== 'connector') {
            const newBounds = {
              x1: newX,
              y1: newY,
              x2: newX + obj.width,
              y2: newY + obj.height,
            };
            const newParent = resolveParentFrameIdFromFrames(obj, newBounds, frames);
            if (newParent !== obj.parentFrameId) {
              objUpdates.parentFrameId = newParent ?? '';
            }
          }

          batch.push({ objectId: id, updates: objUpdates });
        }

        return batch;
      }
    );

    if (updates.length > 0) {
      onObjectsUpdate(updates);
    }

    selectionDragBoundsRef.current = null;
    setGroupDragOffset(null);
    spatialIndex.clearDragging();
  }, [onObjectsUpdate, selectedIds, objectsById, snapToGridEnabled, objects, setGroupDragOffset]);

  // --- Drag bound func (alignment guides + snap) ---

  const getDragBoundFunc = useCallback(
    (objectId: string, width: number, height: number) => {
      const cached = dragBoundFuncCacheRef.current.get(objectId);
      if (cached && cached.width === width && cached.height === height) {
        return cached.fn;
      }

      const candidateMap = new Map<string, IAlignmentCandidate>();
      for (const c of guideCandidateBoundsRef.current) {
        if (c.id !== objectId) candidateMap.set(c.id, c.candidate);
      }

      const nextDragBoundFunc = (pos: IPosition) => {
        if (snapToGridEnabled) {
          setGuidesThrottledRef.current({ horizontal: [], vertical: [] });

          return snapPositionToGrid(pos.x, pos.y, GRID_SIZE);
        }

        const dragged = {
          x1: pos.x,
          y1: pos.y,
          x2: pos.x + width,
          y2: pos.y + height,
        };

        const SNAP_EXPAND = 4;
        let nearbyCandidates: IAlignmentCandidate[];
        if (spatialIndex.size > 0) {
          const nearbyIds = spatialIndex.query({
            x1: dragged.x1 - SNAP_EXPAND,
            y1: dragged.y1 - SNAP_EXPAND,
            x2: dragged.x2 + SNAP_EXPAND,
            y2: dragged.y2 + SNAP_EXPAND,
          });
          nearbyCandidates = [];
          for (const id of nearbyIds) {
            const candidate = candidateMap.get(id);
            if (candidate) nearbyCandidates.push(candidate);
          }
        } else {
          nearbyCandidates = Array.from(candidateMap.values());
        }

        const guides = computeAlignmentGuidesWithCandidates(dragged, nearbyCandidates);
        const snapped = computeSnappedPositionFromGuides(guides, pos, width, height);

        setGuidesThrottledRef.current(guides);

        return snapped;
      };

      dragBoundFuncCacheRef.current.set(objectId, { width, height, fn: nextDragBoundFunc });

      return nextDragBoundFunc;
    },
    [snapToGridEnabled, dragBoundFuncCacheRef, guideCandidateBoundsRef]
  );

  // --- Text change (optimistic + queued write) ---

  const handleTextChange = useCallback(
    (objectId: string, text: string) => {
      useObjectsStore.getState().updateObject(objectId, { text });
      queueWrite(objectId, { text });
    },
    []
  );

  // --- Drag move (grid snap, spatial exemption, drop target detection) ---

  const handleDragMove = useCallback(
    (e: IKonvaDragEvent) => {
      if (snapToGridEnabled) {
        applySnapPositionToNode(e.target, objectsById, GRID_SIZE);
      }

      const objectId = e.target.id?.() ?? e.target.name?.();
      if (objectId && typeof objectId === 'string') {
        if (!dragExemptionSetRef.current) {
          dragExemptionSetRef.current = true;
          const dragIds = new Set<string>();

          if (selectedIds.size > 1 && selectedIds.has(objectId)) {
            for (const sid of selectedIds) dragIds.add(sid);
            const childIndex = useObjectsStore.getState().frameChildrenIndex;
            for (const sid of selectedIds) {
              const selObj = objectsById.get(sid);
              if (selObj?.type === 'frame') {
                const children = childIndex.get(sid);
                if (children) for (const cid of children) dragIds.add(cid);
              }
            }
          } else {
            dragIds.add(objectId);
            const dragObj = objectsById.get(objectId);
            if (dragObj?.type === 'frame') {
              const children = useObjectsStore.getState().frameChildrenIndex.get(objectId);
              if (children) for (const cid of children) dragIds.add(cid);
            }
          }

          spatialIndex.setDragging(dragIds);
        }

        const obj = objectsById.get(objectId);
        if (obj?.type === 'frame') {
          setFrameDragOffset({
            frameId: objectId,
            dx: e.target.x() - obj.x,
            dy: e.target.y() - obj.y,
          });
        } else if (obj && obj.type !== 'connector') {
          const now = performance.now();
          if (now - lastDropTargetCheckRef.current > DROP_TARGET_THROTTLE_MS) {
            lastDropTargetCheckRef.current = now;
            const dragX = e.target.x();
            const dragY = e.target.y();
            const dragBounds = {
              x1: dragX,
              y1: dragY,
              x2: dragX + obj.width,
              y2: dragY + obj.height,
            };
            const targetFrame = findContainingFrame(dragBounds, framesRef.current, obj.id);
            setDropTargetFrameId(targetFrame ?? null);
          }
        }
      }
    },
    [objectsById, snapToGridEnabled, setFrameDragOffset, setDropTargetFrameId, selectedIds]
  );

  const onDragMoveProp = canEdit ? handleDragMove : undefined;

  // --- Enter frame (double-click) ---

  const handleEnterFrame = useCallback(
    (frameId: string) => {
      const childIds = useObjectsStore.getState().frameChildrenIndex.get(frameId);
      if (childIds && childIds.size > 0) {
        setSelectedIds([...childIds]);
      }
    },
    [setSelectedIds]
  );

  // --- Transform end ---

  const handleTransformEnd = useCallback(
    (objectId: string, attrs: ITransformEndAttrs) => {
      let finalAttrs = attrs;
      if (snapToGridEnabled) {
        if ('width' in attrs && 'height' in attrs) {
          const object = objectsById.get(objectId);
          if (object) {
            const snappedRect = snapResizeRectToGrid(
              { x: object.x, y: object.y, width: object.width, height: object.height },
              { x: attrs.x, y: attrs.y, width: attrs.width, height: attrs.height },
              GRID_SIZE
            );
            finalAttrs = {
              ...attrs,
              x: snappedRect.x,
              y: snappedRect.y,
              width: snappedRect.width,
              height: snappedRect.height,
            };
          } else {
            finalAttrs = {
              ...attrs,
              ...snapPositionToGrid(attrs.x, attrs.y, GRID_SIZE),
            };
          }
        } else if ('points' in attrs) {
          const snappedPos = snapPositionToGrid(attrs.x, attrs.y, GRID_SIZE);
          finalAttrs = {
            ...attrs,
            x: snappedPos.x,
            y: snappedPos.y,
          };
        }
      }

      if ('points' in finalAttrs && finalAttrs.points.length >= 4) {
        const { width, height } = getWidthHeightFromPoints(finalAttrs.points);
        finalAttrs = { ...finalAttrs, width, height };
      }

      onObjectUpdate?.(objectId, finalAttrs as Partial<IBoardObject>);
    },
    [onObjectUpdate, snapToGridEnabled, objectsById]
  );

  // --- Handler maps (stable per-object callbacks) ---

  const selectHandlerMapRef = useRef<Map<string, () => void>>(new Map());
  const dragEndHandlerMapRef = useRef<Map<string, (x: number, y: number) => void>>(new Map());
  const textChangeHandlerMapRef = useRef<Map<string, (text: string) => void>>(new Map());

  const getSelectHandler = useCallback(
    (objectId: string) => {
      const existing = selectHandlerMapRef.current.get(objectId);
      if (existing) return existing;

      const handler = () => { handleObjectSelect(objectId); };
      selectHandlerMapRef.current.set(objectId, handler);

      return handler;
    },
    [handleObjectSelect]
  );

  const getDragEndHandler = useCallback(
    (objectId: string) => {
      const existing = dragEndHandlerMapRef.current.get(objectId);
      if (existing) return existing;

      const handler = (x: number, y: number) => {
        handleObjectDragEnd(objectId, x, y);
        clearDragState();
      };
      dragEndHandlerMapRef.current.set(objectId, handler);

      return handler;
    },
    [handleObjectDragEnd, clearDragState]
  );

  const getTextChangeHandler = useCallback(
    (objectId: string) => {
      const existing = textChangeHandlerMapRef.current.get(objectId);
      if (existing) return existing;

      const handler = (text: string) => { handleTextChange(objectId, text); };
      textChangeHandlerMapRef.current.set(objectId, handler);

      return handler;
    },
    [handleTextChange]
  );

  // Prune stale handler map entries when objects change
  useEffect(() => {
    const liveIds = new Set(objects.map((o) => o.id));
    const prune = <T,>(map: Map<string, T>) => {
      for (const id of map.keys()) {
        if (!liveIds.has(id)) map.delete(id);
      }
    };

    prune(selectHandlerMapRef.current);
    prune(dragEndHandlerMapRef.current);
    prune(textChangeHandlerMapRef.current);
    prune(dragBoundFuncCacheRef.current);
  }, [objects, dragBoundFuncCacheRef]);

  return {
    handleObjectSelect,
    handleObjectDragEnd,
    handleDragMove,
    handleSelectionDragStart,
    handleSelectionDragMove,
    handleSelectionDragEnd,
    handleEnterFrame,
    handleTransformEnd,
    handleTextChange,
    getSelectHandler,
    getDragEndHandler,
    getTextChangeHandler,
    getDragBoundFunc,
    selectionBounds,
    alignmentGuides,
    isHoveringSelectionHandleEffective,
    setIsHoveringSelectionHandle,
    onDragMoveProp,
  };
}

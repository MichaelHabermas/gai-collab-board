import { create } from 'zustand';
import type { IFrameDragOffset } from '@/types/canvas';

/**
 * Transient drag state extracted from BoardCanvas to avoid re-rendering
 * ALL visible shapes on every mousemove (60 Hz).
 *
 * Only shapes that subscribe (frame children, drop-target frames) re-render.
 */
interface IDragOffsetState {
  frameDragOffset: IFrameDragOffset | null;
  dropTargetFrameId: string | null;
}

interface IDragOffsetActions {
  setFrameDragOffset: (offset: IFrameDragOffset | null) => void;
  setDropTargetFrameId: (id: string | null) => void;
}

type IDragOffsetStore = IDragOffsetState & IDragOffsetActions;

export const useDragOffsetStore = create<IDragOffsetStore>()((set) => ({
  frameDragOffset: null,
  dropTargetFrameId: null,

  setFrameDragOffset: (offset) => set({ frameDragOffset: offset }),
  setDropTargetFrameId: (id) => set({ dropTargetFrameId: id }),
}));

// ── Selectors ──────────────────────────────────────────────────────────

/** Returns the drag offset only when it applies to this shape's parent frame. */
export const selectFrameOffset =
  (parentFrameId: string | undefined) =>
  (state: IDragOffsetStore): IFrameDragOffset | null => {
    if (!parentFrameId) return null;
    if (state.frameDragOffset?.frameId !== parentFrameId) return null;
    return state.frameDragOffset;
  };

/** Returns true when this frame is the current drop target. */
export const selectIsDropTarget =
  (frameId: string) =>
  (state: IDragOffsetStore): boolean =>
    state.dropTargetFrameId === frameId;

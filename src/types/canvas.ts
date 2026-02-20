/**
 * Canvas UI types: selection rect, overlay rect, shape renderer props, viewport actions.
 * Moved from components so no type exports from .tsx files.
 * Replace in: SelectionLayer, CanvasShapeRenderer, ViewportActionsContext,
 * RightSidebar, canvasOverlayPosition (IOverlayRect already there; re-export here).
 */

import type { ReactNode } from 'react';
import type { IBoardObject } from './board';
import type { IDragBoundFunc } from './shapes';
import type { IKonvaDragEvent } from './konva';

/** Right sidebar tab. Used by useBoardSettings and RightSidebar. */
export type SidebarTab = 'boards' | 'props' | 'ai' | 'comments';

/** Selection drag rect (visible + bounds). Used by SelectionLayer and BoardCanvas. */
export interface ISelectionRect {
  visible: boolean;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** Screen-space overlay rect from getOverlayRectFromLocalCorners. */
export interface IOverlayRect {
  left: number;
  top: number;
  width: number;
  height: number;
  avgScale: number;
}

/** Export image format. Used by ViewportActionsContext and useExportAsImage. */
export type ExportImageFormat = 'png' | 'jpeg';

/** Viewport actions exposed via context (zoom, export). */
export interface IViewportActionsValue {
  zoomToFitAll: () => void;
  zoomToSelection: (objectIds: string[]) => void;
  setZoomLevel: (percent: number) => void;
  exportViewport?: (format?: ExportImageFormat) => void;
  exportFullBoard?: (format?: ExportImageFormat) => void;
}

/** Offset applied to selected objects during group-drag-from-empty-area. */
export interface IGroupDragOffset {
  dx: number;
  dy: number;
}

/** Offset applied to frame children during frame drag so they move visually with the frame. */
export interface IFrameDragOffset {
  frameId: string;
  dx: number;
  dy: number;
}

/** Props for CanvasShapeRenderer. */
export interface ICanvasShapeRendererProps {
  object: IBoardObject;
  isSelected: boolean;
  canEdit: boolean;
  objectsById: Map<string, IBoardObject>;
  selectionColor: string;
  /** When set, selected objects are rendered at (object.x + dx, object.y + dy) during group drag. */
  groupDragOffset?: IGroupDragOffset | null;
  /** When set, children of this frame are rendered at (object.x + dx, object.y + dy) during frame drag. */
  frameDragOffset?: IFrameDragOffset | null;
  /** ID of the frame currently being hovered during a drag operation (for drop zone feedback). */
  dropTargetFrameId?: string | null;
  /** Called when the user double-clicks a frame body to "enter" the frame (select children). */
  onEnterFrame?: (frameId: string) => void;
  getSelectHandler: (id: string) => () => void;
  getDragEndHandler: (id: string) => (x: number, y: number) => void;
  getTextChangeHandler: (id: string) => (text: string) => void;
  getDragBoundFunc: (id: string, width: number, height: number) => IDragBoundFunc | undefined;
  onDragMove?: (e: IKonvaDragEvent) => void;
  handleObjectSelect: (id: string) => void;
  handleObjectDragEnd: (id: string, x: number, y: number) => void;
}

/** Props for RightSidebar. */
export interface IRightSidebarProps {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
  sidebarTab: SidebarTab;
  setSidebarTab: (v: SidebarTab) => void;
  expandedContent: ReactNode;
  /** When true, only show the Boards tab (e.g. for viewers). */
  boardsOnly?: boolean;
}

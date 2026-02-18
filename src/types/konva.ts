/**
 * Konva event type wrappers. Keeps Konva as a type dependency only in this file;
 * components and hooks use IKonva* from @/types instead of importing Konva.
 * Replace in: BoardCanvas, useShapeDragHandler, useShapeTransformHandler,
 * useCanvasViewport, ConnectionNodesLayer.
 */

import type Konva from 'konva';

/** Konva mouse event. Use for stage/layer click and mouse move. */
export type IKonvaMouseEvent = Konva.KonvaEventObject<MouseEvent>;

/** Konva drag event. Use for drag end on stage or nodes. */
export type IKonvaDragEvent = Konva.KonvaEventObject<DragEvent>;

/** Konva wheel event. Use for zoom. */
export type IKonvaWheelEvent = Konva.KonvaEventObject<WheelEvent>;

/** Konva touch event. Use for touch move/end. */
export type IKonvaTouchEvent = Konva.KonvaEventObject<TouchEvent>;

/** Generic Konva event (e.g. transform end). */
export type IKonvaEvent = Konva.KonvaEventObject<Event>;

/**
 * BoardStateManager: read-only facade for board state serialization.
 * DIP: depends on IBoardStateProvider abstraction, not Zustand or viewport hooks.
 * Constitution Article IV: getElementsJSON strips internal metadata for AI consumption.
 */

import type {
  IBoardObject,
  IBoardState,
  ShapeType,
  IViewportPosition,
  IViewportScale,
} from '@/types';
import type { IVersionedAIState } from '@/types/aiCommand';

/** AI state schema version. Bump on breaking changes (Constitution Article IV). */
export const AI_STATE_VERSION = 1;

/** Abstraction over concrete stores so the manager is testable without Zustand. */
export interface IBoardStateProvider {
  getObjects(): Record<string, IBoardObject>;
  getViewport(): { position: IViewportPosition; scale: IViewportScale };
}

/** AI-safe element representation — strips createdBy, createdAt, updatedAt. */
export interface IAIBoardElement {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  fill: string;
  text?: string;
  stroke?: string;
  strokeWidth?: number;
  textFill?: string;
  fontSize?: number;
  opacity?: number;
  points?: number[];
  fromObjectId?: string;
  toObjectId?: string;
  fromAnchor?: string;
  toAnchor?: string;
  arrowheads?: string;
  strokeStyle?: string;
  radius?: number;
  cornerRadius?: number;
  parentFrameId?: string;
}

/** Return type of createBoardStateManager. */
export interface IBoardStateManager {
  getState(): IBoardState;
  getElementsJSON(): string;
  getElementsForAI(includeDetails: boolean): IAIBoardElement[];
  getVersionedStateForAI(includeDetails: boolean): IVersionedAIState;
  getElementById(id: string): IBoardObject | undefined;
  getElementsByType(type: ShapeType): IBoardObject[];
}

/** Strip Firebase/internal metadata from an IBoardObject for AI consumption. */
function toAIElement(obj: IBoardObject, includeDetails: boolean): IAIBoardElement {
  const base: IAIBoardElement = {
    id: obj.id,
    type: obj.type,
    x: obj.x,
    y: obj.y,
    width: obj.width,
    height: obj.height,
    rotation: obj.rotation,
    fill: obj.fill,
  };

  if (!includeDetails) {
    if (obj.text) {
      base.text = obj.text;
    }

    return base;
  }

  if (obj.text) {
    base.text = obj.text;
  }

  if (obj.stroke) {
    base.stroke = obj.stroke;
  }

  if (obj.strokeWidth) {
    base.strokeWidth = obj.strokeWidth;
  }

  if (obj.textFill) {
    base.textFill = obj.textFill;
  }

  if (obj.fontSize) {
    base.fontSize = obj.fontSize;
  }

  if (obj.opacity) {
    base.opacity = obj.opacity;
  }

  if (obj.points) {
    base.points = obj.points;
  }

  if (obj.fromObjectId) {
    base.fromObjectId = obj.fromObjectId;
  }

  if (obj.toObjectId) {
    base.toObjectId = obj.toObjectId;
  }

  if (obj.fromAnchor) {
    base.fromAnchor = obj.fromAnchor;
  }

  if (obj.toAnchor) {
    base.toAnchor = obj.toAnchor;
  }

  if (obj.arrowheads) {
    base.arrowheads = obj.arrowheads;
  }

  if (obj.strokeStyle) {
    base.strokeStyle = obj.strokeStyle;
  }

  if (obj.radius) {
    base.radius = obj.radius;
  }

  if (obj.cornerRadius) {
    base.cornerRadius = obj.cornerRadius;
  }

  if (obj.parentFrameId) {
    base.parentFrameId = obj.parentFrameId;
  }

  return base;
}

export function createBoardStateManager(provider: IBoardStateProvider): IBoardStateManager {
  return {
    getState(): IBoardState {
      return {
        elements: provider.getObjects(),
        viewport: provider.getViewport(),
      };
    },

    getElementsJSON(): string {
      const objects = provider.getObjects();
      const elements = Object.values(objects).map((obj) => toAIElement(obj, true));

      return JSON.stringify(elements);
    },

    getElementsForAI(includeDetails: boolean): IAIBoardElement[] {
      const objects = provider.getObjects();

      return Object.values(objects).map((obj) => toAIElement(obj, includeDetails));
    },

    getVersionedStateForAI(includeDetails: boolean): IVersionedAIState {
      const elements = this.getElementsForAI(includeDetails);

      return {
        version: AI_STATE_VERSION,
        elements,
        elementCount: elements.length,
      };
    },

    getElementById(id: string): IBoardObject | undefined {
      return provider.getObjects()[id];
    },

    getElementsByType(type: ShapeType): IBoardObject[] {
      return Object.values(provider.getObjects()).filter((obj) => obj.type === type);
    },
  };
}

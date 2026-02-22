/**
 * Text edit controller: dblclick → DOM text overlay, commit via queueObjectUpdate.
 * Reuses canvasTextEditOverlay.ts and canvasOverlayPosition.ts. No React state.
 * See docs/IMPERATIVE-KONVA-MIGRATION-V5.md Epic 3 T18.
 */

import Konva from 'konva';
import { getOverlayRectFromLocalCorners } from '@/lib/canvasOverlayPosition';
import { attachOverlayRepositionLifecycle } from '@/lib/canvasTextEditOverlay';
import type { IUpdateObjectParams } from '@/types';
import type { IManagedNode } from '../KonvaNodeManager';

const STICKY_PADDING = 8;
const FRAME_TITLE_HEIGHT = 32;
const FRAME_TITLE_PADDING = 12;
const FRAME_CHEVRON_WIDTH = 14;
const FRAME_TITLE_FONT_SIZE = 14;

const EDITABLE_TYPES = ['sticky', 'text', 'frame'] as const;
type EditableType = (typeof EDITABLE_TYPES)[number];

function isEditableType(type: string): type is EditableType {
  return EDITABLE_TYPES.includes(type as EditableType);
}

export interface ITextEditNodeManager {
  getNode(id: string): IManagedNode | undefined;
  setEditingState(id: string, editing: boolean): void;
}

export interface ITextEditControllerConfig {
  nodeManager: ITextEditNodeManager;
  getStage: () => Konva.Stage | null;
  queueObjectUpdate: (objectId: string, updates: IUpdateObjectParams) => void;
}

export interface ITextEditController {
  open(objectId: string): void;
  close(): void;
}

function getLocalCornersAndNode(managed: IManagedNode): {
  localCorners: { x: number; y: number }[];
  node: Konva.Node;
  fontSize: number;
  isFrameTitle: boolean;
} | null {
  const { type, nodes, lastObj: obj } = managed;
  const { root } = nodes;

  if (type === 'sticky') {
    const padding = STICKY_PADDING;
    const { width, height } = obj;
    const fontSize = obj.fontSize ?? 14;
    return {
      localCorners: [
        { x: padding, y: padding },
        { x: width - padding, y: padding },
        { x: width - padding, y: height - padding },
        { x: padding, y: height - padding },
      ],
      node: root,
      fontSize,
      isFrameTitle: false,
    };
  }

  if (type === 'text') {
    const w = obj.width ?? 100;
    const h = obj.height ?? 20;
    const fontSize = obj.fontSize ?? 16;
    return {
      localCorners: [
        { x: 0, y: 0 },
        { x: w, y: 0 },
        { x: w, y: h },
        { x: 0, y: h },
      ],
      node: root,
      fontSize,
      isFrameTitle: false,
    };
  }

  if (type === 'frame') {
    const titleTop = (FRAME_TITLE_HEIGHT - 14) / 2;
    const titleHeight = 14;
    return {
      localCorners: [
        { x: FRAME_TITLE_PADDING + FRAME_CHEVRON_WIDTH, y: titleTop },
        { x: obj.width - FRAME_TITLE_PADDING, y: titleTop },
        { x: obj.width - FRAME_TITLE_PADDING, y: titleTop + titleHeight },
        { x: FRAME_TITLE_PADDING + FRAME_CHEVRON_WIDTH, y: titleTop + titleHeight },
      ],
      node: root,
      fontSize: FRAME_TITLE_FONT_SIZE,
      isFrameTitle: true,
    };
  }

  return null;
}

function applyTextareaStyle(
  el: HTMLTextAreaElement | HTMLInputElement,
  rect: { left: number; top: number; width: number; height: number; avgScale: number },
  fontSize: number,
  isFrameTitle: boolean
): void {
  el.style.position = 'fixed';
  el.style.top = `${rect.top}px`;
  el.style.left = `${rect.left}px`;
  el.style.width = `${rect.width}px`;
  el.style.height = `${rect.height}px`;
  el.style.fontSize = `${fontSize * rect.avgScale}px`;
  el.style.border = 'none';
  el.style.padding = '0px';
  el.style.margin = '0px';
  el.style.overflow = 'hidden';
  el.style.background = isFrameTitle ? '#f8fafc' : 'transparent';
  el.style.outline = 'none';
  el.style.resize = 'none';
  el.style.fontFamily = 'Inter, system-ui, sans-serif';
  el.style.lineHeight = '1.4';
  el.style.zIndex = '1000';
  if (isFrameTitle) {
    (el as HTMLInputElement).style.fontWeight = '600';
    (el as HTMLInputElement).style.borderBottom = '1px solid rgba(59, 130, 246, 0.3)';
  }
}

export function createTextEditController(config: ITextEditControllerConfig): ITextEditController {
  const { nodeManager, getStage, queueObjectUpdate } = config;
  let currentObjectId: string | null = null;
  let cleanupReposition: (() => void) | null = null;
  let overlayElement: HTMLTextAreaElement | HTMLInputElement | null = null;

  function removeOverlay(): void {
    if (cleanupReposition) {
      cleanupReposition();
      cleanupReposition = null;
    }

    if (overlayElement && document.body.contains(overlayElement)) {
      document.body.removeChild(overlayElement);
      overlayElement = null;
    }

    if (currentObjectId) {
      nodeManager.setEditingState(currentObjectId, false);
      currentObjectId = null;
    }
  }

  function open(objectId: string): void {
    close();
    const managed = nodeManager.getNode(objectId);
    if (!managed || !isEditableType(managed.type)) {
      return;
    }

    const stage = getStage();
    if (!stage) {
      return;
    }

    const params = getLocalCornersAndNode(managed);
    if (!params) {
      return;
    }

    const { localCorners, node, fontSize, isFrameTitle } = params;
    const obj = managed.lastObj;
    const initialText = obj.text ?? '';

    nodeManager.setEditingState(objectId, true);
    currentObjectId = objectId;

    requestAnimationFrame(() => {
      if (!currentObjectId || currentObjectId !== objectId) {
        return;
      }

      const transform = node.getAbsoluteTransform();
      const rect = getOverlayRectFromLocalCorners(stage, transform, localCorners);

      const el = isFrameTitle
        ? (document.createElement('input') as HTMLInputElement)
        : (document.createElement('textarea') as HTMLTextAreaElement);
      if (isFrameTitle) {
        (el as HTMLInputElement).type = 'text';
      }

      el.className = isFrameTitle ? 'frame-title-edit-overlay' : 'sticky-note-edit-overlay';
      if (!isFrameTitle) {
        el.setAttribute('data-testid', 'sticky-note-edit-overlay');
      }

      document.body.appendChild(el);
      overlayElement = el;

      el.value = initialText;
      applyTextareaStyle(el, rect, fontSize, isFrameTitle);

      cleanupReposition = attachOverlayRepositionLifecycle({
        stage,
        node,
        localCorners,
        overlayElement: el,
        applyStyle: (element, r) => {
          applyTextareaStyle(element as HTMLTextAreaElement, r, fontSize, isFrameTitle);
        },
      });

      el.focus();
      el.select();

      function commitAndClose(): void {
        const { value } = el;
        removeOverlay();
        queueObjectUpdate(objectId, { text: value });
      }

      const handleKeyDown = (e: Event): void => {
        if (!(e instanceof KeyboardEvent)) {
          return;
        }

        if (e.key === 'Escape') {
          removeOverlay();
          return;
        }

        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          commitAndClose();
        }
      };

      const handleBlur = (e: Event): void => {
        const rt = e instanceof FocusEvent ? (e.relatedTarget as HTMLElement | null) : null;
        const keepOpen =
          rt &&
          (rt.closest('.toolbar') ||
            rt.closest('[data-testid^="tool-"]') ||
            rt.closest('[data-testid^="zoom-"]') ||
            rt.closest('[data-testid="board-canvas"]'));
        if (keepOpen || !rt) {
          el.focus();
          return;
        }

        commitAndClose();
      };

      el.addEventListener('keydown', handleKeyDown);
      el.addEventListener('blur', handleBlur);
    });
  }

  function close(): void {
    removeOverlay();
  }

  return { open, close };
}

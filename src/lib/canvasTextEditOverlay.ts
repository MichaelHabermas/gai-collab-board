import Konva from 'konva';
import { getOverlayRectFromLocalCorners } from '@/lib/canvasOverlayPosition';
import type { IPosition, IOverlayRect } from '@/types';

/** Stage change events that affect overlay position (pan/zoom). */
const STAGE_CHANGE_EVENTS = 'xChange yChange scaleXChange scaleYChange';

/** Node change events that affect overlay position (move/rotate/resize). */
const NODE_CHANGE_EVENTS =
  'xChange yChange rotationChange widthChange heightChange scaleXChange scaleYChange';

export type ApplyOverlayStyleFn = (el: HTMLElement, rect: IOverlayRect) => void;

export interface IAttachOverlayRepositionOptions {
  stage: Konva.Stage;
  node: Konva.Node;
  localCorners: IPosition[];
  overlayElement: HTMLElement;
  applyStyle: ApplyOverlayStyleFn;
}

/**
 * Attach a reposition lifecycle so the overlay stays aligned when viewport (pan/zoom)
 * or node transform changes during editing. Returns a cleanup function that removes
 * all listeners; call it when closing the editor or on unmount.
 */
export function attachOverlayRepositionLifecycle(
  options: IAttachOverlayRepositionOptions
): () => void {
  const { stage, node, localCorners, overlayElement, applyStyle } = options;

  const updatePosition = (): void => {
    if (!document.body.contains(overlayElement)) {
      return;
    }

    try {
      const transform = node.getAbsoluteTransform();
      const rect = getOverlayRectFromLocalCorners(stage, transform, localCorners);
      applyStyle(overlayElement, rect);
    } catch {
      // Stage or node may be destroyed; ignore
    }
  };

  const handleStageChange = (): void => {
    updatePosition();
  };

  const handleNodeChange = (): void => {
    updatePosition();
  };

  stage.on(STAGE_CHANGE_EVENTS, handleStageChange);
  node.on(NODE_CHANGE_EVENTS, handleNodeChange);

  return () => {
    stage.off(STAGE_CHANGE_EVENTS, handleStageChange);
    node.off(NODE_CHANGE_EVENTS, handleNodeChange);
  };
}

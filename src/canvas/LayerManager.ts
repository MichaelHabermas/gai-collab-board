/**
 * Layer Manager — Creates and manages Konva layers and RAF-coalesced batch drawing.
 * See docs/IMPERATIVE-KONVA-MIGRATION-V5.md Epic 2.
 */

import Konva from 'konva';

export interface ILayerManagerReturn {
  layers: {
    static: Konva.Layer;
    active: Konva.Layer;
    overlay: Konva.Layer;
    selection: Konva.Layer;
  };
  scheduleBatchDraw: (layer: Konva.Layer) => void;
  destroy: () => void;
}

export function createLayerManager(stage: Konva.Stage): ILayerManagerReturn {
  // Create 4 layers in specific z-order
  const staticLayer = new Konva.Layer({ name: 'static-layer' });
  const activeLayer = new Konva.Layer({ name: 'active-layer' });
  const overlayLayer = new Konva.Layer({ name: 'overlay-layer' });
  const selectionLayer = new Konva.Layer({ name: 'selection-layer' });

  stage.add(staticLayer);
  stage.add(activeLayer);
  stage.add(overlayLayer);
  stage.add(selectionLayer);

  // Track pending RAFs per layer to coalesce draw calls
  const pendingRafs = new Map<Konva.Layer, number>();

  const scheduleBatchDraw = (layer: Konva.Layer) => {
    if (!pendingRafs.has(layer)) {
      const rafId = requestAnimationFrame(() => {
        pendingRafs.delete(layer);
        layer.batchDraw();
      });
      pendingRafs.set(layer, rafId);
    }
  };

  const destroy = () => {
    // Cancel all pending RAFs
    pendingRafs.forEach((rafId) => cancelAnimationFrame(rafId));
    pendingRafs.clear();

    // Destroy layers
    staticLayer.destroy();
    activeLayer.destroy();
    overlayLayer.destroy();
    selectionLayer.destroy();
  };

  return {
    layers: {
      static: staticLayer,
      active: activeLayer,
      overlay: overlayLayer,
      selection: selectionLayer,
    },
    scheduleBatchDraw,
    destroy,
  };
}

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Konva from 'konva';
import { createLayerManager } from '@/canvas/LayerManager';

vi.mock('konva', () => {
  return {
    default: {
      Layer: class {
        name: () => string;
        batchDraw: () => void;
        destroy: () => void;
        constructor(config: { name?: string }) {
          this.name = () => config?.name ?? '';
          this.batchDraw = () => {};
          this.destroy = () => {};
        }
      },
    },
  };
});

describe('LayerManager', () => {
  let stage: any;

  beforeEach(() => {
    stage = {
      add: vi.fn(),
      getLayers: vi.fn().mockReturnValue([]),
      destroy: vi.fn(),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates 4 layers and adds them to the stage', () => {
    const manager = createLayerManager(stage as unknown as Konva.Stage);
    
    expect(manager.layers.static.name()).toBe('static-layer');
    expect(manager.layers.active.name()).toBe('active-layer');
    expect(manager.layers.overlay.name()).toBe('overlay-layer');
    expect(manager.layers.selection.name()).toBe('selection-layer');

    expect(stage.add).toHaveBeenCalledTimes(4);
    expect(stage.add).toHaveBeenNthCalledWith(1, manager.layers.static);
    expect(stage.add).toHaveBeenNthCalledWith(2, manager.layers.active);
    expect(stage.add).toHaveBeenNthCalledWith(3, manager.layers.overlay);
    expect(stage.add).toHaveBeenNthCalledWith(4, manager.layers.selection);
  });

  it('coalesces scheduleBatchDraw calls using requestAnimationFrame', () => {
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((_cb) => {
      return 1 as unknown as number;
    });
    
    const manager = createLayerManager(stage as unknown as Konva.Stage);
    const layer = manager.layers.static;
    
    manager.scheduleBatchDraw(layer);
    manager.scheduleBatchDraw(layer);
    manager.scheduleBatchDraw(layer);

    // Should only schedule one RAF
    expect(rafSpy).toHaveBeenCalledTimes(1);
  });

  it('destroy cancels pending RAFs and destroys layers', () => {
    const cancelRafSpy = vi.spyOn(window, 'cancelAnimationFrame');
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((_cb) => {
      return 123 as unknown as number;
    });

    const manager = createLayerManager(stage as unknown as Konva.Stage);
    const layer = manager.layers.static;

    // Create a pending RAF
    manager.scheduleBatchDraw(layer);

    expect(() => manager.destroy()).not.toThrow();

    // Should cancel the RAF
    expect(cancelRafSpy).toHaveBeenCalledWith(123);
  });
});

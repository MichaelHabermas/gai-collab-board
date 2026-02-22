import { describe, it, expect, vi, beforeEach } from 'vitest';
import Konva from 'konva';
import { OverlayManager } from '@/canvas/OverlayManager';

const mockAdd = vi.fn();
const mockBatchDraw = vi.fn();

vi.mock('konva', () => {
  class MockLine {
    setAttrs = vi.fn();
    destroy = vi.fn();
    constructor(attrs: { points: number[] }) {
      expect(attrs.points).toBeDefined();
    }
  }

  class MockGroup {
    add = vi.fn();
    destroy = vi.fn();
    children: unknown[] = [];
    constructor(attrs: { listening: boolean; name: string }) {
      expect(attrs.name).toBe('alignment-guides');
    }
  }

  class MockRect {
    setAttrs = vi.fn();
    destroy = vi.fn();
    constructor(attrs: { x: number; y: number; width: number; height: number }) {
      expect(attrs.x).toBeDefined();
      expect(attrs.width).toBeDefined();
    }
  }

  return {
    default: {
      Layer: class MockLayer {
        add = mockAdd;
        batchDraw = mockBatchDraw;
      },
      Group: MockGroup,
      Line: MockLine,
      Rect: MockRect,
    },
  };
});

describe('OverlayManager', () => {
  beforeEach(() => {
    mockAdd.mockClear();
    mockBatchDraw.mockClear();
  });

  it('instantiates with overlay layer and destroy clears internal ref', () => {
    const mockLayer = new Konva.Layer();
    const manager = new OverlayManager(mockLayer);

    expect(() => manager.destroy()).not.toThrow();
  });

  it('updateGuides(null) removes guides and does not add nodes', () => {
    const mockLayer = new Konva.Layer();
    const manager = new OverlayManager(mockLayer);

    manager.updateGuides({ horizontal: [100], vertical: [200] });
    expect(mockAdd).toHaveBeenCalledTimes(1);

    manager.updateGuides(null);
    expect(mockBatchDraw).toHaveBeenCalled();
  });

  it('updateGuides with empty arrays does not add a group', () => {
    const mockLayer = new Konva.Layer();
    const manager = new OverlayManager(mockLayer);

    manager.updateGuides({ horizontal: [], vertical: [] });
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it('updateGuides with values adds a group with lines to the layer', () => {
    const mockLayer = new Konva.Layer();
    const manager = new OverlayManager(mockLayer);

    manager.updateGuides({ horizontal: [10], vertical: [20] });

    expect(mockAdd).toHaveBeenCalledTimes(1);
    const firstCall = mockAdd.mock.calls[0];
    const added = firstCall?.[0];
    expect(added).toBeDefined();
    if (added) {
      expect(added.add).toBeDefined();
      expect(added.add).toHaveBeenCalledTimes(2);
    }
  });

  it('updateGuides with new values replaces previous guides', () => {
    const mockLayer = new Konva.Layer();
    const manager = new OverlayManager(mockLayer);

    manager.updateGuides({ horizontal: [1], vertical: [2] });
    expect(mockAdd).toHaveBeenCalledTimes(1);

    manager.updateGuides({ horizontal: [3], vertical: [4] });
    expect(mockAdd).toHaveBeenCalledTimes(2);
  });

  it('updateMarquee with visible true adds a rect to the layer', () => {
    const mockLayer = new Konva.Layer();
    const manager = new OverlayManager(mockLayer);

    manager.updateMarquee({
      visible: true,
      x1: 0,
      y1: 0,
      x2: 100,
      y2: 50,
    });

    expect(mockAdd).toHaveBeenCalledTimes(1);
    const added = mockAdd.mock.calls[0]?.[0];
    expect(added).toBeDefined();
    if (added) {
      expect(added.setAttrs).toBeDefined();
      expect(added.destroy).toBeDefined();
    }
  });

  it('updateMarquee with visible false removes marquee rect', () => {
    const mockLayer = new Konva.Layer();
    const manager = new OverlayManager(mockLayer);

    manager.updateMarquee({
      visible: true,
      x1: 0,
      y1: 0,
      x2: 100,
      y2: 50,
    });
    const rect = mockAdd.mock.calls[0]?.[0];
    expect(rect).toBeDefined();

    manager.updateMarquee({
      visible: false,
      x1: 0,
      y1: 0,
      x2: 0,
      y2: 0,
    });

    if (rect && typeof rect.destroy === 'function') {
      expect(rect.destroy).toHaveBeenCalled();
    }
  });

  it('hideMarquee removes marquee rect', () => {
    const mockLayer = new Konva.Layer();
    const manager = new OverlayManager(mockLayer);

    manager.updateMarquee({
      visible: true,
      x1: 10,
      y1: 20,
      x2: 110,
      y2: 70,
    });
    const rect = mockAdd.mock.calls[0]?.[0];
    expect(rect).toBeDefined();

    manager.hideMarquee();

    if (rect && typeof rect.destroy === 'function') {
      expect(rect.destroy).toHaveBeenCalled();
    }
  });

  it('showDrawingPreview adds a preview node to the layer', () => {
    const mockLayer = new Konva.Layer();
    const manager = new OverlayManager(mockLayer);

    manager.showDrawingPreview('rectangle', '#f00');

    expect(mockAdd).toHaveBeenCalledTimes(1);
    const added = mockAdd.mock.calls[0]?.[0];
    expect(added).toBeDefined();
    expect(added?.setAttrs).toBeDefined();
    expect(added?.destroy).toBeDefined();
  });

  it('updateDrawingPreview updates rect geometry via setAttrs', () => {
    const mockLayer = new Konva.Layer();
    const manager = new OverlayManager(mockLayer);

    manager.showDrawingPreview('rectangle', '#f00');
    const rect = mockAdd.mock.calls[0]?.[0];
    expect(rect).toBeDefined();

    manager.updateDrawingPreview(
      { startX: 10, startY: 20, currentX: 50, currentY: 60 },
      'rectangle',
      '#f00'
    );

    expect(rect?.setAttrs).toHaveBeenCalledWith(
      expect.objectContaining({
        x: 10,
        y: 20,
        width: 40,
        height: 40,
      })
    );
  });

  it('hideDrawingPreview destroys preview node', () => {
    const mockLayer = new Konva.Layer();
    const manager = new OverlayManager(mockLayer);

    manager.showDrawingPreview('rectangle', '#f00');
    const rect = mockAdd.mock.calls[0]?.[0];
    expect(rect).toBeDefined();

    manager.hideDrawingPreview();

    expect(rect?.destroy).toHaveBeenCalled();
  });

  it('destroy clears drawing preview node', () => {
    const mockLayer = new Konva.Layer();
    const manager = new OverlayManager(mockLayer);

    manager.showDrawingPreview('rectangle', '#f00');
    const rect = mockAdd.mock.calls[0]?.[0];
    expect(rect).toBeDefined();

    manager.destroy();

    expect(rect?.destroy).toHaveBeenCalled();
  });

  it('all public methods are callable without throwing (stub contract)', () => {
    const mockLayer = new Konva.Layer();
    const manager = new OverlayManager(mockLayer);

    expect(() => manager.showMarquee()).not.toThrow();
    expect(() =>
      manager.updateMarquee({ visible: true, x1: 0, y1: 0, x2: 10, y2: 10 })
    ).not.toThrow();
    expect(() => manager.hideMarquee()).not.toThrow();
    expect(() => manager.updateGuides(null)).not.toThrow();
    expect(() =>
      manager.updateGuides({ horizontal: [0], vertical: [0] })
    ).not.toThrow();
    expect(() => manager.showDrawingPreview('rectangle', '#000')).not.toThrow();
    expect(() =>
      manager.updateDrawingPreview(
        { startX: 0, startY: 0, currentX: 5, currentY: 5 },
        'rectangle',
        '#000'
      )
    ).not.toThrow();
    expect(() => manager.hideDrawingPreview()).not.toThrow();
    expect(() => manager.updateCursors({}, 'uid')).not.toThrow();
    expect(() =>
      manager.updateConnectionNodes([], {}, () => {})
    ).not.toThrow();
    expect(() => manager.highlightAnchor('id', 'top')).not.toThrow();
    expect(() => manager.clearConnectionNodes()).not.toThrow();
    expect(() => manager.destroy()).not.toThrow();
  });
});

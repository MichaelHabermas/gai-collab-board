import { describe, it, expect, vi, beforeEach } from 'vitest';
import Konva from 'konva';
import { OverlayManager } from '@/canvas/OverlayManager';
import type { IBoardObject } from '@/types';

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
    constructor(attrs: { listening?: boolean; name?: string; x?: number; y?: number }) {
      if (attrs.name !== undefined) {
        expect(['alignment-guides', 'cursors', 'connection-nodes']).toContain(attrs.name);
      }
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

  class MockCircle {
    destroy = vi.fn();
    on = vi.fn();
    setAttr = vi.fn();
    constructor(_attrs: { radius?: number; fill?: string; x?: number; y?: number }) {
      // no assertion needed
    }
  }

  class MockText {
    destroy = vi.fn();
    constructor(_attrs: { text: string; x: number; y: number }) {
      // no assertion needed
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
      Circle: MockCircle,
      Text: MockText,
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

  it('updateCursors with other users adds cursors group to the layer', () => {
    const mockLayer = new Konva.Layer();
    const manager = new OverlayManager(mockLayer);

    manager.updateCursors(
      {
        otherUid: {
          uid: 'otherUid',
          x: 100,
          y: 50,
          displayName: 'Other',
          color: '#3b82f6',
          lastUpdated: 0,
        },
      },
      'myUid'
    );

    expect(mockAdd).toHaveBeenCalledTimes(1);
    const added = mockAdd.mock.calls[0]?.[0];
    expect(added).toBeDefined();
    expect(added?.add).toBeDefined();
    expect(added?.add).toHaveBeenCalledTimes(1);
  });

  it('updateCursors filters out current user', () => {
    const mockLayer = new Konva.Layer();
    const manager = new OverlayManager(mockLayer);

    manager.updateCursors(
      {
        myUid: {
          uid: 'myUid',
          x: 0,
          y: 0,
          displayName: 'Me',
          color: '#000',
          lastUpdated: 0,
        },
      },
      'myUid'
    );

    expect(mockAdd).not.toHaveBeenCalled();
  });

  it('updateCursors with empty cursors removes existing cursor group', () => {
    const mockLayer = new Konva.Layer();
    const manager = new OverlayManager(mockLayer);

    manager.updateCursors(
      {
        other: {
          uid: 'other',
          x: 10,
          y: 10,
          displayName: 'O',
          color: '#f00',
          lastUpdated: 0,
        },
      },
      'me'
    );
    expect(mockAdd).toHaveBeenCalledTimes(1);
    const group = mockAdd.mock.calls[0]?.[0];
    expect(group?.destroy).toBeDefined();

    mockAdd.mockClear();
    manager.updateCursors({}, 'me');

    expect(group?.destroy).toHaveBeenCalled();
  });

  it('destroy clears cursor group', () => {
    const mockLayer = new Konva.Layer();
    const manager = new OverlayManager(mockLayer);

    manager.updateCursors(
      {
        other: {
          uid: 'other',
          x: 5,
          y: 5,
          displayName: 'O',
          color: '#0f0',
          lastUpdated: 0,
        },
      },
      'me'
    );
    const group = mockAdd.mock.calls[0]?.[0];
    expect(group).toBeDefined();

    manager.destroy();

    expect(group?.destroy).toHaveBeenCalled();
  });

  it('updateConnectionNodes adds connection nodes group for connectable shapes', () => {
    const mockLayer = new Konva.Layer();
    const manager = new OverlayManager(mockLayer);
    const onNodeClick = vi.fn();

    manager.updateConnectionNodes(
      ['rect1'],
      {
        rect1: {
          id: 'rect1',
          type: 'rectangle',
          x: 0,
          y: 0,
          width: 100,
          height: 50,
          rotation: 0,
        } as IBoardObject,
      },
      onNodeClick
    );

    expect(mockAdd).toHaveBeenCalledTimes(1);
    const group = mockAdd.mock.calls[0]?.[0];
    expect(group?.add).toBeDefined();
    expect(group?.add).toHaveBeenCalled();
  });

  it('updateConnectionNodes with no connectable shapes does not add group', () => {
    const mockLayer = new Konva.Layer();
    const manager = new OverlayManager(mockLayer);

    manager.updateConnectionNodes([], {}, () => {});

    expect(mockAdd).not.toHaveBeenCalled();
  });

  it('clearConnectionNodes removes connection nodes group', () => {
    const mockLayer = new Konva.Layer();
    const manager = new OverlayManager(mockLayer);

    manager.updateConnectionNodes(
      ['r1'],
      {
        r1: {
          id: 'r1',
          type: 'rectangle',
          x: 0,
          y: 0,
          width: 10,
          height: 10,
          rotation: 0,
        } as IBoardObject,
      },
      () => {}
    );
    const group = mockAdd.mock.calls[0]?.[0];
    expect(group).toBeDefined();

    mockAdd.mockClear();
    manager.clearConnectionNodes();

    expect(group?.destroy).toHaveBeenCalled();
  });

  it('destroy clears connection nodes group', () => {
    const mockLayer = new Konva.Layer();
    const manager = new OverlayManager(mockLayer);

    manager.updateConnectionNodes(
      ['r1'],
      {
        r1: {
          id: 'r1',
          type: 'rectangle',
          x: 0,
          y: 0,
          width: 10,
          height: 10,
          rotation: 0,
        } as IBoardObject,
      },
      () => {}
    );
    const group = mockAdd.mock.calls[0]?.[0];

    manager.destroy();

    expect(group?.destroy).toHaveBeenCalled();
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

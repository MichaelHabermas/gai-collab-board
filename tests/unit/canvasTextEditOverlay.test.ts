import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type Konva from 'konva';
import { getOverlayRectFromLocalCorners } from '@/lib/canvasOverlayPosition';
import { attachOverlayRepositionLifecycle, type ApplyOverlayStyleFn } from '@/lib/canvasTextEditOverlay';
import type { IOverlayRect } from '@/types';

const mockRect: IOverlayRect = {
  left: 10,
  top: 20,
  width: 100,
  height: 40,
  avgScale: 1,
};

const mockRectAfterChange: IOverlayRect = {
  left: 50,
  top: 60,
  width: 100,
  height: 40,
  avgScale: 1.5,
};

vi.mock('@/lib/canvasOverlayPosition', () => ({
  getOverlayRectFromLocalCorners: vi.fn(() => mockRect),
}));

describe('canvasTextEditOverlay', () => {
  let stageOn: ReturnType<typeof vi.fn>;
  let stageOff: ReturnType<typeof vi.fn>;
  let nodeOn: ReturnType<typeof vi.fn>;
  let nodeOff: ReturnType<typeof vi.fn>;
  let stageListeners: Record<string, (() => void)[]>;
  let nodeListeners: Record<string, (() => void)[]>;
  let mockStage: Konva.Stage;
  let mockNode: Konva.Node;
  let overlayElement: HTMLDivElement;
  let applyStyle: ApplyOverlayStyleFn;

  beforeEach(() => {
    stageListeners = {};
    nodeListeners = {};
    stageOn = vi.fn((events: string, handler: () => void) => {
      for (const e of events.split(' ')) {
        if (!stageListeners[e]) {
          stageListeners[e] = [];
        }
        stageListeners[e].push(handler);
      }
    });
    stageOff = vi.fn((events: string, handler: () => void) => {
      for (const e of events.split(' ')) {
        if (stageListeners[e]) {
          stageListeners[e] = stageListeners[e].filter((h) => h !== handler);
        }
      }
    });
    nodeOn = vi.fn((events: string, handler: () => void) => {
      for (const e of events.split(' ')) {
        if (!nodeListeners[e]) {
          nodeListeners[e] = [];
        }
        nodeListeners[e].push(handler);
      }
    });
    nodeOff = vi.fn((events: string, handler: () => void) => {
      for (const e of events.split(' ')) {
        if (nodeListeners[e]) {
          nodeListeners[e] = nodeListeners[e].filter((h) => h !== handler);
        }
      }
    });

    mockStage = {
      on: stageOn,
      off: stageOff,
    } as unknown as Konva.Stage;

    mockNode = {
      on: nodeOn,
      off: nodeOff,
      getAbsoluteTransform: vi.fn(() => ({ point: (p: { x: number; y: number }) => p })),
    } as unknown as Konva.Node;

    overlayElement = document.createElement('div');
    document.body.appendChild(overlayElement);

    applyStyle = vi.fn<ApplyOverlayStyleFn>();
  });

  afterEach(() => {
    if (document.body.contains(overlayElement)) {
      document.body.removeChild(overlayElement);
    }
    vi.clearAllMocks();
  });

  it('attaches stage and node change listeners on call', () => {
    attachOverlayRepositionLifecycle({
      stage: mockStage,
      node: mockNode,
      localCorners: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }],
      overlayElement,
      applyStyle,
    });

    expect(stageOn).toHaveBeenCalled();
    expect(nodeOn).toHaveBeenCalled();
  });

  it('calls applyStyle when stage change event fires', () => {
    vi.mocked(getOverlayRectFromLocalCorners).mockReturnValue(mockRectAfterChange);

    attachOverlayRepositionLifecycle({
      stage: mockStage,
      node: mockNode,
      localCorners: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }],
      overlayElement,
      applyStyle,
    });

    const stageHandler = stageListeners['xChange']?.[0];
    expect(stageHandler).toBeDefined();
    stageHandler?.();

    expect(applyStyle).toHaveBeenCalledWith(overlayElement, mockRectAfterChange);
  });

  it('calls applyStyle when node change event fires', () => {
    vi.mocked(getOverlayRectFromLocalCorners).mockReturnValue(mockRectAfterChange);

    attachOverlayRepositionLifecycle({
      stage: mockStage,
      node: mockNode,
      localCorners: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }],
      overlayElement,
      applyStyle,
    });

    const nodeHandler = nodeListeners['rotationChange']?.[0];
    expect(nodeHandler).toBeDefined();
    nodeHandler?.();

    expect(applyStyle).toHaveBeenCalledWith(overlayElement, mockRectAfterChange);
  });

  it('returns cleanup that removes listeners', () => {
    const cleanup = attachOverlayRepositionLifecycle({
      stage: mockStage,
      node: mockNode,
      localCorners: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }],
      overlayElement,
      applyStyle,
    });

    expect(stageOn).toHaveBeenCalled();
    expect(nodeOn).toHaveBeenCalled();

    cleanup();

    expect(stageOff).toHaveBeenCalled();
    expect(nodeOff).toHaveBeenCalled();
  });

  it('does not call applyStyle when overlay element is detached from document', () => {
    document.body.removeChild(overlayElement);

    attachOverlayRepositionLifecycle({
      stage: mockStage,
      node: mockNode,
      localCorners: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }],
      overlayElement,
      applyStyle,
    });

    const stageHandler = stageListeners['xChange']?.[0];
    stageHandler?.();

    expect(applyStyle).not.toHaveBeenCalled();
  });
});

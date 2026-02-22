import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import Konva from 'konva';
import type { IManagedNode } from '@/canvas/KonvaNodeManager';
import {
  createTextEditController,
  type ITextEditControllerConfig,
  type ITextEditNodeManager,
} from '@/canvas/events/TextEditController';
import type { IBoardObject } from '@/types';

const mockRect = { left: 0, top: 0, width: 100, height: 50, avgScale: 1 };

vi.mock('@/lib/canvasOverlayPosition', () => ({
  getOverlayRectFromLocalCorners: vi.fn(() => mockRect),
}));

const mockCleanup = vi.fn();
vi.mock('@/lib/canvasTextEditOverlay', () => ({
  attachOverlayRepositionLifecycle: vi.fn(() => mockCleanup),
}));

function makeStickyObject(id: string, text: string): IBoardObject {
  const ts = Timestamp.now();
  return {
    id,
    type: 'sticky',
    x: 0,
    y: 0,
    width: 120,
    height: 80,
    rotation: 0,
    fill: '#fff',
    text,
    fontSize: 14,
    createdBy: 'test',
    createdAt: ts,
    updatedAt: ts,
  };
}

function makeManagedSticky(id: string, text: string): IManagedNode {
  const root = {
    getAbsoluteTransform: vi.fn(() => ({
      point: (p: { x: number; y: number }) => ({ x: p.x, y: p.y }),
    })),
  };
  return {
    id,
    type: 'sticky',
    nodes: { root: root as unknown as Konva.Group, parts: {}, cacheable: true },
    lastObj: makeStickyObject(id, text),
    currentLayer: 'static',
    isCached: false,
    isEditing: false,
  };
}

function createNodeManagerMock(managed: IManagedNode | undefined): ITextEditNodeManager {
  const getNode = vi.fn(() => managed);
  const setEditingState = vi.fn();
  return { getNode, setEditingState };
}

function createConfig(
  overrides: Partial<ITextEditControllerConfig> = {}
): ITextEditControllerConfig {
  const managed = makeManagedSticky('obj-1', 'Hello');
  const nodeManager = createNodeManagerMock(managed);
  const stage = { on: vi.fn(), off: vi.fn(), scaleX: () => 1, scaleY: () => 1 } as unknown as Konva.Stage;
  return {
    nodeManager,
    getStage: vi.fn(() => stage),
    onObjectUpdate: vi.fn(),
    queueObjectUpdate: vi.fn(),
    ...overrides,
  };
}

describe('TextEditController', () => {
  let config: ITextEditControllerConfig;
  let controller: ReturnType<typeof createTextEditController>;

  beforeEach(() => {
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((cb: () => void) => {
        cb();
        return 1;
      })
    );
    config = createConfig();
    controller = createTextEditController(config);
    mockCleanup.mockClear();
  });

  afterEach(() => {
    controller.close();
    vi.unstubAllGlobals();
  });

  it('open with valid id calls setEditingState(objectId, true) and creates overlay in document', () => {
    controller.open('obj-1');
    expect(config.nodeManager.setEditingState).toHaveBeenCalledWith('obj-1', true);
    const overlay = document.body.querySelector('.sticky-note-edit-overlay');
    expect(overlay).not.toBeNull();
    expect((overlay as HTMLTextAreaElement).value).toBe('Hello');
  });

  it('open with non-editable type does not call setEditingState and does not create overlay', () => {
    const managed = makeManagedSticky('obj-1', 'Hi');
    managed.type = 'rectangle';
    config = createConfig({
      nodeManager: createNodeManagerMock(managed),
    });
    controller = createTextEditController(config);
    controller.open('obj-1');
    expect(config.nodeManager.setEditingState).not.toHaveBeenCalled();
    expect(document.body.querySelector('.sticky-note-edit-overlay')).toBeNull();
  });

  it('open when getNode returns undefined does not call setEditingState', () => {
    config = createConfig({
      nodeManager: createNodeManagerMock(undefined),
    });
    controller = createTextEditController(config);
    controller.open('obj-1');
    expect(config.nodeManager.setEditingState).not.toHaveBeenCalled();
  });

  it('close clears editing state and removes overlay', () => {
    controller.open('obj-1');
    expect(config.nodeManager.setEditingState).toHaveBeenCalledWith('obj-1', true);
    (config.nodeManager.setEditingState as ReturnType<typeof vi.fn>).mockClear();
    controller.close();
    expect(config.nodeManager.setEditingState).toHaveBeenCalledWith('obj-1', false);
    expect(document.body.querySelector('.sticky-note-edit-overlay')).toBeNull();
    expect(mockCleanup).toHaveBeenCalled();
  });

  it('commit on Enter calls queueObjectUpdate and setEditingState(false)', () => {
    controller.open('obj-1');
    const overlay = document.body.querySelector('.sticky-note-edit-overlay') as HTMLTextAreaElement;
    expect(overlay).not.toBeNull();
    overlay.value = 'Updated text';
    (config.nodeManager.setEditingState as ReturnType<typeof vi.fn>).mockClear();
    overlay.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', shiftKey: false, bubbles: true })
    );
    expect(config.queueObjectUpdate).toHaveBeenCalledWith('obj-1', { text: 'Updated text' });
    expect(config.nodeManager.setEditingState).toHaveBeenCalledWith('obj-1', false);
  });

  it('Escape closes without calling queueObjectUpdate', () => {
    controller.open('obj-1');
    const overlay = document.body.querySelector('.sticky-note-edit-overlay') as HTMLTextAreaElement;
    overlay.value = 'Changed';
    overlay.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    );
    expect(config.queueObjectUpdate).not.toHaveBeenCalled();
    expect(config.nodeManager.setEditingState).toHaveBeenCalledWith('obj-1', false);
  });

  it('open when getStage returns null does not call setEditingState and does not create overlay', () => {
    config = createConfig({ getStage: vi.fn(() => null) });
    controller = createTextEditController(config);
    controller.open('obj-1');
    expect(config.nodeManager.setEditingState).not.toHaveBeenCalled();
    expect(document.body.querySelector('.sticky-note-edit-overlay')).toBeNull();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as dragCommit from '@/canvas/drag/dragCommit';
import * as alignmentEngine from '@/canvas/drag/alignmentEngine';
import * as dragBounds from '@/canvas/drag/dragBounds';
import { createDragCoordinator } from '@/canvas/drag/DragCoordinator';
import type { IDragCoordinatorConfig } from '@/canvas/drag/DragCoordinator';
import type { IAlignmentCandidate } from '@/types';
import Konva from 'konva';

describe('DragCoordinator', () => {
  const mockOverlayManager = { updateGuides: vi.fn() };
  const config: IDragCoordinatorConfig = {
    overlayManager: mockOverlayManager,
    snapToGridEnabled: () => true,
    onObjectUpdate: vi.fn(),
    onObjectsUpdate: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(dragCommit, 'selectObject');
    vi.spyOn(dragCommit, 'commitDragEnd');
    vi.spyOn(dragCommit, 'handleSelectionDragStart');
    vi.spyOn(dragCommit, 'handleSelectionDragMove').mockImplementation(() => {});
    vi.spyOn(dragCommit, 'handleSelectionDragEnd');
    vi.spyOn(alignmentEngine, 'onDragMove').mockImplementation(() => {});
    vi.spyOn(dragBounds, 'createDragBoundFunc');
  });

  it('returns an object with all coordinator methods', () => {
    const coordinator = createDragCoordinator(config);
    expect(coordinator.selectObject).toBeDefined();
    expect(coordinator.onDragMove).toBeDefined();
    expect(coordinator.commitDragEnd).toBeDefined();
    expect(coordinator.createDragBoundFunc).toBeDefined();
    expect(coordinator.handleSelectionDragStart).toBeDefined();
    expect(coordinator.handleSelectionDragMove).toBeDefined();
    expect(coordinator.handleSelectionDragEnd).toBeDefined();
  });

  it('selectObject delegates to dragCommit.selectObject with same args', () => {
    const coordinator = createDragCoordinator(config);
    coordinator.selectObject('obj1', true);
    expect(dragCommit.selectObject).toHaveBeenCalledWith('obj1', true);
  });

  it('onDragMove delegates to alignmentEngine.onDragMove with event, candidates, and overlayManager', () => {
    const coordinator = createDragCoordinator(config);
    const fakeEvent = { target: {} } as Konva.KonvaEventObject<DragEvent>;
    const candidates: IAlignmentCandidate[] = [
      { id: 'c1', bounds: { x1: 0, y1: 0, x2: 10, y2: 10 }, positions: { v: [], h: [] } },
    ];
    coordinator.onDragMove(fakeEvent, candidates);
    expect(alignmentEngine.onDragMove).toHaveBeenCalledWith(
      fakeEvent,
      candidates,
      mockOverlayManager
    );
  });

  it('commitDragEnd delegates to dragCommit.commitDragEnd with correct args', () => {
    const coordinator = createDragCoordinator(config);
    const objectsRecord: Record<string, never> = {};
    const frames: never[] = [];
    const childIndex = new Map<string, Set<string>>();
    coordinator.commitDragEnd('obj1', 100, 200, objectsRecord, frames, childIndex);
    expect(dragCommit.commitDragEnd).toHaveBeenCalledWith(
      'obj1',
      100,
      200,
      config,
      objectsRecord,
      frames,
      childIndex
    );
  });

  it('createDragBoundFunc delegates to dragBounds.createDragBoundFunc and returns a function', () => {
    const coordinator = createDragCoordinator(config);
    const fn = coordinator.createDragBoundFunc('obj1');
    expect(dragBounds.createDragBoundFunc).toHaveBeenCalledWith('obj1', config);
    expect(typeof fn).toBe('function');
  });

  it('handleSelectionDragStart delegates to dragCommit.handleSelectionDragStart', () => {
    const coordinator = createDragCoordinator(config);
    const bounds = { x1: 0, y1: 0, x2: 100, y2: 100 };
    const objectsRecord: Record<string, never> = {};
    const childIndex = new Map<string, Set<string>>();
    coordinator.handleSelectionDragStart(bounds, objectsRecord, childIndex);
    expect(dragCommit.handleSelectionDragStart).toHaveBeenCalledWith(
      bounds,
      objectsRecord,
      childIndex
    );
  });

  it('handleSelectionDragMove delegates to dragCommit.handleSelectionDragMove', () => {
    const coordinator = createDragCoordinator(config);
    const fakeEvent = { target: {} } as Konva.KonvaEventObject<DragEvent>;
    const initialBounds = { x1: 0, y1: 0, x2: 100, y2: 100 };
    coordinator.handleSelectionDragMove(fakeEvent, initialBounds);
    expect(dragCommit.handleSelectionDragMove).toHaveBeenCalledWith(
      fakeEvent,
      initialBounds
    );
  });

  it('handleSelectionDragEnd delegates to dragCommit.handleSelectionDragEnd', () => {
    const coordinator = createDragCoordinator(config);
    const initialBounds = { x1: 0, y1: 0, x2: 100, y2: 100 };
    const objectsRecord: Record<string, never> = {};
    const frames: never[] = [];
    const childIndex = new Map<string, Set<string>>();
    coordinator.handleSelectionDragEnd(
      initialBounds,
      objectsRecord,
      frames,
      childIndex
    );
    expect(dragCommit.handleSelectionDragEnd).toHaveBeenCalledWith(
      initialBounds,
      config,
      objectsRecord,
      frames,
      childIndex
    );
  });
});

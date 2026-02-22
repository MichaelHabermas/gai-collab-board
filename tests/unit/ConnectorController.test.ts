import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import type { IBoardObject } from '@/types';
import {
  createConnectorController,
  type IConnectorOverlay,
  type IConnectorControllerConfig,
} from '@/canvas/events/ConnectorController';

const ts = Timestamp.now();

function makeRect(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number
): IBoardObject {
  return {
    id,
    type: 'rectangle',
    x,
    y,
    width,
    height,
    rotation: 0,
    fill: '#fff',
    createdBy: 'test',
    createdAt: ts,
    updatedAt: ts,
  };
}

function createOverlayMock(): IConnectorOverlay & {
  getCalls: () => { highlight: unknown[]; clear: number };
} {
  const highlight = vi.fn();
  const clear = vi.fn();
  return {
    highlightAnchor: highlight,
    clearHighlight: clear,
    getCalls: () => ({ highlight: highlight.mock.calls, clear: clear.mock.calls.length }),
  };
}

function createConfig(
  overrides: Partial<IConnectorControllerConfig> = {}
): IConnectorControllerConfig {
  const overlay = createOverlayMock();
  const objectsRecord: Record<string, IBoardObject> = {
    a: makeRect('a', 0, 0, 100, 50),
    b: makeRect('b', 200, 0, 100, 50),
  };
  return {
    overlay,
    getObjectsRecord: () => objectsRecord,
    getColor: vi.fn(() => '#333'),
    onObjectCreate: vi.fn().mockResolvedValue({ id: 'conn-1', type: 'connector' } as IBoardObject),
    setActiveTool: vi.fn(),
    ...overrides,
  };
}

describe('ConnectorController', () => {
  let overlay: ReturnType<typeof createOverlayMock>;
  let config: IConnectorControllerConfig;
  let controller: ReturnType<typeof createConnectorController>;

  beforeEach(() => {
    overlay = createOverlayMock();
    config = createConfig({ overlay });
    controller = createConnectorController(config);
  });

  it('first click calls overlay.highlightAnchor and does not call onObjectCreate', () => {
    controller.onConnectorNodeClick('a', 'top');
    expect(overlay.highlightAnchor).toHaveBeenCalledTimes(1);
    expect(overlay.highlightAnchor).toHaveBeenCalledWith('a', 'top');
    expect(config.onObjectCreate).not.toHaveBeenCalled();
  });

  it('second click on same shape clears and does not call onObjectCreate', () => {
    controller.onConnectorNodeClick('a', 'top');
    (overlay.highlightAnchor as ReturnType<typeof vi.fn>).mockClear();
    controller.onConnectorNodeClick('a', 'right');
    expect(overlay.clearHighlight).toHaveBeenCalledTimes(1);
    expect(config.onObjectCreate).not.toHaveBeenCalled();
  });

  it('second click on different shape calls onObjectCreate with connector params then setActiveTool', async () => {
    controller.onConnectorNodeClick('a', 'right');
    controller.onConnectorNodeClick('b', 'left');
    await Promise.resolve();

    expect(config.onObjectCreate).toHaveBeenCalledTimes(1);
    const call = (config.onObjectCreate as ReturnType<typeof vi.fn>).mock.calls[0];
    const params = call?.[0];
    expect(params).toBeDefined();
    expect(params?.type).toBe('connector');
    expect(params?.fromObjectId).toBe('a');
    expect(params?.toObjectId).toBe('b');
    expect(params?.fromAnchor).toBe('right');
    expect(params?.toAnchor).toBe('left');
    expect(params?.stroke).toBe('#333');
    expect(params?.points).toHaveLength(4);
    expect(config.setActiveTool).toHaveBeenCalledWith('select');
  });

  it('clearConnector calls overlay.clearHighlight', () => {
    controller.onConnectorNodeClick('a', 'top');
    (overlay.clearHighlight as ReturnType<typeof vi.fn>).mockClear();
    controller.clearConnector();
    expect(overlay.clearHighlight).toHaveBeenCalledTimes(1);
  });

  it('when toObj is missing, clears and does not call onObjectCreate', () => {
    const emptyRecord: Record<string, IBoardObject> = { a: makeRect('a', 0, 0, 100, 50) };
    config = createConfig({
      overlay,
      getObjectsRecord: () => emptyRecord,
    });
    controller = createConnectorController(config);
    controller.onConnectorNodeClick('a', 'top');
    controller.onConnectorNodeClick('nonexistent', 'left');
    expect(config.onObjectCreate).not.toHaveBeenCalled();
  });

  it('onObjectCreate reject clears and does not call setActiveTool', async () => {
    config = createConfig({
      overlay,
      onObjectCreate: vi.fn().mockRejectedValue(new Error('create failed')),
    });
    controller = createConnectorController(config);
    controller.onConnectorNodeClick('a', 'top');
    controller.onConnectorNodeClick('b', 'left');
    await Promise.resolve();
    expect(config.setActiveTool).not.toHaveBeenCalled();
  });
});

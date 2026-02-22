import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IBoardObject } from '@/types';
import {
  createDrawingController,
  type IDrawingOverlay,
  type IDrawingControllerConfig,
} from '@/canvas/events/DrawingController';

function createOverlayMock(): IDrawingOverlay & {
  getCalls: () => { show: unknown[]; update: unknown[]; hide: number };
} {
  const show = vi.fn();
  const update = vi.fn();
  const hide = vi.fn();
  return {
    showDrawingPreview: show,
    updateDrawingPreview: update,
    hideDrawingPreview: hide,
    getCalls: () => ({ show: show.mock.calls, update: update.mock.calls, hide: hide.mock.calls.length }),
  };
}

function createConfig(overrides: Partial<IDrawingControllerConfig> = {}): IDrawingControllerConfig {
  const overlay = createOverlayMock();
  return {
    overlay,
    getTool: vi.fn(() => 'rectangle' as const),
    getColor: vi.fn(() => '#93c5fd'),
    onCreate: vi.fn().mockResolvedValue({ id: 'new-1', type: 'rectangle' } as IBoardObject),
    onSuccess: vi.fn(),
    ...overrides,
  };
}

describe('DrawingController', () => {
  let overlay: ReturnType<typeof createOverlayMock>;
  let config: IDrawingControllerConfig;
  let controller: ReturnType<typeof createDrawingController>;

  beforeEach(() => {
    overlay = createOverlayMock();
    config = createConfig({ overlay });
    controller = createDrawingController(config);
  });

  it('calls overlay.showDrawingPreview on start with tool and color', () => {
    (config.getTool as ReturnType<typeof vi.fn>).mockReturnValue('rectangle');
    (config.getColor as ReturnType<typeof vi.fn>).mockReturnValue('#abc');
    controller.onDrawStart({ x: 10, y: 20 });
    expect(overlay.showDrawingPreview).toHaveBeenCalledTimes(1);
    expect(overlay.showDrawingPreview).toHaveBeenCalledWith('rectangle', '#abc');
  });

  it('calls overlay.updateDrawingPreview on move with state, tool, color', () => {
    controller.onDrawStart({ x: 10, y: 20 });
    (config.getTool as ReturnType<typeof vi.fn>).mockReturnValue('circle');
    (config.getColor as ReturnType<typeof vi.fn>).mockReturnValue('#def');
    controller.onDrawMove({ x: 50, y: 60 });
    expect(overlay.updateDrawingPreview).toHaveBeenCalledTimes(1);
    expect(overlay.updateDrawingPreview).toHaveBeenCalledWith(
      { startX: 10, startY: 20, currentX: 50, currentY: 60 },
      'circle',
      '#def'
    );
  });

  it('calls overlay.hideDrawingPreview on end and does not call onCreate when no start', () => {
    controller.onDrawEnd();
    expect(overlay.hideDrawingPreview).toHaveBeenCalledTimes(1);
    expect(config.onCreate).not.toHaveBeenCalled();
  });

  it('calls overlay.hideDrawingPreview on end and does not call onCreate when size < 5px', async () => {
    controller.onDrawStart({ x: 10, y: 20 });
    controller.onDrawMove({ x: 12, y: 22 });
    await controller.onDrawEnd();
    expect(overlay.hideDrawingPreview).toHaveBeenCalledTimes(1);
    expect(config.onCreate).not.toHaveBeenCalled();
  });

  it('calls onCreate and onSuccess when size >= 5px and tool is rectangle', async () => {
    (config.getTool as ReturnType<typeof vi.fn>).mockReturnValue('rectangle');
    (config.getColor as ReturnType<typeof vi.fn>).mockReturnValue('#fill');
    controller.onDrawStart({ x: 10, y: 20 });
    controller.onDrawMove({ x: 40, y: 50 });
    await controller.onDrawEnd();
    expect(overlay.hideDrawingPreview).toHaveBeenCalledTimes(1);
    expect(config.onCreate).toHaveBeenCalledTimes(1);
    expect(config.onCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'rectangle',
        x: 10,
        y: 20,
        width: 30,
        height: 30,
        fill: '#fill',
      })
    );
    expect(config.onSuccess).toHaveBeenCalledTimes(1);
  });

  it('does not call onSuccess when onCreate returns null', async () => {
    (config.onCreate as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    controller.onDrawStart({ x: 0, y: 0 });
    controller.onDrawMove({ x: 20, y: 20 });
    await controller.onDrawEnd();
    expect(config.onCreate).toHaveBeenCalledTimes(1);
    expect(config.onSuccess).not.toHaveBeenCalled();
  });

  it('does not call onCreate when move was never called (zero size)', async () => {
    controller.onDrawStart({ x: 10, y: 20 });
    await controller.onDrawEnd();
    expect(overlay.hideDrawingPreview).toHaveBeenCalledTimes(1);
    expect(config.onCreate).not.toHaveBeenCalled();
  });
});

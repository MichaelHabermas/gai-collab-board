import Konva from 'konva';
import { useDragOffsetStore } from '@/stores/dragOffsetStore';
import type { IGroupDragOffset } from '@/types/canvas';
import type { IBounds, IKonvaDragEvent } from '@/types';

export interface ISelectionDragHandleConfig {
  layer: Konva.Layer;
  scheduleBatchDraw: (layer: Konva.Layer) => void;
  onDragStart: () => void;
  onDragMove: (event: IKonvaDragEvent) => void;
  onDragEnd: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export class SelectionDragHandle {
  private readonly layer: Konva.Layer;
  private readonly scheduleBatchDraw: (layer: Konva.Layer) => void;
  private readonly rect: Konva.Rect;
  private bounds: IBounds | null = null;
  private groupDragOffset: IGroupDragOffset | null = null;
  private unsubDragOffset: (() => void) | null = null;

  constructor(config: ISelectionDragHandleConfig) {
    this.layer = config.layer;
    this.scheduleBatchDraw = config.scheduleBatchDraw;
    this.rect = new Konva.Rect({
      name: 'selection-drag-handle',
      fill: 'transparent',
      draggable: true,
      listening: true,
    });

    this.rect.visible(false);
    this.layer.add(this.rect);

    this.rect.on('dragstart', () => {
      config.onDragStart();
    });

    this.rect.on('dragmove', (event) => {
      config.onDragMove(event);
    });

    this.rect.on('dragend', () => {
      config.onDragEnd();
    });

    this.rect.on('mouseenter', () => {
      config.onMouseEnter();
    });

    this.rect.on('mouseleave', () => {
      config.onMouseLeave();
    });

    this.groupDragOffset = useDragOffsetStore.getState().groupDragOffset;
    this.unsubDragOffset = useDragOffsetStore.subscribe((state) => {
      const offset = state.groupDragOffset;
      if (offset === this.groupDragOffset) {
        return;
      }

      this.groupDragOffset = offset;
      this.syncRect();
    });
  }

  setBounds(bounds: IBounds | null): void {
    this.bounds = bounds;
    this.syncRect();
  }

  destroy(): void {
    if (this.unsubDragOffset) {
      this.unsubDragOffset();
      this.unsubDragOffset = null;
    }

    this.rect.destroy();
  }

  private syncRect(): void {
    const { bounds } = this;
    if (!bounds) {
      this.rect.visible(false);
      this.scheduleBatchDraw(this.layer);

      return;
    }

    const offset = this.groupDragOffset;
    const dx = offset ? offset.dx : 0;
    const dy = offset ? offset.dy : 0;
    const width = Math.max(0, bounds.x2 - bounds.x1);
    const height = Math.max(0, bounds.y2 - bounds.y1);

    this.rect.position({ x: bounds.x1 + dx, y: bounds.y1 + dy });
    this.rect.width(width);
    this.rect.height(height);
    this.rect.visible(true);
    this.scheduleBatchDraw(this.layer);
  }
}

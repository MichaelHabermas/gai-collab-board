import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getWidthHeightFromPoints } from '@/lib/lineTransform';
import { snapPositionToGrid, snapResizeRectToGrid } from '@/lib/snapToGrid';
import type { ITransformEndAttrs } from '@/types';

vi.mock('konva', () => {
  interface ILayerRef {
    batchDraw(): void;
  }

  class MockNode {
    private _id = '';
    private _name = '';
    private readonly _className: string;
    private _scaleX = 1;
    private _scaleY = 1;
    private _x = 0;
    private _y = 0;
    private _width = 0;
    private _height = 0;
    private _rotation = 0;
    private _layer: ILayerRef | null = null;
    private _attrs: Record<string, unknown>;

    constructor(className: string, attrs: Record<string, unknown> = {}) {
      this._className = className;
      this._attrs = { ...attrs };
      if (typeof attrs.id === 'string') {
        this._id = attrs.id;
      }
      if (typeof attrs.name === 'string') {
        this._name = attrs.name;
      }
      if (typeof attrs.scaleX === 'number') {
        this._scaleX = attrs.scaleX;
      }
      if (typeof attrs.scaleY === 'number') {
        this._scaleY = attrs.scaleY;
      }
      if (typeof attrs.x === 'number') {
        this._x = attrs.x;
      }
      if (typeof attrs.y === 'number') {
        this._y = attrs.y;
      }
      if (typeof attrs.width === 'number') {
        this._width = attrs.width;
      }
      if (typeof attrs.height === 'number') {
        this._height = attrs.height;
      }
      if (typeof attrs.rotation === 'number') {
        this._rotation = attrs.rotation;
      }
    }

    id(): string {
      return this._id;
    }

    name(): string {
      return this._name;
    }

    getClassName(): string {
      return this._className;
    }

    scaleX(value?: number): number {
      if (typeof value === 'number') {
        this._scaleX = value;
      }
      return this._scaleX;
    }

    scaleY(value?: number): number {
      if (typeof value === 'number') {
        this._scaleY = value;
      }
      return this._scaleY;
    }

    x(): number {
      return this._x;
    }

    y(): number {
      return this._y;
    }

    width(): number {
      return this._width;
    }

    height(): number {
      return this._height;
    }

    rotation(): number {
      return this._rotation;
    }

    position(pos: { x: number; y: number }): void {
      this._x = pos.x;
      this._y = pos.y;
    }

    getClientRect(_config?: { skipTransform?: boolean }): { width: number; height: number } {
      return { width: this._width, height: this._height };
    }

    setLayer(layer: ILayerRef): void {
      this._layer = layer;
    }

    getLayer(): ILayerRef | null {
      return this._layer;
    }

    getAttrs(): Record<string, unknown> {
      return this._attrs;
    }

    destroy(): void {}
  }

  class MockLayer extends MockNode {
    private readonly children: MockNode[] = [];

    constructor(attrs: Record<string, unknown> = {}) {
      super('Layer', attrs);
    }

    add(node: MockNode): MockLayer {
      node.setLayer(this);
      this.children.push(node);
      return this;
    }

    getChildren(): MockNode[] {
      return [...this.children];
    }

    findOne(selector: string): MockNode | null {
      if (!selector.startsWith('#')) {
        return null;
      }
      const id = selector.slice(1);
      for (const child of this.children) {
        if (child.id() === id) {
          return child;
        }
      }
      return null;
    }

    batchDraw(): void {}
  }

  class MockRect extends MockNode {
    constructor(attrs: Record<string, unknown> = {}) {
      super('Rect', attrs);
    }
  }

  class MockEllipse extends MockNode {
    private _radiusX = 0;
    private _radiusY = 0;

    constructor(attrs: Record<string, unknown> = {}) {
      super('Ellipse', attrs);
      if (typeof attrs.radiusX === 'number') {
        this._radiusX = attrs.radiusX;
      }
      if (typeof attrs.radiusY === 'number') {
        this._radiusY = attrs.radiusY;
      }
    }

    radiusX(): number {
      return this._radiusX;
    }

    radiusY(): number {
      return this._radiusY;
    }
  }

  class MockLine extends MockNode {
    private _points: number[] = [];

    constructor(attrs: Record<string, unknown> = {}) {
      super('Line', attrs);
      const points = attrs.points;
      if (Array.isArray(points)) {
        const numericPoints: number[] = [];
        for (const value of points) {
          if (typeof value === 'number') {
            numericPoints.push(value);
          }
        }
        this._points = numericPoints;
      }
    }

    points(): number[] {
      return this._points;
    }
  }

  class MockArrow extends MockNode {
    private _points: number[] = [];

    constructor(attrs: Record<string, unknown> = {}) {
      super('Arrow', attrs);
      const points = attrs.points;
      if (Array.isArray(points)) {
        const numericPoints: number[] = [];
        for (const value of points) {
          if (typeof value === 'number') {
            numericPoints.push(value);
          }
        }
        this._points = numericPoints;
      }
    }

    points(): number[] {
      return this._points;
    }
  }

  class MockGroup extends MockNode {
    private readonly children: MockNode[] = [];

    constructor(attrs: Record<string, unknown> = {}) {
      super('Group', attrs);
    }

    add(node: MockNode): MockGroup {
      this.children.push(node);
      return this;
    }

    findOne(selector: string): MockNode | null {
      if (selector === 'Rect') {
        for (const child of this.children) {
          if (child.getClassName() === 'Rect') {
            return child;
          }
        }
      }
      return null;
    }
  }

  class MockTransformer extends MockNode {
    private nodesList: MockNode[] = [];
    private readonly handlers = new Map<string, Array<() => void>>();

    constructor(attrs: Record<string, unknown> = {}) {
      super('Transformer', attrs);
    }

    nodes(nextNodes?: MockNode[]): MockNode[] {
      if (Array.isArray(nextNodes)) {
        this.nodesList = nextNodes;
      }
      return this.nodesList;
    }

    on(eventName: string, handler: () => void): void {
      const existing = this.handlers.get(eventName) ?? [];
      existing.push(handler);
      this.handlers.set(eventName, existing);
    }

    off(eventName: string, handler: () => void): void {
      const existing = this.handlers.get(eventName);
      if (!existing) {
        return;
      }
      this.handlers.set(
        eventName,
        existing.filter((entry) => entry !== handler)
      );
    }

    fire(eventName: string): void {
      const existing = this.handlers.get(eventName) ?? [];
      for (const handler of existing) {
        handler();
      }
    }
  }

  return {
    default: {
      Layer: MockLayer,
      Transformer: MockTransformer,
      Rect: MockRect,
      Ellipse: MockEllipse,
      Line: MockLine,
      Arrow: MockArrow,
      Group: MockGroup,
    },
  };
});

import Konva from 'konva';
import { TransformerManager } from '@/canvas/TransformerManager';

type TransformUpdateAttrs = ITransformEndAttrs & Partial<{ width: number; height: number }>;

function isTransformerNode(node: Konva.Node): node is Konva.Transformer {
  return node.getClassName() === 'Transformer';
}

function getTransformer(selectionLayer: Konva.Layer): Konva.Transformer {
  const transformer = selectionLayer.getChildren().find(isTransformerNode);
  if (!transformer) {
    throw new Error('Transformer not found');
  }
  return transformer;
}

describe('TransformerManager', () => {
  let selectionLayer: Konva.Layer;
  let activeLayer: Konva.Layer;
  let manager: TransformerManager;

  beforeEach(() => {
    selectionLayer = new Konva.Layer();
    activeLayer = new Konva.Layer();
    manager = new TransformerManager(selectionLayer);
  });

  it('uses exact Transformer config from TransformHandler', () => {
    const transformer = getTransformer(selectionLayer);
    const attrs = transformer.getAttrs();

    expect(attrs.flipEnabled).toBe(false);
    expect(attrs.rotateEnabled).toBe(true);
    expect(attrs.rotationSnapTolerance).toBe(5);
    expect(attrs.anchorSize).toBe(8);
    expect(attrs.anchorCornerRadius).toBe(2);
    expect(attrs.anchorStroke).toBe('#3b82f6');
    expect(attrs.anchorFill).toBe('#ffffff');
    expect(attrs.anchorStrokeWidth).toBe(1);
    expect(attrs.borderStroke).toBe('#3b82f6');
    expect(attrs.borderStrokeWidth).toBe(1);

    const rotationSnaps = attrs.rotationSnaps;
    if (!Array.isArray(rotationSnaps)) {
      throw new Error('rotationSnaps not configured');
    }
    expect(rotationSnaps).toEqual([0, 45, 90, 135, 180, 225, 270, 315]);

    const enabledAnchors = attrs.enabledAnchors;
    if (!Array.isArray(enabledAnchors)) {
      throw new Error('enabledAnchors not configured');
    }
    expect(enabledAnchors).toEqual([
      'top-left',
      'top-center',
      'top-right',
      'middle-right',
      'bottom-right',
      'bottom-center',
      'bottom-left',
      'middle-left',
    ]);

    const borderDash = attrs.borderDash;
    if (!Array.isArray(borderDash)) {
      throw new Error('borderDash not configured');
    }
    expect(borderDash).toEqual([3, 3]);

    const boundBoxFunc = attrs.boundBoxFunc;
    if (typeof boundBoxFunc !== 'function') {
      throw new Error('boundBoxFunc not configured');
    }
    const oldBox = { width: 20, height: 20 };
    const smallBox = { width: 5, height: 20 };
    expect(boundBoxFunc(oldBox, smallBox)).toBe(oldBox);
  });

  it('syncNodes attaches nodes found in active layer', () => {
    const rectNode = new Konva.Rect({ id: 'rect-1', x: 10, y: 20, width: 100, height: 50 });
    const lineNode = new Konva.Line({ id: 'line-1', x: 8, y: 12, points: [0, 0, 100, 50] });
    activeLayer.add(rectNode);
    activeLayer.add(lineNode);

    const batchDrawSpy = vi.spyOn(selectionLayer, 'batchDraw');

    manager.syncNodes(['rect-1', 'line-1'], activeLayer);

    const transformer = getTransformer(selectionLayer);
    expect(transformer.nodes()).toEqual([rectNode, lineNode]);
    expect(batchDrawSpy).toHaveBeenCalledTimes(1);

    manager.syncNodes([], activeLayer);
    expect(transformer.nodes()).toEqual([]);
  });

  it('emits shape-aware attrs on transform end', () => {
    const rectNode = new Konva.Rect({
      id: 'rect-1',
      x: 10,
      y: 20,
      width: 100,
      height: 50,
      rotation: 15,
      scaleX: 2,
      scaleY: 1.5,
    });
    const lineNode = new Konva.Line({
      id: 'line-1',
      x: 8,
      y: 12,
      points: [0, 0, 100, 50],
      rotation: 30,
      scaleX: 2,
      scaleY: 2,
    });
    const arrowNode = new Konva.Arrow({
      id: 'arrow-1',
      x: 8,
      y: 12,
      points: [0, 0, 100, 50],
      rotation: 30,
      scaleX: 2,
      scaleY: 2,
    });
    const stickyGroup = new Konva.Group({
      id: 'sticky-1',
      name: 'shape sticky',
      x: 15,
      y: 25,
      width: 140,
      height: 90,
      rotation: 20,
      scaleX: 1.5,
      scaleY: 2,
    });
    stickyGroup.add(new Konva.Rect({ width: 100, height: 60 }));
    const ellipseNode = new Konva.Ellipse({
      id: 'ellipse-1',
      x: 200,
      y: 120,
      radiusX: 10,
      radiusY: 8,
      rotation: 45,
      scaleX: 0.2,
      scaleY: 0.3,
    });

    activeLayer.add(rectNode);
    activeLayer.add(lineNode);
    activeLayer.add(arrowNode);
    activeLayer.add(stickyGroup);
    activeLayer.add(ellipseNode);

    manager.syncNodes(['rect-1', 'line-1', 'arrow-1', 'sticky-1', 'ellipse-1'], activeLayer);

    const updates: Array<{ id: string; attrs: ITransformEndAttrs }> = [];
    manager.handleTransformEnd((id, attrs) => {
      updates.push({ id, attrs });
    });

    const transformer = getTransformer(selectionLayer);
    transformer.fire('transformend');

    expect(updates).toContainEqual({
      id: 'rect-1',
      attrs: { x: 10, y: 20, width: 200, height: 75, rotation: 15 },
    });
    expect(updates).toContainEqual({
      id: 'line-1',
      attrs: { x: -42, y: -13, points: [-50, -25, 150, 75], rotation: 30 },
    });
    expect(updates).toContainEqual({
      id: 'arrow-1',
      attrs: { x: -42, y: -13, points: [-50, -25, 150, 75], rotation: 30 },
    });
    expect(updates).toContainEqual({
      id: 'sticky-1',
      attrs: { x: 15, y: 25, width: 150, height: 120, rotation: 20 },
    });
    expect(updates).toContainEqual({
      id: 'ellipse-1',
      attrs: { x: 195, y: 115, width: 10, height: 10, rotation: 45 },
    });
  });

  it('supports D28 snapping + line width/height from points', () => {
    const rectNode = new Konva.Rect({
      id: 'rect-1',
      x: 0,
      y: 0,
      width: 115,
      height: 78,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
    });
    const lineNode = new Konva.Line({
      id: 'line-1',
      x: 15,
      y: 38,
      points: [0, 0, 180, 90],
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
    });

    activeLayer.add(rectNode);
    activeLayer.add(lineNode);
    manager.syncNodes(['rect-1', 'line-1'], activeLayer);

    const updates: Array<{ id: string; attrs: TransformUpdateAttrs }> = [];
    const objectsById = new Map<string, { x: number; y: number; width: number; height: number }>([
      ['rect-1', { x: 0, y: 0, width: 100, height: 60 }],
    ]);

    manager.handleTransformEnd((id, attrs) => {
      let nextAttrs: TransformUpdateAttrs = { ...attrs };
      if ('width' in attrs && 'height' in attrs) {
        const object = objectsById.get(id);
        if (object) {
          const snappedRect = snapResizeRectToGrid(
            { x: object.x, y: object.y, width: object.width, height: object.height },
            { x: attrs.x, y: attrs.y, width: attrs.width, height: attrs.height },
            20
          );
          nextAttrs = {
            ...attrs,
            x: snappedRect.x,
            y: snappedRect.y,
            width: snappedRect.width,
            height: snappedRect.height,
          };
        }
      } else if ('points' in attrs) {
        const snapped = snapPositionToGrid(attrs.x, attrs.y, 20);
        const { width, height } = getWidthHeightFromPoints(attrs.points);
        nextAttrs = {
          ...attrs,
          x: snapped.x,
          y: snapped.y,
          width,
          height,
        };
      }
      updates.push({ id, attrs: nextAttrs });
    });

    const transformer = getTransformer(selectionLayer);
    transformer.fire('transformend');

    expect(updates).toContainEqual({
      id: 'rect-1',
      attrs: { x: 0, y: 0, width: 120, height: 80, rotation: 0 },
    });
    expect(updates).toContainEqual({
      id: 'line-1',
      attrs: { x: -80, y: 0, points: [0, 0, 180, 90], rotation: 0, width: 180, height: 90 },
    });
  });
});

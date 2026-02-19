import { render } from '@testing-library/react';
import { forwardRef, useImperativeHandle, type Ref, type RefObject } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type Konva from 'konva';
import { TransformHandler } from '@/components/canvas/TransformHandler';

interface ITransformerProps {
  onTransformEnd?: () => void;
}

let transformerProps: ITransformerProps | null = null;
let transformerNodes: Konva.Node[] = [];
const transformerNodesMock = vi.fn((nextNodes?: Konva.Node[]) => {
  if (nextNodes) {
    transformerNodes = nextNodes;
  }
  return transformerNodes;
});
const requestBatchDrawMock = vi.fn();

vi.mock('react-konva', () => ({
  Transformer: forwardRef((props: ITransformerProps, ref: Ref<unknown>) => {
    transformerProps = props;
    useImperativeHandle(ref, () => ({
      nodes: transformerNodesMock,
      getLayer: () => ({ batchDraw: vi.fn() }),
    }));
    return <div data-testid='transformer-mock' />;
  }),
}));

const createRectNode = (): Konva.Node => {
  let scaleXValue = 2;
  let scaleYValue = 1.5;

  return {
    id: () => 'rect-1',
    getClassName: () => 'Rect',
    scaleX: (value?: number) => {
      if (typeof value === 'number') {
        scaleXValue = value;
      }
      return scaleXValue;
    },
    scaleY: (value?: number) => {
      if (typeof value === 'number') {
        scaleYValue = value;
      }
      return scaleYValue;
    },
    width: () => 100,
    height: () => 50,
    x: () => 10,
    y: () => 20,
    rotation: () => 15,
  } as unknown as Konva.Node;
};

const createLineNode = (): Konva.Node => {
  let scaleXValue = 2;
  let scaleYValue = 2;

  return {
    id: () => 'line-1',
    getClassName: () => 'Line',
    scaleX: (value?: number) => {
      if (typeof value === 'number') {
        scaleXValue = value;
      }
      return scaleXValue;
    },
    scaleY: (value?: number) => {
      if (typeof value === 'number') {
        scaleYValue = value;
      }
      return scaleYValue;
    },
    points: () => [0, 0, 100, 50],
    x: () => 8,
    y: () => 12,
    rotation: () => 30,
  } as unknown as Konva.Node;
};

const createStickyGroupNode = (): Konva.Node => {
  let scaleXValue = 1.5;
  let scaleYValue = 2;

  return {
    id: () => 'sticky-1',
    getClassName: () => 'Group',
    name: () => 'shape sticky',
    scaleX: (value?: number) => {
      if (typeof value === 'number') {
        scaleXValue = value;
      }
      return scaleXValue;
    },
    scaleY: (value?: number) => {
      if (typeof value === 'number') {
        scaleYValue = value;
      }
      return scaleYValue;
    },
    getClientRect: () => ({ width: 140, height: 90 }),
    findOne: (selector: string) =>
      selector === 'Rect'
        ? ({
            getClassName: () => 'Rect',
            width: () => 100,
            height: () => 60,
          } as unknown as Konva.Rect)
        : null,
    x: () => 15,
    y: () => 25,
    rotation: () => 20,
  } as unknown as Konva.Node;
};

const createEllipseNode = (): Konva.Node => {
  let scaleXValue = 0.2;
  let scaleYValue = 0.3;

  return {
    id: () => 'ellipse-1',
    getClassName: () => 'Ellipse',
    scaleX: (value?: number) => {
      if (typeof value === 'number') {
        scaleXValue = value;
      }
      return scaleXValue;
    },
    scaleY: (value?: number) => {
      if (typeof value === 'number') {
        scaleYValue = value;
      }
      return scaleYValue;
    },
    radiusX: () => 10,
    radiusY: () => 8,
    x: () => 200,
    y: () => 120,
    rotation: () => 45,
  } as unknown as Konva.Node;
};

describe('TransformHandler', () => {
  beforeEach(() => {
    transformerProps = null;
    transformerNodes = [];
    transformerNodesMock.mockClear();
    requestBatchDrawMock.mockClear();
  });

  it('attaches transformer only to non-excluded selected nodes', () => {
    const rectNode = createRectNode();
    const lineNode = createLineNode();
    const layerRef = {
      current: {
        findOne: vi.fn((selector: string) => {
          if (selector === '#rect-1') {
            return rectNode;
          }
          if (selector === '#line-1') {
            return lineNode;
          }
          return null;
        }),
      },
    } as unknown as RefObject<Konva.Layer | null>;

    render(
      <TransformHandler
        selectedIds={['rect-1', 'line-1']}
        excludedFromTransformIds={['line-1']}
        layerRef={layerRef}
        requestBatchDraw={requestBatchDrawMock}
      />
    );

    expect(transformerNodesMock).toHaveBeenCalledWith([rectNode]);
    expect(requestBatchDrawMock).toHaveBeenCalledTimes(1);
  });

  it('emits rect-like transform attrs for rect nodes', () => {
    const rectNode = createRectNode();
    const layerRef = {
      current: {
        findOne: vi.fn(() => rectNode),
      },
    } as unknown as RefObject<Konva.Layer | null>;
    const onTransformEnd = vi.fn();

    render(
      <TransformHandler
        selectedIds={['rect-1']}
        layerRef={layerRef}
        requestBatchDraw={requestBatchDrawMock}
        onTransformEnd={onTransformEnd}
      />
    );

    transformerProps?.onTransformEnd?.();

    expect(onTransformEnd).toHaveBeenCalledWith('rect-1', {
      x: 10,
      y: 20,
      width: 200,
      height: 75,
      rotation: 15,
    });
  });

  it('emits line-like transform attrs with length-only scaling for line nodes', () => {
    const lineNode = createLineNode();
    const layerRef = {
      current: {
        findOne: vi.fn(() => lineNode),
      },
    } as unknown as RefObject<Konva.Layer | null>;
    const onTransformEnd = vi.fn();

    render(
      <TransformHandler
        selectedIds={['line-1']}
        layerRef={layerRef}
        requestBatchDraw={requestBatchDrawMock}
        onTransformEnd={onTransformEnd}
      />
    );

    transformerProps?.onTransformEnd?.();

    expect(onTransformEnd).toHaveBeenCalledWith('line-1', {
      x: -42,
      y: -13,
      points: [-50, -25, 150, 75],
      rotation: 30,
    });
  });

  it('handles sticky group transforms using first rect dimensions', () => {
    const stickyNode = createStickyGroupNode();
    const layerRef = {
      current: {
        findOne: vi.fn(() => stickyNode),
      },
    } as unknown as RefObject<Konva.Layer | null>;
    const onTransformEnd = vi.fn();

    render(
      <TransformHandler
        selectedIds={['sticky-1']}
        layerRef={layerRef}
        requestBatchDraw={requestBatchDrawMock}
        onTransformEnd={onTransformEnd}
      />
    );

    transformerProps?.onTransformEnd?.();

    expect(onTransformEnd).toHaveBeenCalledWith('sticky-1', {
      x: 15,
      y: 25,
      width: 150,
      height: 120,
      rotation: 20,
    });
  });

  it('handles ellipse transforms and enforces minimum dimensions', () => {
    const ellipseNode = createEllipseNode();
    const layerRef = {
      current: {
        findOne: vi.fn(() => ellipseNode),
      },
    } as unknown as RefObject<Konva.Layer | null>;
    const onTransformEnd = vi.fn();

    render(
      <TransformHandler
        selectedIds={['ellipse-1']}
        layerRef={layerRef}
        requestBatchDraw={requestBatchDrawMock}
        onTransformEnd={onTransformEnd}
      />
    );

    transformerProps?.onTransformEnd?.();

    expect(onTransformEnd).toHaveBeenCalledWith('ellipse-1', {
      x: 195,
      y: 115,
      width: 10,
      height: 10,
      rotation: 45,
    });
  });
});

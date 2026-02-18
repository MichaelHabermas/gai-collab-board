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
const transformerBatchDrawMock = vi.fn();

vi.mock('react-konva', () => ({
  Transformer: forwardRef((props: ITransformerProps, ref: Ref<unknown>) => {
    transformerProps = props;
    useImperativeHandle(ref, () => ({
      nodes: transformerNodesMock,
      getLayer: () => ({
        batchDraw: transformerBatchDrawMock,
      }),
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

describe('TransformHandler', () => {
  beforeEach(() => {
    transformerProps = null;
    transformerNodes = [];
    transformerNodesMock.mockClear();
    transformerBatchDrawMock.mockClear();
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
      />
    );

    expect(transformerNodesMock).toHaveBeenCalledWith([rectNode]);
    expect(transformerBatchDrawMock).toHaveBeenCalledTimes(1);
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
      <TransformHandler selectedIds={['rect-1']} layerRef={layerRef} onTransformEnd={onTransformEnd} />
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

  it('emits line-like transform attrs for line nodes', () => {
    const lineNode = createLineNode();
    const layerRef = {
      current: {
        findOne: vi.fn(() => lineNode),
      },
    } as unknown as RefObject<Konva.Layer | null>;
    const onTransformEnd = vi.fn();

    render(
      <TransformHandler selectedIds={['line-1']} layerRef={layerRef} onTransformEnd={onTransformEnd} />
    );

    transformerProps?.onTransformEnd?.();

    expect(onTransformEnd).toHaveBeenCalledWith('line-1', {
      x: 8,
      y: 12,
      points: [0, 0, 200, 100],
      rotation: 30,
    });
  });
});

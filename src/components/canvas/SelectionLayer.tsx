import { Rect } from 'react-konva';
import { memo } from 'react';
import type { ReactElement } from 'react';

interface ISelectionRect {
  visible: boolean;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface ISelectionLayerProps {
  selectionRect: ISelectionRect;
}

/**
 * SelectionLayer component - renders the drag-to-select rectangle.
 * Shows a semi-transparent blue rectangle during selection drag.
 */
export const SelectionLayer = memo(
  ({ selectionRect }: ISelectionLayerProps): ReactElement | null => {
    if (!selectionRect.visible) {
      return null;
    }

    const x = Math.min(selectionRect.x1, selectionRect.x2);
    const y = Math.min(selectionRect.y1, selectionRect.y2);
    const width = Math.abs(selectionRect.x2 - selectionRect.x1);
    const height = Math.abs(selectionRect.y2 - selectionRect.y1);

    return (
      <Rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill='rgba(59, 130, 246, 0.1)'
        stroke='#3b82f6'
        strokeWidth={1}
        dash={[4, 4]}
        listening={false}
      />
    );
  }
);

SelectionLayer.displayName = 'SelectionLayer';

export type { ISelectionRect };

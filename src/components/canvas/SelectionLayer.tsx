import { Rect } from 'react-konva';
import { memo, useMemo } from 'react';
import type { ReactElement } from 'react';
import { useTheme } from '@/hooks/useTheme';
import type { ISelectionRect } from '@/types';

interface ISelectionLayerProps {
  selectionRect: ISelectionRect;
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) {
    return `rgba(59, 130, 246, ${alpha})`;
  }
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * SelectionLayer component - renders the drag-to-select rectangle.
 * Shows a semi-transparent primary-colored rectangle during selection drag.
 */
export const SelectionLayer = memo(
  ({ selectionRect }: ISelectionLayerProps): ReactElement | null => {
    const { theme } = useTheme();
    const selectionColor = useMemo(
      () =>
        (typeof document !== 'undefined'
          ? getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim()
          : '') || '#3b82f6',
      [theme]
    );
    const fillColor = useMemo(() => hexToRgba(selectionColor, 0.1), [selectionColor]);

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
        fill={fillColor}
        stroke={selectionColor}
        strokeWidth={1}
        dash={[4, 4]}
        listening={false}
      />
    );
  }
);

SelectionLayer.displayName = 'SelectionLayer';

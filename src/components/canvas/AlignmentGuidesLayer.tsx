import { memo, useMemo, type ReactElement } from 'react';
import { Layer, Line } from 'react-konva';
import { useTheme } from '@/hooks/useTheme';
import type { IAlignmentGuides } from '@/types';

const GUIDE_EXTENT = 50000;
const GUIDE_STROKE_WIDTH = 1;
const GUIDE_DASH = [4, 4];

interface IAlignmentGuidesLayerProps {
  guides: IAlignmentGuides | null;
}

/**
 * Renders temporary alignment guide lines during drag.
 * Lines are in canvas coordinates; layer is non-interactive.
 */
export const AlignmentGuidesLayer = memo(
  ({ guides }: IAlignmentGuidesLayerProps): ReactElement | null => {
    const { theme } = useTheme();
    const guideColor = useMemo(
      () =>
        (typeof document !== 'undefined'
          ? getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim()
          : '') || '#3b82f6',
      [theme]
    );

    if (guides === null) {
      return null;
    }
    const { horizontal, vertical } = guides;
    if (horizontal.length === 0 && vertical.length === 0) {
      return null;
    }

    return (
      <Layer listening={false} name='alignment-guides'>
        {vertical.map((x) => (
          <Line
            key={`v-${x}`}
            points={[x, -GUIDE_EXTENT, x, GUIDE_EXTENT]}
            stroke={guideColor}
            strokeWidth={GUIDE_STROKE_WIDTH}
            dash={GUIDE_DASH}
            listening={false}
          />
        ))}
        {horizontal.map((y) => (
          <Line
            key={`h-${y}`}
            points={[-GUIDE_EXTENT, y, GUIDE_EXTENT, y]}
            stroke={guideColor}
            strokeWidth={GUIDE_STROKE_WIDTH}
            dash={GUIDE_DASH}
            listening={false}
          />
        ))}
      </Layer>
    );
  }
);

AlignmentGuidesLayer.displayName = 'AlignmentGuidesLayer';

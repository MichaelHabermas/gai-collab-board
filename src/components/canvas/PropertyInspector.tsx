import { useMemo, useCallback, type ReactElement } from 'react';
import { useSelection } from '@/contexts/selectionContext';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useDebouncedNumberField } from '@/hooks/useDebouncedNumberField';
import type { IBoardObject } from '@/types';
import type { IUpdateObjectParams } from '@/modules/sync/objectService';

const MIXED_PLACEHOLDER = 'Mixed';
const DEFAULT_STICKY_TEXT_COLOR = '#000000';

interface IPropertyInspectorProps {
  objects: IBoardObject[];
  onObjectUpdate: (objectId: string, updates: IUpdateObjectParams) => Promise<void>;
}

const supportsFill = (type: IBoardObject['type']): boolean => {
  return ['sticky', 'rectangle', 'circle', 'line', 'frame'].includes(type);
};

const supportsStroke = (type: IBoardObject['type']): boolean => {
  return ['rectangle', 'circle', 'line', 'frame', 'connector'].includes(type);
};

const supportsFontSize = (type: IBoardObject['type']): boolean => {
  return ['sticky', 'text'].includes(type);
};

const supportsFontColor = (type: IBoardObject['type']): boolean => {
  return ['sticky', 'text'].includes(type);
};

const getObjectFontColor = (object: IBoardObject, defaultFontColor: string): string => {
  if (object.type === 'sticky') {
    return object.textFill ?? defaultFontColor;
  }

  return object.fill;
};

/**
 * Property inspector panel: shows when at least one object is selected.
 * Displays controls for fill, stroke, stroke width; reserves space for font size and opacity.
 */
export const PropertyInspector = ({
  objects,
  onObjectUpdate,
}: IPropertyInspectorProps): ReactElement | null => {
  const { selectedIds } = useSelection();
  const defaultFontColor = DEFAULT_STICKY_TEXT_COLOR;
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const objectsById = useMemo(() => {
    return new Map(objects.map((obj) => [obj.id, obj]));
  }, [objects]);

  const selectedObjects = useMemo(() => {
    if (selectedIds.length === 0) {
      return [];
    }

    return selectedIds
      .map((id) => objectsById.get(id))
      .filter((obj): obj is IBoardObject => obj !== undefined);
  }, [objectsById, selectedIds]);

  const hasSelection = selectedObjects.length >= 1;
  const showFill = hasSelection && selectedObjects.some((o) => supportsFill(o.type));
  const showStroke = hasSelection && selectedObjects.some((o) => supportsStroke(o.type));
  const showFontSize = hasSelection && selectedObjects.some((o) => supportsFontSize(o.type));
  const showFontColor = hasSelection && selectedObjects.some((o) => supportsFontColor(o.type));

  const fillValue = useMemo(() => {
    if (selectedObjects.length === 0) return '';

    const fills = [
      ...new Set(selectedObjects.filter((o) => supportsFill(o.type)).map((o) => o.fill)),
    ];
    return fills.length === 1 ? (fills[0] ?? '') : MIXED_PLACEHOLDER;
  }, [selectedObjects]);

  const strokeValue = useMemo(() => {
    if (selectedObjects.length === 0) return '';

    const strokes = [
      ...new Set(selectedObjects.filter((o) => supportsStroke(o.type)).map((o) => o.stroke ?? '')),
    ].filter(Boolean);
    if (strokes.length === 0) return '';

    return strokes.length === 1 ? (strokes[0] ?? '') : MIXED_PLACEHOLDER;
  }, [selectedObjects]);

  const strokeWidthValue = useMemo(() => {
    if (selectedObjects.length === 0) return '';

    const widths = [
      ...new Set(
        selectedObjects
          .filter((o) => supportsStroke(o.type))
          .map((o) => (o.strokeWidth != null ? String(o.strokeWidth) : ''))
      ),
    ].filter(Boolean);
    if (widths.length === 0) return '';

    return widths.length === 1 ? (widths[0] ?? '') : MIXED_PLACEHOLDER;
  }, [selectedObjects]);

  const fontSizeValue = useMemo(() => {
    if (selectedObjects.length === 0) return '';

    const textObjects = selectedObjects.filter((o) => supportsFontSize(o.type));
    if (textObjects.length === 0) return '';

    const sizes = [...new Set(textObjects.map((o) => (o.fontSize != null ? o.fontSize : 14)))];
    return sizes.length === 1 ? String(sizes[0]) : MIXED_PLACEHOLDER;
  }, [selectedObjects]);

  const fontColorValue = useMemo(() => {
    if (selectedObjects.length === 0) return '';

    const textObjects = selectedObjects.filter((o) => supportsFontColor(o.type));
    if (textObjects.length === 0) return '';

    const colors = [...new Set(textObjects.map((o) => getObjectFontColor(o, defaultFontColor)))];
    return colors.length === 1 ? (colors[0] ?? '') : MIXED_PLACEHOLDER;
  }, [defaultFontColor, selectedObjects]);

  const opacityValue = useMemo(() => {
    if (selectedObjects.length === 0) return '';

    const opacities = [...new Set(selectedObjects.map((o) => (o.opacity != null ? o.opacity : 1)))];
    return opacities.length === 1
      ? String(Math.round((opacities[0] ?? 1) * 100))
      : MIXED_PLACEHOLDER;
  }, [selectedObjects]);
  const selectedShapeCount = useMemo(() => {
    return objects.reduce((count, obj) => (selectedIdSet.has(obj.id) ? count + 1 : count), 0);
  }, [objects, selectedIdSet]);

  const handleFillChange = (value: string) => {
    if (value === MIXED_PLACEHOLDER || !value) return;

    selectedObjects.forEach((obj) => {
      if (supportsFill(obj.type)) {
        onObjectUpdate(obj.id, { fill: value });
      }
    });
  };

  const handleStrokeChange = (value: string) => {
    if (value === MIXED_PLACEHOLDER || value === '') return;

    selectedObjects.forEach((obj) => {
      if (supportsStroke(obj.type)) {
        onObjectUpdate(obj.id, { stroke: value });
      }
    });
  };

  const handleStrokeWidthCommit = useCallback(
    (num: number) => {
      selectedObjects.forEach((obj) => {
        if (supportsStroke(obj.type)) {
          onObjectUpdate(obj.id, { strokeWidth: num });
        }
      });
    },
    [selectedObjects, onObjectUpdate]
  );

  const handleFontSizeCommit = useCallback(
    (num: number) => {
      selectedObjects.forEach((obj) => {
        if (supportsFontSize(obj.type)) {
          onObjectUpdate(obj.id, { fontSize: num });
        }
      });
    },
    [selectedObjects, onObjectUpdate]
  );

  const strokeWidthField = useDebouncedNumberField(strokeWidthValue, handleStrokeWidthCommit, {
    min: 0,
  });

  const fontSizeField = useDebouncedNumberField(fontSizeValue, handleFontSizeCommit, {
    min: 8,
    max: 72,
  });

  const handleFontColorChange = (value: string) => {
    if (value === MIXED_PLACEHOLDER || value === '') return;

    selectedObjects.forEach((obj) => {
      if (!supportsFontColor(obj.type)) return;

      const updates: IUpdateObjectParams =
        obj.type === 'sticky' ? { textFill: value } : { fill: value };
      onObjectUpdate(obj.id, updates);
    });
  };

  const handleOpacityChange = (value: string) => {
    if (value === MIXED_PLACEHOLDER) return;

    const num = Number(value);
    if (Number.isNaN(num) || num < 0 || num > 100) return;

    const opacity = num / 100;
    selectedObjects.forEach((obj) => {
      onObjectUpdate(obj.id, { opacity });
    });
  };

  if (!hasSelection) {
    return (
      <div
        className='flex flex-col items-center justify-center py-8 text-muted-foreground text-sm'
        data-testid='property-inspector-empty'
      >
        Select one or more objects to edit properties.
      </div>
    );
  }

  return (
    <div
      className='flex h-full min-h-0 flex-1 flex-col gap-4 overflow-auto'
      data-testid='property-inspector-panel'
    >
      <div className='text-xs text-muted-foreground'>
        {selectedShapeCount} object{selectedShapeCount !== 1 ? 's' : ''} selected
      </div>

      {showFill && (
        <div className='space-y-2'>
          <Label htmlFor='property-inspector-fill' className='text-foreground'>
            Fill
          </Label>
          <div className='flex gap-2 items-center'>
            <input
              id='property-inspector-fill'
              type='color'
              value={fillValue === MIXED_PLACEHOLDER ? '#888888' : fillValue}
              onChange={(e) => handleFillChange(e.target.value)}
              disabled={fillValue === MIXED_PLACEHOLDER}
              className='h-9 w-12 rounded border border-border bg-muted cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
              data-testid='property-inspector-fill-color'
            />
            <Input
              value={fillValue}
              onChange={(e) => handleFillChange(e.target.value)}
              disabled={fillValue === MIXED_PLACEHOLDER}
              className='flex-1 font-mono text-sm'
              data-testid='property-inspector-fill-input'
            />
          </div>
        </div>
      )}

      {showStroke && (
        <>
          <div className='space-y-2'>
            <Label htmlFor='property-inspector-stroke' className='text-foreground'>
              Stroke
            </Label>
            <div className='flex gap-2 items-center'>
              <input
                id='property-inspector-stroke'
                type='color'
                value={strokeValue === MIXED_PLACEHOLDER || !strokeValue ? '#000000' : strokeValue}
                onChange={(e) => handleStrokeChange(e.target.value)}
                disabled={strokeValue === MIXED_PLACEHOLDER}
                className='h-9 w-12 rounded border border-border bg-muted cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
                data-testid='property-inspector-stroke-color'
              />
              <Input
                value={strokeValue}
                onChange={(e) => handleStrokeChange(e.target.value)}
                disabled={strokeValue === MIXED_PLACEHOLDER}
                className='flex-1 font-mono text-sm'
                data-testid='property-inspector-stroke-input'
              />
            </div>
          </div>
          <div className='space-y-2'>
            <Label htmlFor='property-inspector-stroke-width' className='text-foreground'>
              Stroke width
            </Label>
            <Input
              id='property-inspector-stroke-width'
              type='number'
              min={0}
              value={strokeWidthField.value}
              onChange={strokeWidthField.onChange}
              onBlur={strokeWidthField.onBlur}
              disabled={strokeWidthValue === MIXED_PLACEHOLDER}
              className='font-mono'
              data-testid='property-inspector-stroke-width'
            />
          </div>
        </>
      )}

      {showFontSize && (
        <div className='space-y-2'>
          <Label htmlFor='property-inspector-font-size' className='text-foreground'>
            Font size
          </Label>
          <Input
            id='property-inspector-font-size'
            type='number'
            min={8}
            max={72}
            value={fontSizeField.value}
            onChange={fontSizeField.onChange}
            onBlur={fontSizeField.onBlur}
            disabled={fontSizeValue === MIXED_PLACEHOLDER}
            className='font-mono'
            data-testid='property-inspector-font-size'
          />
        </div>
      )}

      {showFontColor && (
        <div className='space-y-2'>
          <Label htmlFor='property-inspector-font-color' className='text-foreground'>
            Font color
          </Label>
          <div className='flex gap-2 items-center'>
            <input
              id='property-inspector-font-color'
              type='color'
              value={
                fontColorValue === MIXED_PLACEHOLDER || !fontColorValue
                  ? DEFAULT_STICKY_TEXT_COLOR
                  : fontColorValue
              }
              onChange={(e) => handleFontColorChange(e.target.value)}
              disabled={fontColorValue === MIXED_PLACEHOLDER}
              className='h-9 w-12 rounded border border-border bg-muted cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
              data-testid='property-inspector-font-color-color'
            />
            <Input
              value={fontColorValue}
              onChange={(e) => handleFontColorChange(e.target.value)}
              disabled={fontColorValue === MIXED_PLACEHOLDER}
              className='flex-1 font-mono text-sm'
              data-testid='property-inspector-font-color-input'
            />
          </div>
        </div>
      )}

      {hasSelection && (
        <div className='space-y-2'>
          <Label htmlFor='property-inspector-opacity' className='text-foreground'>
            Opacity
          </Label>
          <div className='flex gap-2 items-center'>
            <input
              id='property-inspector-opacity'
              type='range'
              min={0}
              max={100}
              value={opacityValue === MIXED_PLACEHOLDER ? 100 : Number(opacityValue)}
              onChange={(e) => handleOpacityChange(e.target.value)}
              disabled={opacityValue === MIXED_PLACEHOLDER}
              className='opacity-slider flex-1 h-2.5 min-w-[80px] rounded-full border border-border bg-input appearance-none accent-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50'
              data-testid='property-inspector-opacity-slider'
            />
            <span className='text-xs text-muted-foreground w-10'>
              {opacityValue === MIXED_PLACEHOLDER ? MIXED_PLACEHOLDER : `${opacityValue}%`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

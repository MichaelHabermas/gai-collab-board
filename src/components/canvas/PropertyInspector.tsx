import { useMemo, useCallback, useState, memo, type ReactElement } from 'react';
import { useSelectionStore } from '@/stores/selectionStore';
import { useObjectsStore } from '@/stores/objectsStore';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useDebouncedNumberField } from '@/hooks/useDebouncedNumberField';
import { getFrameChildren } from '@/hooks/useFrameContainment';
import { queueObjectUpdate } from '@/lib/writeQueue';
import type { IBoardObject, ArrowheadMode, StrokeStyle, IUpdateObjectParams } from '@/types';

const MIXED_PLACEHOLDER = 'Mixed';
const DEFAULT_STICKY_TEXT_COLOR = '#000000';
const FRAME_PADDING = 20;

interface IPropertyInspectorProps {
  onObjectUpdate: (objectId: string, updates: IUpdateObjectParams) => Promise<void>;
}

const supportsFill = (type: IBoardObject['type']): boolean => {
  return ['sticky', 'rectangle', 'circle', 'frame'].includes(type);
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

const supportsArrowheads = (type: IBoardObject['type']): boolean => {
  return type === 'connector';
};

const supportsStrokeStyle = (type: IBoardObject['type']): boolean => {
  return type === 'connector';
};

const ARROWHEAD_OPTIONS: { value: ArrowheadMode; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'start', label: 'Start' },
  { value: 'end', label: 'End' },
  { value: 'both', label: 'Both' },
];

const STROKE_STYLE_OPTIONS: { value: StrokeStyle; label: string }[] = [
  { value: 'solid', label: 'Solid' },
  { value: 'dashed', label: 'Dashed' },
  { value: 'dotted', label: 'Dotted' },
];

const getObjectFontColor = (object: IBoardObject, defaultFontColor: string): string => {
  if (object.type === 'sticky') {
    return object.textFill ?? defaultFontColor;
  }

  return object.fill;
};

// ── Frame-specific property panel ──────────────────────────────────

interface IFramePropertiesProps {
  frame: IBoardObject;
  onObjectUpdate: (objectId: string, updates: IUpdateObjectParams) => Promise<void>;
}

const FrameProperties = ({ frame, onObjectUpdate }: IFramePropertiesProps): ReactElement => {
  const frameObjects = useObjectsStore((s) => s.objects);
  const allObjects = useMemo(() => Object.values(frameObjects), [frameObjects]);
  const setSelectedIds = useSelectionStore((s) => s.setSelectedIds);
  const children = useMemo(() => getFrameChildren(frame.id, allObjects), [frame.id, allObjects]);

  // Debounced title input — sync from prop during render (no useEffect)
  const [titleValue, setTitleValue] = useState(frame.text || 'Frame');
  const [prevText, setPrevText] = useState(frame.text);
  if (frame.text !== prevText) {
    setPrevText(frame.text);
    setTitleValue(frame.text || 'Frame');
  }

  const handleTitleBlur = useCallback(() => {
    if (titleValue !== (frame.text || 'Frame')) {
      onObjectUpdate(frame.id, { text: titleValue });
    }
  }, [titleValue, frame.id, frame.text, onObjectUpdate]);

  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onObjectUpdate(frame.id, { text: titleValue });
        (e.target as HTMLInputElement).blur();
      }
    },
    [titleValue, frame.id, onObjectUpdate]
  );

  const handleCornerRadiusCommit = useCallback(
    (num: number) => {
      onObjectUpdate(frame.id, { cornerRadius: Math.max(0, num) });
    },
    [frame.id, onObjectUpdate]
  );

  const cornerRadiusField = useDebouncedNumberField(
    String(frame.cornerRadius ?? 8),
    handleCornerRadiusCommit,
    { min: 0, max: 40 }
  );

  const handleOpacityChange = useCallback(
    (value: string) => {
      const num = Number(value);
      if (Number.isNaN(num) || num < 0 || num > 100) return;

      queueObjectUpdate(frame.id, { opacity: num / 100 });
    },
    [frame.id]
  );

  const handleFillChange = useCallback(
    (value: string) => {
      if (!value) return;

      queueObjectUpdate(frame.id, { fill: value });
    },
    [frame.id]
  );

  const handleStrokeChange = useCallback(
    (value: string) => {
      if (!value) return;

      queueObjectUpdate(frame.id, { stroke: value });
    },
    [frame.id]
  );

  const handleSelectAllChildren = useCallback(() => {
    if (children.length > 0) {
      setSelectedIds(children.map((c) => c.id));
    }
  }, [children, setSelectedIds]);

  const handleResizeToFit = useCallback(() => {
    if (children.length === 0) return;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const child of children) {
      minX = Math.min(minX, child.x);
      minY = Math.min(minY, child.y);
      maxX = Math.max(maxX, child.x + child.width);
      maxY = Math.max(maxY, child.y + child.height);
    }

    onObjectUpdate(frame.id, {
      x: minX - FRAME_PADDING,
      y: minY - FRAME_PADDING - 32, // account for title bar height
      width: maxX - minX + FRAME_PADDING * 2,
      height: maxY - minY + FRAME_PADDING * 2 + 32,
    });
  }, [children, frame.id, onObjectUpdate]);

  const opacityPercent = Math.round((frame.opacity ?? 1) * 100);

  return (
    <div
      className='flex h-full min-h-0 flex-1 flex-col gap-4 overflow-auto'
      data-testid='property-inspector-panel'
    >
      <div className='text-xs font-medium text-foreground'>Frame: {frame.text || 'Frame'}</div>

      {/* Title */}
      <div className='space-y-2'>
        <Label htmlFor='frame-title' className='text-foreground'>
          Title
        </Label>
        <Input
          id='frame-title'
          value={titleValue}
          onChange={(e) => setTitleValue(e.target.value)}
          onBlur={handleTitleBlur}
          onKeyDown={handleTitleKeyDown}
          className='text-sm'
          data-testid='property-inspector-frame-title'
        />
      </div>

      {/* Appearance section */}
      <div className='space-y-3'>
        <div className='text-xs font-medium text-muted-foreground uppercase tracking-wider'>
          Appearance
        </div>

        <div className='space-y-2'>
          <Label htmlFor='frame-fill' className='text-foreground'>
            Fill
          </Label>
          <div className='flex gap-2 items-center'>
            <input
              id='frame-fill'
              type='color'
              value={frame.fill || '#f1f5f9'}
              onChange={(e) => handleFillChange(e.target.value)}
              className='h-9 w-12 rounded border border-border bg-muted cursor-pointer'
              data-testid='property-inspector-fill-color'
            />
            <Input
              value={frame.fill || ''}
              onChange={(e) => handleFillChange(e.target.value)}
              className='flex-1 font-mono text-sm'
              data-testid='property-inspector-fill-input'
            />
          </div>
        </div>

        <div className='space-y-2'>
          <Label htmlFor='frame-border' className='text-foreground'>
            Border
          </Label>
          <div className='flex gap-2 items-center'>
            <input
              id='frame-border'
              type='color'
              value={frame.stroke || '#94a3b8'}
              onChange={(e) => handleStrokeChange(e.target.value)}
              className='h-9 w-12 rounded border border-border bg-muted cursor-pointer'
              data-testid='property-inspector-stroke-color'
            />
            <Input
              value={frame.stroke || ''}
              onChange={(e) => handleStrokeChange(e.target.value)}
              className='flex-1 font-mono text-sm'
              data-testid='property-inspector-stroke-input'
            />
          </div>
        </div>

        <div className='space-y-2'>
          <Label htmlFor='frame-corner-radius' className='text-foreground'>
            Corner radius
          </Label>
          <Input
            id='frame-corner-radius'
            type='number'
            min={0}
            max={40}
            value={cornerRadiusField.value}
            onChange={cornerRadiusField.onChange}
            onBlur={cornerRadiusField.onBlur}
            className='font-mono'
            data-testid='property-inspector-corner-radius'
          />
        </div>

        <div className='space-y-2'>
          <Label htmlFor='frame-opacity' className='text-foreground'>
            Opacity
          </Label>
          <div className='flex gap-2 items-center'>
            <input
              id='frame-opacity'
              type='range'
              min={0}
              max={100}
              value={opacityPercent}
              onChange={(e) => handleOpacityChange(e.target.value)}
              className='opacity-slider flex-1 h-2.5 min-w-[80px] rounded-full border border-border bg-input appearance-none accent-primary'
              data-testid='property-inspector-opacity-slider'
            />
            <span className='text-xs text-muted-foreground w-10'>{opacityPercent}%</span>
          </div>
        </div>
      </div>

      {/* Contents section */}
      <div className='space-y-3'>
        <div className='text-xs font-medium text-muted-foreground uppercase tracking-wider'>
          Contents
        </div>

        <div className='text-sm text-muted-foreground'>
          {children.length} {children.length === 1 ? 'child' : 'children'}
        </div>

        <div className='flex gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={handleSelectAllChildren}
            disabled={children.length === 0}
            className='flex-1 text-xs'
            data-testid='property-inspector-select-children'
          >
            Select All
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={handleResizeToFit}
            disabled={children.length === 0}
            className='flex-1 text-xs'
            data-testid='property-inspector-resize-to-fit'
          >
            Resize to Fit
          </Button>
        </div>
      </div>
    </div>
  );
};

// ── Generic property inspector ─────────────────────────────────────

/**
 * Property inspector panel: shows when at least one object is selected.
 * When a single frame is selected, shows frame-specific controls.
 * Otherwise shows generic fill/stroke/opacity controls.
 */
export const PropertyInspector = memo(function PropertyInspector({
  onObjectUpdate,
}: IPropertyInspectorProps): ReactElement | null {
  const storeObjects = useObjectsStore((s) => s.objects);
  const selectedIds = useSelectionStore((state) => state.selectedIds);
  const defaultFontColor = DEFAULT_STICKY_TEXT_COLOR;

  const selectedObjects = useMemo(() => {
    if (selectedIds.size === 0) {
      return [];
    }

    return [...selectedIds]
      .map((id) => storeObjects[id])
      .filter((obj): obj is IBoardObject => obj !== undefined);
  }, [storeObjects, selectedIds]);

  const hasSelection = selectedObjects.length >= 1;

  // Single frame selected → show frame-specific panel
  const firstSelected = selectedObjects.length === 1 ? selectedObjects[0] : undefined;
  const singleFrame = firstSelected && firstSelected.type === 'frame' ? firstSelected : null;

  const showFill = hasSelection && selectedObjects.some((o) => supportsFill(o.type));
  const showStroke = hasSelection && selectedObjects.some((o) => supportsStroke(o.type));
  const showFontSize = hasSelection && selectedObjects.some((o) => supportsFontSize(o.type));
  const showFontColor = hasSelection && selectedObjects.some((o) => supportsFontColor(o.type));
  const showArrowheads = hasSelection && selectedObjects.some((o) => supportsArrowheads(o.type));
  const showStrokeStyle = hasSelection && selectedObjects.some((o) => supportsStrokeStyle(o.type));

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
  const arrowheadsValue = useMemo(() => {
    if (selectedObjects.length === 0) return '';

    const connectors = selectedObjects.filter((o) => supportsArrowheads(o.type));
    if (connectors.length === 0) return '';

    const values = [...new Set(connectors.map((o) => o.arrowheads ?? 'end'))];
    return values.length === 1 ? (values[0] ?? 'end') : MIXED_PLACEHOLDER;
  }, [selectedObjects]);

  const strokeStyleValue = useMemo(() => {
    if (selectedObjects.length === 0) return '';

    const connectors = selectedObjects.filter((o) => supportsStrokeStyle(o.type));
    if (connectors.length === 0) return '';

    const values = [...new Set(connectors.map((o) => o.strokeStyle ?? 'solid'))];
    return values.length === 1 ? (values[0] ?? 'solid') : MIXED_PLACEHOLDER;
  }, [selectedObjects]);

  const handleFillChange = (value: string) => {
    if (value === MIXED_PLACEHOLDER || !value) return;

    selectedObjects.forEach((obj) => {
      if (supportsFill(obj.type)) {
        queueObjectUpdate(obj.id, { fill: value });
        void onObjectUpdate(obj.id, { fill: value });
      }
    });
  };

  const handleStrokeChange = (value: string) => {
    if (value === MIXED_PLACEHOLDER || value === '') return;

    selectedObjects.forEach((obj) => {
      if (supportsStroke(obj.type)) {
        queueObjectUpdate(obj.id, { stroke: value });
      }
    });
  };

  const handleStrokeWidthCommit = useCallback(
    (num: number) => {
      const clamped = Math.max(1, num);
      selectedObjects.forEach((obj) => {
        if (supportsStroke(obj.type)) {
          onObjectUpdate(obj.id, { strokeWidth: clamped });
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
    min: 1,
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
      queueObjectUpdate(obj.id, updates);
      void onObjectUpdate(obj.id, updates);
    });
  };

  const handleOpacityChange = (value: string) => {
    if (value === MIXED_PLACEHOLDER) return;

    const num = Number(value);
    if (Number.isNaN(num) || num < 0 || num > 100) return;

    const opacity = num / 100;
    selectedObjects.forEach((obj) => {
      queueObjectUpdate(obj.id, { opacity });
      void onObjectUpdate(obj.id, { opacity });
    });
  };

  const handleArrowheadsChange = (value: ArrowheadMode) => {
    selectedObjects.forEach((obj) => {
      if (supportsArrowheads(obj.type)) {
        onObjectUpdate(obj.id, { arrowheads: value });
      }
    });
  };

  const handleStrokeStyleChange = (value: StrokeStyle) => {
    selectedObjects.forEach((obj) => {
      if (supportsStrokeStyle(obj.type)) {
        onObjectUpdate(obj.id, { strokeStyle: value });
      }
    });
  };

  // Single frame → frame-specific panel (placed after all hooks to respect rules-of-hooks)
  if (singleFrame) {
    return <FrameProperties frame={singleFrame} onObjectUpdate={onObjectUpdate} />;
  }

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
        {selectedObjects.length} object{selectedObjects.length !== 1 ? 's' : ''} selected
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
              min={1}
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

      {showArrowheads && (
        <div className='space-y-2'>
          <Label className='text-foreground'>Arrowheads</Label>
          <div className='flex gap-1' data-testid='property-inspector-arrowheads'>
            {ARROWHEAD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type='button'
                onClick={() => handleArrowheadsChange(opt.value)}
                disabled={arrowheadsValue === MIXED_PLACEHOLDER}
                className={`flex-1 rounded px-2 py-1 text-xs border transition-colors ${
                  arrowheadsValue === opt.value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted text-muted-foreground border-border hover:bg-accent'
                }`}
                data-testid={`property-inspector-arrowheads-${opt.value}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {showStrokeStyle && (
        <div className='space-y-2'>
          <Label className='text-foreground'>Line style</Label>
          <div className='flex gap-1' data-testid='property-inspector-stroke-style'>
            {STROKE_STYLE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type='button'
                onClick={() => handleStrokeStyleChange(opt.value)}
                disabled={strokeStyleValue === MIXED_PLACEHOLDER}
                className={`flex-1 rounded px-2 py-1 text-xs border transition-colors ${
                  strokeStyleValue === opt.value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted text-muted-foreground border-border hover:bg-accent'
                }`}
                data-testid={`property-inspector-stroke-style-${opt.value}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
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
});

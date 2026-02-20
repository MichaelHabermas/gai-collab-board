import { memo, type ReactElement } from 'react';
import { Grid3X3, Magnet, Download, Focus, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AlignToolbar } from './AlignToolbar';
import { cn } from '@/lib/utils';
import type { IBoardObject } from '@/types';

// Zoom preset scales (1 = 100%)
const ZOOM_PRESETS = [0.5, 1, 2] as const;

interface ICanvasControlPanelProps {
  showGrid: boolean;
  setShowGrid: (v: boolean) => void;
  snapToGridEnabled: boolean;
  setSnapToGridEnabled: (v: boolean) => void;
  exportViewport: (format: 'png' | 'jpeg') => void;
  exportFullBoard: (objects: IBoardObject[], zoomToFitBounds: (b: { x1: number; y1: number; x2: number; y2: number }) => void, format: 'png' | 'jpeg') => void;
  objects: IBoardObject[];
  zoomToFitBounds: (b: { x1: number; y1: number; x2: number; y2: number }) => void;
  handleZoomToSelection: () => void;
  handleZoomToFitAll: () => void;
  handleZoomPreset: (scale: number) => void;
  selectedIds: ReadonlySet<string>;
  selectedIdsArray: string[];
  visibleCount: number;
  totalCount: number;
  zoomPercent: number;
  onObjectUpdate?: (objectId: string, updates: Partial<IBoardObject>) => void;
  canEdit: boolean;
}

export const CanvasControlPanel = memo(function CanvasControlPanel({
  showGrid,
  setShowGrid,
  snapToGridEnabled,
  setSnapToGridEnabled,
  exportViewport,
  exportFullBoard,
  objects,
  zoomToFitBounds,
  handleZoomToSelection,
  handleZoomToFitAll,
  handleZoomPreset,
  selectedIds,
  selectedIdsArray,
  visibleCount,
  totalCount,
  zoomPercent,
  onObjectUpdate,
  canEdit,
}: ICanvasControlPanelProps): ReactElement {
  return (
    <div className='absolute bottom-4 right-4 flex gap-2 items-center'>
      {/* Grid and snap toggles */}
      <Button
        variant={showGrid ? 'default' : 'ghost'}
        size='icon'
        className={cn(
          'h-9 w-9 rounded-md',
          showGrid
            ? 'bg-primary text-primary-foreground'
            : 'text-card-foreground hover:bg-accent bg-card/80'
        )}
        onClick={() => setShowGrid(!showGrid)}
        title={showGrid ? 'Hide grid' : 'Show grid'}
        data-testid='toggle-show-grid'
      >
        <Grid3X3 className='h-4 w-4' />
      </Button>
      <Button
        variant={snapToGridEnabled ? 'default' : 'ghost'}
        size='icon'
        className={cn(
          'h-9 w-9 rounded-md',
          snapToGridEnabled
            ? 'bg-primary text-primary-foreground'
            : 'text-card-foreground hover:bg-accent bg-card/80'
        )}
        onClick={() => setSnapToGridEnabled(!snapToGridEnabled)}
        title={snapToGridEnabled ? 'Disable snap to grid' : 'Enable snap to grid'}
        data-testid='toggle-snap-to-grid'
      >
        <Magnet className='h-4 w-4' />
      </Button>
      <Button
        variant='ghost'
        size='icon'
        className='h-9 w-9 text-card-foreground hover:bg-accent bg-card/80 rounded-md'
        onClick={() => exportViewport('png')}
        title='Export current view as PNG'
        data-testid='export-viewport-png'
      >
        <Download className='h-4 w-4' />
      </Button>
      <Button
        variant='ghost'
        size='icon'
        className='h-9 w-9 text-card-foreground hover:bg-accent bg-card/80 rounded-md'
        onClick={() => exportFullBoard(objects, zoomToFitBounds, 'png')}
        title='Export full board as PNG'
        data-testid='export-full-board-png'
      >
        <Download className='h-4 w-4' />
      </Button>
      {onObjectUpdate != null && (
        <AlignToolbar
          objects={objects}
          selectedIds={selectedIdsArray}
          onObjectUpdate={onObjectUpdate}
          canEdit={canEdit}
        />
      )}
      {/* Object count (visible/total) */}
      <div
        className='bg-card/80 text-card-foreground px-3 py-1.5 rounded-md text-sm font-medium backdrop-blur-sm'
        data-testid='object-count'
      >
        {visibleCount}/{totalCount}
      </div>
      {/* Zoom to selection */}
      <Button
        variant='ghost'
        size='icon'
        className='h-9 w-9 text-card-foreground hover:bg-accent bg-card/80 rounded-md'
        onClick={handleZoomToSelection}
        disabled={selectedIds.size === 0}
        title='Zoom to selection'
        data-testid='zoom-to-selection'
      >
        <Focus className='h-4 w-4' />
      </Button>
      {/* Zoom to fit all */}
      <Button
        variant='ghost'
        size='icon'
        className='h-9 w-9 text-card-foreground hover:bg-accent bg-card/80 rounded-md'
        onClick={handleZoomToFitAll}
        title='Zoom to fit all'
        data-testid='zoom-to-fit-all'
      >
        <Maximize2 className='h-4 w-4' />
      </Button>
      {/* Zoom presets */}
      {ZOOM_PRESETS.map((scale) => (
        <Button
          key={scale}
          variant='ghost'
          size='sm'
          className='h-9 px-2 text-card-foreground hover:bg-accent bg-card/80 rounded-md text-xs font-medium'
          onClick={() => handleZoomPreset(scale)}
          title={`${scale * 100}%`}
          data-testid={`zoom-preset-${scale * 100}`}
        >
          {scale * 100}%
        </Button>
      ))}
      {/* Zoom indicator */}
      <div
        className='bg-card/80 text-card-foreground px-3 py-1.5 rounded-md text-sm font-medium backdrop-blur-sm'
        data-testid='zoom-indicator'
      >
        {zoomPercent}%
      </div>
    </div>
  );
});

import { memo, useCallback, useMemo, type ReactElement } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignHorizontalSpaceBetween,
  AlignVerticalSpaceBetween,
} from 'lucide-react';
import {
  computeAlignUpdates,
  computeDistributeUpdates,
  type AlignOption,
  type DistributeDirection,
} from '@/lib/alignDistribute';
import type { IBoardObject, ILayoutRect } from '@/types';

interface IAlignToolbarProps {
  selectedObjects: IBoardObject[];
  selectedIds: string[];
  onObjectUpdate: (objectId: string, updates: Partial<IBoardObject>) => void;
  canEdit?: boolean;
}

function toRect(obj: IBoardObject): ILayoutRect {
  return { id: obj.id, x: obj.x, y: obj.y, width: obj.width, height: obj.height };
}

export const AlignToolbar = memo(
  ({
    selectedObjects,
    selectedIds,
    onObjectUpdate,
    canEdit = true,
  }: IAlignToolbarProps): ReactElement => {
    const rects = useMemo(() => selectedObjects.map(toRect), [selectedObjects]);
    const canDistribute = rects.length >= 3;

    const handleAlign = useCallback(
      (alignment: AlignOption) => {
        const updates = computeAlignUpdates(rects, alignment);
        for (const u of updates) {
          const payload: Partial<IBoardObject> = {};
          // x/y can be 0; must use !== undefined so first position is applied
          /* eslint-disable local/prefer-falsy-over-explicit-nullish -- 0 is valid for x/y */
          if (u.x !== undefined) {
            payload.x = u.x;
          }

          if (u.y !== undefined) {
            payload.y = u.y;
          }

          /* eslint-enable local/prefer-falsy-over-explicit-nullish */
          if (Object.keys(payload).length > 0) {
            onObjectUpdate(u.id, payload);
          }
        }
      },
      [rects, onObjectUpdate]
    );

    const handleDistribute = useCallback(
      (direction: DistributeDirection) => {
        const updates = computeDistributeUpdates(rects, direction);
        for (const u of updates) {
          const payload: Partial<IBoardObject> = {};
          // x/y can be 0; must use !== undefined so first position is applied
          /* eslint-disable local/prefer-falsy-over-explicit-nullish -- 0 is valid for x/y */
          if (u.x !== undefined) {
            payload.x = u.x;
          }

          if (u.y !== undefined) {
            payload.y = u.y;
          }

          /* eslint-enable local/prefer-falsy-over-explicit-nullish */
          if (Object.keys(payload).length > 0) {
            onObjectUpdate(u.id, payload);
          }
        }
      },
      [rects, onObjectUpdate]
    );

    if (selectedIds.length < 2 || !canEdit) {
      return <></>;
    }

    return (
      <div
        className='flex items-center gap-0.5 rounded-md border border-slate-600 bg-slate-800/90 p-1'
        role='group'
        aria-label='Align and distribute'
        data-testid='align-toolbar'
      >
        <Button
          variant='ghost'
          size='icon'
          className='h-8 w-8 text-slate-300 hover:text-white hover:bg-slate-700'
          onClick={() => handleAlign('left')}
          title='Align left'
          data-testid='align-toolbar-left'
        >
          <AlignStartHorizontal className='h-4 w-4' />
        </Button>
        <Button
          variant='ghost'
          size='icon'
          className='h-8 w-8 text-slate-300 hover:text-white hover:bg-slate-700'
          onClick={() => handleAlign('center')}
          title='Align center'
          data-testid='align-toolbar-center'
        >
          <AlignCenterHorizontal className='h-4 w-4' />
        </Button>
        <Button
          variant='ghost'
          size='icon'
          className='h-8 w-8 text-slate-300 hover:text-white hover:bg-slate-700'
          onClick={() => handleAlign('right')}
          title='Align right'
          data-testid='align-toolbar-right'
        >
          <AlignEndHorizontal className='h-4 w-4' />
        </Button>
        <div className='mx-0.5 w-px bg-slate-600' aria-hidden />
        <Button
          variant='ghost'
          size='icon'
          className='h-8 w-8 text-slate-300 hover:text-white hover:bg-slate-700'
          onClick={() => handleAlign('top')}
          title='Align top'
          data-testid='align-toolbar-top'
        >
          <AlignStartVertical className='h-4 w-4' />
        </Button>
        <Button
          variant='ghost'
          size='icon'
          className='h-8 w-8 text-slate-300 hover:text-white hover:bg-slate-700'
          onClick={() => handleAlign('middle')}
          title='Align middle'
          data-testid='align-toolbar-middle'
        >
          <AlignCenterVertical className='h-4 w-4' />
        </Button>
        <Button
          variant='ghost'
          size='icon'
          className='h-8 w-8 text-slate-300 hover:text-white hover:bg-slate-700'
          onClick={() => handleAlign('bottom')}
          title='Align bottom'
          data-testid='align-toolbar-bottom'
        >
          <AlignEndVertical className='h-4 w-4' />
        </Button>
        <div className='mx-0.5 w-px bg-slate-600' aria-hidden />
        <Button
          variant='ghost'
          size='icon'
          className='h-8 w-8 text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-50'
          onClick={() => handleDistribute('horizontal')}
          title='Distribute horizontally'
          disabled={!canDistribute}
          data-testid='align-toolbar-distribute-horizontal'
        >
          <AlignHorizontalSpaceBetween className='h-4 w-4' />
        </Button>
        <Button
          variant='ghost'
          size='icon'
          className='h-8 w-8 text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-50'
          onClick={() => handleDistribute('vertical')}
          title='Distribute vertically'
          disabled={!canDistribute}
          data-testid='align-toolbar-distribute-vertical'
        >
          <AlignVerticalSpaceBetween className='h-4 w-4' />
        </Button>
      </div>
    );
  }
);

AlignToolbar.displayName = 'AlignToolbar';

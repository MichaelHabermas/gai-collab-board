import { memo, type ReactElement } from 'react';
import { Wrench } from 'lucide-react';
import { Toolbar } from './Toolbar';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { ToolMode } from '@/types';

interface ICanvasToolbarWrapperProps {
  activeTool: ToolMode;
  onToolChange: (tool: ToolMode) => void;
  activeColor: string;
  onColorChange: (color: string) => void;
  canEdit: boolean;
  mobileToolsOpen: boolean;
  setMobileToolsOpen: (open: boolean) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export const CanvasToolbarWrapper = memo(function CanvasToolbarWrapper({
  activeTool,
  onToolChange,
  activeColor,
  onColorChange,
  canEdit,
  mobileToolsOpen,
  setMobileToolsOpen,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: ICanvasToolbarWrapperProps): ReactElement {
  return (
    <>
      {/* Desktop toolbar: visible from md up */}
      <div className='hidden md:block absolute left-4 top-1/2 -translate-y-1/2 z-20'>
        <Toolbar
          activeTool={activeTool}
          onToolChange={onToolChange}
          activeColor={activeColor}
          onColorChange={onColorChange}
          canEdit={canEdit}
          onUndo={onUndo}
          onRedo={onRedo}
          canUndo={canUndo}
          canRedo={canRedo}
        />
      </div>

      {/* Mobile: floating Tools button + bottom sheet */}
      <div className='md:hidden fixed bottom-6 left-4 z-30'>
        <Button
          size='icon'
          className='h-12 w-12 rounded-full shadow-lg bg-card border border-border text-card-foreground hover:bg-accent'
          onClick={() => setMobileToolsOpen(true)}
          data-testid='toolbar-mobile-toggle'
          title='Tools'
        >
          <Wrench className='h-6 w-6' />
        </Button>
      </div>
      <Dialog open={mobileToolsOpen} onOpenChange={setMobileToolsOpen}>
        <DialogContent
          className='fixed left-0 right-0 bottom-0 top-auto translate-x-0 translate-y-0 max-h-[70vh] w-full rounded-t-xl border-t border-border bg-card/95 p-4'
          data-testid='toolbar-mobile-sheet'
        >
          <Toolbar
            embedded
            activeTool={activeTool}
            onToolChange={onToolChange}
            activeColor={activeColor}
            onColorChange={onColorChange}
            canEdit={canEdit}
          />
        </DialogContent>
      </Dialog>
    </>
  );
});

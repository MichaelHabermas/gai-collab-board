import { type ReactElement, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PanelRightClose, PanelRightOpen, LayoutDashboard, Settings, Bot } from 'lucide-react';
import type { SidebarTab } from '@/hooks/useBoardSettings';

export interface IRightSidebarProps {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
  sidebarTab: SidebarTab;
  setSidebarTab: (v: SidebarTab) => void;
  expandedContent: ReactNode;
}

/**
 * Collapsible right panel: expanded (tabs + content) or collapsed icon rail.
 * State is persisted by the caller (e.g. useBoardSettings).
 */
export const RightSidebar = ({
  sidebarCollapsed,
  setSidebarCollapsed,
  sidebarTab,
  setSidebarTab,
  expandedContent,
}: IRightSidebarProps): ReactElement => {
  return (
    <aside
      className={`shrink-0 border-l border-border bg-card flex flex-col min-h-0 overflow-hidden transition-[width] duration-200 ease-out ${
        sidebarCollapsed ? 'w-14 p-2' : 'w-80 p-2'
      }`}
      data-testid='sidebar'
      aria-expanded={!sidebarCollapsed}
    >
      <Tabs
        value={sidebarTab}
        onValueChange={(value) => {
          if (value === 'boards' || value === 'properties' || value === 'ai') {
            setSidebarTab(value);
          }
        }}
        className='flex flex-col min-h-0 flex-1 overflow-hidden'
      >
        {sidebarCollapsed ? (
          <div
            className='flex flex-col gap-1 flex-1 min-h-0'
            role='tablist'
            aria-label='Sidebar sections'
          >
            <Button
              type='button'
              variant={sidebarTab === 'boards' ? 'secondary' : 'ghost'}
              size='icon'
              className='h-9 w-9 shrink-0'
              onClick={() => setSidebarTab('boards')}
              title='Boards'
              aria-label='Boards'
              data-testid='sidebar-rail-tab-boards'
            >
              <LayoutDashboard className='h-4 w-4' aria-hidden />
            </Button>
            <Button
              type='button'
              variant={sidebarTab === 'properties' ? 'secondary' : 'ghost'}
              size='icon'
              className='h-9 w-9 shrink-0'
              onClick={() => setSidebarTab('properties')}
              title='Properties'
              aria-label='Properties'
              data-testid='sidebar-rail-tab-properties'
            >
              <Settings className='h-4 w-4' aria-hidden />
            </Button>
            <Button
              type='button'
              variant={sidebarTab === 'ai' ? 'secondary' : 'ghost'}
              size='icon'
              className='h-9 w-9 shrink-0'
              onClick={() => setSidebarTab('ai')}
              title='AI'
              aria-label='AI'
              data-testid='sidebar-rail-tab-ai'
            >
              <Bot className='h-4 w-4' aria-hidden />
            </Button>
            <div className='flex-1 min-h-2' />
            <Button
              type='button'
              variant='ghost'
              size='icon'
              className='h-9 w-9 shrink-0'
              onClick={() => setSidebarCollapsed(false)}
              title='Expand panel'
              aria-label='Expand panel'
              data-testid='sidebar-expand'
            >
              <PanelRightOpen className='h-4 w-4' aria-hidden />
            </Button>
          </div>
        ) : (
          <>
            <TabsList className='w-full grid grid-cols-3 bg-muted shrink-0'>
              <TabsTrigger
                value='boards'
                className='text-muted-foreground data-[state=active]:bg-accent data-[state=active]:text-accent-foreground'
              >
                Boards
              </TabsTrigger>
              <TabsTrigger
                value='properties'
                className='text-muted-foreground data-[state=active]:bg-accent data-[state=active]:text-accent-foreground'
              >
                Properties
              </TabsTrigger>
              <TabsTrigger
                value='ai'
                className='text-muted-foreground data-[state=active]:bg-accent data-[state=active]:text-accent-foreground'
              >
                AI
              </TabsTrigger>
            </TabsList>
            {expandedContent}
            <div className='flex justify-end shrink-0 pt-2 mt-auto'>
              <Button
                type='button'
                variant='ghost'
                size='icon'
                className='h-9 w-9'
                onClick={() => setSidebarCollapsed(true)}
                title='Collapse panel'
                aria-label='Collapse panel'
                data-testid='sidebar-collapse'
              >
                <PanelRightClose className='h-4 w-4' aria-hidden />
              </Button>
            </div>
          </>
        )}
      </Tabs>
    </aside>
  );
};

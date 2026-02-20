import { memo, type ReactElement } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  PanelRightClose,
  PanelRightOpen,
  LayoutDashboard,
  Settings,
  Bot,
  MessageSquare,
} from 'lucide-react';
import type { IRightSidebarProps } from '@/types';

/**
 * Collapsible right panel: expanded (tabs + content) or collapsed icon rail.
 * State is persisted by the caller (e.g. useBoardSettings).
 */
export const RightSidebar = memo(function RightSidebar({
  sidebarCollapsed,
  setSidebarCollapsed,
  sidebarTab,
  setSidebarTab,
  expandedContent,
  boardsOnly = false,
}: IRightSidebarProps): ReactElement {
  return (
    <aside
      className={`shrink-0 border-l border-border bg-card flex flex-col min-h-0 overflow-hidden transition-[width] duration-200 ease-out ${
        sidebarCollapsed ? 'w-14 p-2' : 'w-80 p-2'
      }`}
      data-testid='sidebar'
      aria-expanded={!sidebarCollapsed}
    >
      <Tabs
        value={boardsOnly ? 'boards' : sidebarTab}
        onValueChange={(value) => {
          if (value === 'boards' || value === 'props' || value === 'ai' || value === 'comments') {
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
              onClick={() => {
                setSidebarTab('boards');
                setSidebarCollapsed(false);
              }}
              title='Boards'
              aria-label='Boards'
              data-testid='sidebar-rail-tab-boards'
            >
              <LayoutDashboard className='h-4 w-4' aria-hidden />
            </Button>
            {!boardsOnly && (
              <>
                <Button
                  type='button'
                  variant={sidebarTab === 'props' ? 'secondary' : 'ghost'}
                  size='icon'
                  className='h-9 w-9 shrink-0'
                  onClick={() => {
                    setSidebarTab('props');
                    setSidebarCollapsed(false);
                  }}
                  title='props'
                  aria-label='props'
                  data-testid='sidebar-rail-tab-props'
                >
                  <Settings className='h-4 w-4' aria-hidden />
                </Button>
                <Button
                  type='button'
                  variant={sidebarTab === 'ai' ? 'secondary' : 'ghost'}
                  size='icon'
                  className='h-9 w-9 shrink-0'
                  onClick={() => {
                    setSidebarTab('ai');
                    setSidebarCollapsed(false);
                  }}
                  title='AI'
                  aria-label='AI'
                  data-testid='sidebar-rail-tab-ai'
                >
                  <Bot className='h-4 w-4' aria-hidden />
                </Button>
                <Button
                  type='button'
                  variant={sidebarTab === 'comments' ? 'secondary' : 'ghost'}
                  size='icon'
                  className='h-9 w-9 shrink-0'
                  onClick={() => {
                    setSidebarTab('comments');
                    setSidebarCollapsed(false);
                  }}
                  title='Comments'
                  aria-label='Comments'
                  data-testid='sidebar-rail-tab-comments'
                >
                  <MessageSquare className='h-4 w-4' aria-hidden />
                </Button>
              </>
            )}
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
            <TabsList
              className={`w-full shrink-0 bg-muted ${boardsOnly ? 'grid grid-cols-1' : 'grid grid-cols-4'}`}
            >
              <TabsTrigger
                value='boards'
                className='text-muted-foreground data-[state=active]:bg-accent data-[state=active]:text-accent-foreground'
              >
                Boards
              </TabsTrigger>
              {!boardsOnly && (
                <>
                  <TabsTrigger
                    value='props'
                    className='text-muted-foreground data-[state=active]:bg-accent data-[state=active]:text-accent-foreground'
                  >
                    Props
                  </TabsTrigger>
                  <TabsTrigger
                    value='ai'
                    className='text-muted-foreground data-[state=active]:bg-accent data-[state=active]:text-accent-foreground'
                  >
                    AI
                  </TabsTrigger>
                  <TabsTrigger
                    value='comments'
                    className='text-muted-foreground data-[state=active]:bg-accent data-[state=active]:text-accent-foreground'
                  >
                    Comments
                  </TabsTrigger>
                </>
              )}
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
});

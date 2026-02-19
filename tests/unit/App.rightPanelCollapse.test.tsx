import { describe, it, expect } from 'vitest';
import { render, screen, within, act } from '@testing-library/react';
import { useState } from 'react';
import { RightSidebar } from '@/components/board/RightSidebar';
import { TabsContent } from '@/components/ui/tabs';
import type { SidebarTab } from '@/hooks/useBoardSettings';

const RightSidebarHarness = (): React.ReactElement => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('boards');
  return (
    <RightSidebar
      sidebarCollapsed={sidebarCollapsed}
      setSidebarCollapsed={setSidebarCollapsed}
      sidebarTab={sidebarTab}
      setSidebarTab={setSidebarTab}
      expandedContent={
        <>
          <TabsContent value='boards' className='flex-1 min-h-0 mt-2 overflow-auto'>
            <div data-testid='boards-panel'>Boards content</div>
          </TabsContent>
          <TabsContent
            value='props'
            className='flex-1 min-h-0 mt-2 overflow-auto'
            data-testid='props-tab-content'
          >
            <div>Properties content</div>
          </TabsContent>
          <TabsContent value='ai' className='flex-1 min-h-0 mt-2 overflow-hidden flex flex-col'>
            <div data-testid='ai-panel'>AI content</div>
          </TabsContent>
        </>
      }
    />
  );
};

describe('Right panel collapse', () => {
  it('renders sidebar expanded by default and collapse button is visible', () => {
    render(<RightSidebarHarness />);

    const sidebar = screen.getByTestId('sidebar');
    expect(sidebar).toBeInTheDocument();
    expect(sidebar).toHaveAttribute('aria-expanded', 'true');
    const collapseBtn = within(sidebar).getByTestId('sidebar-collapse');
    expect(collapseBtn).toBeInTheDocument();
  });

  it('collapses to icon rail when collapse is clicked', async () => {
    render(<RightSidebarHarness />);

    const sidebar = screen.getByTestId('sidebar');
    const collapseBtn = within(sidebar).getByTestId('sidebar-collapse');
    await act(async () => {
      collapseBtn.click();
    });

    expect(sidebar).toHaveAttribute('aria-expanded', 'false');
    expect(within(sidebar).getByTestId('sidebar-expand')).toBeInTheDocument();
    expect(within(sidebar).getByTestId('sidebar-rail-tab-boards')).toBeInTheDocument();
    expect(within(sidebar).getByTestId('sidebar-rail-tab-props')).toBeInTheDocument();
    expect(within(sidebar).getByTestId('sidebar-rail-tab-ai')).toBeInTheDocument();
  });

  it('expands panel when expand is clicked from collapsed rail', async () => {
    render(<RightSidebarHarness />);

    const sidebar = screen.getByTestId('sidebar');
    await act(async () => {
      within(sidebar).getByTestId('sidebar-collapse').click();
    });
    expect(sidebar).toHaveAttribute('aria-expanded', 'false');

    await act(async () => {
      within(sidebar).getByTestId('sidebar-expand').click();
    });
    expect(sidebar).toHaveAttribute('aria-expanded', 'true');
    expect(within(sidebar).getByTestId('sidebar-collapse')).toBeInTheDocument();
  });

  it('rail tab click expands panel and shows that tab content', async () => {
    render(<RightSidebarHarness />);

    const sidebar = screen.getByTestId('sidebar');
    await act(async () => {
      within(sidebar).getByTestId('sidebar-collapse').click();
    });
    expect(sidebar).toHaveAttribute('aria-expanded', 'false');
    await act(async () => {
      within(sidebar).getByTestId('sidebar-rail-tab-props').click();
    });
    expect(sidebar).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('props-tab-content')).toBeInTheDocument();
  });

  it('when initially collapsed, rail is visible and expand shows full panel', () => {
    const InitialCollapsed = (): React.ReactElement => {
      const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
      const [sidebarTab, setSidebarTab] = useState<SidebarTab>('boards');
      return (
        <RightSidebar
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
          sidebarTab={sidebarTab}
          setSidebarTab={setSidebarTab}
          expandedContent={
            <>
              <TabsContent value='boards' className='flex-1 min-h-0 mt-2 overflow-auto'>
                <div data-testid='boards-panel'>Boards</div>
              </TabsContent>
              <TabsContent
                value='props'
                className='flex-1 min-h-0 mt-2 overflow-auto'
                data-testid='props-tab-content'
              >
                <div>props</div>
              </TabsContent>
              <TabsContent value='ai' className='flex-1 min-h-0 mt-2 overflow-hidden flex flex-col'>
                <div data-testid='ai-panel'>AI</div>
              </TabsContent>
            </>
          }
        />
      );
    };

    render(<InitialCollapsed />);

    const sidebar = screen.getByTestId('sidebar');
    expect(sidebar).toHaveAttribute('aria-expanded', 'false');
    expect(within(sidebar).getByTestId('sidebar-expand')).toBeInTheDocument();
  });
});

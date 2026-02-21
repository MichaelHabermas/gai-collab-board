import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RightSidebar } from '@/components/board/RightSidebar';
import type { SidebarTab } from '@/types';

describe('RightSidebar', () => {
  const setSidebarCollapsed = vi.fn();
  const setSidebarTab = vi.fn();

  const defaultProps = {
    sidebarCollapsed: false,
    setSidebarCollapsed,
    sidebarTab: 'boards' as SidebarTab,
    setSidebarTab,
    expandedContent: <div data-testid="sidebar-expanded-content">Panel content</div>,
    boardsOnly: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders sidebar with data-testid sidebar', () => {
    render(<RightSidebar {...defaultProps} />);
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
  });

  it('when expanded shows TabsList with Boards, Props, AI, Comments', () => {
    render(<RightSidebar {...defaultProps} />);
    expect(screen.getByRole('tab', { name: 'Boards' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Props' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'AI' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Comments' })).toBeInTheDocument();
  });

  it('when expanded renders expandedContent', () => {
    render(<RightSidebar {...defaultProps} />);
    expect(screen.getByTestId('sidebar-expanded-content')).toBeInTheDocument();
    expect(screen.getByText('Panel content')).toBeInTheDocument();
  });

  it('when expanded shows collapse button', () => {
    render(<RightSidebar {...defaultProps} />);
    const collapse = screen.getByTestId('sidebar-collapse');
    expect(collapse).toBeInTheDocument();
    fireEvent.click(collapse);
    expect(setSidebarCollapsed).toHaveBeenCalledWith(true);
  });

  it('when collapsed shows rail and expand button', () => {
    render(<RightSidebar {...defaultProps} sidebarCollapsed={true} />);
    expect(screen.getByTestId('sidebar-rail-tab-boards')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-rail-tab-props')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-rail-tab-ai')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-rail-tab-comments')).toBeInTheDocument();
    const expand = screen.getByTestId('sidebar-expand');
    fireEvent.click(expand);
    expect(setSidebarCollapsed).toHaveBeenCalledWith(false);
  });

  it('when collapsed and boardsOnly shows only boards rail tab', () => {
    render(
      <RightSidebar
        {...defaultProps}
        sidebarCollapsed={true}
        boardsOnly={true}
      />
    );
    expect(screen.getByTestId('sidebar-rail-tab-boards')).toBeInTheDocument();
    expect(screen.queryByTestId('sidebar-rail-tab-props')).not.toBeInTheDocument();
    expect(screen.queryByTestId('sidebar-rail-tab-ai')).not.toBeInTheDocument();
    expect(screen.queryByTestId('sidebar-rail-tab-comments')).not.toBeInTheDocument();
  });

  it('when expanded and boardsOnly shows only Boards tab', () => {
    render(
      <RightSidebar
        {...defaultProps}
        boardsOnly={true}
      />
    );
    expect(screen.getByRole('tab', { name: 'Boards' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Props' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'AI' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Comments' })).not.toBeInTheDocument();
  });

  it('shows Boards as active tab when sidebarTab is boards', () => {
    render(<RightSidebar {...defaultProps} sidebarTab="boards" />);
    const boardsTab = screen.getByRole('tab', { name: 'Boards' });
    expect(boardsTab).toHaveAttribute('data-state', 'active');
  });

  it('shows AI as active tab when sidebarTab is ai', () => {
    render(<RightSidebar {...defaultProps} sidebarTab="ai" />);
    const aiTab = screen.getByRole('tab', { name: 'AI' });
    expect(aiTab).toHaveAttribute('data-state', 'active');
  });

  it('shows Comments as active tab when sidebarTab is comments', () => {
    render(<RightSidebar {...defaultProps} sidebarTab="comments" />);
    const commentsTab = screen.getByRole('tab', { name: 'Comments' });
    expect(commentsTab).toHaveAttribute('data-state', 'active');
  });

  it('rail tab props expands and sets tab', () => {
    render(<RightSidebar {...defaultProps} sidebarCollapsed={true} />);
    fireEvent.click(screen.getByTestId('sidebar-rail-tab-props'));
    expect(setSidebarTab).toHaveBeenCalledWith('props');
    expect(setSidebarCollapsed).toHaveBeenCalledWith(false);
  });

  it('rail tab ai expands and sets tab', () => {
    render(<RightSidebar {...defaultProps} sidebarCollapsed={true} />);
    fireEvent.click(screen.getByTestId('sidebar-rail-tab-ai'));
    expect(setSidebarTab).toHaveBeenCalledWith('ai');
    expect(setSidebarCollapsed).toHaveBeenCalledWith(false);
  });

  it('rail tab comments expands and sets tab', () => {
    render(<RightSidebar {...defaultProps} sidebarCollapsed={true} />);
    fireEvent.click(screen.getByTestId('sidebar-rail-tab-comments'));
    expect(setSidebarTab).toHaveBeenCalledWith('comments');
    expect(setSidebarCollapsed).toHaveBeenCalledWith(false);
  });

  it('has aria-expanded false when collapsed', () => {
    render(<RightSidebar {...defaultProps} sidebarCollapsed={true} />);
    expect(screen.getByTestId('sidebar')).toHaveAttribute('aria-expanded', 'false');
  });

  it('has aria-expanded true when expanded', () => {
    render(<RightSidebar {...defaultProps} />);
    expect(screen.getByTestId('sidebar')).toHaveAttribute('aria-expanded', 'true');
  });
});

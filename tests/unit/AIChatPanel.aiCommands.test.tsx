import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIChatPanel } from '@/components/ai/AIChatPanel';
import { useObjectsStore } from '@/stores/objectsStore';
import type { IBoardObject } from '@/types';
import { Timestamp } from 'firebase/firestore';

// Mock selectionStore
let mockSelectedIds = new Set<string>();
vi.mock('@/stores/selectionStore', () => ({
  useSelectionStore: (selector: (state: { selectedIds: Set<string> }) => unknown) =>
    selector({ selectedIds: mockSelectedIds }),
}));

const makeObject = (id: string): IBoardObject => ({
  id,
  type: 'sticky',
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  rotation: 0,
  fill: '#fbbf24',
  createdBy: 'user-1',
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
});

describe('AIChatPanel AI Commands', () => {
  const defaultProps = {
    messages: [],
    loading: false,
    error: '',
    onSend: vi.fn().mockResolvedValue(undefined),
    onClearError: vi.fn(),
    onClearMessages: vi.fn(),
  };

  const setStoreObjects = (objects: IBoardObject[]): void => {
    useObjectsStore.getState().setAll(objects);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectedIds = new Set<string>();
    useObjectsStore.getState().clear();
  });

  // Feature 18: Explain Board

  it('renders "Explain Board" button', () => {
    render(<AIChatPanel {...defaultProps} />);
    expect(screen.getByTestId('ai-explain-board')).toBeInTheDocument();
  });

  it('disables "Explain Board" when board has no objects', () => {
    render(<AIChatPanel {...defaultProps} />);
    expect(screen.getByTestId('ai-explain-board')).toBeDisabled();
  });

  it('enables "Explain Board" when board has objects', () => {
    setStoreObjects([makeObject('obj-1')]);
    render(<AIChatPanel {...defaultProps} />);
    expect(screen.getByTestId('ai-explain-board')).not.toBeDisabled();
  });

  it('calls onSend with explain prompt when clicked', () => {
    setStoreObjects([makeObject('obj-1')]);
    const onSend = vi.fn().mockResolvedValue(undefined);
    render(<AIChatPanel {...defaultProps} onSend={onSend} />);

    fireEvent.click(screen.getByTestId('ai-explain-board'));
    expect(onSend).toHaveBeenCalledTimes(1);
    expect(onSend.mock.calls[0]?.[0]).toMatch(/explain this board/i);
  });

  it('disables "Explain Board" when loading', () => {
    setStoreObjects([makeObject('obj-1')]);
    render(<AIChatPanel {...defaultProps} loading={true} />);
    expect(screen.getByTestId('ai-explain-board')).toBeDisabled();
  });

  // Feature 19: Summarize Selection

  it('renders "Summarize Selection" button', () => {
    render(<AIChatPanel {...defaultProps} />);
    expect(screen.getByTestId('ai-summarize-selection')).toBeInTheDocument();
  });

  it('disables "Summarize Selection" when no selection', () => {
    mockSelectedIds = new Set<string>();
    setStoreObjects([makeObject('obj-1')]);
    render(<AIChatPanel {...defaultProps} />);
    expect(screen.getByTestId('ai-summarize-selection')).toBeDisabled();
  });

  it('enables "Summarize Selection" when objects are selected', () => {
    mockSelectedIds = new Set(['obj-1', 'obj-2']);
    setStoreObjects([makeObject('obj-1'), makeObject('obj-2')]);
    render(<AIChatPanel {...defaultProps} />);
    expect(screen.getByTestId('ai-summarize-selection')).not.toBeDisabled();
  });

  it('calls onSend with summarize prompt including selection count', () => {
    mockSelectedIds = new Set(['obj-1', 'obj-2']);
    setStoreObjects([makeObject('obj-1'), makeObject('obj-2')]);
    const onSend = vi.fn().mockResolvedValue(undefined);
    render(<AIChatPanel {...defaultProps} onSend={onSend} />);

    fireEvent.click(screen.getByTestId('ai-summarize-selection'));
    expect(onSend).toHaveBeenCalledTimes(1);
    const prompt = onSend.mock.calls[0]?.[0] as string;
    expect(prompt).toMatch(/summarize/i);
    expect(prompt).toContain('2');
  });

  it('disables "Summarize Selection" when loading', () => {
    mockSelectedIds = new Set(['obj-1']);
    setStoreObjects([makeObject('obj-1')]);
    render(<AIChatPanel {...defaultProps} loading={true} />);
    expect(screen.getByTestId('ai-summarize-selection')).toBeDisabled();
  });

  // Enter = submit, Shift+Enter = new line

  it('submits when Enter is pressed in the chat input', () => {
    const onSend = vi.fn().mockResolvedValue(undefined);
    render(<AIChatPanel {...defaultProps} onSend={onSend} />);
    const input = screen.getByTestId('ai-chat-input');

    fireEvent.change(input, { target: { value: 'Make a circle' } });
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: false });

    expect(onSend).toHaveBeenCalledTimes(1);
    expect(onSend.mock.calls[0]?.[0]).toBe('Make a circle');
  });

  it('does not submit when Shift+Enter is pressed in the chat input', () => {
    const onSend = vi.fn().mockResolvedValue(undefined);
    render(<AIChatPanel {...defaultProps} onSend={onSend} />);
    const input = screen.getByTestId('ai-chat-input');

    fireEvent.change(input, { target: { value: 'Make a circle' } });
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });

    expect(onSend).not.toHaveBeenCalled();
    expect(input).toHaveValue('Make a circle');
  });
});

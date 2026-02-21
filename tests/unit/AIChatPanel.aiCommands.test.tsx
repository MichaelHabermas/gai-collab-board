import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
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

describe('AIChatPanel branches', () => {
  const defaultProps = {
    messages: [] as { role: 'user' | 'assistant'; content: string }[],
    loading: false,
    error: '',
    onSend: vi.fn().mockResolvedValue(undefined),
    onClearError: vi.fn(),
    onClearMessages: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectedIds = new Set<string>();
    useObjectsStore.getState().clear();
  });

  it('shows empty state placeholder when no messages and not loading', () => {
    render(<AIChatPanel {...defaultProps} />);
    expect(screen.getByText(/Ask to create sticky notes/)).toBeInTheDocument();
  });

  it('shows loading state with Thinking and spinner', () => {
    render(<AIChatPanel {...defaultProps} loading={true} />);
    expect(screen.getByText('Thinking...')).toBeInTheDocument();
  });

  it('does not show empty placeholder when loading', () => {
    render(<AIChatPanel {...defaultProps} loading={true} />);
    expect(screen.queryByText(/Ask to create sticky notes/)).not.toBeInTheDocument();
  });

  it('shows error and Dismiss calls onClearError', () => {
    const onClearError = vi.fn();
    render(
      <AIChatPanel
        {...defaultProps}
        error="Something went wrong"
        onClearError={onClearError}
      />
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
    const dismiss = screen.getByText('Dismiss');
    fireEvent.click(dismiss);
    expect(onClearError).toHaveBeenCalledTimes(1);
  });

  it('Clear button calls onClearMessages', () => {
    const onClearMessages = vi.fn();
    render(<AIChatPanel {...defaultProps} onClearMessages={onClearMessages} />);
    fireEvent.click(screen.getByText('Clear'));
    expect(onClearMessages).toHaveBeenCalledTimes(1);
  });

  it('submit with empty input does not call onSend', async () => {
    const onSend = vi.fn().mockResolvedValue(undefined);
    render(<AIChatPanel {...defaultProps} onSend={onSend} />);
    const form = screen.getByTestId('ai-chat-input').closest('form');
    if (form) {
      fireEvent.submit(form);
    }
    expect(onSend).not.toHaveBeenCalled();
  });

  it('submit with whitespace-only input does not call onSend', async () => {
    const onSend = vi.fn().mockResolvedValue(undefined);
    render(<AIChatPanel {...defaultProps} onSend={onSend} />);
    const input = screen.getByTestId('ai-chat-input');
    fireEvent.change(input, { target: { value: '   ' } });
    const form = input.closest('form');
    if (form) {
      fireEvent.submit(form);
    }
    expect(onSend).not.toHaveBeenCalled();
  });

  it('submit with text calls onSend and clears input', async () => {
    const onSend = vi.fn().mockResolvedValue(undefined);
    render(<AIChatPanel {...defaultProps} onSend={onSend} />);
    const input = screen.getByTestId('ai-chat-input');
    fireEvent.change(input, { target: { value: 'Hello' } });
    const form = input.closest('form');
    if (form) {
      fireEvent.submit(form);
    }
    expect(onSend).toHaveBeenCalledWith('Hello');
    expect(input).toHaveValue('');
  });

  it('renders user message as plain text', () => {
    render(
      <AIChatPanel
        {...defaultProps}
        messages={[{ role: 'user', content: 'User said this' }]}
      />
    );
    expect(screen.getByText('User said this')).toBeInTheDocument();
  });

  it('renders assistant message with Markdown', () => {
    render(
      <AIChatPanel
        {...defaultProps}
        messages={[{ role: 'assistant', content: '**Bold** and normal' }]}
      />
    );
    expect(document.body).toHaveTextContent('Bold');
    expect(document.body).toHaveTextContent('and normal');
  });

  describe('voice input', () => {
    it('sets voiceError when SpeechRecognition is not supported', () => {
      const origSpeech = (global as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
      const origWebkit = (global as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
      delete (global as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
      delete (global as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;

      render(<AIChatPanel {...defaultProps} />);
      const voiceBtn = screen.queryByTestId('ai-voice-input');
      if (voiceBtn) {
        fireEvent.click(voiceBtn);
        expect(screen.getByText(/Voice input is not supported/)).toBeInTheDocument();
      }

      (global as unknown as { SpeechRecognition?: unknown }).SpeechRecognition = origSpeech;
      (global as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition = origWebkit;
    });

    it('appends transcript to input when SpeechRecognition fires onresult', async () => {
      let instance: {
        onresult: ((e: { results: ArrayLike<{ 0: { transcript: string }; length: number }> }) => void) | null;
        onerror: (() => void) | null;
        onend: (() => void) | null;
      } | null = null;
      const MockRecognition = vi.fn().mockImplementation(function (this: {
        start: () => void;
        continuous: boolean;
        interimResults: boolean;
        lang: string;
        onresult: ((e: { results: ArrayLike<{ 0: { transcript: string }; length: number }> }) => void) | null;
        onerror: (() => void) | null;
        onend: (() => void) | null;
      }) {
        instance = this;
        this.start = vi.fn();
        this.continuous = false;
        this.interimResults = false;
        this.lang = 'en-US';
        this.onresult = null;
        this.onerror = null;
        this.onend = null;
      });
      (global as unknown as { SpeechRecognition: typeof MockRecognition }).SpeechRecognition = MockRecognition;
      (global as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition = undefined;

      render(<AIChatPanel {...defaultProps} />);
      await act(async () => {
        fireEvent.click(screen.getByTestId('ai-voice-input'));
      });
      const resultItem = { 0: { transcript: 'hello' }, length: 1 };
      const resultsList = {
        length: 1,
        0: resultItem,
        item: (i: number) => (i === 0 ? resultItem : undefined),
      };
      await act(async () => {
        if (instance?.onresult) {
          instance.onresult({ results: resultsList });
        }
      });
      await waitFor(() => {
        expect(screen.getByTestId('ai-chat-input')).toHaveValue('hello');
      });

      delete (global as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
    });

    it('sets voiceError when SpeechRecognition fires onerror', async () => {
      let instance: { onerror: (() => void) | null } | null = null;
      const MockRecognition = vi.fn().mockImplementation(function (this: {
        start: () => void;
        onresult: null;
        onerror: (() => void) | null;
        onend: null;
      }) {
        instance = this;
        this.start = vi.fn();
        this.onresult = null;
        this.onerror = null;
        this.onend = null;
      });
      (global as unknown as { SpeechRecognition: typeof MockRecognition }).SpeechRecognition = MockRecognition;
      (global as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition = undefined;

      render(<AIChatPanel {...defaultProps} />);
      await act(async () => {
        fireEvent.click(screen.getByTestId('ai-voice-input'));
      });
      await act(async () => {
        if (instance?.onerror) {
          instance.onerror();
        }
      });
      expect(screen.getByText(/Voice input failed/)).toBeInTheDocument();

      delete (global as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
    });

    it('typing in input clears voiceError after onerror', async () => {
      let instance: { onerror: (() => void) | null } | null = null;
      const MockRecognition = vi.fn().mockImplementation(function (this: {
        start: () => void;
        onresult: null;
        onerror: (() => void) | null;
        onend: null;
      }) {
        instance = this;
        this.start = vi.fn();
        this.onresult = null;
        this.onerror = null;
        this.onend = null;
      });
      (global as unknown as { SpeechRecognition: typeof MockRecognition }).SpeechRecognition = MockRecognition;
      (global as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition = undefined;

      render(<AIChatPanel {...defaultProps} />);
      await act(async () => {
        fireEvent.click(screen.getByTestId('ai-voice-input'));
      });
      await act(async () => {
        if (instance?.onerror) {
          instance.onerror();
        }
      });
      expect(screen.getByText(/Voice input failed/)).toBeInTheDocument();
      await act(async () => {
        fireEvent.change(screen.getByTestId('ai-chat-input'), { target: { value: 'x' } });
      });
      expect(screen.queryByText(/Voice input failed/)).not.toBeInTheDocument();

      delete (global as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
    });
  });
});

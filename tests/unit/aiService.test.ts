import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIService } from '@/modules/ai/aiService';
import type { IToolCall } from '@/modules/ai/tools';
import { aiClient } from '@/lib/ai';

vi.mock('@/lib/ai', () => ({
  aiClient: {
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  },
  AI_CONFIG: { model: 'test-model', maxTokens: 100, temperature: 0.7, topP: 0.9 },
}));

const mockCreate = vi.mocked(aiClient.chat.completions.create);

describe('AIService', () => {
  let onToolExecute: (tool: IToolCall) => Promise<unknown>;
  let service: AIService;

  beforeEach(() => {
    vi.clearAllMocks();
    onToolExecute = vi.fn().mockResolvedValue({ success: true });
    service = new AIService(onToolExecute);
    service.updateBoardState([]);
  });

  it('returns assistant content when no tool calls', async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: 'Done!',
            tool_calls: undefined,
          },
        },
      ],
    });

    const result = await service.processCommand('Add a note');
    expect(result).toBe('Done!');
    expect(onToolExecute).not.toHaveBeenCalled();
  });

  it('calls onToolExecute for each tool call and returns follow-up content', async () => {
    mockCreate
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: null,
              tool_calls: [
                {
                  id: 'call-1',
                  function: {
                    name: 'createStickyNote',
                    arguments: JSON.stringify({ text: 'Hi', x: 10, y: 20 }),
                  },
                },
              ],
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        choices: [{ message: { content: 'Created a sticky note.' } }],
      });

    const result = await service.processCommand('Add a sticky saying Hi at 10,20');
    expect(result).toBe('Created a sticky note.');
    expect(onToolExecute).toHaveBeenCalledTimes(1);
    expect(onToolExecute).toHaveBeenCalledWith({
      name: 'createStickyNote',
      arguments: { text: 'Hi', x: 10, y: 20 },
    });
  });

  it('pushes tool error into result and continues', async () => {
    onToolExecute.mockRejectedValueOnce(new Error('Object not found'));
    mockCreate
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: null,
              tool_calls: [
                {
                  id: 'call-1',
                  function: {
                    name: 'deleteObject',
                    arguments: JSON.stringify({ objectId: 'bad-id' }),
                  },
                },
              ],
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        choices: [{ message: { content: 'That object could not be found.' } }],
      });

    const result = await service.processCommand('Delete the bad object');
    expect(result).toBe('That object could not be found.');
    expect(onToolExecute).toHaveBeenCalledWith({
      name: 'deleteObject',
      arguments: { objectId: 'bad-id' },
    });
  });
});

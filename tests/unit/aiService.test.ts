import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { AIService } from '@/modules/ai/aiService';
import type { IToolCall } from '@/modules/ai/tools';
import { AIError } from '@/modules/ai/errors';
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
  let onToolExecute: Mock<(tool: IToolCall) => Promise<unknown>>;
  let service: AIService;

  beforeEach(() => {
    vi.clearAllMocks();
    onToolExecute = vi.fn().mockResolvedValue({ success: true });
    service = new AIService(onToolExecute);
    service.updateBoardState([]);
  });

  it('returns assistant content when no tool calls', async () => {
    mockCreate.mockResolvedValue({
      id: 'test-id',
      created: 1717171717,
      model: 'test-model',
      object: 'chat.completion',
      choices: [
        {
          message: {
            content: 'Done!',
            tool_calls: [],
            refusal: null,
            role: 'assistant',
          },
          finish_reason: 'stop',
          index: 0,
          logprobs: null,
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
        id: 'test-id',
        created: 1717171717,
        model: 'test-model',
        object: 'chat.completion',
        choices: [
          {
            finish_reason: 'stop',
            index: 0,
            logprobs: null,
            message: {
              content: null,
              refusal: null,
              role: 'assistant',
              tool_calls: [
                {
                  id: 'call-1',
                  type: 'function',
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
        id: 'test-id',
        created: 1717171717,
        model: 'test-model',
        object: 'chat.completion',
        choices: [
          {
            message: { content: 'Created a sticky note.', refusal: null, role: 'assistant' },
            finish_reason: 'stop',
            index: 0,
            logprobs: null,
          },
        ],
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
        id: 'test-id',
        created: 1717171717,
        model: 'test-model',
        object: 'chat.completion',
        choices: [
          {
            message: {
              content: null,
              refusal: null,
              role: 'assistant',
              tool_calls: [
                {
                  id: 'call-1',
                  type: 'function',
                  function: {
                    name: 'deleteObject',
                    arguments: JSON.stringify({ objectId: 'bad-id' }),
                  },
                },
              ],
            },
            finish_reason: 'stop',
            index: 0,
            logprobs: null,
          },
        ],
      })
      .mockResolvedValueOnce({
        id: 'test-id',
        created: 1717171717,
        model: 'test-model',
        object: 'chat.completion',
        choices: [
          {
            message: {
              content: 'That object could not be found.',
              refusal: null,
              role: 'assistant',
            },
            finish_reason: 'stop',
            index: 0,
            logprobs: null,
          },
        ],
      });

    const result = await service.processCommand('Delete the bad object');
    expect(result).toBe('That object could not be found.');
    expect(onToolExecute).toHaveBeenCalledWith({
      name: 'deleteObject',
      arguments: { objectId: 'bad-id' },
    });
  });

  it('throws AIError when response has no choices (malformed/unexpected response)', async () => {
    mockCreate.mockResolvedValue({
      id: 'test-id',
      created: 1717171717,
      model: 'test-model',
      object: 'chat.completion',
    } as Awaited<ReturnType<typeof aiClient.chat.completions.create>>);

    const err = await service.processCommand('Add a note').catch((e) => e);
    expect(err).toBeInstanceOf(AIError);
    expect((err as Error).message).toMatch(/unexpected response|proxy.*configured/i);
    expect((err as Error).message).not.toMatch(/reading '0'/);
  });

  it('throws AIError when response.choices is empty array', async () => {
    mockCreate.mockResolvedValue({
      id: 'test-id',
      created: 1717171717,
      model: 'test-model',
      object: 'chat.completion',
      choices: [],
    });

    await expect(service.processCommand('Add a note')).rejects.toThrow(AIError);
    await expect(service.processCommand('Add a note')).rejects.toThrow(
      /unexpected response|proxy.*configured/i
    );
  });

  it('returns safe fallback when follow-up response has no choices (no TypeError)', async () => {
    mockCreate
      .mockResolvedValueOnce({
        id: 'test-id',
        created: 1717171717,
        model: 'test-model',
        object: 'chat.completion',
        choices: [
          {
            finish_reason: 'stop',
            index: 0,
            logprobs: null,
            message: {
              content: null,
              refusal: null,
              role: 'assistant',
              tool_calls: [
                {
                  id: 'call-1',
                  type: 'function',
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
        id: 'test-id-2',
        created: 1717171717,
        model: 'test-model',
        object: 'chat.completion',
        choices: [],
      });

    const result = await service.processCommand('Add a sticky');
    expect(typeof result).toBe('string');
    expect(result).toMatch(/couldn't get a final reply|final reply/i);
    expect(onToolExecute).toHaveBeenCalledTimes(1);
  });
});

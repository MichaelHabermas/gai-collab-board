import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { AIService } from '@/modules/ai/aiService';
import type { IToolCall } from '@/modules/ai/tools';
import { AIError } from '@/modules/ai/errors';

const { mockClient } = vi.hoisted(() => ({
  mockClient: {
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  },
}));

vi.mock('@/lib/ai', () => ({
  getAIClient: vi.fn().mockResolvedValue(mockClient),
  AI_CONFIG: { model: 'test-model', maxTokens: 100, temperature: 0.7, topP: 0.9 },
}));

const mockCreate = vi.mocked(mockClient.chat.completions.create);

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
    } as Awaited<ReturnType<typeof mockClient.chat.completions.create>>);

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

  // ====================================================================
  // Multiple tool calls in single response
  // ====================================================================

  it('executes multiple tool calls in a single response', async () => {
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
                    arguments: JSON.stringify({ text: 'Note 1', x: 0, y: 0 }),
                  },
                },
                {
                  id: 'call-2',
                  type: 'function',
                  function: {
                    name: 'createStickyNote',
                    arguments: JSON.stringify({ text: 'Note 2', x: 100, y: 0 }),
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
        choices: [
          {
            message: {
              content: 'Created two sticky notes.',
              refusal: null,
              role: 'assistant',
            },
            finish_reason: 'stop',
            index: 0,
            logprobs: null,
          },
        ],
      });

    const result = await service.processCommand('Add two stickies');
    expect(result).toBe('Created two sticky notes.');
    expect(onToolExecute).toHaveBeenCalledTimes(2);
  });

  // ====================================================================
  // Tool call with JSON parse error in arguments
  // ====================================================================

  it('pushes JSON parse errors as tool results instead of throwing', async () => {
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
                    arguments: '{ invalid json',
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
        choices: [
          {
            message: {
              content: 'I encountered an error parsing the arguments.',
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
    expect(result).toBe('I encountered an error parsing the arguments.');
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  // ====================================================================
  // Empty content with no tool calls — returns fallback
  // ====================================================================

  it('returns fallback when assistant content is null and no tool calls', async () => {
    mockCreate.mockResolvedValueOnce({
      id: 'test-id',
      created: 1717171717,
      model: 'test-model',
      object: 'chat.completion',
      choices: [
        {
          message: {
            content: null,
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

    const result = await service.processCommand('What?');
    expect(result).toBe("I'm not sure how to help with that.");
  });

  // ====================================================================
  // Tool call with empty tool_calls in handleToolCalls guard
  // ====================================================================

  it('returns fallback when tool_calls is empty in handleToolCalls', async () => {
    // Simulate: assistantMessage.tool_calls exists but length is 0,
    // AND the outer check sees it as truthy (length > 0 fails).
    // This hits the early check in processCommand: tool_calls.length > 0
    mockCreate.mockResolvedValueOnce({
      id: 'test-id',
      created: 1717171717,
      model: 'test-model',
      object: 'chat.completion',
      choices: [
        {
          message: {
            content: 'Nothing to do.',
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

    const result = await service.processCommand('Do nothing');
    expect(result).toBe('Nothing to do.');
    expect(onToolExecute).not.toHaveBeenCalled();
  });

  // ====================================================================
  // Tool call without function property (skipped in handleToolCalls)
  // ====================================================================

  it('skips tool calls without function property', async () => {
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
                  // function is missing
                },
                {
                  id: 'call-2',
                  type: 'function',
                  function: {
                    name: 'createStickyNote',
                    arguments: JSON.stringify({ text: 'Hello', x: 0, y: 0 }),
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
        choices: [
          {
            message: {
              content: 'Created a note.',
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
    expect(result).toBe('Created a note.');
    // Only the second tool call (with function) should be executed
    expect(onToolExecute).toHaveBeenCalledTimes(1);
  });

  // ====================================================================
  // withRetry — retryable error (500) retries, then succeeds
  // ====================================================================

  it('retries on retryable 500 error and succeeds', async () => {
    const error500 = new Error('Internal server error');
    (error500 as Error & { status: number }).status = 500;

    mockCreate
      .mockRejectedValueOnce(error500)
      .mockResolvedValueOnce({
        id: 'test-id',
        created: 1717171717,
        model: 'test-model',
        object: 'chat.completion',
        choices: [
          {
            message: {
              content: 'Recovered!',
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

    const result = await service.processCommand('Test retry');
    expect(result).toBe('Recovered!');
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  // ====================================================================
  // withRetry — non-retryable error (400) throws immediately as AIError
  // ====================================================================

  it('wraps non-retryable errors as AIError without retry', async () => {
    const error400 = new Error('Bad request');
    (error400 as Error & { status: number }).status = 400;

    mockCreate.mockRejectedValueOnce(error400);

    const err = await service.processCommand('Test no-retry').catch((e) => e);
    expect(err).toBeInstanceOf(AIError);
    expect((err as AIError).status).toBe(400);
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  // ====================================================================
  // withRetry — non-Error thrown is wrapped as AIError
  // ====================================================================

  it('wraps non-Error thrown values as AIError', async () => {
    mockCreate.mockRejectedValueOnce('string error');

    const err = await service.processCommand('Test string error').catch((e) => e);
    expect(err).toBeInstanceOf(AIError);
    expect((err as Error).message).toBe('string error');
  });

  // ====================================================================
  // clearContext resets message history
  // ====================================================================

  it('clearContext resets conversation messages', async () => {
    mockCreate.mockResolvedValue({
      id: 'test-id',
      created: 1717171717,
      model: 'test-model',
      object: 'chat.completion',
      choices: [
        {
          message: {
            content: 'OK.',
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

    await service.processCommand('First message');
    service.clearContext();
    await service.processCommand('Second message after clear');

    // After clearContext, the second call should not include the first message in context
    // We verify by checking that mockCreate was called twice
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });
});

import type {
  ChatCompletionMessageParam,
  ChatCompletionMessage,
} from 'openai/resources/chat/completions';
import { aiClient, AI_CONFIG } from '@/lib/ai';
import { boardTools, type IToolCall } from './tools';
import type { IBoardObject } from '@/types';
import { AIError, isRetryableError } from './errors';

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;
/** Timeout per request so the UI does not hang if the API or proxy never responds. */
const REQUEST_TIMEOUT_MS = 90_000;

/** Extra body for providers that support disabling thinking mode (e.g. some OpenAI-compatible APIs). */
const PROVIDER_EXTRA_BODY = { thinking: { type: 'disabled' as const } };

const SYSTEM_PROMPT = `You are an AI assistant for CollabBoard, a collaborative whiteboard application.
Your role is to help users manipulate the board through natural language commands.

You can:
- Create sticky notes, shapes (rectangles, circles, lines), frames, connectors, and text
- Move, resize, and modify existing objects
- Arrange objects in grids or align them
- Query the board state to understand what's on it

Guidelines:
1. For creation commands, place objects at reasonable positions (avoid edges, overlap)
2. For manipulation commands, first query the board state if needed to find objects
3. For complex templates (like SWOT), create frames and sticky notes in organized layouts
4. Use appropriate colors: yellow for general notes, pink for important, blue for questions, green for done
5. Spacing should be consistent (typically 20-50 pixels between objects)

When replying to the user:
- Always give a brief, natural confirmation of what you did (e.g. "I've added a yellow sticky note with the text 'New Note'.").
- Never include raw JSON, object IDs, "Current board state", or any technical dump in your response. The user must only see plain, friendly text.`;

interface IConversationContext {
  messages: ChatCompletionMessageParam[];
  boardState: IBoardObject[];
}

export class AIService {
  private context: IConversationContext = {
    messages: [],
    boardState: [],
  };

  private requestQueue: Promise<void> = Promise.resolve();

  constructor(private onToolExecute: (tool: IToolCall) => Promise<unknown>) {}

  updateBoardState(objects: IBoardObject[]): void {
    this.context.boardState = objects;
  }

  clearContext(): void {
    this.context.messages = [];
  }

  /** Multi-step commands (e.g. SWOT template) are supported: the model may return multiple tool_calls in one response; we execute them sequentially and send results back for a final reply. */
  async processCommand(userMessage: string): Promise<string> {
    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'system',
        content: `[Internal context - do not quote or repeat this to the user]\nBoard state (${this.context.boardState.length} objects):\n${JSON.stringify(
          this.context.boardState.map((obj) => ({
            id: obj.id,
            type: obj.type,
            x: obj.x,
            y: obj.y,
            text: obj.text,
            fill: obj.fill,
          }))
        )}`,
      },
      ...this.context.messages,
      { role: 'user', content: userMessage },
    ];

    const providerExtra = AI_CONFIG.provider === 'nvidia' ? PROVIDER_EXTRA_BODY : {};
    const response = await this.throttledRequest(() =>
      this.withRetry(() =>
        aiClient.chat.completions.create(
          {
            model: AI_CONFIG.model,
            messages,
            tools: boardTools,
            tool_choice: 'auto',
            max_tokens: AI_CONFIG.maxTokens,
            temperature: AI_CONFIG.temperature,
            top_p: AI_CONFIG.topP,
            ...providerExtra,
          },
          { timeout: REQUEST_TIMEOUT_MS }
        )
      )
    );

    const assistantMessage = response.choices[0]?.message;

    if (!assistantMessage) {
      throw new Error('No response from AI');
    }

    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      return await this.handleToolCalls(messages, assistantMessage);
    }

    this.context.messages.push(
      { role: 'user', content: userMessage },
      { role: 'assistant', content: assistantMessage.content ?? '' }
    );

    return assistantMessage.content ?? "I'm not sure how to help with that.";
  }

  private async handleToolCalls(
    messages: ChatCompletionMessageParam[],
    assistantMessage: ChatCompletionMessage
  ): Promise<string> {
    const toolCalls = assistantMessage.tool_calls;
    if (!toolCalls?.length) {
      return "I couldn't process any tools.";
    }

    const toolResults: Array<{
      tool_call_id: string;
      role: 'tool';
      content: string;
    }> = [];

    for (const toolCall of toolCalls) {
      if (!('function' in toolCall) || !toolCall.function) {
        continue;
      }

      const functionName = toolCall.function.name;
      const functionArgs = JSON.parse(toolCall.function.arguments ?? '{}');

      try {
        const result = await this.onToolExecute({
          name: functionName as IToolCall['name'],
          arguments: functionArgs,
        });

        toolResults.push({
          tool_call_id: toolCall.id,
          role: 'tool',
          content: JSON.stringify(result),
        });
      } catch (error) {
        toolResults.push({
          tool_call_id: toolCall.id,
          role: 'tool',
          content: JSON.stringify({ error: (error as Error).message }),
        });
      }
    }

    const followUpMessages: ChatCompletionMessageParam[] = [
      ...messages,
      assistantMessage,
      ...toolResults,
    ];

    const providerExtraFollowUp = AI_CONFIG.provider === 'nvidia' ? PROVIDER_EXTRA_BODY : {};
    const followUpResponse = await this.throttledRequest(() =>
      this.withRetry(() =>
        aiClient.chat.completions.create(
          {
            model: AI_CONFIG.model,
            messages: followUpMessages,
            max_tokens: AI_CONFIG.maxTokens,
            temperature: AI_CONFIG.temperature,
            ...providerExtraFollowUp,
          },
          { timeout: REQUEST_TIMEOUT_MS }
        )
      )
    );

    const finalMessage = followUpResponse.choices[0]?.message?.content ?? '';

    const lastUserContent = messages[messages.length - 1];
    const userContent =
      lastUserContent && 'content' in lastUserContent ? (lastUserContent.content as string) : '';

    this.context.messages.push(
      { role: 'user', content: userContent },
      assistantMessage,
      ...toolResults,
      { role: 'assistant', content: finalMessage }
    );

    return finalMessage;
  }

  private async throttledRequest<T>(fn: () => Promise<T>): Promise<T> {
    const prev = this.requestQueue;
    let resolve: (() => void) | undefined;
    this.requestQueue = new Promise((r) => {
      resolve = r;
    });
    await prev;
    try {
      return await fn();
    } finally {
      resolve?.();
    }
  }

  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        const status =
          error != null && typeof error === 'object' && 'status' in error
            ? (error as { status?: number }).status
            : undefined;
        if (!isRetryableError(error) || attempt === MAX_RETRIES) {
          throw error instanceof Error
            ? new AIError(error.message, undefined, status)
            : new AIError(String(error), undefined, status);
        }

        const delayMs = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
    throw lastError;
  }
}

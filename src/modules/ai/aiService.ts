import type {
  ChatCompletionMessageParam,
  ChatCompletionMessage,
} from 'openai/resources/chat/completions';
import { getAIClient, AI_CONFIG } from '@/lib/ai';
import { boardTools, type IToolCall } from './tools';
import { compoundBoardTools } from './compoundTools';
import type { IBoardObject } from '@/types';
import { AIError, isRetryableError } from './errors';

const allBoardTools = [...boardTools, ...compoundBoardTools];

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;
/** Timeout per request so the UI does not hang if the API or proxy never responds. */
const REQUEST_TIMEOUT_MS = 90_000;

const UNEXPECTED_RESPONSE_MESSAGE =
  'AI service returned an unexpected response. Check that the AI proxy is configured and reachable.';

/** Returns the first assistant message from a completion response; throws AIError if shape is invalid. */
function getFirstAssistantMessage(
  response: { choices?: Array<{ message?: ChatCompletionMessage }> } | null | undefined
): ChatCompletionMessage {
  const choices = response?.choices;

  if (!Array.isArray(choices) || choices.length === 0) {
    throw new AIError(UNEXPECTED_RESPONSE_MESSAGE);
  }

  const first = choices[0]?.message;

  if (!first) {
    throw new AIError(UNEXPECTED_RESPONSE_MESSAGE);
  }

  return first;
}

const SYSTEM_PROMPT = `You are an AI assistant for CollabBoard, a collaborative whiteboard application.
Your role is to help users manipulate the board through natural language commands.

## Capabilities

### Atomic Tools
- Create: sticky notes, shapes (rectangles, circles, lines), frames, connectors, text
- Modify: move, resize, color, font, stroke, opacity, rotation, arrowheads, stroke style
- Organize: align, distribute, arrange in grid, group into frames
- Query: board state, find objects, get full object details
- Batch: create/update multiple objects atomically (batchCreate, batchUpdate)

### Compound Templates (prefer these for complex requests)
- **createQuadrant**: SWOT analysis, 2x2 matrices, impact/effort grids — one call creates frame + axes + labels + stickies
- **createColumnLayout**: Kanban boards, retrospectives, pro/con lists — one call creates frame + columns + stickies
- **createFlowchart**: Process flows, decision trees, org charts — one call creates nodes + connectors with auto-layout
- **createMindMap**: Brainstorming, concept maps, topic exploration — one call creates radial branches with connectors

Always prefer compound tools over multiple atomic calls when the user requests a template, diagram, or structured layout.

### Composite Tools
- **groupIntoFrame**: Group existing objects into a new frame
- **connectSequence**: Connect objects in a chain (A→B→C→D) with one call instead of N-1 createConnector calls

## When to act vs. when to converse

- **Definitive request, recognizable tool:** When the user’s intent is clear and maps to a specific tool (e.g. "add a circle", "create a mind map", "make a sticky"), call that tool immediately. Use object defaults for any property the user did not specify; do not ask for clarification on optional parameters. Prefer "right tool, default props" over asking for every parameter.
- **Vague or exploratory request:** When the request is ambiguous, high-level, or inquisitive (e.g. "help me organize", "what can you do?", "I’m not sure what I want"), respond with a normal conversation: ask clarifying questions, suggest options or templates, and only call tools once the user has chosen something concrete.

## Guidelines
1. Place objects at reasonable positions; compound tools auto-find open space if x/y omitted
2. For manipulation, query board state first if needed to find objects
3. Colors: yellow=general, pink=important/negative, blue=questions/neutral, green=positive/done, purple=ideas, orange=warnings
4. Spacing: 20-50px between objects, 30px frame padding
5. Use connectSequence for chains instead of individual createConnector calls
6. Use batchCreate/batchUpdate for bulk operations instead of individual calls

## Response Style
- Brief, natural confirmation of what you did
- Never include raw JSON, object IDs, or technical state in your response
- For templates: mention the structure created (e.g. "Created a SWOT analysis with 4 quadrants and 8 items")`;

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

    const response = await this.throttledRequest(() =>
      this.withRetry(async () =>
        (await getAIClient()).chat.completions.create(
          {
            model: AI_CONFIG.model,
            messages,
            tools: allBoardTools,
            tool_choice: 'auto',
            max_tokens: AI_CONFIG.maxTokens,
            temperature: AI_CONFIG.temperature,
            top_p: AI_CONFIG.topP,
          },
          { timeout: REQUEST_TIMEOUT_MS }
        )
      )
    );

    const assistantMessage = getFirstAssistantMessage(response);

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

    const followUpResponse = await this.throttledRequest(() =>
      this.withRetry(async () =>
        (await getAIClient()).chat.completions.create(
          {
            model: AI_CONFIG.model,
            messages: followUpMessages,
            max_tokens: AI_CONFIG.maxTokens,
            temperature: AI_CONFIG.temperature,
          },
          { timeout: REQUEST_TIMEOUT_MS }
        )
      )
    );

    let finalMessage: string;
    try {
      const followUpMessage = getFirstAssistantMessage(followUpResponse);
      finalMessage = followUpMessage?.content ?? '';
    } catch {
      finalMessage = "I ran the actions but couldn't get a final reply from the AI.";
    }

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

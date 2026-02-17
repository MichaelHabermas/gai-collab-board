# AI Integration Guide for CollabBoard

## Overview

CollabBoard supports multiple AI providers for board manipulation via natural language. The **recommended option** is **Groq** (free tier, no credit card). You can also use **Kimi 2.5** via the NVIDIA API. Both use the same OpenAI-compatible client and proxy; the key stays server-side in production.

**API Documentation**:

- [Groq Console & API Keys](https://console.groq.com/keys) (recommended, free tier)
- [Nvidia Kimi 2.5 API](https://build.nvidia.com/moonshotai/kimi-k2.5) (optional)

---

## Table of Contents

1. [Provider Options](#provider-options)
2. [API Setup](#api-setup)
3. [Function Calling Schema](#function-calling-schema)
4. [AI Service Implementation](#ai-service-implementation)
5. [Board Commands](#board-commands)
6. [Multi-Step Operations](#multi-step-operations)
7. [Context Management](#context-management)
8. [Error Handling](#error-handling)
9. [Rate Limiting & Optimization](#rate-limiting--optimization)
10. [Cost Analysis](#cost-analysis)

---

## Provider Options

### Groq (recommended, free)

| Feature | Value |
| -------- | ----- |
| Cost | Free tier, no credit card |
| Model | Llama 3.3 70B Versatile |
| Function calling | Yes (OpenAI-compatible) |
| Setup | Sign up at [console.groq.com](https://console.groq.com) → Create API key |

### Kimi 2.5 via NVIDIA (optional)

| Feature | Value |
| -------- | ----- |
| Cost | 5,000 free API credits, then paid |
| Model | Kimi K2.5 (256K context) |
| Function calling | Yes (OpenAI-compatible) |
| Setup | [Nvidia Build](https://build.nvidia.com/moonshotai/kimi-k2.5) → API key |

---

## API Setup

### Groq (recommended)

1. Go to [console.groq.com](https://console.groq.com) and sign up or log in.
2. Open [API Keys](https://console.groq.com/keys) and create a new key (e.g. `gsk_...`).
3. Copy the key and add it to your environment (see below).

### NVIDIA / Kimi 2.5 (optional)

1. Visit [Nvidia Build – Kimi 2.5](https://build.nvidia.com/moonshotai/kimi-k2.5).
2. Sign up / Log in, then generate an API key.
3. Add the key to your environment if you want to use NVIDIA.

### Environment Configuration

**Local development** — in project root `.env` (create from `.env.example`):

```env
# Prefer Groq (free)
VITE_AI_PROVIDER=groq
VITE_GROQ_API_KEY=gsk_your_key_here

# Optional: use NVIDIA/Kimi 2.5 instead
# VITE_AI_PROVIDER=nvidia
# VITE_NVIDIA_API_KEY=nvapi-xxxx-xxxx-xxxx
```

**Production (Netlify)** — in Site → Environment variables:

- **Groq:** `GROQ_API_KEY` = your Groq API key (and optionally `AI_PROVIDER=groq`).
- **NVIDIA:** `NVIDIA_API_KEY` = your NVIDIA API key (and optionally `AI_PROVIDER=nvidia`).

The app uses a single proxy (`/.netlify/functions/ai-chat`). The proxy chooses the provider from `AI_PROVIDER` or from which key is set (Groq preferred if both are set).

### Install Dependencies

```bash
bun add openai  # OpenAI-compatible API for Groq and NVIDIA
```

### API Client (existing)

`src/lib/ai.ts` is already set up to use the unified proxy path (`/api/ai/v1` in dev, `/.netlify/functions/ai-chat/v1` in prod). The client resolves the provider from `VITE_AI_PROVIDER` and key env vars, and selects the model (Groq: `llama-3.3-70b-versatile`, NVIDIA: `moonshotai/kimi-k2.5`). The proxy injects the API key in both dev (Vite proxy) and prod (Netlify function).

---

## Function Calling Schema

### Tool Definitions

Create `src/modules/ai/tools.ts`:

```typescript
import type { ChatCompletionTool } from 'openai/resources/chat/completions';

// Tool definitions for CollabBoard
export const boardTools: ChatCompletionTool[] = [
  // Creation tools
  {
    type: 'function',
    function: {
      name: 'createStickyNote',
      description:
        'Creates a new sticky note on the board with specified text, position, and color',
      parameters: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description: 'The text content of the sticky note',
          },
          x: {
            type: 'number',
            description: 'X coordinate position on the board',
          },
          y: {
            type: 'number',
            description: 'Y coordinate position on the board',
          },
          color: {
            type: 'string',
            description:
              'Background color of the sticky note (e.g., '#fef08a' for yellow)',
            enum: [
              '#fef08a', // Yellow
              '#fda4af', // Pink
              '#93c5fd', // Blue
              '#86efac', // Green
              '#c4b5fd', // Purple
              '#fed7aa', // Orange
            ],
          },
        },
        required: ['text', 'x', 'y'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'createShape',
      description: 'Creates a new shape (rectangle, circle, or line) on the board',
      parameters: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['rectangle', 'circle', 'line'],
            description: 'The type of shape to create',
          },
          x: {
            type: 'number',
            description: 'X coordinate position',
          },
          y: {
            type: 'number',
            description: 'Y coordinate position',
          },
          width: {
            type: 'number',
            description: 'Width of the shape (for rectangle/line)',
          },
          height: {
            type: 'number',
            description: 'Height of the shape (for rectangle/circle)',
          },
          color: {
            type: 'string',
            description: 'Fill color of the shape',
          },
        },
        required: ['type', 'x', 'y', 'width', 'height'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'createFrame',
      description: 'Creates a frame to group and organize content areas',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Title of the frame',
          },
          x: {
            type: 'number',
            description: 'X coordinate position',
          },
          y: {
            type: 'number',
            description: 'Y coordinate position',
          },
          width: {
            type: 'number',
            description: 'Width of the frame',
          },
          height: {
            type: 'number',
            description: 'Height of the frame',
          },
        },
        required: ['title', 'x', 'y', 'width', 'height'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'createConnector',
      description: 'Creates a connector line/arrow between two objects',
      parameters: {
        type: 'object',
        properties: {
          fromId: {
            type: 'string',
            description: 'ID of the source object',
          },
          toId: {
            type: 'string',
            description: 'ID of the target object',
          },
          style: {
            type: 'string',
            enum: ['line', 'arrow', 'dashed'],
            description: 'Style of the connector',
          },
        },
        required: ['fromId', 'toId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'createText',
      description: 'Creates a standalone text element on the board',
      parameters: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description: 'The text content',
          },
          x: {
            type: 'number',
            description: 'X coordinate position',
          },
          y: {
            type: 'number',
            description: 'Y coordinate position',
          },
          fontSize: {
            type: 'number',
            description: 'Font size in pixels',
          },
          color: {
            type: 'string',
            description: 'Text color',
          },
        },
        required: ['text', 'x', 'y'],
      },
    },
  },

  // Manipulation tools
  {
    type: 'function',
    function: {
      name: 'moveObject',
      description: 'Moves an object to a new position',
      parameters: {
        type: 'object',
        properties: {
          objectId: {
            type: 'string',
            description: 'ID of the object to move',
          },
          x: {
            type: 'number',
            description: 'New X coordinate',
          },
          y: {
            type: 'number',
            description: 'New Y coordinate',
          },
        },
        required: ['objectId', 'x', 'y'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'resizeObject',
      description: 'Resizes an object',
      parameters: {
        type: 'object',
        properties: {
          objectId: {
            type: 'string',
            description: 'ID of the object to resize',
          },
          width: {
            type: 'number',
            description: 'New width',
          },
          height: {
            type: 'number',
            description: 'New height',
          },
        },
        required: ['objectId', 'width', 'height'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'updateText',
      description: 'Updates the text content of an object',
      parameters: {
        type: 'object',
        properties: {
          objectId: {
            type: 'string',
            description: 'ID of the object',
          },
          newText: {
            type: 'string',
            description: 'New text content',
          },
        },
        required: ['objectId', 'newText'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'changeColor',
      description: 'Changes the color of an object',
      parameters: {
        type: 'object',
        properties: {
          objectId: {
            type: 'string',
            description: 'ID of the object',
          },
          color: {
            type: 'string',
            description: 'New color value',
          },
        },
        required: ['objectId', 'color'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'deleteObject',
      description: 'Deletes an object from the board',
      parameters: {
        type: 'object',
        properties: {
          objectId: {
            type: 'string',
            description: 'ID of the object to delete',
          },
        },
        required: ['objectId'],
      },
    },
  },

  // Query tools
  {
    type: 'function',
    function: {
      name: 'getBoardState',
      description:
        'Gets the current state of all objects on the board for context',
      parameters: {
        type: 'object',
        properties: {
          includeDetails: {
            type: 'boolean',
            description: 'Whether to include full object details',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'findObjects',
      description: 'Finds objects matching certain criteria',
      parameters: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['sticky', 'rectangle', 'circle', 'line', 'text', 'frame'],
            description: 'Filter by object type',
          },
          color: {
            type: 'string',
            description: 'Filter by color',
          },
          textContains: {
            type: 'string',
            description: 'Filter by text content',
          },
        },
        required: [],
      },
    },
  },

  // Layout tools
  {
    type: 'function',
    function: {
      name: 'arrangeInGrid',
      description: 'Arranges selected objects in a grid layout',
      parameters: {
        type: 'object',
        properties: {
          objectIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'IDs of objects to arrange',
          },
          columns: {
            type: 'number',
            description: 'Number of columns in the grid',
          },
          spacing: {
            type: 'number',
            description: 'Spacing between objects',
          },
          startX: {
            type: 'number',
            description: 'Starting X position',
          },
          startY: {
            type: 'number',
            description: 'Starting Y position',
          },
        },
        required: ['objectIds', 'columns'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'alignObjects',
      description: 'Aligns objects horizontally or vertically',
      parameters: {
        type: 'object',
        properties: {
          objectIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'IDs of objects to align',
          },
          alignment: {
            type: 'string',
            enum: ['left', 'center', 'right', 'top', 'middle', 'bottom'],
            description: 'Alignment direction',
          },
        },
        required: ['objectIds', 'alignment'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'distributeObjects',
      description: 'Distributes objects evenly with equal spacing',
      parameters: {
        type: 'object',
        properties: {
          objectIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'IDs of objects to distribute',
          },
          direction: {
            type: 'string',
            enum: ['horizontal', 'vertical'],
            description: 'Distribution direction',
          },
        },
        required: ['objectIds', 'direction'],
      },
    },
  },
];

// Type for tool arguments
export type ToolName = (typeof boardTools)[number]['function']['name'];

export interface IToolCall {
  name: ToolName;
  arguments: Record<string, unknown>;
}
```

---

## AI Service Implementation

### AI Service Module

Create `src/modules/ai/aiService.ts`:

```typescript
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { aiClient, AI_CONFIG } from '@/lib/ai';
import { boardTools, IToolCall } from './tools';
import type { IBoardObject } from '@/types';

// System prompt for the AI agent
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

Always confirm what you've done after executing commands.`;

// Message history for conversation context
interface IConversationContext {
  messages: ChatCompletionMessageParam[];
  boardState: IBoardObject[];
}

export class AIService {
  private context: IConversationContext = {
    messages: [],
    boardState: [],
  };

  constructor(private onToolExecute: (tool: IToolCall) => Promise<unknown>) {}

  // Update board state context
  updateBoardState(objects: IBoardObject[]): void {
    this.context.boardState = objects;
  }

  // Clear conversation history
  clearContext(): void {
    this.context.messages = [];
  }

  // Process user command
  async processCommand(userMessage: string): Promise<string> {
    // Build messages array
    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      // Include board state context
      {
        role: 'system',
        content: `Current board state (${this.context.boardState.length} objects):\n${JSON.stringify(
          this.context.boardState.map((obj) => ({
            id: obj.id,
            type: obj.type,
            x: obj.x,
            y: obj.y,
            text: obj.text,
            fill: obj.fill,
          })),
          null,
          2
        )}`,
      },
      // Previous conversation
      ...this.context.messages,
      // Current user message
      { role: 'user', content: userMessage },
    ];

    try {
      // Initial API call
      const response = await aiClient.chat.completions.create({
        model: AI_CONFIG.model,
        messages,
        tools: boardTools,
        tool_choice: 'auto',
        max_tokens: AI_CONFIG.maxTokens,
        temperature: AI_CONFIG.temperature,
        top_p: AI_CONFIG.topP,
      });

      const assistantMessage = response.choices[0]?.message;

      if (!assistantMessage) {
        throw new Error('No response from AI');
      }

      // Handle tool calls if present
      if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        return await this.handleToolCalls(messages, assistantMessage);
      }

      // Add to conversation history
      this.context.messages.push(
        { role: 'user', content: userMessage },
        { role: 'assistant', content: assistantMessage.content || '' }
      );

      return assistantMessage.content || 'I'm not sure how to help with that.';
    } catch (error) {
      console.error('AI processing error:', error);
      throw error;
    }
  }

  // Handle tool calls from AI response
  private async handleToolCalls(
    messages: ChatCompletionMessageParam[],
    assistantMessage: OpenAI.Chat.Completions.ChatCompletionMessage
  ): Promise<string> {
    const toolCalls = assistantMessage.tool_calls!;
    const toolResults: Array<{
      tool_call_id: string;
      role: 'tool';
      content: string;
    }> = [];

    // Execute each tool call
    for (const toolCall of toolCalls) {
      const functionName = toolCall.function.name;
      const functionArgs = JSON.parse(toolCall.function.arguments);

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

    // Send results back to AI for final response
    const followUpMessages: ChatCompletionMessageParam[] = [
      ...messages,
      assistantMessage,
      ...toolResults,
    ];

    const followUpResponse = await aiClient.chat.completions.create({
      model: AI_CONFIG.model,
      messages: followUpMessages,
      max_tokens: AI_CONFIG.maxTokens,
      temperature: AI_CONFIG.temperature,
    });

    const finalMessage = followUpResponse.choices[0]?.message?.content || '';

    // Update conversation history
    this.context.messages.push(
      { role: 'user', content: messages[messages.length - 1].content as string },
      assistantMessage,
      ...toolResults,
      { role: 'assistant', content: finalMessage }
    );

    return finalMessage;
  }
}
```

### Tool Executor

Create `src/modules/ai/toolExecutor.ts`:

```typescript
import { IToolCall } from './tools';
import { IBoardObject } from '@/types';
import {
  createObject,
  updateObject,
  deleteObject,
} from '@/modules/sync/firestoreService';
import { generateId } from '@/lib/utils';

interface IToolExecutorDeps {
  boardId: string;
  getBoardObjects: () => IBoardObject[];
  addLocalObject: (obj: IBoardObject) => void;
  updateLocalObject: (id: string, updates: Partial<IBoardObject>) => void;
  removeLocalObject: (id: string) => void;
  userId: string;
}

export const createToolExecutor = (deps: IToolExecutorDeps) => {
  const {
    boardId,
    getBoardObjects,
    addLocalObject,
    updateLocalObject,
    removeLocalObject,
    userId,
  } = deps;

  const execute = async (tool: IToolCall): Promise<unknown> => {
    switch (tool.name) {
      case 'createStickyNote': {
        const { text, x, y, color = '#fef08a' } = tool.arguments as {
          text: string;
          x: number;
          y: number;
          color?: string;
        };

        const id = generateId();
        const newObject: IBoardObject = {
          id,
          type: 'sticky',
          x,
          y,
          width: 200,
          height: 200,
          rotation: 0,
          fill: color,
          text,
          createdBy: userId,
          createdAt: new Date() as unknown as import('firebase/firestore').Timestamp,
          updatedAt: new Date() as unknown as import('firebase/firestore').Timestamp,
        };

        // Optimistic update
        addLocalObject(newObject);

        // Sync to Firebase
        await createObject(boardId, id, {
          type: 'sticky',
          x,
          y,
          width: 200,
          height: 200,
          rotation: 0,
          fill: color,
          text,
          createdBy: userId,
        });

        return { id, success: true, message: `Created sticky note: '${text}'` };
      }

      case 'createShape': {
        const { type, x, y, width, height, color = '#3b82f6' } = tool.arguments as {
          type: 'rectangle' | 'circle' | 'line';
          x: number;
          y: number;
          width: number;
          height: number;
          color?: string;
        };

        const id = generateId();
        const newObject: IBoardObject = {
          id,
          type,
          x,
          y,
          width,
          height,
          rotation: 0,
          fill: color,
          createdBy: userId,
          createdAt: new Date() as unknown as import('firebase/firestore').Timestamp,
          updatedAt: new Date() as unknown as import('firebase/firestore').Timestamp,
        };

        addLocalObject(newObject);
        await createObject(boardId, id, {
          type,
          x,
          y,
          width,
          height,
          rotation: 0,
          fill: color,
          createdBy: userId,
        });

        return { id, success: true, message: `Created ${type}` };
      }

      case 'createFrame': {
        const { title, x, y, width, height } = tool.arguments as {
          title: string;
          x: number;
          y: number;
          width: number;
          height: number;
        };

        const id = generateId();
        const newObject: IBoardObject = {
          id,
          type: 'frame',
          x,
          y,
          width,
          height,
          rotation: 0,
          fill: 'transparent',
          text: title,
          createdBy: userId,
          createdAt: new Date() as unknown as import('firebase/firestore').Timestamp,
          updatedAt: new Date() as unknown as import('firebase/firestore').Timestamp,
        };

        addLocalObject(newObject);
        await createObject(boardId, id, {
          type: 'frame',
          x,
          y,
          width,
          height,
          rotation: 0,
          fill: 'transparent',
          text: title,
          createdBy: userId,
        });

        return { id, success: true, message: `Created frame: '${title}'` };
      }

      case 'createText': {
        const { text, x, y, fontSize = 16, color = '#333333' } = tool.arguments as {
          text: string;
          x: number;
          y: number;
          fontSize?: number;
          color?: string;
        };

        const id = generateId();
        const newObject: IBoardObject = {
          id,
          type: 'text',
          x,
          y,
          width: text.length * fontSize * 0.6,
          height: fontSize * 1.5,
          rotation: 0,
          fill: color,
          text,
          fontSize,
          createdBy: userId,
          createdAt: new Date() as unknown as import('firebase/firestore').Timestamp,
          updatedAt: new Date() as unknown as import('firebase/firestore').Timestamp,
        };

        addLocalObject(newObject);
        await createObject(boardId, id, {
          type: 'text',
          x,
          y,
          width: newObject.width,
          height: newObject.height,
          rotation: 0,
          fill: color,
          text,
          fontSize,
          createdBy: userId,
        });

        return { id, success: true, message: `Created text: '${text}'` };
      }

      case 'moveObject': {
        const { objectId, x, y } = tool.arguments as {
          objectId: string;
          x: number;
          y: number;
        };

        updateLocalObject(objectId, { x, y });
        await updateObject(boardId, objectId, { x, y });

        return { success: true, message: `Moved object to (${x}, ${y})` };
      }

      case 'resizeObject': {
        const { objectId, width, height } = tool.arguments as {
          objectId: string;
          width: number;
          height: number;
        };

        updateLocalObject(objectId, { width, height });
        await updateObject(boardId, objectId, { width, height });

        return { success: true, message: `Resized object to ${width}x${height}` };
      }

      case 'updateText': {
        const { objectId, newText } = tool.arguments as {
          objectId: string;
          newText: string;
        };

        updateLocalObject(objectId, { text: newText });
        await updateObject(boardId, objectId, { text: newText });

        return { success: true, message: `Updated text to '${newText}'` };
      }

      case 'changeColor': {
        const { objectId, color } = tool.arguments as {
          objectId: string;
          color: string;
        };

        updateLocalObject(objectId, { fill: color });
        await updateObject(boardId, objectId, { fill: color });

        return { success: true, message: `Changed color to ${color}` };
      }

      case 'deleteObject': {
        const { objectId } = tool.arguments as { objectId: string };

        removeLocalObject(objectId);
        await deleteObject(boardId, objectId);

        return { success: true, message: 'Deleted object' };
      }

      case 'getBoardState': {
        const objects = getBoardObjects();
        return {
          objectCount: objects.length,
          objects: objects.map((obj) => ({
            id: obj.id,
            type: obj.type,
            x: obj.x,
            y: obj.y,
            width: obj.width,
            height: obj.height,
            text: obj.text,
            fill: obj.fill,
          })),
        };
      }

      case 'findObjects': {
        const { type, color, textContains } = tool.arguments as {
          type?: string;
          color?: string;
          textContains?: string;
        };

        let objects = getBoardObjects();

        if (type) {
          objects = objects.filter((obj) => obj.type === type);
        }
        if (color) {
          objects = objects.filter((obj) => obj.fill === color);
        }
        if (textContains) {
          objects = objects.filter((obj) =>
            obj.text?.toLowerCase().includes(textContains.toLowerCase())
          );
        }

        return {
          found: objects.length,
          objects: objects.map((obj) => ({
            id: obj.id,
            type: obj.type,
            text: obj.text,
            x: obj.x,
            y: obj.y,
          })),
        };
      }

      case 'arrangeInGrid': {
        const { objectIds, columns, spacing = 20, startX = 100, startY = 100 } =
          tool.arguments as {
            objectIds: string[];
            columns: number;
            spacing?: number;
            startX?: number;
            startY?: number;
          };

        const objects = getBoardObjects().filter((obj) =>
          objectIds.includes(obj.id)
        );

        for (let i = 0; i < objects.length; i++) {
          const row = Math.floor(i / columns);
          const col = i % columns;
          const obj = objects[i];

          const newX = startX + col * (obj.width + spacing);
          const newY = startY + row * (obj.height + spacing);

          updateLocalObject(obj.id, { x: newX, y: newY });
          await updateObject(boardId, obj.id, { x: newX, y: newY });
        }

        return {
          success: true,
          message: `Arranged ${objects.length} objects in a ${columns}-column grid`,
        };
      }

      case 'alignObjects': {
        const { objectIds, alignment } = tool.arguments as {
          objectIds: string[];
          alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';
        };

        const objects = getBoardObjects().filter((obj) =>
          objectIds.includes(obj.id)
        );

        if (objects.length === 0) {
          return { success: false, message: 'No objects found' };
        }

        let targetValue: number;

        switch (alignment) {
          case 'left':
            targetValue = Math.min(...objects.map((o) => o.x));
            for (const obj of objects) {
              updateLocalObject(obj.id, { x: targetValue });
              await updateObject(boardId, obj.id, { x: targetValue });
            }
            break;
          case 'right':
            targetValue = Math.max(...objects.map((o) => o.x + o.width));
            for (const obj of objects) {
              const newX = targetValue - obj.width;
              updateLocalObject(obj.id, { x: newX });
              await updateObject(boardId, obj.id, { x: newX });
            }
            break;
          case 'center':
            const centerX =
              (Math.min(...objects.map((o) => o.x)) +
                Math.max(...objects.map((o) => o.x + o.width))) /
              2;
            for (const obj of objects) {
              const newX = centerX - obj.width / 2;
              updateLocalObject(obj.id, { x: newX });
              await updateObject(boardId, obj.id, { x: newX });
            }
            break;
          case 'top':
            targetValue = Math.min(...objects.map((o) => o.y));
            for (const obj of objects) {
              updateLocalObject(obj.id, { y: targetValue });
              await updateObject(boardId, obj.id, { y: targetValue });
            }
            break;
          case 'bottom':
            targetValue = Math.max(...objects.map((o) => o.y + o.height));
            for (const obj of objects) {
              const newY = targetValue - obj.height;
              updateLocalObject(obj.id, { y: newY });
              await updateObject(boardId, obj.id, { y: newY });
            }
            break;
          case 'middle':
            const centerY =
              (Math.min(...objects.map((o) => o.y)) +
                Math.max(...objects.map((o) => o.y + o.height))) /
              2;
            for (const obj of objects) {
              const newY = centerY - obj.height / 2;
              updateLocalObject(obj.id, { y: newY });
              await updateObject(boardId, obj.id, { y: newY });
            }
            break;
        }

        return { success: true, message: `Aligned objects: ${alignment}` };
      }

      case 'distributeObjects': {
        const { objectIds, direction } = tool.arguments as {
          objectIds: string[];
          direction: 'horizontal' | 'vertical';
        };

        const objects = getBoardObjects()
          .filter((obj) => objectIds.includes(obj.id))
          .sort((a, b) =>
            direction === 'horizontal' ? a.x - b.x : a.y - b.y
          );

        if (objects.length < 3) {
          return {
            success: false,
            message: 'Need at least 3 objects to distribute',
          };
        }

        const first = objects[0];
        const last = objects[objects.length - 1];

        if (direction === 'horizontal') {
          const totalWidth = last.x + last.width - first.x;
          const objectsWidth = objects.reduce((sum, o) => sum + o.width, 0);
          const spacing = (totalWidth - objectsWidth) / (objects.length - 1);

          let currentX = first.x;
          for (const obj of objects) {
            updateLocalObject(obj.id, { x: currentX });
            await updateObject(boardId, obj.id, { x: currentX });
            currentX += obj.width + spacing;
          }
        } else {
          const totalHeight = last.y + last.height - first.y;
          const objectsHeight = objects.reduce((sum, o) => sum + o.height, 0);
          const spacing = (totalHeight - objectsHeight) / (objects.length - 1);

          let currentY = first.y;
          for (const obj of objects) {
            updateLocalObject(obj.id, { y: currentY });
            await updateObject(boardId, obj.id, { y: currentY });
            currentY += obj.height + spacing;
          }
        }

        return {
          success: true,
          message: `Distributed ${objects.length} objects ${direction}ly`,
        };
      }

      default:
        return { success: false, message: `Unknown tool: ${tool.name}` };
    }
  };

  return execute;
};
```

---

## Board Commands

### Command Examples

```typescript
// Creation commands
'Add a yellow sticky note that says 'User Research''
'Create a blue rectangle at position 100, 200'
'Add a frame called 'Sprint Planning''
'Create a text label 'Important''

// Manipulation commands
'Move all the pink sticky notes to the right side'
'Resize the frame to fit its contents'
'Change the sticky note color to green'
'Delete all the empty sticky notes'

// Layout commands
'Arrange these sticky notes in a grid'
'Create a 2x3 grid of sticky notes for pros and cons'
'Space these elements evenly'
'Align all rectangles to the left'

// Complex commands
'Create a SWOT analysis template with four quadrants'
'Build a user journey map with 5 stages'
'Set up a retrospective board with What Went Well, What Didn't, and Action Items columns'
```

### SWOT Template Implementation

The AI automatically handles complex commands by generating multiple tool calls:

```typescript
// User: 'Create a SWOT analysis template'
// AI generates:
[
  {
    name: 'createFrame',
    arguments: { title: 'Strengths', x: 100, y: 100, width: 300, height: 300 }
  },
  {
    name: 'createFrame',
    arguments: { title: 'Weaknesses', x: 420, y: 100, width: 300, height: 300 }
  },
  {
    name: 'createFrame',
    arguments: { title: 'Opportunities', x: 100, y: 420, width: 300, height: 300 }
  },
  {
    name: 'createFrame',
    arguments: { title: 'Threats', x: 420, y: 420, width: 300, height: 300 }
  }
]
```

---

## Multi-Step Operations

### AI Agent Planning

For complex commands, Kimi 2.5 plans and executes steps sequentially:

```typescript
// User: 'Create a Kanban board with To Do, In Progress, and Done columns'

// Step 1: AI queries current board state
// Step 2: AI plans the layout
// Step 3: AI executes multiple tool calls:
//   - createFrame('To Do', 100, 100, 300, 600)
//   - createFrame('In Progress', 420, 100, 300, 600)
//   - createFrame('Done', 740, 100, 300, 600)
//   - createStickyNote('Task 1', 120, 150, '#fef08a')
//   - ... (sample tasks)
// Step 4: AI confirms completion
```

### Sequential Execution Handler

```typescript
// In AIService, tool calls are executed sequentially
for (const toolCall of toolCalls) {
  const result = await this.onToolExecute({
    name: toolCall.function.name,
    arguments: JSON.parse(toolCall.function.arguments),
  });
  
  // Each result is collected for AI's final response
  toolResults.push({
    tool_call_id: toolCall.id,
    role: 'tool',
    content: JSON.stringify(result),
  });
}
```

---

## Context Management

### Board State Context

The AI receives current board state with each request:

```typescript
// Include in system message
const boardStateContext = {
  objectCount: objects.length,
  objects: objects.map((obj) => ({
    id: obj.id,
    type: obj.type,
    x: obj.x,
    y: obj.y,
    text: obj.text,
    fill: obj.fill,
  })),
};
```

### Conversation History

Maintain conversation context for follow-up commands:

```typescript
// Example conversation flow
// User: 'Add 3 sticky notes'
// AI: Creates 3 sticky notes
// User: 'Arrange them in a row'  <- AI knows which notes from context
// AI: Arranges the 3 sticky notes horizontally
```

---

## Error Handling

### API Error Handling

```typescript
export class AIError extends Error {
  constructor(
    message: string,
    public code: string,
    public isRetryable: boolean
  ) {
    super(message);
    this.name = 'AIError';
  }
}

const handleAIError = (error: unknown): never => {
  if (error instanceof OpenAI.APIError) {
    switch (error.status) {
      case 429:
        throw new AIError(
          'Rate limit exceeded. Please wait a moment.',
          'RATE_LIMITED',
          true
        );
      case 500:
      case 502:
      case 503:
        throw new AIError(
          'AI service temporarily unavailable.',
          'SERVICE_ERROR',
          true
        );
      case 401:
        throw new AIError(
          'Invalid API key.',
          'AUTH_ERROR',
          false
        );
      default:
        throw new AIError(
          `AI error: ${error.message}`,
          'UNKNOWN',
          false
        );
    }
  }
  throw error;
};
```

### Retry Logic

```typescript
const withRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (error instanceof AIError && !error.isRetryable) {
        throw error;
      }

      if (attempt < maxRetries - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, delay * Math.pow(2, attempt))
        );
      }
    }
  }

  throw lastError;
};
```

---

## Rate Limiting & Optimization

### Request Throttling

```typescript
import { RateLimiter } from 'limiter';

// 10 requests per minute for free tier
const limiter = new RateLimiter({
  tokensPerInterval: 10,
  interval: 'minute',
});

const throttledRequest = async <T>(fn: () => Promise<T>): Promise<T> => {
  await limiter.removeTokens(1);
  return fn();
};
```

### Token Optimization

```typescript
// Compact board state for context
const compactBoardState = (objects: IBoardObject[]): string => {
  return objects
    .map(
      (obj) =>
        `${obj.id}:${obj.type}@(${obj.x},${obj.y})${obj.text ? `:'${obj.text.slice(0, 20)}'` : ''}`
    )
    .join('|');
};

// Example output: 'abc123:sticky@(100,200):'Meeting Notes'|def456:rectangle@(300,100)'
```

### Caching Responses

```typescript
const responseCache = new Map<string, { response: string; timestamp: number }>();
const CACHE_TTL = 60000; // 1 minute

const getCachedResponse = (key: string): string | null => {
  const cached = responseCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.response;
  }
  return null;
};

const setCachedResponse = (key: string, response: string): void => {
  responseCache.set(key, { response, timestamp: Date.now() });
};
```

---

## Cost Analysis

### Pricing (Kimi 2.5 via Nvidia)

| Metric | Cost |
| ------- | ------- |
| Input tokens | $0.60 per 1M tokens |
| Output tokens | $3.00 per 1M tokens |
| Free tier | Development credits available |

### Estimating Costs

```typescript
interface ICommandTokenEstimate {
  inputTokens: number;
  outputTokens: number;
  totalCost: number;
}

const estimateCommandCost = (
  boardObjectCount: number,
  commandComplexity: 'simple' | 'medium' | 'complex'
): ICommandTokenEstimate => {
  // Base tokens
  const systemPromptTokens = 500;
  const boardStateTokens = boardObjectCount * 50; // ~50 tokens per object

  // Command complexity
  const complexityMultiplier = {
    simple: 1,
    medium: 2,
    complex: 4,
  };

  const userInputTokens = 50 * complexityMultiplier[commandComplexity];
  const outputTokens = 200 * complexityMultiplier[commandComplexity];

  const inputTokens = systemPromptTokens + boardStateTokens + userInputTokens;

  // Cost calculation
  const inputCost = (inputTokens / 1_000_000) * 0.6;
  const outputCost = (outputTokens / 1_000_000) * 3.0;

  return {
    inputTokens,
    outputTokens,
    totalCost: inputCost + outputCost,
  };
};
```

### Monthly Cost Projections

| Users | Commands/User/Month | Est. Monthly Cost |
| ------- | ------------------- | ----------------- |
| 100 | 10 | $0.50 - $2.00 |
| 1,000 | 10 | $5.00 - $20.00 |
| 10,000 | 10 | $50.00 - $200.00 |
| 100,000 | 10 | $500.00 - $2,000.00 |

**Assumptions**:

- Average 1,000 input tokens per command
- Average 300 output tokens per command
- Mix of simple (60%), medium (30%), complex (10%) commands

---

## Best Practices

1. **Always provide context**: Include board state in every request
2. **Batch operations**: Group related changes into single commands
3. **Handle failures gracefully**: Implement retry logic with exponential backoff
4. **Cache when possible**: Store common responses to reduce API calls
5. **Monitor usage**: Track token consumption and costs
6. **Test edge cases**: Empty boards, 500+ objects, malformed inputs
7. **Provide feedback**: Show loading states and execution progress
8. **Limit context size**: Truncate board state for very large boards

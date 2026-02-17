import type { ChatCompletionTool } from 'openai/resources/chat/completions';

export const boardTools: ChatCompletionTool[] = [
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
            description: 'Background color of the sticky note (e.g. #fef08a for yellow)',
            enum: ['#fef08a', '#fda4af', '#93c5fd', '#86efac', '#c4b5fd', '#fed7aa'],
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
          x: { type: 'number', description: 'X coordinate position' },
          y: { type: 'number', description: 'Y coordinate position' },
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
          x: { type: 'number', description: 'X coordinate position' },
          y: { type: 'number', description: 'Y coordinate position' },
          width: { type: 'number', description: 'Width of the frame' },
          height: { type: 'number', description: 'Height of the frame' },
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
          text: { type: 'string', description: 'The text content' },
          x: { type: 'number', description: 'X coordinate position' },
          y: { type: 'number', description: 'Y coordinate position' },
          fontSize: {
            type: 'number',
            description: 'Font size in pixels',
          },
          color: { type: 'string', description: 'Text color' },
        },
        required: ['text', 'x', 'y'],
      },
    },
  },
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
          x: { type: 'number', description: 'New X coordinate' },
          y: { type: 'number', description: 'New Y coordinate' },
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
          width: { type: 'number', description: 'New width' },
          height: { type: 'number', description: 'New height' },
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
  {
    type: 'function',
    function: {
      name: 'getBoardState',
      description: 'Gets the current state of all objects on the board for context',
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

export type ToolName = Extract<
  (typeof boardTools)[number],
  { type: 'function' }
>['function']['name'];

export interface IToolCall {
  name: ToolName;
  arguments: Record<string, unknown>;
}

import type { ChatCompletionTool } from 'openai/resources/chat/completions';

export const boardTools: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'createStickyNote',
      description:
        'Creates a new sticky note on the board. Never ask what the note should say—omit any unspecified parameter for default.',
      parameters: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description: 'The text content of the sticky note. Omit for default.',
          },
          x: {
            type: 'number',
            description: 'X coordinate. Omit for auto-placement.',
          },
          y: {
            type: 'number',
            description: 'Y coordinate. Omit for auto-placement.',
          },
          color: {
            type: 'string',
            description:
              'Background color: use a color name (yellow, pink, blue, green, purple, orange, red) or a hex code (e.g. #fef08a). Omit for default.',
          },
          fontSize: {
            type: 'number',
            description: 'Font size in pixels (e.g. 14–72). Omit for default.',
          },
          fontColor: {
            type: 'string',
            description: 'Font color as hex (e.g. #1e293b) or named color. Omit for default.',
          },
          opacity: {
            type: 'number',
            description: 'Opacity 0–1. Omit for default (1).',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'createShape',
      description:
        'Creates a new shape (rectangle, circle, or line) on the board. Never ask for position or size—omit any unspecified parameter for default.',
      parameters: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['rectangle', 'circle', 'line'],
            description: 'The type of shape to create',
          },
          x: { type: 'number', description: 'X coordinate. Omit for auto-placement.' },
          y: { type: 'number', description: 'Y coordinate. Omit for auto-placement.' },
          width: {
            type: 'number',
            description: 'Width of the shape. Omit for default.',
          },
          height: {
            type: 'number',
            description: 'Height of the shape. Omit for default.',
          },
          color: {
            type: 'string',
            description: 'Fill color. Omit for default.',
          },
        },
        required: ['type'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'createFrame',
      description:
        'Creates a frame to group and organize content areas. Never ask for title or position—omit any unspecified parameter for default.',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Title of the frame. Omit for default.',
          },
          x: { type: 'number', description: 'X coordinate. Omit for auto-placement.' },
          y: { type: 'number', description: 'Y coordinate. Omit for auto-placement.' },
          width: {
            type: 'number',
            description: 'Width. Omit for default.',
          },
          height: {
            type: 'number',
            description: 'Height. Omit for default.',
          },
        },
        required: [],
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
          fromAnchor: {
            type: 'string',
            enum: ['top', 'right', 'bottom', 'left'],
            description: 'Anchor point on the source object. Optional; default right.',
          },
          toAnchor: {
            type: 'string',
            enum: ['top', 'right', 'bottom', 'left'],
            description: 'Anchor point on the target object. Optional; default left.',
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
      description:
        'Creates a standalone text element on the board. Never ask what the text should say—omit any unspecified parameter for default.',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'The text content. Omit for default.' },
          x: { type: 'number', description: 'X coordinate. Omit for auto-placement.' },
          y: { type: 'number', description: 'Y coordinate. Omit for auto-placement.' },
          fontSize: {
            type: 'number',
            description: 'Font size in pixels. Omit for default.',
          },
          color: { type: 'string', description: 'Text color. Omit for default.' },
        },
        required: [],
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
      name: 'setFontSize',
      description: 'Sets the font size for a text or sticky note object (in pixels)',
      parameters: {
        type: 'object',
        properties: {
          objectId: {
            type: 'string',
            description: 'ID of the sticky note or text object',
          },
          fontSize: {
            type: 'number',
            description: 'Font size in pixels (e.g. 14, 16, 20)',
          },
        },
        required: ['objectId', 'fontSize'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'setFontColor',
      description: 'Sets font color for sticky notes and text elements',
      parameters: {
        type: 'object',
        properties: {
          objectId: {
            type: 'string',
            description: 'ID of the sticky note or text object',
          },
          color: {
            type: 'string',
            description: 'Font color as hex (e.g. #1e293b) or named color.',
          },
        },
        required: ['objectId', 'color'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'setStroke',
      description: 'Sets the stroke (border) color of a shape or connector',
      parameters: {
        type: 'object',
        properties: {
          objectId: {
            type: 'string',
            description: 'ID of the object',
          },
          color: {
            type: 'string',
            description: 'Stroke color (e.g. hex #000000)',
          },
        },
        required: ['objectId', 'color'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'setStrokeWidth',
      description: 'Sets the stroke (border) width of a shape or connector in pixels',
      parameters: {
        type: 'object',
        properties: {
          objectId: {
            type: 'string',
            description: 'ID of the object',
          },
          strokeWidth: {
            type: 'number',
            description: 'Stroke width in pixels',
          },
        },
        required: ['objectId', 'strokeWidth'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'setOpacity',
      description: 'Sets the opacity of an object (0 to 1, where 1 is fully opaque)',
      parameters: {
        type: 'object',
        properties: {
          objectId: {
            type: 'string',
            description: 'ID of the object',
          },
          opacity: {
            type: 'number',
            description: 'Opacity from 0 (transparent) to 1 (opaque)',
          },
        },
        required: ['objectId', 'opacity'],
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
      name: 'deleteObjects',
      description: 'Deletes multiple objects by ID. Use for bulk remove.',
      parameters: {
        type: 'object',
        properties: {
          objectIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'IDs of objects to delete',
          },
        },
        required: ['objectIds'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'duplicateObject',
      description:
        'Creates a copy of an object at an offset position. For connectors, the copy keeps the same from/to endpoints.',
      parameters: {
        type: 'object',
        properties: {
          objectId: {
            type: 'string',
            description: 'ID of the object to duplicate',
          },
          offsetX: {
            type: 'number',
            description: 'X offset for the copy. Optional; default 20.',
          },
          offsetY: {
            type: 'number',
            description: 'Y offset for the copy. Optional; default 20.',
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
            enum: ['sticky', 'rectangle', 'circle', 'line', 'text', 'frame', 'connector'],
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
  {
    type: 'function',
    function: {
      name: 'zoomToFitAll',
      description: 'Fits the entire board content in the viewport.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'zoomToSelection',
      description: 'Zooms the viewport to fit the specified objects in view.',
      parameters: {
        type: 'object',
        properties: {
          objectIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'IDs of objects to fit in view',
          },
        },
        required: ['objectIds'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'setZoomLevel',
      description: 'Sets the viewport zoom to the given percentage (50, 100, or 200).',
      parameters: {
        type: 'object',
        properties: {
          percent: {
            type: 'number',
            enum: [50, 100, 200],
            description: 'Zoom percentage',
          },
        },
        required: ['percent'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'exportBoardAsImage',
      description:
        'Exports the board as an image file (PNG or JPEG). Use viewport to export what is currently visible, or full to export the entire board.',
      parameters: {
        type: 'object',
        properties: {
          scope: {
            type: 'string',
            enum: ['viewport', 'full'],
            description: 'Viewport = current view; full = entire board content',
          },
          format: {
            type: 'string',
            enum: ['png', 'jpeg'],
            description: 'Image format',
          },
        },
        required: ['scope'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getRecentBoards',
      description:
        'Returns the current user’s recently opened boards (IDs and names) in last-opened order.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getFavoriteBoards',
      description: 'Returns the current user’s favorite (starred) boards (IDs and names).',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'toggleBoardFavorite',
      description:
        'Toggles the favorite (star) state for a board for the current user. Pass the board ID.',
      parameters: {
        type: 'object',
        properties: {
          boardId: {
            type: 'string',
            description: 'ID of the board to star or unstar',
          },
        },
        required: ['boardId'],
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

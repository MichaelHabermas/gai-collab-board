import type { ChatCompletionTool } from 'openai/resources/chat/completions';

const quadrantProperties = {
  type: 'object' as const,
  properties: {
    label: { type: 'string' as const },
    color: {
      type: 'string' as const,
      description: 'Color name (green, pink, blue, purple, orange, yellow, red) or hex',
    },
    items: { type: 'array' as const, items: { type: 'string' as const } },
  },
  required: ['label', 'items'],
};

export const compoundBoardTools: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'batchCreate',
      description:
        'Creates multiple objects in a single call. Use instead of repeated createStickyNote/createShape calls when adding 3+ objects at once.',
      parameters: {
        type: 'object',
        properties: {
          objects: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: ['sticky', 'rectangle', 'circle', 'line', 'text', 'frame'],
                },
                x: { type: 'number' },
                y: { type: 'number' },
                width: { type: 'number' },
                height: { type: 'number' },
                text: { type: 'string' },
                color: { type: 'string' },
                fontSize: { type: 'number' },
                opacity: { type: 'number' },
              },
              required: ['type', 'x', 'y'],
            },
            description: 'Array of objects to create. Each needs at least type, x, y.',
          },
        },
        required: ['objects'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'batchUpdate',
      description:
        'Updates multiple objects in a single call. Use instead of repeated moveObject/changeColor/resizeObject calls when modifying 3+ objects at once.',
      parameters: {
        type: 'object',
        properties: {
          updates: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                objectId: { type: 'string' },
                changes: {
                  type: 'object',
                  properties: {
                    x: { type: 'number' },
                    y: { type: 'number' },
                    width: { type: 'number' },
                    height: { type: 'number' },
                    fill: { type: 'string' },
                    text: { type: 'string' },
                    fontSize: { type: 'number' },
                    opacity: { type: 'number' },
                    stroke: { type: 'string' },
                    strokeWidth: { type: 'number' },
                    rotation: { type: 'number' },
                  },
                },
              },
              required: ['objectId', 'changes'],
            },
          },
        },
        required: ['updates'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'groupIntoFrame',
      description:
        'Creates a frame around the specified objects and groups them. Automatically computes size from bounding box. Use instead of manually creating a frame and positioning it.',
      parameters: {
        type: 'object',
        properties: {
          objectIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'IDs of objects to group',
          },
          title: {
            type: 'string',
            description: 'Title for the new frame',
          },
          padding: {
            type: 'number',
            description: 'Padding around objects. Default 30.',
          },
        },
        required: ['objectIds', 'title'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'connectSequence',
      description:
        'Creates connectors between objects in sequence (A->B->C->D). Use instead of N-1 individual createConnector calls when chaining objects.',
      parameters: {
        type: 'object',
        properties: {
          objectIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'Ordered list of object IDs to connect sequentially',
          },
          style: {
            type: 'string',
            enum: ['line', 'arrow', 'dashed'],
            description: 'Connector style. Default arrow.',
          },
          direction: {
            type: 'string',
            enum: ['horizontal', 'vertical'],
            description: 'Flow direction for anchor selection. Default horizontal.',
          },
        },
        required: ['objectIds'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'setArrowheads',
      description:
        'Sets the arrowhead mode on a connector: none, start, end, or both ends. Use for bidirectional arrows or removing arrowheads.',
      parameters: {
        type: 'object',
        properties: {
          objectId: {
            type: 'string',
            description: 'ID of the connector',
          },
          arrowheads: {
            type: 'string',
            enum: ['none', 'start', 'end', 'both'],
          },
        },
        required: ['objectId', 'arrowheads'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'setStrokeStyle',
      description: 'Sets the stroke style of a shape or connector to solid, dashed, or dotted.',
      parameters: {
        type: 'object',
        properties: {
          objectId: { type: 'string' },
          strokeStyle: {
            type: 'string',
            enum: ['solid', 'dashed', 'dotted'],
          },
        },
        required: ['objectId', 'strokeStyle'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'setRotation',
      description: 'Sets the rotation of an object in degrees (0-360).',
      parameters: {
        type: 'object',
        properties: {
          objectId: { type: 'string' },
          rotation: {
            type: 'number',
            description: 'Rotation in degrees (0-360)',
          },
        },
        required: ['objectId', 'rotation'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getObjectDetails',
      description:
        'Returns full details of a specific object including all properties (position, size, colors, stroke, opacity, connections, frame parent, etc.). Use when you need to inspect a single object thoroughly.',
      parameters: {
        type: 'object',
        properties: {
          objectId: {
            type: 'string',
            description: 'ID of the object to inspect',
          },
        },
        required: ['objectId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'createQuadrant',
      description:
        'Creates a complete quadrant/matrix diagram (e.g., SWOT analysis, impact/effort grid) in one call. Creates a frame with axis lines, quadrant labels, and sticky notes positioned automatically. Use instead of manually creating frames, lines, and stickies for 2x2 matrices.',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Title for the quadrant diagram (e.g., "SWOT Analysis")',
          },
          xAxisLabel: {
            type: 'string',
            description: 'Optional label for the horizontal axis',
          },
          yAxisLabel: {
            type: 'string',
            description: 'Optional label for the vertical axis',
          },
          quadrants: {
            type: 'object',
            properties: {
              topLeft: quadrantProperties,
              topRight: quadrantProperties,
              bottomLeft: quadrantProperties,
              bottomRight: quadrantProperties,
            },
            required: ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'],
          },
          x: {
            type: 'number',
            description: 'Optional X position. Auto-placed if omitted.',
          },
          y: {
            type: 'number',
            description: 'Optional Y position. Auto-placed if omitted.',
          },
        },
        required: ['title', 'quadrants'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'createColumnLayout',
      description:
        'Creates a column-based layout (e.g., kanban board, retrospective, pro/con list) in one call. Creates a frame with column headings and sticky notes. Use instead of manually creating frames and stickies for columnar layouts.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          columns: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                heading: { type: 'string' },
                color: {
                  type: 'string',
                  description: "Color name or hex for this column's stickies",
                },
                items: {
                  type: 'array',
                  items: { type: 'string' },
                },
              },
              required: ['heading', 'items'],
            },
          },
          x: {
            type: 'number',
            description: 'Optional X position',
          },
          y: {
            type: 'number',
            description: 'Optional Y position',
          },
        },
        required: ['title', 'columns'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'createFlowchart',
      description:
        'Creates a flowchart with automatic layout using the dagre algorithm. Specify nodes and edges declaratively; positions are computed automatically. Use for process flows, decision trees, and any directed graph visualization.',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Optional frame title',
          },
          direction: {
            type: 'string',
            enum: ['top-to-bottom', 'left-to-right'],
            description: 'Flow direction. Default top-to-bottom.',
          },
          nodes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  description: 'Unique node identifier (for referencing in edges)',
                },
                label: {
                  type: 'string',
                  description: 'Display text',
                },
                shape: {
                  type: 'string',
                  enum: ['rectangle', 'circle'],
                  description: 'Node shape. Default rectangle.',
                },
                color: {
                  type: 'string',
                  description: 'Fill color name or hex',
                },
              },
              required: ['id', 'label'],
            },
          },
          edges: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                from: {
                  type: 'string',
                  description: 'Source node id',
                },
                to: {
                  type: 'string',
                  description: 'Target node id',
                },
                label: {
                  type: 'string',
                  description: 'Optional edge label',
                },
              },
              required: ['from', 'to'],
            },
          },
          x: { type: 'number' },
          y: { type: 'number' },
        },
        required: ['nodes', 'edges'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'createMindMap',
      description:
        'Creates a radial mind map with a central topic and branches. Branches are distributed evenly around the center with their children on sub-arcs. Use for brainstorming, topic exploration, and hierarchical idea capture.',
      parameters: {
        type: 'object',
        properties: {
          centralTopic: {
            type: 'string',
            description: 'The central idea/topic text',
          },
          branches: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                label: {
                  type: 'string',
                  description: 'Branch topic',
                },
                color: {
                  type: 'string',
                  description: "Color for this branch's sticky notes",
                },
                children: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Child topics under this branch',
                },
              },
              required: ['label', 'children'],
            },
          },
          x: {
            type: 'number',
            description: 'Optional center X position',
          },
          y: {
            type: 'number',
            description: 'Optional center Y position',
          },
        },
        required: ['centralTopic', 'branches'],
      },
    },
  },
];

export type CompoundToolName = Extract<
  (typeof compoundBoardTools)[number],
  { type: 'function' }
>['function']['name'];

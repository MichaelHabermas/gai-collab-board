/**
 * AI Board Agent – Command Test Suite
 *
 * Tests that the toolExecutor correctly handles all required AI agent commands
 * across four categories: Creation, Manipulation, Layout, and Complex Commands.
 *
 * These tests validate the tool executor layer (not the LLM itself). Each test
 * simulates the tool call the LLM would emit for a given natural-language command
 * and asserts the correct createObject / updateObject / deleteObject calls are made.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import { createToolExecutor } from '@/modules/ai/toolExecutor';
import type { IBoardObject } from '@/types';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGetBoard = vi.fn();
const mockGetUserPreferences = vi.fn();
const mockToggleFavoriteBoardId = vi.fn();

vi.mock('@/modules/sync/boardService', () => ({
  getBoard: (id: string) => mockGetBoard(id),
}));

vi.mock('@/modules/sync/userPreferencesService', () => ({
  getUserPreferences: (userId: string) => mockGetUserPreferences(userId),
  toggleFavoriteBoardId: (userId: string, boardId: string) =>
    mockToggleFavoriteBoardId(userId, boardId),
}));

const mockCreateObject = vi.fn();
const mockUpdateObject = vi.fn();
const mockDeleteObject = vi.fn();

const now = Timestamp.now();
const BOARD_ID = 'board-test';
const USER_ID = 'user-test';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeObject(overrides: Partial<IBoardObject> & { id: string; type: string }): IBoardObject {
  return {
    x: 0,
    y: 0,
    width: 200,
    height: 120,
    rotation: 0,
    fill: '#fef08a',
    createdBy: USER_ID,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  } as IBoardObject;
}

function createContext(objects: IBoardObject[] = []) {
  return {
    boardId: BOARD_ID,
    createdBy: USER_ID,
    userId: USER_ID,
    getObjects: () => objects,
    createObject: mockCreateObject as (boardId: string, params: unknown) => Promise<IBoardObject>,
    updateObject: mockUpdateObject as (
      boardId: string,
      objectId: string,
      updates: unknown
    ) => Promise<void>,
    deleteObject: mockDeleteObject as (boardId: string, objectId: string) => Promise<void>,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AI Board Agent – Command Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateObject.mockResolvedValue({ id: 'new-id', type: 'sticky', x: 0, y: 0 });
    mockUpdateObject.mockResolvedValue(undefined);
    mockDeleteObject.mockResolvedValue(undefined);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORY 1: CREATION COMMANDS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Creation Commands', () => {
    // "Add a yellow sticky note that says 'User Research'"
    it('creates a yellow sticky note with specified text', async () => {
      const { execute } = createToolExecutor(createContext());
      const result = await execute({
        name: 'createStickyNote',
        arguments: { text: 'User Research', x: 100, y: 100, color: 'yellow' },
      });

      expect(mockCreateObject).toHaveBeenCalledWith(
        BOARD_ID,
        expect.objectContaining({
          type: 'sticky',
          text: 'User Research',
          fill: expect.stringMatching(/^#/), // resolved to hex
        })
      );
      expect(result).toMatchObject({ success: true });
    });

    // "Create a blue rectangle at position 100, 200"
    it('creates a blue rectangle at a specific position', async () => {
      const { execute } = createToolExecutor(createContext());
      const result = await execute({
        name: 'createShape',
        arguments: { type: 'rectangle', x: 100, y: 200, width: 150, height: 100, color: '#93c5fd' },
      });

      expect(mockCreateObject).toHaveBeenCalledWith(
        BOARD_ID,
        expect.objectContaining({
          type: 'rectangle',
          x: 100,
          y: 200,
          width: 150,
          height: 100,
          fill: '#93c5fd',
        })
      );
      expect(result).toMatchObject({ success: true, message: expect.stringContaining('rectangle') });
    });

    // "Add a frame called 'Sprint Planning'"
    it('creates a frame with a title', async () => {
      const { execute } = createToolExecutor(createContext());
      const result = await execute({
        name: 'createFrame',
        arguments: { title: 'Sprint Planning', x: 50, y: 50 },
      });

      expect(mockCreateObject).toHaveBeenCalledWith(
        BOARD_ID,
        expect.objectContaining({
          type: 'frame',
          text: 'Sprint Planning',
          x: 50,
          y: 50,
        })
      );
      expect(result).toMatchObject({ success: true, message: expect.stringContaining('Sprint Planning') });
    });

    // Additional creation: circle shape
    it('creates a circle shape', async () => {
      const { execute } = createToolExecutor(createContext());
      const result = await execute({
        name: 'createShape',
        arguments: { type: 'circle', x: 300, y: 300, width: 80, height: 80, color: '#86efac' },
      });

      expect(mockCreateObject).toHaveBeenCalledWith(
        BOARD_ID,
        expect.objectContaining({ type: 'circle', fill: '#86efac' })
      );
      expect(result).toMatchObject({ success: true });
    });

    // Additional creation: text element
    it('creates a standalone text element', async () => {
      const { execute } = createToolExecutor(createContext());
      const result = await execute({
        name: 'createText',
        arguments: { text: 'Header Title', x: 50, y: 20, fontSize: 24 },
      });

      expect(mockCreateObject).toHaveBeenCalledWith(
        BOARD_ID,
        expect.objectContaining({
          type: 'text',
          text: 'Header Title',
          fontSize: 24,
        })
      );
      expect(result).toMatchObject({ success: true });
    });

    // Additional creation: connector between two objects
    it('creates a connector between two existing objects', async () => {
      const objects = [
        makeObject({ id: 'src-1', type: 'sticky', x: 0, y: 0, width: 100, height: 80 }),
        makeObject({ id: 'tgt-1', type: 'sticky', x: 300, y: 0, width: 100, height: 80 }),
      ];
      const { execute } = createToolExecutor(createContext(objects));
      const result = await execute({
        name: 'createConnector',
        arguments: { fromId: 'src-1', toId: 'tgt-1', style: 'arrow' },
      });

      expect(mockCreateObject).toHaveBeenCalledWith(
        BOARD_ID,
        expect.objectContaining({
          type: 'connector',
          fromObjectId: 'src-1',
          toObjectId: 'tgt-1',
        })
      );
      expect(result).toMatchObject({ success: true });
    });

    // Connector error: missing target
    it('throws when connector target does not exist', async () => {
      const objects = [makeObject({ id: 'only', type: 'sticky' })];
      const { execute } = createToolExecutor(createContext(objects));

      await expect(
        execute({ name: 'createConnector', arguments: { fromId: 'only', toId: 'missing' } })
      ).rejects.toThrow(/not found/);
    });

    // Color name resolution for sticky notes
    it('resolves named colors (pink, green, purple, orange) to hex', async () => {
      const { execute } = createToolExecutor(createContext());
      for (const color of ['pink', 'green', 'purple', 'orange']) {
        mockCreateObject.mockClear();
        await execute({
          name: 'createStickyNote',
          arguments: { text: `${color} note`, x: 0, y: 0, color },
        });
        expect(mockCreateObject).toHaveBeenCalledWith(
          BOARD_ID,
          expect.objectContaining({ fill: expect.stringMatching(/^#/) })
        );
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORY 2: MANIPULATION COMMANDS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Manipulation Commands', () => {
    // "Move all the pink sticky notes to the right side"
    // Step 1: findObjects to locate pink stickies
    // Step 2: moveObject for each one
    it('finds objects by color then moves them', async () => {
      const pinkNote = makeObject({ id: 'pink-1', type: 'sticky', fill: '#f9a8d4', x: 50, y: 50 });
      const blueNote = makeObject({ id: 'blue-1', type: 'sticky', fill: '#93c5fd', x: 100, y: 100 });
      const ctx = createContext([pinkNote, blueNote]);
      const { execute } = createToolExecutor(ctx);

      // Find pink stickies
      const found = await execute({
        name: 'findObjects',
        arguments: { type: 'sticky', color: '#f9a8d4' },
      });
      expect(found).toMatchObject({ found: 1, objects: expect.arrayContaining([expect.objectContaining({ id: 'pink-1' })]) });

      // Move pink sticky to the right side
      await execute({
        name: 'moveObject',
        arguments: { objectId: 'pink-1', x: 800, y: 50 },
      });
      expect(mockUpdateObject).toHaveBeenCalledWith(BOARD_ID, 'pink-1', { x: 800, y: 50 });
    });

    // "Resize the frame to fit its contents"
    it('resizes an object to specified dimensions', async () => {
      const { execute } = createToolExecutor(createContext());
      const result = await execute({
        name: 'resizeObject',
        arguments: { objectId: 'frame-1', width: 600, height: 400 },
      });

      expect(mockUpdateObject).toHaveBeenCalledWith(BOARD_ID, 'frame-1', { width: 600, height: 400 });
      expect(result).toMatchObject({ success: true, message: expect.stringContaining('600x400') });
    });

    // "Change the sticky note color to green"
    it('changes an object color', async () => {
      const { execute } = createToolExecutor(createContext());
      const result = await execute({
        name: 'changeColor',
        arguments: { objectId: 'sticky-1', color: '#86efac' },
      });

      expect(mockUpdateObject).toHaveBeenCalledWith(BOARD_ID, 'sticky-1', { fill: '#86efac' });
      expect(result).toMatchObject({ success: true });
    });

    // Update text content
    it('updates text content of an object', async () => {
      const { execute } = createToolExecutor(createContext());
      const result = await execute({
        name: 'updateText',
        arguments: { objectId: 'sticky-1', newText: 'Updated Content' },
      });

      expect(mockUpdateObject).toHaveBeenCalledWith(BOARD_ID, 'sticky-1', { text: 'Updated Content' });
      expect(result).toMatchObject({ success: true });
    });

    // Set font size
    it('sets font size within valid range', async () => {
      const { execute } = createToolExecutor(createContext());
      const result = await execute({
        name: 'setFontSize',
        arguments: { objectId: 'text-1', fontSize: 20 },
      });

      expect(mockUpdateObject).toHaveBeenCalledWith(BOARD_ID, 'text-1', { fontSize: 20 });
      expect(result).toMatchObject({ success: true });
    });

    it('rejects font size outside 8-72 range', async () => {
      const { execute } = createToolExecutor(createContext());
      const tooSmall = await execute({ name: 'setFontSize', arguments: { objectId: 'x', fontSize: 3 } });
      const tooLarge = await execute({ name: 'setFontSize', arguments: { objectId: 'x', fontSize: 100 } });
      expect(tooSmall).toMatchObject({ success: false });
      expect(tooLarge).toMatchObject({ success: false });
      expect(mockUpdateObject).not.toHaveBeenCalled();
    });

    // Set font color on sticky vs text vs unsupported
    it('sets font color on sticky note (textFill)', async () => {
      const sticky = makeObject({ id: 'sticky-1', type: 'sticky' });
      const { execute } = createToolExecutor(createContext([sticky]));
      await execute({ name: 'setFontColor', arguments: { objectId: 'sticky-1', color: '#ef4444' } });
      expect(mockUpdateObject).toHaveBeenCalledWith(BOARD_ID, 'sticky-1', { textFill: '#ef4444' });
    });

    it('sets font color on text element (fill)', async () => {
      const text = makeObject({ id: 'text-1', type: 'text', fill: '#1e293b' });
      const { execute } = createToolExecutor(createContext([text]));
      await execute({ name: 'setFontColor', arguments: { objectId: 'text-1', color: '#3b82f6' } });
      expect(mockUpdateObject).toHaveBeenCalledWith(BOARD_ID, 'text-1', { fill: '#3b82f6' });
    });

    it('rejects font color on unsupported type (rectangle)', async () => {
      const rect = makeObject({ id: 'rect-1', type: 'rectangle' });
      const { execute } = createToolExecutor(createContext([rect]));
      const result = await execute({ name: 'setFontColor', arguments: { objectId: 'rect-1', color: '#fff' } });
      expect(result).toMatchObject({ success: false });
      expect(mockUpdateObject).not.toHaveBeenCalled();
    });

    // Stroke operations
    it('sets stroke color', async () => {
      const { execute } = createToolExecutor(createContext());
      const result = await execute({ name: 'setStroke', arguments: { objectId: 'obj-1', color: '#000' } });
      expect(mockUpdateObject).toHaveBeenCalledWith(BOARD_ID, 'obj-1', { stroke: '#000' });
      expect(result).toMatchObject({ success: true });
    });

    it('sets stroke width and rejects negative values', async () => {
      const { execute } = createToolExecutor(createContext());
      const ok = await execute({ name: 'setStrokeWidth', arguments: { objectId: 'obj-1', strokeWidth: 3 } });
      expect(ok).toMatchObject({ success: true });

      const bad = await execute({ name: 'setStrokeWidth', arguments: { objectId: 'obj-1', strokeWidth: -1 } });
      expect(bad).toMatchObject({ success: false });
    });

    // Opacity
    it('sets opacity and rejects out-of-range values', async () => {
      const { execute } = createToolExecutor(createContext());
      const ok = await execute({ name: 'setOpacity', arguments: { objectId: 'obj-1', opacity: 0.5 } });
      expect(ok).toMatchObject({ success: true });

      const bad = await execute({ name: 'setOpacity', arguments: { objectId: 'obj-1', opacity: 1.5 } });
      expect(bad).toMatchObject({ success: false });
      expect(mockUpdateObject).toHaveBeenCalledTimes(1); // only the valid call
    });

    // Delete
    it('deletes an object', async () => {
      const { execute } = createToolExecutor(createContext());
      await execute({ name: 'deleteObject', arguments: { objectId: 'doomed' } });
      expect(mockDeleteObject).toHaveBeenCalledWith(BOARD_ID, 'doomed');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORY 3: LAYOUT COMMANDS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Layout Commands', () => {
    // "Arrange these sticky notes in a grid"
    it('arranges objects in a grid layout', async () => {
      const objects = [
        makeObject({ id: 'g1', type: 'sticky', width: 100, height: 80 }),
        makeObject({ id: 'g2', type: 'sticky', width: 100, height: 80 }),
        makeObject({ id: 'g3', type: 'sticky', width: 100, height: 80 }),
        makeObject({ id: 'g4', type: 'sticky', width: 100, height: 80 }),
      ];
      const { execute } = createToolExecutor(createContext(objects));
      const result = await execute({
        name: 'arrangeInGrid',
        arguments: { objectIds: ['g1', 'g2', 'g3', 'g4'], columns: 2, spacing: 20, startX: 0, startY: 0 },
      });

      expect(mockUpdateObject).toHaveBeenCalledTimes(4);
      // Row 0: g1 at (0,0), g2 at (120,0)
      expect(mockUpdateObject).toHaveBeenCalledWith(BOARD_ID, 'g1', { x: 0, y: 0 });
      expect(mockUpdateObject).toHaveBeenCalledWith(BOARD_ID, 'g2', { x: 120, y: 0 });
      // Row 1: g3 at (0,100), g4 at (120,100)
      expect(mockUpdateObject).toHaveBeenCalledWith(BOARD_ID, 'g3', { x: 0, y: 100 });
      expect(mockUpdateObject).toHaveBeenCalledWith(BOARD_ID, 'g4', { x: 120, y: 100 });
      expect(result).toMatchObject({ success: true, message: expect.stringContaining('grid') });
    });

    // "Create a 2x3 grid of sticky notes for pros and cons"
    it('creates 6 sticky notes and arranges them in a 2x3 grid', async () => {
      const labels = ['Pro 1', 'Con 1', 'Pro 2', 'Con 2', 'Pro 3', 'Con 3'];
      const createdIds: string[] = [];

      // Simulate creating 6 sticky notes
      for (let i = 0; i < labels.length; i++) {
        const id = `pc-${i}`;
        createdIds.push(id);
        mockCreateObject.mockResolvedValueOnce({ id, type: 'sticky', x: 0, y: 0 });
      }

      const { execute } = createToolExecutor(createContext());

      for (let i = 0; i < labels.length; i++) {
        await execute({
          name: 'createStickyNote',
          arguments: { text: labels[i], x: 0, y: 0, color: i % 2 === 0 ? 'green' : 'pink' },
        });
      }

      expect(mockCreateObject).toHaveBeenCalledTimes(6);

      // Now arrange the created objects in a 2x3 grid
      const gridObjects = createdIds.map((id) =>
        makeObject({ id, type: 'sticky', width: 200, height: 120, x: 0, y: 0 })
      );
      const gridCtx = createContext(gridObjects);
      const { execute: gridExecute } = createToolExecutor(gridCtx);

      const gridResult = await gridExecute({
        name: 'arrangeInGrid',
        arguments: { objectIds: createdIds, columns: 2, spacing: 30, startX: 50, startY: 50 },
      });

      expect(gridResult).toMatchObject({ success: true });
      expect(mockUpdateObject).toHaveBeenCalledTimes(6);
    });

    // "Space these elements evenly" – horizontal distribute
    it('distributes objects evenly (horizontal)', async () => {
      const objects = [
        makeObject({ id: 'h1', type: 'sticky', x: 0, y: 0, width: 50, height: 50 }),
        makeObject({ id: 'h2', type: 'sticky', x: 100, y: 0, width: 50, height: 50 }),
        makeObject({ id: 'h3', type: 'sticky', x: 300, y: 0, width: 50, height: 50 }),
      ];
      const { execute } = createToolExecutor(createContext(objects));
      const result = await execute({
        name: 'distributeObjects',
        arguments: { objectIds: ['h1', 'h2', 'h3'], direction: 'horizontal' },
      });

      expect(mockUpdateObject).toHaveBeenCalledTimes(3);
      expect(result).toMatchObject({ success: true, message: expect.stringContaining('3 objects') });
    });

    // Distribute requires at least 3 objects
    it('rejects distribute with fewer than 3 objects', async () => {
      const objects = [
        makeObject({ id: 'v1', type: 'sticky', x: 0, y: 0, width: 50, height: 50 }),
        makeObject({ id: 'v2', type: 'sticky', x: 0, y: 100, width: 50, height: 50 }),
      ];
      const { execute } = createToolExecutor(createContext(objects));
      const result = await execute({
        name: 'distributeObjects',
        arguments: { objectIds: ['v1', 'v2'], direction: 'vertical' },
      });
      expect(result).toMatchObject({ success: false });
      expect(mockUpdateObject).not.toHaveBeenCalled();
    });

    // Align left
    it('aligns objects to the left', async () => {
      const objects = [
        makeObject({ id: 'a1', type: 'sticky', x: 50, y: 0, width: 100, height: 80 }),
        makeObject({ id: 'a2', type: 'sticky', x: 200, y: 0, width: 100, height: 80 }),
        makeObject({ id: 'a3', type: 'sticky', x: 150, y: 0, width: 100, height: 80 }),
      ];
      const { execute } = createToolExecutor(createContext(objects));
      const result = await execute({
        name: 'alignObjects',
        arguments: { objectIds: ['a1', 'a2', 'a3'], alignment: 'left' },
      });

      expect(result).toMatchObject({ success: true, message: expect.stringContaining('left') });
      // All should be aligned to the leftmost x (50)
      expect(mockUpdateObject).toHaveBeenCalledWith(BOARD_ID, 'a1', { x: 50 });
      expect(mockUpdateObject).toHaveBeenCalledWith(BOARD_ID, 'a2', { x: 50 });
      expect(mockUpdateObject).toHaveBeenCalledWith(BOARD_ID, 'a3', { x: 50 });
    });

    // Align with no matching objects
    it('returns failure when aligning non-existent objects', async () => {
      const { execute } = createToolExecutor(createContext([]));
      const result = await execute({
        name: 'alignObjects',
        arguments: { objectIds: ['nope'], alignment: 'center' },
      });
      expect(result).toMatchObject({ success: false, message: 'No objects found' });
    });

    // Distribute vertical
    it('distributes objects evenly (vertical)', async () => {
      const objects = [
        makeObject({ id: 'dv1', type: 'sticky', x: 0, y: 0, width: 50, height: 50 }),
        makeObject({ id: 'dv2', type: 'sticky', x: 0, y: 100, width: 50, height: 50 }),
        makeObject({ id: 'dv3', type: 'sticky', x: 0, y: 400, width: 50, height: 50 }),
      ];
      const { execute } = createToolExecutor(createContext(objects));
      const result = await execute({
        name: 'distributeObjects',
        arguments: { objectIds: ['dv1', 'dv2', 'dv3'], direction: 'vertical' },
      });

      expect(mockUpdateObject).toHaveBeenCalledTimes(3);
      expect(result).toMatchObject({ success: true, message: expect.stringContaining('vertically') });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORY 4: COMPLEX COMMANDS (Multi-step tool sequences)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Complex Commands', () => {
    // "Create a SWOT analysis template with four quadrants"
    // The AI would emit: 1 frame + 4 titled sticky notes (or 4 frames), then arrange them
    it('creates a SWOT analysis: 4 frames in a 2x2 grid', async () => {
      const swotLabels = ['Strengths', 'Weaknesses', 'Opportunities', 'Threats'];
      const frameIds: string[] = [];

      for (let i = 0; i < swotLabels.length; i++) {
        const id = `swot-frame-${i}`;
        frameIds.push(id);
        mockCreateObject.mockResolvedValueOnce({ id, type: 'frame', x: 0, y: 0 });
      }

      const { execute } = createToolExecutor(createContext());

      // Step 1: Create 4 frames
      for (let i = 0; i < swotLabels.length; i++) {
        const result = await execute({
          name: 'createFrame',
          arguments: {
            title: swotLabels[i],
            x: (i % 2) * 350,
            y: Math.floor(i / 2) * 250,
            width: 300,
            height: 200,
          },
        });
        expect(result).toMatchObject({ success: true });
      }

      expect(mockCreateObject).toHaveBeenCalledTimes(4);

      // Verify each frame was created with the right title
      for (let i = 0; i < swotLabels.length; i++) {
        expect(mockCreateObject).toHaveBeenCalledWith(
          BOARD_ID,
          expect.objectContaining({ type: 'frame', text: swotLabels[i] })
        );
      }
    });

    // "Build a user journey map with 5 stages"
    // The AI would create 5 frames + connectors between them
    it('creates a user journey map: 5 frames with connectors', async () => {
      const stages = ['Awareness', 'Consideration', 'Purchase', 'Retention', 'Advocacy'];
      const stageIds: string[] = [];

      for (let i = 0; i < stages.length; i++) {
        const id = `journey-${i}`;
        stageIds.push(id);
        mockCreateObject.mockResolvedValueOnce({ id, type: 'frame', x: i * 350, y: 100 });
      }

      const { execute } = createToolExecutor(createContext());

      // Create 5 stage frames
      for (let i = 0; i < stages.length; i++) {
        await execute({
          name: 'createFrame',
          arguments: { title: stages[i], x: i * 350, y: 100, width: 300, height: 200 },
        });
      }

      expect(mockCreateObject).toHaveBeenCalledTimes(5);

      // Now create connectors between consecutive stages
      const journeyObjects = stageIds.map((id, i) =>
        makeObject({ id, type: 'frame', x: i * 350, y: 100, width: 300, height: 200 })
      );
      const connectorCtx = createContext(journeyObjects);
      const { execute: connExec } = createToolExecutor(connectorCtx);

      for (let i = 0; i < stageIds.length - 1; i++) {
        mockCreateObject.mockResolvedValueOnce({
          id: `conn-${i}`,
          type: 'connector',
          x: 0,
          y: 0,
        } as unknown as IBoardObject);

        const result = await connExec({
          name: 'createConnector',
          arguments: { fromId: stageIds[i], toId: stageIds[i + 1], style: 'arrow' },
        });
        expect(result).toMatchObject({ success: true });
      }

      // 5 frames + 4 connectors = 9 total createObject calls
      expect(mockCreateObject).toHaveBeenCalledTimes(9);
    });

    // "Set up a retrospective board" (3 columns: What went well, What didn't, Action items)
    it('creates a retrospective template: 3 frames + header sticky notes', async () => {
      const columns = ['What Went Well', "What Didn't Go Well", 'Action Items'];
      const colors = ['green', 'pink', 'blue'];
      const createdItems: string[] = [];

      // 3 frames + 3 header stickies = 6 creates
      for (let i = 0; i < 6; i++) {
        const id = `retro-${i}`;
        createdItems.push(id);
        mockCreateObject.mockResolvedValueOnce({
          id,
          type: i < 3 ? 'frame' : 'sticky',
          x: 0,
          y: 0,
        } as unknown as IBoardObject);
      }

      const { execute } = createToolExecutor(createContext());

      // Create 3 frames
      for (let i = 0; i < columns.length; i++) {
        const result = await execute({
          name: 'createFrame',
          arguments: { title: columns[i], x: i * 350, y: 0, width: 300, height: 400 },
        });
        expect(result).toMatchObject({ success: true });
      }

      // Create header sticky notes inside each frame
      for (let i = 0; i < columns.length; i++) {
        const result = await execute({
          name: 'createStickyNote',
          arguments: { text: columns[i], x: i * 350 + 50, y: 50, color: colors[i] },
        });
        expect(result).toMatchObject({ success: true });
      }

      expect(mockCreateObject).toHaveBeenCalledTimes(6);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORY 5: QUERY & STATE COMMANDS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Query & State Commands', () => {
    it('returns board state with object count', async () => {
      const objects = [
        makeObject({ id: 'o1', type: 'sticky', text: 'Note 1' }),
        makeObject({ id: 'o2', type: 'rectangle' }),
      ];
      const { execute } = createToolExecutor(createContext(objects));
      const result = await execute({ name: 'getBoardState', arguments: { includeDetails: false } });

      expect(result).toMatchObject({
        objectCount: 2,
        objects: expect.arrayContaining([
          expect.objectContaining({ id: 'o1', type: 'sticky' }),
          expect.objectContaining({ id: 'o2', type: 'rectangle' }),
        ]),
      });
    });

    it('finds objects by type', async () => {
      const objects = [
        makeObject({ id: 's1', type: 'sticky', text: 'Note' }),
        makeObject({ id: 'r1', type: 'rectangle' }),
        makeObject({ id: 's2', type: 'sticky', text: 'Another' }),
      ];
      const { execute } = createToolExecutor(createContext(objects));
      const result = await execute({ name: 'findObjects', arguments: { type: 'sticky' } });
      expect(result).toMatchObject({ found: 2 });
    });

    it('finds objects by text content', async () => {
      const objects = [
        makeObject({ id: 's1', type: 'sticky', text: 'User Research' }),
        makeObject({ id: 's2', type: 'sticky', text: 'Design Sprint' }),
      ];
      const { execute } = createToolExecutor(createContext(objects));
      const result = await execute({ name: 'findObjects', arguments: { textContains: 'research' } });
      expect(result).toMatchObject({
        found: 1,
        objects: [expect.objectContaining({ id: 's1' })],
      });
    });

    it('finds objects by color', async () => {
      const objects = [
        makeObject({ id: 'p1', type: 'sticky', fill: '#f9a8d4' }),
        makeObject({ id: 'y1', type: 'sticky', fill: '#fef08a' }),
      ];
      const { execute } = createToolExecutor(createContext(objects));
      const result = await execute({ name: 'findObjects', arguments: { color: '#f9a8d4' } });
      expect(result).toMatchObject({ found: 1 });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORY 6: VIEWPORT & EXPORT COMMANDS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Viewport & Export Commands', () => {
    it('zoom to fit all objects', async () => {
      const onZoomToFitAll = vi.fn();
      const { execute } = createToolExecutor({ ...createContext(), onZoomToFitAll });
      const result = await execute({ name: 'zoomToFitAll', arguments: {} });
      expect(onZoomToFitAll).toHaveBeenCalledOnce();
      expect(result).toMatchObject({ success: true });
    });

    it('zoom to selection', async () => {
      const onZoomToSelection = vi.fn();
      const { execute } = createToolExecutor({ ...createContext(), onZoomToSelection });
      const result = await execute({ name: 'zoomToSelection', arguments: { objectIds: ['a', 'b'] } });
      expect(onZoomToSelection).toHaveBeenCalledWith(['a', 'b']);
      expect(result).toMatchObject({ success: true });
    });

    it('rejects zoom to empty selection', async () => {
      const { execute } = createToolExecutor(createContext());
      const result = await execute({ name: 'zoomToSelection', arguments: { objectIds: [] } });
      expect(result).toMatchObject({ success: false });
    });

    it('sets zoom level to allowed values', async () => {
      const onSetZoomLevel = vi.fn();
      const { execute } = createToolExecutor({ ...createContext(), onSetZoomLevel });

      for (const percent of [50, 100, 200]) {
        const result = await execute({ name: 'setZoomLevel', arguments: { percent } });
        expect(result).toMatchObject({ success: true });
      }
      expect(onSetZoomLevel).toHaveBeenCalledTimes(3);
    });

    it('rejects invalid zoom level', async () => {
      const { execute } = createToolExecutor(createContext());
      const result = await execute({ name: 'setZoomLevel', arguments: { percent: 75 } });
      expect(result).toMatchObject({ success: false });
    });

    it('exports viewport as PNG', async () => {
      const onExportViewport = vi.fn();
      const { execute } = createToolExecutor({ ...createContext(), onExportViewport });
      const result = await execute({ name: 'exportBoardAsImage', arguments: { scope: 'viewport', format: 'png' } });
      expect(onExportViewport).toHaveBeenCalledWith('png');
      expect(result).toMatchObject({ success: true });
    });

    it('exports full board as JPEG', async () => {
      const onExportFullBoard = vi.fn();
      const { execute } = createToolExecutor({ ...createContext(), onExportFullBoard });
      const result = await execute({ name: 'exportBoardAsImage', arguments: { scope: 'full', format: 'jpeg' } });
      expect(onExportFullBoard).toHaveBeenCalledWith('jpeg');
      expect(result).toMatchObject({ success: true });
    });

    it('rejects invalid export scope', async () => {
      const { execute } = createToolExecutor(createContext());
      const result = await execute({ name: 'exportBoardAsImage', arguments: { scope: 'invalid' } });
      expect(result).toMatchObject({ success: false });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CATEGORY 7: BOARD MANAGEMENT COMMANDS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Board Management Commands', () => {
    it('retrieves recent boards', async () => {
      mockGetUserPreferences.mockResolvedValue({ recentBoardIds: ['b1', 'b2'], favoriteBoardIds: [] });
      mockGetBoard
        .mockResolvedValueOnce({ id: 'b1', name: 'Board One' })
        .mockResolvedValueOnce({ id: 'b2', name: 'Board Two' });

      const { execute } = createToolExecutor(createContext());
      const result = await execute({ name: 'getRecentBoards', arguments: {} });
      expect(result).toMatchObject({
        recentBoardIds: ['b1', 'b2'],
        boards: expect.arrayContaining([
          expect.objectContaining({ name: 'Board One' }),
        ]),
      });
    });

    it('retrieves favorite boards', async () => {
      mockGetUserPreferences.mockResolvedValue({ recentBoardIds: [], favoriteBoardIds: ['fav1'] });
      mockGetBoard.mockResolvedValueOnce({ id: 'fav1', name: 'Favorite' });

      const { execute } = createToolExecutor(createContext());
      const result = await execute({ name: 'getFavoriteBoards', arguments: {} });
      expect(result).toMatchObject({ favoriteBoardIds: ['fav1'] });
    });

    it('toggles board favorite on', async () => {
      mockToggleFavoriteBoardId.mockResolvedValue(undefined);
      mockGetUserPreferences.mockResolvedValue({ recentBoardIds: [], favoriteBoardIds: ['my-board'] });

      const { execute } = createToolExecutor(createContext());
      const result = await execute({ name: 'toggleBoardFavorite', arguments: { boardId: 'my-board' } });
      expect(result).toMatchObject({ success: true, isFavorite: true });
    });

    it('rejects toggle favorite without boardId', async () => {
      const { execute } = createToolExecutor(createContext());
      const result = await execute({ name: 'toggleBoardFavorite', arguments: {} });
      expect(result).toMatchObject({ success: false });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EDGE CASES & ERROR HANDLING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Edge Cases & Error Handling', () => {
    it('returns failure for unknown tool name', async () => {
      const { execute } = createToolExecutor(createContext());
      const result = await execute({
        name: 'nonExistentTool' as 'createStickyNote',
        arguments: {},
      });
      expect(result).toMatchObject({ success: false, message: expect.stringContaining('Unknown tool') });
    });

    it('handles createStickyNote with only required fields (no color)', async () => {
      const { execute } = createToolExecutor(createContext());
      await execute({
        name: 'createStickyNote',
        arguments: { text: 'Minimal', x: 0, y: 0 },
      });
      expect(mockCreateObject).toHaveBeenCalledWith(
        BOARD_ID,
        expect.objectContaining({ type: 'sticky', text: 'Minimal', fill: '#fef08a' }) // default yellow
      );
    });

    it('clamps font size and opacity on createStickyNote', async () => {
      const { execute } = createToolExecutor(createContext());
      await execute({
        name: 'createStickyNote',
        arguments: { text: 'Clamped', x: 0, y: 0, fontSize: 200, opacity: 5 },
      });
      expect(mockCreateObject).toHaveBeenCalledWith(
        BOARD_ID,
        expect.objectContaining({ fontSize: 72, opacity: 1 })
      );
    });

    it('creates a line shape with computed points', async () => {
      const { execute } = createToolExecutor(createContext());
      await execute({
        name: 'createShape',
        arguments: { type: 'line', x: 10, y: 20, width: 100, height: 50 },
      });
      expect(mockCreateObject).toHaveBeenCalledWith(
        BOARD_ID,
        expect.objectContaining({ type: 'line', points: [0, 0, 100, 50] })
      );
    });

    it('frame defaults to 300x200 when no width/height given', async () => {
      const { execute } = createToolExecutor(createContext());
      await execute({
        name: 'createFrame',
        arguments: { title: 'Default Size', x: 0, y: 0 },
      });
      expect(mockCreateObject).toHaveBeenCalledWith(
        BOARD_ID,
        expect.objectContaining({ width: 300, height: 200 })
      );
    });

    it('grid arrangeInGrid uses default spacing and start position', async () => {
      const objects = [
        makeObject({ id: 'def1', type: 'sticky', width: 100, height: 80 }),
        makeObject({ id: 'def2', type: 'sticky', width: 100, height: 80 }),
      ];
      const { execute } = createToolExecutor(createContext(objects));
      await execute({
        name: 'arrangeInGrid',
        arguments: { objectIds: ['def1', 'def2'], columns: 2 },
      });
      // Default startX=100, startY=100, spacing=20
      expect(mockUpdateObject).toHaveBeenCalledWith(BOARD_ID, 'def1', { x: 100, y: 100 });
      expect(mockUpdateObject).toHaveBeenCalledWith(BOARD_ID, 'def2', { x: 220, y: 100 });
    });

    it('exportBoardAsImage defaults format to png', async () => {
      const onExportViewport = vi.fn();
      const { execute } = createToolExecutor({ ...createContext(), onExportViewport });
      await execute({ name: 'exportBoardAsImage', arguments: { scope: 'viewport' } });
      expect(onExportViewport).toHaveBeenCalledWith('png');
    });

    it('viewport commands return stub when callbacks not provided', async () => {
      const { execute } = createToolExecutor(createContext());
      const zoomFit = await execute({ name: 'zoomToFitAll', arguments: {} });
      expect(zoomFit).toMatchObject({ success: true });

      const zoomSel = await execute({ name: 'zoomToSelection', arguments: { objectIds: ['x'] } });
      expect(zoomSel).toMatchObject({ success: true });

      const zoomLvl = await execute({ name: 'setZoomLevel', arguments: { percent: 100 } });
      expect(zoomLvl).toMatchObject({ success: true });
    });
  });
});

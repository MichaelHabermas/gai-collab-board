import type { IHistoryCommand, IHistoryEntry } from '@/types/history';
import type { IBoardObject, ICreateObjectParams, IUpdateObjectParams } from '@/types';

interface IHistoryExecutionContext {
  createObject: (params: Omit<ICreateObjectParams, 'createdBy'>) => Promise<IBoardObject | null>;
  updateObject: (objectId: string, updates: IUpdateObjectParams) => Promise<void>;
  deleteObject: (objectId: string) => Promise<void>;
  getObjects: () => IBoardObject[];
}

/**
 * Applies the inverse of a single command (for undo).
 */
const executeUndoCommand = async (
  cmd: IHistoryCommand,
  ctx: IHistoryExecutionContext
): Promise<void> => {
  switch (cmd.type) {
    case 'create':
      // Undo create → delete the object
      await ctx.deleteObject(cmd.objectId);
      break;

    case 'delete':
      // Undo delete → recreate with original data
      if (cmd.before) {
        const { id, createdAt, updatedAt, createdBy, ...rest } = cmd.before;
        await ctx.createObject({ ...rest, createdBy } as Omit<ICreateObjectParams, 'createdBy'>);
      }
      break;

    case 'update':
      // Undo update → apply the `before` state
      if (cmd.before) {
        const { id, createdAt, updatedAt, createdBy, ...updates } = cmd.before;
        await ctx.updateObject(cmd.objectId, updates as IUpdateObjectParams);
      }
      break;
  }
};

/**
 * Applies a single command forward (for redo).
 */
const executeRedoCommand = async (
  cmd: IHistoryCommand,
  ctx: IHistoryExecutionContext
): Promise<void> => {
  switch (cmd.type) {
    case 'create':
      // Redo create → recreate
      if (cmd.after) {
        const { id, createdAt, updatedAt, createdBy, ...rest } = cmd.after as IBoardObject;
        await ctx.createObject({ ...rest, createdBy } as Omit<ICreateObjectParams, 'createdBy'>);
      }
      break;

    case 'delete':
      // Redo delete → delete again
      await ctx.deleteObject(cmd.objectId);
      break;

    case 'update':
      // Redo update → apply the `after` state
      if (cmd.after) {
        const { id, createdAt, updatedAt, createdBy, ...updates } = cmd.after as IBoardObject;
        await ctx.updateObject(cmd.objectId, updates as IUpdateObjectParams);
      }
      break;
  }
};

/**
 * Execute a full undo for a history entry (batch of commands).
 * Commands are reversed in order (last command undone first).
 */
export const executeUndo = async (
  entry: IHistoryEntry,
  ctx: IHistoryExecutionContext
): Promise<void> => {
  // Reverse order: undo the last command first
  for (let i = entry.length - 1; i >= 0; i--) {
    const cmd = entry[i];
    if (cmd) {
      try {
        await executeUndoCommand(cmd, ctx);
      } catch {
        // Best effort — object may have been externally deleted
      }
    }
  }
};

/**
 * Execute a full redo for a history entry (batch of commands).
 * Commands are applied in original order.
 */
export const executeRedo = async (
  entry: IHistoryEntry,
  ctx: IHistoryExecutionContext
): Promise<void> => {
  for (const cmd of entry) {
    try {
      await executeRedoCommand(cmd, ctx);
    } catch {
      // Best effort
    }
  }
};

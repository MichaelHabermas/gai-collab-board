/**
 * Command dispatcher for AI CRUD commands (Constitution Article IV).
 * Routes validated AICommand discriminated union to IBoardRepository methods.
 * SRP: validates and dispatches only — persistence is the repository's concern.
 */

import type { AICommand, AICommandAction, ICommandResult } from '@/types/aiCommand';
import type { IBoardObject, IBoardRepository, ICreateObjectParams } from '@/types';
import { validateCommand } from './commandValidator';

const VALID_ACTIONS: ReadonlySet<string> = new Set<AICommandAction>(['CREATE', 'UPDATE', 'DELETE']);

export interface ICommandDispatcherConfig {
  boardId: string;
  createdBy: string;
  repository: IBoardRepository;
  getObjects: () => IBoardObject[];
}

export interface ICommandDispatcher {
  applyCommand(command: AICommand): Promise<ICommandResult>;
  applyCommands(commands: AICommand[]): Promise<ICommandResult[]>;
  applyRaw(input: unknown): Promise<ICommandResult>;
}

export function createCommandDispatcher(config: ICommandDispatcherConfig): ICommandDispatcher {
  const { boardId, createdBy, repository, getObjects } = config;

  function objectExists(objectId: string): boolean {
    return getObjects().some((obj) => obj.id === objectId);
  }

  async function applyCommand(command: AICommand): Promise<ICommandResult> {
    try {
      switch (command.action) {
        case 'CREATE': {
          const params: ICreateObjectParams = {
            ...command.payload,
            createdBy,
          };
          const created = await repository.createObject(boardId, params);

          return { success: true, action: 'CREATE', objectId: created.id };
        }
        case 'UPDATE': {
          const { objectId, updates } = command.payload;
          if (!objectExists(objectId)) {
            return {
              success: false,
              action: 'UPDATE',
              objectId,
              error: `Object not found: ${objectId}`,
            };
          }

          await repository.updateObject(boardId, objectId, updates);

          return { success: true, action: 'UPDATE', objectId };
        }
        case 'DELETE': {
          const { objectId } = command.payload;
          if (!objectExists(objectId)) {
            return {
              success: false,
              action: 'DELETE',
              objectId,
              error: `Object not found: ${objectId}`,
            };
          }

          await repository.deleteObject(boardId, objectId);

          return { success: true, action: 'DELETE', objectId };
        }
      }
    } catch (err) {
      return {
        success: false,
        action: command.action,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async function applyCommands(commands: AICommand[]): Promise<ICommandResult[]> {
    const results: ICommandResult[] = [];
    for (const command of commands) {
      results.push(await applyCommand(command));
    }

    return results;
  }

  function isValidAction(value: string): value is AICommandAction {
    return VALID_ACTIONS.has(value);
  }

  function extractAction(input: unknown): AICommandAction {
    if (typeof input === 'object' && input && 'action' in input) {
      const candidate = String(input.action);
      if (isValidAction(candidate)) {
        return candidate;
      }
    }

    return 'CREATE';
  }

  async function applyRaw(input: unknown): Promise<ICommandResult> {
    const validation = validateCommand(input);
    if (!validation.valid) {
      return {
        success: false,
        action: extractAction(input),
        error: `Validation failed: ${validation.errors.join('; ')}`,
      };
    }

    return applyCommand(validation.command);
  }

  return { applyCommand, applyCommands, applyRaw };
}

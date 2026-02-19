import type { IBoardObject } from './board';

/** A single atomic change that can be undone/redone. */
export interface IHistoryCommand {
  type: 'create' | 'update' | 'delete';
  objectId: string;
  /** Full object state before the change (for update rollback / delete restore). */
  before?: IBoardObject;
  /** Full object state after the change (for create restore / update redo). */
  after?: Partial<IBoardObject>;
}

/** A batch of commands that should be undone/redone as a single step. */
export type IHistoryEntry = IHistoryCommand[];

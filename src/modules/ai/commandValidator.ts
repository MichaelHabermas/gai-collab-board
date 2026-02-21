/**
 * Command validator for AI CRUD commands (Constitution Article IV).
 * Validates payloads against the discriminated union schema before execution.
 * Uses type guards for narrowing; `as` casts at the boundary are justified
 * because this function accepts `unknown` input and validates the full shape.
 */

import type {
  AICommand,
  ICreateCommandPayload,
  IUpdateCommandPayload,
  IDeleteCommandPayload,
} from '@/types/aiCommand';
import type { ShapeType } from '@/types';

const VALID_SHAPE_TYPES: ReadonlySet<string> = new Set<ShapeType>([
  'sticky',
  'rectangle',
  'circle',
  'line',
  'text',
  'frame',
  'connector',
]);

const VALID_ACTIONS: ReadonlySet<string> = new Set(['CREATE', 'UPDATE', 'DELETE']);

export interface IValidationSuccess {
  valid: true;
  command: AICommand;
}

export interface IValidationFailure {
  valid: false;
  errors: string[];
}

export type ValidationResult = IValidationSuccess | IValidationFailure;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !Number.isNaN(value);
}

function isValidShapeType(value: unknown): value is ShapeType {
  return isString(value) && VALID_SHAPE_TYPES.has(value);
}

function collectCreateErrors(payload: Record<string, unknown>): string[] {
  const errors: string[] = [];

  if (!isValidShapeType(payload.type)) {
    errors.push(`CREATE payload.type must be one of: ${[...VALID_SHAPE_TYPES].join(', ')}`);
  }

  if (!isNumber(payload.x)) {
    errors.push('CREATE payload.x must be a number');
  }

  if (!isNumber(payload.y)) {
    errors.push('CREATE payload.y must be a number');
  }

  if (!isNumber(payload.width)) {
    errors.push('CREATE payload.width must be a number');
  }

  if (!isNumber(payload.height)) {
    errors.push('CREATE payload.height must be a number');
  }

  if (!isString(payload.fill)) {
    errors.push('CREATE payload.fill must be a string');
  }

  return errors;
}

function collectUpdateErrors(payload: Record<string, unknown>): string[] {
  const errors: string[] = [];

  if (!isString(payload.objectId) || payload.objectId.length === 0) {
    errors.push('UPDATE payload.objectId must be a non-empty string');
  }

  if (!isRecord(payload.updates)) {
    errors.push('UPDATE payload.updates must be an object');

    return errors;
  }

  if (Object.keys(payload.updates).length === 0) {
    errors.push('UPDATE payload.updates must not be empty');
  }

  return errors;
}

function collectDeleteErrors(payload: Record<string, unknown>): string[] {
  const errors: string[] = [];

  if (!isString(payload.objectId) || payload.objectId.length === 0) {
    errors.push('DELETE payload.objectId must be a non-empty string');
  }

  return errors;
}

/**
 * Validate an unknown input against the AICommand discriminated union.
 * Returns { valid: true, command } or { valid: false, errors }.
 */
export function validateCommand(input: unknown): ValidationResult {
  if (!isRecord(input)) {
    return { valid: false, errors: ['Command must be an object'] };
  }

  if (!isString(input.action) || !VALID_ACTIONS.has(input.action)) {
    return {
      valid: false,
      errors: [`Command action must be one of: ${[...VALID_ACTIONS].join(', ')}`],
    };
  }

  if (!('payload' in input) || !isRecord(input.payload)) {
    return { valid: false, errors: ['Command must have a payload object'] };
  }

  const { action, payload } = input;

  switch (action) {
    case 'CREATE': {
      const errors = collectCreateErrors(payload);
      if (errors.length > 0) {
        return { valid: false, errors };
      }

      return {
        valid: true,
        command: {
          action: 'CREATE',
          payload: payload as unknown as ICreateCommandPayload,
        },
      };
    }
    case 'UPDATE': {
      const errors = collectUpdateErrors(payload);
      if (errors.length > 0) {
        return { valid: false, errors };
      }

      return {
        valid: true,
        command: {
          action: 'UPDATE',
          payload: payload as unknown as IUpdateCommandPayload,
        },
      };
    }
    case 'DELETE': {
      const errors = collectDeleteErrors(payload);
      if (errors.length > 0) {
        return { valid: false, errors };
      }

      return {
        valid: true,
        command: {
          action: 'DELETE',
          payload: payload as unknown as IDeleteCommandPayload,
        },
      };
    }
    default:
      return { valid: false, errors: [`Unknown action: ${String(action)}`] };
  }
}

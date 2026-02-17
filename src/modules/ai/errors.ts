export class AIError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = 'AIError';
    Object.setPrototypeOf(this, AIError.prototype);
  }
}

export const isRetryableError = (error: unknown): boolean => {
  if (error instanceof AIError && error.status != null) {
    return error.status === 429 || (error.status >= 500 && error.status < 600);
  }
  if (error instanceof Error && 'status' in error) {
    const status = (error as Error & { status?: number }).status;
    return status === 429 || (status != null && status >= 500 && status < 600);
  }
  return false;
};

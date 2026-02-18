/**
 * Builds the shareable URL for a board (deep-link).
 * Format: {origin}/board/{boardId}
 */
export function getBoardShareLink(origin: string, boardId: string): string {
  const base = origin.replace(/\/$/, '');
  return `${base}/board/${boardId}`;
}

/**
 * Global constants for the app.
 * GUEST_BOARD_ID is the single shared board anyone can open without signing in.
 */

export const GUEST_BOARD_ID = 'guest';

export function isGuestBoard(boardId: string): boolean {
  return boardId === GUEST_BOARD_ID;
}

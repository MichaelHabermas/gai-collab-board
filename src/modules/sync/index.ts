// Board service exports
export {
  createBoard,
  getBoard,
  subscribeToBoard,
  updateBoardName,
  updateBoardMembers,
  addBoardMember,
  removeBoardMember,
  updateMemberRole,
  deleteBoard,
  getUserRole,
  canUserEdit,
  canUserManage,
  type ICreateBoardParams,
} from './boardService';

// Realtime service exports (cursors, presence, connection)
export {
  updateCursor,
  subscribeToCursors,
  removeCursor,
  setupCursorDisconnectHandler,
  updatePresence,
  subscribeToPresence,
  removePresence,
  setupPresenceDisconnectHandler,
  subscribeToConnectionStatus,
  getUserColor,
  type ICursorData,
  type IPresenceData,
} from './realtimeService';

// Object service exports
export {
  createObject,
  createObjectsBatch,
  updateObject,
  updateObjectsBatch,
  deleteObject,
  deleteObjectsBatch,
  subscribeToObjects,
  mergeObjectUpdates,
  type ICreateObjectParams,
  type IUpdateObjectParams,
} from './objectService';

// User preferences exports
export {
  getUserPreferences,
  updateRecentBoardIds,
  toggleFavoriteBoardId,
  removeBoardIdFromPreferences,
  subscribeToUserPreferences,
} from './userPreferencesService';

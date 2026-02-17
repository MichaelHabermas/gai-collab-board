import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Timestamp } from "firebase/firestore";
import type { IBoardObject } from "@/types";

// Mock Firebase services
const mockFirestoreOnSnapshot = vi.fn();
const mockRealtimeOnValue = vi.fn();
const mockFirestoreSetDoc = vi.fn();
const mockFirestoreUpdateDoc = vi.fn();
const mockFirestoreDeleteDoc = vi.fn();
const mockRealtimeSet = vi.fn();
const mockRealtimeRemove = vi.fn();

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(() => ({ path: "boards/test-board/objects" })),
  doc: vi.fn(() => ({ id: "test-object-id" })),
  setDoc: (ref: unknown, data: unknown) => mockFirestoreSetDoc(ref, data),
  updateDoc: (ref: unknown, data: unknown) => mockFirestoreUpdateDoc(ref, data),
  deleteDoc: (ref: unknown) => mockFirestoreDeleteDoc(ref),
  onSnapshot: (query: unknown, callback: (snapshot: unknown) => void) => {
    mockFirestoreOnSnapshot(query, callback);
    return vi.fn(); // unsubscribe
  },
  query: vi.fn((ref) => ref),
  orderBy: vi.fn(),
  writeBatch: vi.fn(() => ({
    set: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    commit: vi.fn(),
  })),
  Timestamp: {
    now: () => ({
      seconds: Math.floor(Date.now() / 1000),
      nanoseconds: 0,
      toMillis: () => Date.now(),
    }),
  },
}));

vi.mock("firebase/database", () => ({
  ref: vi.fn(() => ({ path: "test-path" })),
  set: (ref: unknown, data: unknown) => mockRealtimeSet(ref, data),
  remove: (ref: unknown) => mockRealtimeRemove(ref),
  onValue: (ref: unknown, callback: (snapshot: unknown) => void) => {
    mockRealtimeOnValue(ref, callback);
    return vi.fn(); // unsubscribe
  },
  onDisconnect: vi.fn(() => ({ remove: vi.fn() })),
}));

vi.mock("@/lib/firebase", () => ({
  firestore: {},
  realtimeDb: {},
}));

describe("Canvas Operations Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("Object CRUD Operations", () => {
    it("should create objects with all required fields", async () => {
      const { createObject } = await import("@/modules/sync/objectService");

      const boardId = "test-board";
      const objectParams = {
        type: "sticky" as const,
        x: 100,
        y: 100,
        width: 200,
        height: 200,
        fill: "#fef08a",
        text: "Test sticky note",
        createdBy: "user-1",
      };

      await createObject(boardId, objectParams);

      expect(mockFirestoreSetDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          type: "sticky",
          x: 100,
          y: 100,
          width: 200,
          height: 200,
          fill: "#fef08a",
          text: "Test sticky note",
          createdBy: "user-1",
          rotation: 0,
        })
      );
    });

    it("should create line objects with points field", async () => {
      const { createObject } = await import("@/modules/sync/objectService");

      const boardId = "test-board";
      const lineParams = {
        type: "line" as const,
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        fill: "transparent",
        stroke: "#000000",
        strokeWidth: 2,
        points: [0, 0, 100, 100],
        createdBy: "user-1",
      };

      await createObject(boardId, lineParams);

      expect(mockFirestoreSetDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          type: "line",
          points: [0, 0, 100, 100],
          stroke: "#000000",
          strokeWidth: 2,
        })
      );
    });

    it("should create connector objects with points field", async () => {
      const { createObject } = await import("@/modules/sync/objectService");

      const boardId = "test-board";
      const connectorParams = {
        type: "connector" as const,
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        fill: "transparent",
        stroke: "#3b82f6",
        strokeWidth: 2,
        points: [50, 50, 150, 150],
        createdBy: "user-1",
      };

      await createObject(boardId, connectorParams);

      expect(mockFirestoreSetDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          type: "connector",
          points: [50, 50, 150, 150],
        })
      );
    });

    it("should create rectangle objects", async () => {
      const { createObject } = await import("@/modules/sync/objectService");

      const boardId = "test-board";
      const rectParams = {
        type: "rectangle" as const,
        x: 50,
        y: 50,
        width: 100,
        height: 80,
        fill: "#93c5fd",
        stroke: "#1e293b",
        strokeWidth: 2,
        createdBy: "user-1",
      };

      await createObject(boardId, rectParams);

      expect(mockFirestoreSetDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          type: "rectangle",
          x: 50,
          y: 50,
          width: 100,
          height: 80,
          fill: "#93c5fd",
        })
      );
    });

    it("should create circle objects", async () => {
      const { createObject } = await import("@/modules/sync/objectService");

      const boardId = "test-board";
      const circleParams = {
        type: "circle" as const,
        x: 200,
        y: 200,
        width: 60,
        height: 60,
        fill: "#86efac",
        stroke: "#1e293b",
        strokeWidth: 2,
        createdBy: "user-1",
      };

      await createObject(boardId, circleParams);

      expect(mockFirestoreSetDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          type: "circle",
          width: 60,
          height: 60,
        })
      );
    });

    it("should create text objects with fontSize", async () => {
      const { createObject } = await import("@/modules/sync/objectService");

      const boardId = "test-board";
      const textParams = {
        type: "text" as const,
        x: 100,
        y: 100,
        width: 200,
        height: 30,
        fill: "#1f2937",
        text: "Hello World",
        fontSize: 16,
        createdBy: "user-1",
      };

      await createObject(boardId, textParams);

      expect(mockFirestoreSetDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          type: "text",
          text: "Hello World",
          fontSize: 16,
        })
      );
    });

    it("should create frame objects", async () => {
      const { createObject } = await import("@/modules/sync/objectService");

      const boardId = "test-board";
      const frameParams = {
        type: "frame" as const,
        x: 0,
        y: 0,
        width: 400,
        height: 300,
        fill: "rgba(241, 245, 249, 0.5)",
        stroke: "#94a3b8",
        strokeWidth: 2,
        text: "My Frame",
        createdBy: "user-1",
      };

      await createObject(boardId, frameParams);

      expect(mockFirestoreSetDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          type: "frame",
          text: "My Frame",
        })
      );
    });

    it("should update object position", async () => {
      const { updateObject } = await import("@/modules/sync/objectService");

      const boardId = "test-board";
      const objectId = "object-1";
      const updates = {
        x: 150,
        y: 150,
      };

      await updateObject(boardId, objectId, updates);

      expect(mockFirestoreUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          x: 150,
          y: 150,
        })
      );
    });

    it("should update object text content", async () => {
      const { updateObject } = await import("@/modules/sync/objectService");

      const boardId = "test-board";
      const objectId = "sticky-1";
      const updates = {
        text: "Updated sticky note content",
      };

      await updateObject(boardId, objectId, updates);

      expect(mockFirestoreUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          text: "Updated sticky note content",
        })
      );
    });

    it("should update object dimensions", async () => {
      const { updateObject } = await import("@/modules/sync/objectService");

      const boardId = "test-board";
      const objectId = "rect-1";
      const updates = {
        width: 250,
        height: 150,
        rotation: 45,
      };

      await updateObject(boardId, objectId, updates);

      expect(mockFirestoreUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          width: 250,
          height: 150,
          rotation: 45,
        })
      );
    });

    it("should delete object", async () => {
      const { deleteObject } = await import("@/modules/sync/objectService");

      const boardId = "test-board";
      const objectId = "object-to-delete";

      await deleteObject(boardId, objectId);

      expect(mockFirestoreDeleteDoc).toHaveBeenCalled();
    });
  });

  describe("Conflict Resolution", () => {
    it("should resolve conflicts using last-write-wins", async () => {
      const { mergeObjectUpdates } = await import(
        "@/modules/sync/objectService"
      );

      const localObject: IBoardObject = {
        id: "obj-1",
        type: "sticky",
        x: 100,
        y: 100,
        width: 200,
        height: 200,
        rotation: 0,
        fill: "#fef08a",
        text: "Local version",
        createdBy: "user-1",
        createdAt: { toMillis: () => 1000 } as Timestamp,
        updatedAt: { toMillis: () => 2000 } as Timestamp,
      };

      const remoteObject: IBoardObject = {
        id: "obj-1",
        type: "sticky",
        x: 150,
        y: 150,
        width: 200,
        height: 200,
        rotation: 0,
        fill: "#fef08a",
        text: "Remote version",
        createdBy: "user-1",
        createdAt: { toMillis: () => 1000 } as Timestamp,
        updatedAt: { toMillis: () => 3000 } as Timestamp, // Newer
      };

      const merged = mergeObjectUpdates(localObject, remoteObject);

      // Remote should win because it has a newer timestamp
      expect(merged.text).toBe("Remote version");
      expect(merged.x).toBe(150);
    });

    it("should keep local when local is newer", async () => {
      const { mergeObjectUpdates } = await import(
        "@/modules/sync/objectService"
      );

      const localObject: IBoardObject = {
        id: "obj-1",
        type: "sticky",
        x: 200,
        y: 200,
        width: 200,
        height: 200,
        rotation: 0,
        fill: "#fef08a",
        text: "Local newer version",
        createdBy: "user-1",
        createdAt: { toMillis: () => 1000 } as Timestamp,
        updatedAt: { toMillis: () => 5000 } as Timestamp, // Newer
      };

      const remoteObject: IBoardObject = {
        id: "obj-1",
        type: "sticky",
        x: 150,
        y: 150,
        width: 200,
        height: 200,
        rotation: 0,
        fill: "#fef08a",
        text: "Remote older version",
        createdBy: "user-1",
        createdAt: { toMillis: () => 1000 } as Timestamp,
        updatedAt: { toMillis: () => 3000 } as Timestamp,
      };

      const merged = mergeObjectUpdates(localObject, remoteObject);

      // Local should win because it has a newer timestamp
      expect(merged.text).toBe("Local newer version");
      expect(merged.x).toBe(200);
    });
  });

  describe("Real-time Cursor Operations", () => {
    it("should update cursor position", async () => {
      const { updateCursor } = await import("@/modules/sync/realtimeService");

      const boardId = "test-board";
      const uid = "user-1";
      const x = 100;
      const y = 200;
      const displayName = "Test User";
      const color = "#ff0000";

      await updateCursor(boardId, uid, x, y, displayName, color);

      expect(mockRealtimeSet).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          uid,
          x,
          y,
          displayName,
          color,
        })
      );
    });

    it("should remove cursor on disconnect", async () => {
      const { removeCursor } = await import("@/modules/sync/realtimeService");

      const boardId = "test-board";
      const uid = "user-1";

      await removeCursor(boardId, uid);

      expect(mockRealtimeRemove).toHaveBeenCalled();
    });
  });

  describe("Real-time Presence Operations", () => {
    it("should update presence status", async () => {
      const { updatePresence } = await import("@/modules/sync/realtimeService");

      const boardId = "test-board";
      const uid = "user-1";
      const displayName = "Test User";
      const photoURL = "https://example.com/photo.jpg";
      const color = "#3b82f6";

      await updatePresence(boardId, uid, displayName, photoURL, color);

      expect(mockRealtimeSet).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          uid,
          displayName,
          photoURL,
          color,
          online: true,
        })
      );
    });

    it("should remove presence on leave", async () => {
      const { removePresence } = await import("@/modules/sync/realtimeService");

      const boardId = "test-board";
      const uid = "user-1";

      await removePresence(boardId, uid);

      expect(mockRealtimeRemove).toHaveBeenCalled();
    });
  });

  describe("User Color Assignment", () => {
    it("should generate consistent colors for same user", async () => {
      const { getUserColor } = await import("@/modules/sync/realtimeService");

      const uid = "user-123";
      const color1 = getUserColor(uid);
      const color2 = getUserColor(uid);

      expect(color1).toBe(color2);
    });

    it("should generate valid hex colors", async () => {
      const { getUserColor } = await import("@/modules/sync/realtimeService");

      const color = getUserColor("test-user");

      expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });

  describe("Batch Operations", () => {
    it("should handle multiple cursor updates simultaneously", async () => {
      const { updateCursor } = await import("@/modules/sync/realtimeService");

      const boardId = "test-board";

      // Simulate multiple users updating cursors
      await Promise.all([
        updateCursor(boardId, "user-1", 100, 100, "User 1", "#ff0000"),
        updateCursor(boardId, "user-2", 200, 200, "User 2", "#00ff00"),
        updateCursor(boardId, "user-3", 300, 300, "User 3", "#0000ff"),
      ]);

      expect(mockRealtimeSet).toHaveBeenCalledTimes(3);
    });

    it("should handle rapid position updates", async () => {
      const { updateObject } = await import("@/modules/sync/objectService");

      const boardId = "test-board";
      const objectId = "dragging-object";

      // Simulate rapid drag updates
      const updates = Array.from({ length: 5 }, (_, i) => ({
        x: i * 20,
        y: i * 20,
      }));

      await Promise.all(
        updates.map((update) => updateObject(boardId, objectId, update))
      );

      expect(mockFirestoreUpdateDoc).toHaveBeenCalledTimes(5);
    });
  });

  describe("Connection Status", () => {
    it("should subscribe to connection status", async () => {
      const { subscribeToConnectionStatus } = await import(
        "@/modules/sync/realtimeService"
      );

      const callback = vi.fn();
      subscribeToConnectionStatus(callback);

      expect(mockRealtimeOnValue).toHaveBeenCalled();
    });
  });
});

describe("Viewport Operations", () => {
  it("should clamp zoom within valid range", () => {
    const MIN_SCALE = 0.1;
    const MAX_SCALE = 10;

    // Test clamping logic
    const clampScale = (scale: number): number => {
      return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
    };

    expect(clampScale(0.05)).toBe(MIN_SCALE);
    expect(clampScale(15)).toBe(MAX_SCALE);
    expect(clampScale(1)).toBe(1);
    expect(clampScale(5)).toBe(5);
  });

  it("should calculate zoom center correctly", () => {
    const calculateZoomCenter = (
      pointer: { x: number; y: number },
      stagePosition: { x: number; y: number },
      scale: number
    ) => {
      return {
        x: (pointer.x - stagePosition.x) / scale,
        y: (pointer.y - stagePosition.y) / scale,
      };
    };

    const pointer = { x: 500, y: 400 };
    const stagePosition = { x: 100, y: 50 };
    const scale = 2;

    const center = calculateZoomCenter(pointer, stagePosition, scale);

    expect(center.x).toBe(200); // (500 - 100) / 2
    expect(center.y).toBe(175); // (400 - 50) / 2
  });
});

describe("Selection Operations", () => {
  it("should calculate selection rectangle bounds", () => {
    const calculateSelectionBounds = (
      x1: number,
      y1: number,
      x2: number,
      y2: number
    ) => {
      return {
        left: Math.min(x1, x2),
        top: Math.min(y1, y2),
        right: Math.max(x1, x2),
        bottom: Math.max(y1, y2),
      };
    };

    // Test with different drag directions
    const bounds1 = calculateSelectionBounds(100, 100, 200, 200);
    expect(bounds1.left).toBe(100);
    expect(bounds1.top).toBe(100);
    expect(bounds1.right).toBe(200);
    expect(bounds1.bottom).toBe(200);

    // Drag from bottom-right to top-left
    const bounds2 = calculateSelectionBounds(200, 200, 100, 100);
    expect(bounds2.left).toBe(100);
    expect(bounds2.top).toBe(100);
    expect(bounds2.right).toBe(200);
    expect(bounds2.bottom).toBe(200);
  });

  it("should detect object intersection with selection", () => {
    const isIntersecting = (
      objBounds: { x1: number; y1: number; x2: number; y2: number },
      selBounds: { x1: number; y1: number; x2: number; y2: number }
    ): boolean => {
      return (
        objBounds.x1 < selBounds.x2 &&
        objBounds.x2 > selBounds.x1 &&
        objBounds.y1 < selBounds.y2 &&
        objBounds.y2 > selBounds.y1
      );
    };

    // Object fully inside selection
    expect(
      isIntersecting(
        { x1: 120, y1: 120, x2: 180, y2: 180 },
        { x1: 100, y1: 100, x2: 200, y2: 200 }
      )
    ).toBe(true);

    // Object partially inside selection
    expect(
      isIntersecting(
        { x1: 150, y1: 150, x2: 250, y2: 250 },
        { x1: 100, y1: 100, x2: 200, y2: 200 }
      )
    ).toBe(true);

    // Object completely outside selection
    expect(
      isIntersecting(
        { x1: 300, y1: 300, x2: 400, y2: 400 },
        { x1: 100, y1: 100, x2: 200, y2: 200 }
      )
    ).toBe(false);
  });
});

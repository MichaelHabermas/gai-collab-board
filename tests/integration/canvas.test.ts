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

  describe("Object Persistence - Sticky Notes", () => {
    it("should persist sticky note after creation and return it with an ID", async () => {
      const { createObject } = await import("@/modules/sync/objectService");

      const boardId = "test-board";
      const stickyParams = {
        type: "sticky" as const,
        x: 100,
        y: 100,
        width: 200,
        height: 200,
        fill: "#fef08a",
        text: "My persistent sticky note",
        createdBy: "user-1",
      };

      const createdSticky = await createObject(boardId, stickyParams);

      // Verify the object was persisted to Firestore
      expect(mockFirestoreSetDoc).toHaveBeenCalledTimes(1);

      // Verify the returned object has all required fields
      expect(createdSticky).toMatchObject({
        id: expect.any(String),
        type: "sticky",
        x: 100,
        y: 100,
        width: 200,
        height: 200,
        fill: "#fef08a",
        text: "My persistent sticky note",
        createdBy: "user-1",
        rotation: 0,
        createdAt: expect.anything(),
        updatedAt: expect.anything(),
      });

      // Verify the ID is not empty
      expect(createdSticky.id).toBeTruthy();
      expect(createdSticky.id.length).toBeGreaterThan(0);
    });

    it("should persist sticky note with empty text for later editing", async () => {
      const { createObject } = await import("@/modules/sync/objectService");

      const boardId = "test-board";
      const stickyParams = {
        type: "sticky" as const,
        x: 250,
        y: 150,
        width: 200,
        height: 200,
        fill: "#fda4af", // Pink sticky
        text: "", // Empty text - user will edit later
        createdBy: "user-1",
      };

      const createdSticky = await createObject(boardId, stickyParams);

      expect(mockFirestoreSetDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          type: "sticky",
          text: "",
          fill: "#fda4af",
        })
      );

      expect(createdSticky.text).toBe("");
      expect(createdSticky.id).toBeTruthy();
    });

    it("should allow updating sticky note text after creation", async () => {
      const { createObject, updateObject } = await import(
        "@/modules/sync/objectService"
      );

      const boardId = "test-board";

      // First create a sticky note
      const stickyParams = {
        type: "sticky" as const,
        x: 100,
        y: 100,
        width: 200,
        height: 200,
        fill: "#fef08a",
        text: "",
        createdBy: "user-1",
      };

      const createdSticky = await createObject(boardId, stickyParams);

      // Then update its text
      await updateObject(boardId, createdSticky.id, {
        text: "Updated sticky note content!",
      });

      // Verify both operations were called
      expect(mockFirestoreSetDoc).toHaveBeenCalledTimes(1);
      expect(mockFirestoreUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          text: "Updated sticky note content!",
        })
      );
    });
  });

  describe("Object Persistence - Shapes", () => {
    it("should persist rectangle shape after creation", async () => {
      const { createObject } = await import("@/modules/sync/objectService");

      const boardId = "test-board";
      const rectParams = {
        type: "rectangle" as const,
        x: 50,
        y: 50,
        width: 150,
        height: 100,
        fill: "#93c5fd",
        stroke: "#1e293b",
        strokeWidth: 2,
        createdBy: "user-1",
      };

      const createdRect = await createObject(boardId, rectParams);

      // Verify persistence
      expect(mockFirestoreSetDoc).toHaveBeenCalledTimes(1);

      // Verify returned object
      expect(createdRect).toMatchObject({
        id: expect.any(String),
        type: "rectangle",
        x: 50,
        y: 50,
        width: 150,
        height: 100,
        fill: "#93c5fd",
        stroke: "#1e293b",
        strokeWidth: 2,
      });

      expect(createdRect.id).toBeTruthy();
    });

    it("should persist circle shape after creation", async () => {
      const { createObject } = await import("@/modules/sync/objectService");

      const boardId = "test-board";
      const circleParams = {
        type: "circle" as const,
        x: 200,
        y: 200,
        width: 80,
        height: 80,
        fill: "#86efac",
        stroke: "#1e293b",
        strokeWidth: 2,
        createdBy: "user-1",
      };

      const createdCircle = await createObject(boardId, circleParams);

      expect(mockFirestoreSetDoc).toHaveBeenCalledTimes(1);
      expect(createdCircle).toMatchObject({
        id: expect.any(String),
        type: "circle",
        width: 80,
        height: 80,
      });
      expect(createdCircle.id).toBeTruthy();
    });

    it("should persist line shape with points after creation", async () => {
      const { createObject } = await import("@/modules/sync/objectService");

      const boardId = "test-board";
      const lineParams = {
        type: "line" as const,
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        fill: "transparent",
        stroke: "#ef4444",
        strokeWidth: 3,
        points: [100, 100, 300, 200],
        createdBy: "user-1",
      };

      const createdLine = await createObject(boardId, lineParams);

      expect(mockFirestoreSetDoc).toHaveBeenCalledTimes(1);
      expect(createdLine).toMatchObject({
        id: expect.any(String),
        type: "line",
        points: [100, 100, 300, 200],
        stroke: "#ef4444",
        strokeWidth: 3,
      });
      expect(createdLine.id).toBeTruthy();
    });
  });

  describe("Object Persistence - Visibility on Board", () => {
    it("should make created objects available via subscription", async () => {
      const { createObject, subscribeToObjects } = await import(
        "@/modules/sync/objectService"
      );

      const boardId = "test-board";

      // Create a sticky note
      const stickyParams = {
        type: "sticky" as const,
        x: 100,
        y: 100,
        width: 200,
        height: 200,
        fill: "#fef08a",
        text: "Visible sticky",
        createdBy: "user-1",
      };

      const createdSticky = await createObject(boardId, stickyParams);

      // Subscribe to objects (simulating what the board does)
      const objectsCallback = vi.fn();
      subscribeToObjects(boardId, objectsCallback);

      // Verify subscription was set up
      expect(mockFirestoreOnSnapshot).toHaveBeenCalled();

      // Simulate Firestore returning the created object
      const snapshotCallback = mockFirestoreOnSnapshot.mock.calls[0]?.[1] as
        | ((snapshot: unknown) => void)
        | undefined;
      expect(snapshotCallback).toBeDefined();
      const mockSnapshot = {
        forEach: (cb: (doc: { data: () => IBoardObject }) => void) => {
          cb({ data: () => createdSticky });
        },
      };
      snapshotCallback!(mockSnapshot);

      // Verify the callback received the object
      expect(objectsCallback).toHaveBeenCalledWith([createdSticky]);
    });

    it("should show multiple objects on board after creation", async () => {
      const { createObject, subscribeToObjects } = await import(
        "@/modules/sync/objectService"
      );

      const boardId = "test-board";

      // Create multiple objects
      const sticky = await createObject(boardId, {
        type: "sticky" as const,
        x: 100,
        y: 100,
        width: 200,
        height: 200,
        fill: "#fef08a",
        text: "Sticky 1",
        createdBy: "user-1",
      });

      const rect = await createObject(boardId, {
        type: "rectangle" as const,
        x: 350,
        y: 100,
        width: 100,
        height: 80,
        fill: "#93c5fd",
        stroke: "#1e293b",
        strokeWidth: 2,
        createdBy: "user-1",
      });

      const circle = await createObject(boardId, {
        type: "circle" as const,
        x: 500,
        y: 100,
        width: 60,
        height: 60,
        fill: "#86efac",
        stroke: "#1e293b",
        strokeWidth: 2,
        createdBy: "user-1",
      });

      // All three objects were persisted
      expect(mockFirestoreSetDoc).toHaveBeenCalledTimes(3);

      // Subscribe to objects
      const objectsCallback = vi.fn();
      subscribeToObjects(boardId, objectsCallback);

      // Simulate Firestore returning all objects
      const snapshotCallback = mockFirestoreOnSnapshot.mock.calls[0]?.[1] as
        | ((snapshot: unknown) => void)
        | undefined;
      expect(snapshotCallback).toBeDefined();
      const mockSnapshot = {
        forEach: (cb: (doc: { data: () => IBoardObject }) => void) => {
          cb({ data: () => sticky });
          cb({ data: () => rect });
          cb({ data: () => circle });
        },
      };
      snapshotCallback!(mockSnapshot);

      // Verify callback received all three objects
      expect(objectsCallback).toHaveBeenCalledWith([sticky, rect, circle]);
    });

    it("should persist object movement and reflect in subscription", async () => {
      const { createObject, updateObject, subscribeToObjects } = await import(
        "@/modules/sync/objectService"
      );

      const boardId = "test-board";

      // Create a sticky note
      const sticky = await createObject(boardId, {
        type: "sticky" as const,
        x: 100,
        y: 100,
        width: 200,
        height: 200,
        fill: "#fef08a",
        text: "Movable sticky",
        createdBy: "user-1",
      });

      // Move it
      await updateObject(boardId, sticky.id, { x: 300, y: 250 });

      expect(mockFirestoreUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          x: 300,
          y: 250,
        })
      );

      // Subscribe and verify updated position
      const objectsCallback = vi.fn();
      subscribeToObjects(boardId, objectsCallback);

      const movedSticky = { ...sticky, x: 300, y: 250 };
      const snapshotCallback = mockFirestoreOnSnapshot.mock.calls[0]?.[1] as
        | ((snapshot: unknown) => void)
        | undefined;
      expect(snapshotCallback).toBeDefined();
      const mockSnapshot = {
        forEach: (cb: (doc: { data: () => IBoardObject }) => void) => {
          cb({ data: () => movedSticky });
        },
      };
      snapshotCallback!(mockSnapshot);

      expect(objectsCallback).toHaveBeenCalledWith([
        expect.objectContaining({ x: 300, y: 250 }),
      ]);
    });
  });

  describe("Object Persistence - Real-time Sync", () => {
    it("should sync created object to other users via subscription", async () => {
      const { createObject, subscribeToObjects } = await import(
        "@/modules/sync/objectService"
      );

      const boardId = "shared-board";

      // User 1 subscribes to objects
      const user1Callback = vi.fn();
      subscribeToObjects(boardId, user1Callback);

      // User 2 subscribes to objects
      const user2Callback = vi.fn();
      subscribeToObjects(boardId, user2Callback);

      // User 1 creates a sticky note
      const sticky = await createObject(boardId, {
        type: "sticky" as const,
        x: 100,
        y: 100,
        width: 200,
        height: 200,
        fill: "#fef08a",
        text: "Shared sticky",
        createdBy: "user-1",
      });

      // Simulate Firestore broadcasting to both subscribers
      const mockSnapshot = {
        forEach: (cb: (doc: { data: () => IBoardObject }) => void) => {
          cb({ data: () => sticky });
        },
      };

      // Both subscription callbacks should receive the object
      const user1SnapshotCallback = mockFirestoreOnSnapshot.mock.calls[0]?.[1] as
        | ((snapshot: unknown) => void)
        | undefined;
      const user2SnapshotCallback = mockFirestoreOnSnapshot.mock.calls[1]?.[1] as
        | ((snapshot: unknown) => void)
        | undefined;

      expect(user1SnapshotCallback).toBeDefined();
      expect(user2SnapshotCallback).toBeDefined();

      user1SnapshotCallback!(mockSnapshot);
      user2SnapshotCallback!(mockSnapshot);

      expect(user1Callback).toHaveBeenCalledWith([sticky]);
      expect(user2Callback).toHaveBeenCalledWith([sticky]);
    });
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

describe("Click-to-Create Operations", () => {
  describe("Sticky Note Creation via Click", () => {
    it("should create sticky note with correct parameters when clicking with sticky tool", async () => {
      const { createObject } = await import("@/modules/sync/objectService");

      const boardId = "test-board";
      const clickX = 500;
      const clickY = 300;
      const defaultStickySize = { width: 200, height: 200 };
      const activeColor = "#fef08a";

      // Simulate the parameters that would be passed from handleStageClick
      const stickyParams = {
        type: "sticky" as const,
        x: clickX - defaultStickySize.width / 2,
        y: clickY - defaultStickySize.height / 2,
        width: defaultStickySize.width,
        height: defaultStickySize.height,
        fill: activeColor,
        text: "",
        rotation: 0,
        createdBy: "user-1",
      };

      const createdSticky = await createObject(boardId, stickyParams);

      // Verify sticky note was created at centered position
      expect(createdSticky.x).toBe(400); // 500 - 100
      expect(createdSticky.y).toBe(200); // 300 - 100
      expect(createdSticky.width).toBe(200);
      expect(createdSticky.height).toBe(200);
      expect(createdSticky.type).toBe("sticky");
      expect(createdSticky.text).toBe("");
      expect(createdSticky.fill).toBe("#fef08a");
      expect(createdSticky.rotation).toBe(0);
      expect(createdSticky.id).toBeTruthy();
    });

    it("should create sticky note with different colors", async () => {
      const { createObject } = await import("@/modules/sync/objectService");

      const boardId = "test-board";
      const colors = ["#fef08a", "#fda4af", "#93c5fd", "#86efac", "#c4b5fd"];

      for (const color of colors) {
        vi.clearAllMocks();

        const stickyParams = {
          type: "sticky" as const,
          x: 100,
          y: 100,
          width: 200,
          height: 200,
          fill: color,
          text: "",
          rotation: 0,
          createdBy: "user-1",
        };

        const createdSticky = await createObject(boardId, stickyParams);

        expect(createdSticky.fill).toBe(color);
        expect(mockFirestoreSetDoc).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            fill: color,
          })
        );
      }
    });

    it("should create sticky note at edge of canvas", async () => {
      const { createObject } = await import("@/modules/sync/objectService");

      const boardId = "test-board";

      // Test creation at canvas origin
      const stickyParams = {
        type: "sticky" as const,
        x: 0 - 100, // Centered at origin
        y: 0 - 100,
        width: 200,
        height: 200,
        fill: "#fef08a",
        text: "",
        rotation: 0,
        createdBy: "user-1",
      };

      const createdSticky = await createObject(boardId, stickyParams);

      expect(createdSticky.x).toBe(-100);
      expect(createdSticky.y).toBe(-100);
      expect(createdSticky.id).toBeTruthy();
    });
  });

  describe("Text Element Creation via Click", () => {
    it("should create text element with correct parameters when clicking with text tool", async () => {
      const { createObject } = await import("@/modules/sync/objectService");

      const boardId = "test-board";
      const clickX = 400;
      const clickY = 250;

      // Simulate the parameters that would be passed from handleStageClick
      const textParams = {
        type: "text" as const,
        x: clickX,
        y: clickY,
        width: 200,
        height: 30,
        fill: "#1f2937", // Default text color when sticky color is active
        text: "",
        fontSize: 16,
        rotation: 0,
        createdBy: "user-1",
      };

      const createdText = await createObject(boardId, textParams);

      // Verify text element was created at click position (not centered)
      expect(createdText.x).toBe(400);
      expect(createdText.y).toBe(250);
      expect(createdText.width).toBe(200);
      expect(createdText.height).toBe(30);
      expect(createdText.type).toBe("text");
      expect(createdText.text).toBe("");
      expect(createdText.fontSize).toBe(16);
      expect(createdText.fill).toBe("#1f2937");
      expect(createdText.id).toBeTruthy();
    });

    it("should create text element with custom color when non-yellow color is active", async () => {
      const { createObject } = await import("@/modules/sync/objectService");

      const boardId = "test-board";
      const customColor = "#3b82f6"; // Blue

      const textParams = {
        type: "text" as const,
        x: 100,
        y: 100,
        width: 200,
        height: 30,
        fill: customColor,
        text: "",
        fontSize: 16,
        rotation: 0,
        createdBy: "user-1",
      };

      const createdText = await createObject(boardId, textParams);

      expect(createdText.fill).toBe(customColor);
    });
  });

  describe("Empty Area Click Detection", () => {
    it("should correctly identify empty area clicks", () => {
      // Simulate the click detection logic from BoardCanvas
      const isEmptyAreaClick = (
        targetName: string,
        targetClassName: string,
        isStage: boolean
      ): boolean => {
        const clickedOnShape = targetName.includes("shape");
        const clickedOnBackground = targetName === "background";
        const clickedOnStageOrLayer = isStage || targetClassName === "Layer";
        return !clickedOnShape && (clickedOnBackground || clickedOnStageOrLayer);
      };

      // Click on stage - should be empty area
      expect(isEmptyAreaClick("", "Stage", true)).toBe(true);

      // Click on layer - should be empty area
      expect(isEmptyAreaClick("", "Layer", false)).toBe(true);

      // Click on background rect - should be empty area
      expect(isEmptyAreaClick("background", "Rect", false)).toBe(true);

      // Click on shape - should NOT be empty area
      expect(isEmptyAreaClick("shape sticky", "Group", false)).toBe(false);
      expect(isEmptyAreaClick("shape rectangle", "Rect", false)).toBe(false);

      // Click on other elements without 'shape' or 'background' in name
      // Should be empty area only if on Layer
      expect(isEmptyAreaClick("grid", "Layer", false)).toBe(true);
      // But not if it's a regular Rect without background name
      expect(isEmptyAreaClick("", "Rect", false)).toBe(false);
      expect(isEmptyAreaClick("grid", "Rect", false)).toBe(false);
    });
  });

  describe("Selection State Reset", () => {
    it("should reset selection state after mouse up regardless of drawing state", () => {
      // Simulate selection state management
      interface ISelectionState {
        isSelecting: boolean;
        selectionRect: {
          visible: boolean;
          x1: number;
          y1: number;
          x2: number;
          y2: number;
        };
      }

      const initialState: ISelectionState = {
        isSelecting: true,
        selectionRect: {
          visible: true,
          x1: 100,
          y1: 100,
          x2: 200,
          y2: 200,
        },
      };

      // Simulate handleStageMouseUp behavior (fixed version)
      const handleMouseUp = (
        state: ISelectionState,
        _isDrawing: boolean
      ): ISelectionState => {
        // The fix ensures selection state is always reset regardless of _isDrawing
        if (state.isSelecting) {
          return {
            isSelecting: false,
            selectionRect: {
              visible: false,
              x1: 0,
              y1: 0,
              x2: 0,
              y2: 0,
            },
          };
        }
        return state;
      };

      // Test: Selection should be reset even when not drawing
      const resultNotDrawing = handleMouseUp(initialState, false);
      expect(resultNotDrawing.isSelecting).toBe(false);
      expect(resultNotDrawing.selectionRect.visible).toBe(false);

      // Test: Selection should be reset when drawing
      const resultDrawing = handleMouseUp(initialState, true);
      expect(resultDrawing.isSelecting).toBe(false);
      expect(resultDrawing.selectionRect.visible).toBe(false);
    });
  });
});
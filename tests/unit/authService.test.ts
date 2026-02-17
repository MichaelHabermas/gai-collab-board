import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  signUpWithEmail,
  signInWithEmail,
  signInWithGoogle,
  logOut,
  subscribeToAuthChanges,
} from "@/modules/auth/authService";

// Mock Firebase auth
vi.mock("firebase/auth", () => ({
  createUserWithEmailAndPassword: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
  GoogleAuthProvider: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
}));

vi.mock("@/lib/firebase", () => ({
  auth: {},
}));

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";

describe("authService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("signUpWithEmail", () => {
    it("should return user on successful signup", async () => {
      const mockUser = { uid: "123", email: "test@example.com" };
      vi.mocked(createUserWithEmailAndPassword).mockResolvedValue({
        user: mockUser,
      } as never);

      const result = await signUpWithEmail("test@example.com", "password123");

      expect(result.user).toEqual(mockUser);
      expect(result.error).toBeNull();
    });

    it("should return error on failed signup", async () => {
      vi.mocked(createUserWithEmailAndPassword).mockRejectedValue(
        new Error("Email already in use")
      );

      const result = await signUpWithEmail("test@example.com", "password123");

      expect(result.user).toBeNull();
      expect(result.error).toBe("Email already in use");
    });
  });

  describe("signInWithEmail", () => {
    it("should return user on successful signin", async () => {
      const mockUser = { uid: "123", email: "test@example.com" };
      vi.mocked(signInWithEmailAndPassword).mockResolvedValue({
        user: mockUser,
      } as never);

      const result = await signInWithEmail("test@example.com", "password123");

      expect(result.user).toEqual(mockUser);
      expect(result.error).toBeNull();
    });

    it("should return error on failed signin", async () => {
      vi.mocked(signInWithEmailAndPassword).mockRejectedValue(
        new Error("Invalid credentials")
      );

      const result = await signInWithEmail("test@example.com", "wrongpassword");

      expect(result.user).toBeNull();
      expect(result.error).toBe("Invalid credentials");
    });
  });

  describe("signInWithGoogle", () => {
    it("should return user on successful Google signin", async () => {
      const mockUser = { uid: "456", email: "google@example.com" };
      vi.mocked(signInWithPopup).mockResolvedValue({
        user: mockUser,
      } as never);

      const result = await signInWithGoogle();

      expect(result.user).toEqual(mockUser);
      expect(result.error).toBeNull();
    });

    it("should return error on failed Google signin", async () => {
      vi.mocked(signInWithPopup).mockRejectedValue(
        new Error("Popup closed by user")
      );

      const result = await signInWithGoogle();

      expect(result.user).toBeNull();
      expect(result.error).toBe("Popup closed by user");
    });
  });

  describe("logOut", () => {
    it("should call signOut", async () => {
      vi.mocked(signOut).mockResolvedValue(undefined);

      await logOut();

      expect(signOut).toHaveBeenCalled();
    });
  });

  describe("subscribeToAuthChanges", () => {
    it("should subscribe to auth state changes", () => {
      const mockCallback = vi.fn();
      const mockUnsubscribe = vi.fn();
      vi.mocked(onAuthStateChanged).mockReturnValue(mockUnsubscribe);

      const unsubscribe = subscribeToAuthChanges(mockCallback);

      expect(onAuthStateChanged).toHaveBeenCalled();
      expect(unsubscribe).toBe(mockUnsubscribe);
    });
  });
});

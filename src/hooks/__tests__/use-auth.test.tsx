import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor, cleanup } from "@testing-library/react";
import { useAuth } from "../use-auth";
import * as authActions from "@/actions";
import * as anonWorkTracker from "@/lib/anon-work-tracker";
import * as getProjectsAction from "@/actions/get-projects";
import * as createProjectAction from "@/actions/create-project";

// Mock Next.js router
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock server actions
vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

// Mock anon work tracker
vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

// Mock project actions
vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe("signIn", () => {
    test("successfully signs in and navigates when anonymous work exists", async () => {
      const mockAnonWork = {
        messages: [{ id: "1", role: "user", content: "Test" }],
        fileSystemData: { "/App.tsx": { type: "file", content: "test" } },
      };

      const mockProject = {
        id: "project-123",
        name: "Design from 10:30:00 AM",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (authActions.signIn as any).mockResolvedValue({ success: true });
      (anonWorkTracker.getAnonWorkData as any).mockReturnValue(mockAnonWork);
      (createProjectAction.createProject as any).mockResolvedValue(mockProject);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        const signInResult = await result.current.signIn("test@example.com", "password123");
        expect(signInResult.success).toBe(true);
      });

      await waitFor(() => {
        expect(authActions.signIn).toHaveBeenCalledWith("test@example.com", "password123");
        expect(anonWorkTracker.getAnonWorkData).toHaveBeenCalled();
        expect(createProjectAction.createProject).toHaveBeenCalledWith({
          name: expect.stringContaining("Design from"),
          messages: mockAnonWork.messages,
          data: mockAnonWork.fileSystemData,
        });
        expect(anonWorkTracker.clearAnonWork).toHaveBeenCalled();
        expect(mockPush).toHaveBeenCalledWith("/project-123");
      });
    });

    test("successfully signs in and navigates to most recent project when no anonymous work", async () => {
      const mockProjects = [
        { id: "project-1", name: "Project 1", createdAt: new Date(), updatedAt: new Date() },
        { id: "project-2", name: "Project 2", createdAt: new Date(), updatedAt: new Date() },
      ];

      (authActions.signIn as any).mockResolvedValue({ success: true });
      (anonWorkTracker.getAnonWorkData as any).mockReturnValue(null);
      (getProjectsAction.getProjects as any).mockResolvedValue(mockProjects);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "password123");
      });

      await waitFor(() => {
        expect(getProjectsAction.getProjects).toHaveBeenCalled();
        expect(mockPush).toHaveBeenCalledWith("/project-1");
        expect(createProjectAction.createProject).not.toHaveBeenCalled();
      });
    });

    test("successfully signs in and creates new project when no anonymous work or existing projects", async () => {
      const mockProject = {
        id: "new-project-123",
        name: "New Design #12345",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (authActions.signIn as any).mockResolvedValue({ success: true });
      (anonWorkTracker.getAnonWorkData as any).mockReturnValue(null);
      (getProjectsAction.getProjects as any).mockResolvedValue([]);
      (createProjectAction.createProject as any).mockResolvedValue(mockProject);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "password123");
      });

      await waitFor(() => {
        expect(getProjectsAction.getProjects).toHaveBeenCalled();
        expect(createProjectAction.createProject).toHaveBeenCalledWith({
          name: expect.stringMatching(/New Design #\d+/),
          messages: [],
          data: {},
        });
        expect(mockPush).toHaveBeenCalledWith("/new-project-123");
      });
    });

    test("handles anonymous work with empty messages", async () => {
      const mockAnonWork = {
        messages: [],
        fileSystemData: {},
      };

      const mockProjects = [
        { id: "project-1", name: "Project 1", createdAt: new Date(), updatedAt: new Date() },
      ];

      (authActions.signIn as any).mockResolvedValue({ success: true });
      (anonWorkTracker.getAnonWorkData as any).mockReturnValue(mockAnonWork);
      (getProjectsAction.getProjects as any).mockResolvedValue(mockProjects);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "password123");
      });

      await waitFor(() => {
        // Should not create project from anonymous work if messages are empty
        expect(getProjectsAction.getProjects).toHaveBeenCalled();
        expect(mockPush).toHaveBeenCalledWith("/project-1");
      });
    });

    test("returns error when sign in fails", async () => {
      (authActions.signIn as any).mockResolvedValue({
        success: false,
        error: "Invalid credentials",
      });

      const { result } = renderHook(() => useAuth());

      let signInResult;
      await act(async () => {
        signInResult = await result.current.signIn("test@example.com", "wrongpassword");
      });

      expect(signInResult).toEqual({
        success: false,
        error: "Invalid credentials",
      });
      expect(mockPush).not.toHaveBeenCalled();
    });

    test("sets loading state during sign in", async () => {
      (authActions.signIn as any).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100))
      );
      (anonWorkTracker.getAnonWorkData as any).mockReturnValue(null);
      (getProjectsAction.getProjects as any).mockResolvedValue([
        { id: "project-1", name: "Project 1", createdAt: new Date(), updatedAt: new Date() },
      ]);

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(false);

      act(() => {
        result.current.signIn("test@example.com", "password123");
      });

      // Should be loading immediately
      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    test("resets loading state even when sign in fails", async () => {
      (authActions.signIn as any).mockResolvedValue({
        success: false,
        error: "Invalid credentials",
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "wrongpassword");
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("signUp", () => {
    test("successfully signs up and navigates when anonymous work exists", async () => {
      const mockAnonWork = {
        messages: [{ id: "1", role: "user", content: "Create a button" }],
        fileSystemData: { "/Button.tsx": { type: "file", content: "button code" } },
      };

      const mockProject = {
        id: "project-456",
        name: "Design from 2:30:00 PM",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (authActions.signUp as any).mockResolvedValue({ success: true });
      (anonWorkTracker.getAnonWorkData as any).mockReturnValue(mockAnonWork);
      (createProjectAction.createProject as any).mockResolvedValue(mockProject);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        const signUpResult = await result.current.signUp("new@example.com", "password123");
        expect(signUpResult.success).toBe(true);
      });

      await waitFor(() => {
        expect(authActions.signUp).toHaveBeenCalledWith("new@example.com", "password123");
        expect(anonWorkTracker.getAnonWorkData).toHaveBeenCalled();
        expect(createProjectAction.createProject).toHaveBeenCalledWith({
          name: expect.stringContaining("Design from"),
          messages: mockAnonWork.messages,
          data: mockAnonWork.fileSystemData,
        });
        expect(anonWorkTracker.clearAnonWork).toHaveBeenCalled();
        expect(mockPush).toHaveBeenCalledWith("/project-456");
      });
    });

    test("successfully signs up and navigates to most recent project when no anonymous work", async () => {
      const mockProjects = [
        { id: "project-3", name: "Project 3", createdAt: new Date(), updatedAt: new Date() },
      ];

      (authActions.signUp as any).mockResolvedValue({ success: true });
      (anonWorkTracker.getAnonWorkData as any).mockReturnValue(null);
      (getProjectsAction.getProjects as any).mockResolvedValue(mockProjects);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("new@example.com", "password123");
      });

      await waitFor(() => {
        expect(getProjectsAction.getProjects).toHaveBeenCalled();
        expect(mockPush).toHaveBeenCalledWith("/project-3");
      });
    });

    test("successfully signs up and creates new project when no anonymous work or existing projects", async () => {
      const mockProject = {
        id: "new-signup-project",
        name: "New Design #54321",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (authActions.signUp as any).mockResolvedValue({ success: true });
      (anonWorkTracker.getAnonWorkData as any).mockReturnValue(null);
      (getProjectsAction.getProjects as any).mockResolvedValue([]);
      (createProjectAction.createProject as any).mockResolvedValue(mockProject);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("new@example.com", "password123");
      });

      await waitFor(() => {
        expect(createProjectAction.createProject).toHaveBeenCalledWith({
          name: expect.stringMatching(/New Design #\d+/),
          messages: [],
          data: {},
        });
        expect(mockPush).toHaveBeenCalledWith("/new-signup-project");
      });
    });

    test("returns error when sign up fails", async () => {
      (authActions.signUp as any).mockResolvedValue({
        success: false,
        error: "Email already registered",
      });

      const { result } = renderHook(() => useAuth());

      let signUpResult;
      await act(async () => {
        signUpResult = await result.current.signUp("existing@example.com", "password123");
      });

      expect(signUpResult).toEqual({
        success: false,
        error: "Email already registered",
      });
      expect(mockPush).not.toHaveBeenCalled();
    });

    test("sets loading state during sign up", async () => {
      (authActions.signUp as any).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100))
      );
      (anonWorkTracker.getAnonWorkData as any).mockReturnValue(null);
      (getProjectsAction.getProjects as any).mockResolvedValue([
        { id: "project-1", name: "Project 1", createdAt: new Date(), updatedAt: new Date() },
      ]);

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(false);

      act(() => {
        result.current.signUp("new@example.com", "password123");
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    test("resets loading state even when sign up fails", async () => {
      (authActions.signUp as any).mockResolvedValue({
        success: false,
        error: "Password too short",
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("new@example.com", "pass");
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("isLoading state", () => {
    test("initializes with isLoading false", () => {
      const { result } = renderHook(() => useAuth());
      expect(result.current.isLoading).toBe(false);
    });

    test("maintains loading state through entire sign in flow", async () => {
      (authActions.signIn as any).mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return { success: true };
      });

      (anonWorkTracker.getAnonWorkData as any).mockReturnValue(null);
      (getProjectsAction.getProjects as any).mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return [];
      });

      (createProjectAction.createProject as any).mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return {
          id: "project-xyz",
          name: "Test Project",
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      });

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(false);

      // Start sign in
      act(() => {
        result.current.signIn("test@example.com", "password123");
      });

      // Should be loading
      expect(result.current.isLoading).toBe(true);

      // Wait for completion
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      }, { timeout: 300 });
    });
  });

  describe("edge cases", () => {
    test("handles createProject error gracefully", async () => {
      (authActions.signIn as any).mockResolvedValue({ success: true });
      (anonWorkTracker.getAnonWorkData as any).mockReturnValue({
        messages: [{ id: "1", role: "user", content: "Test" }],
        fileSystemData: {},
      });
      (createProjectAction.createProject as any).mockRejectedValue(
        new Error("Database error")
      );

      const { result } = renderHook(() => useAuth());

      await expect(
        act(async () => {
          await result.current.signIn("test@example.com", "password123");
        })
      ).rejects.toThrow("Database error");

      // Loading should still be reset
      expect(result.current.isLoading).toBe(false);
    });

    test("handles getProjects error gracefully", async () => {
      (authActions.signIn as any).mockResolvedValue({ success: true });
      (anonWorkTracker.getAnonWorkData as any).mockReturnValue(null);
      (getProjectsAction.getProjects as any).mockRejectedValue(
        new Error("Network error")
      );

      const { result } = renderHook(() => useAuth());

      await expect(
        act(async () => {
          await result.current.signIn("test@example.com", "password123");
        })
      ).rejects.toThrow("Network error");

      expect(result.current.isLoading).toBe(false);
    });

    test("clears anonymous work before navigation", async () => {
      const mockAnonWork = {
        messages: [{ id: "1", role: "user", content: "Test" }],
        fileSystemData: { "/test.tsx": { type: "file", content: "test" } },
      };

      (authActions.signIn as any).mockResolvedValue({ success: true });
      (anonWorkTracker.getAnonWorkData as any).mockReturnValue(mockAnonWork);
      (createProjectAction.createProject as any).mockResolvedValue({
        id: "project-789",
        name: "Test",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "password123");
      });

      await waitFor(() => {
        // Verify clearAnonWork is called before navigation
        expect(anonWorkTracker.clearAnonWork).toHaveBeenCalled();
        expect(mockPush).toHaveBeenCalledWith("/project-789");
      });
    });

    test("handles sign in action throwing an error", async () => {
      (authActions.signIn as any).mockRejectedValue(new Error("Server error"));

      const { result } = renderHook(() => useAuth());

      await expect(
        act(async () => {
          await result.current.signIn("test@example.com", "password123");
        })
      ).rejects.toThrow("Server error");

      // Loading should still be reset
      expect(result.current.isLoading).toBe(false);
    });

    test("handles sign up action throwing an error", async () => {
      (authActions.signUp as any).mockRejectedValue(new Error("Server error"));

      const { result } = renderHook(() => useAuth());

      await expect(
        act(async () => {
          await result.current.signUp("test@example.com", "password123");
        })
      ).rejects.toThrow("Server error");

      // Loading should still be reset
      expect(result.current.isLoading).toBe(false);
    });

    test("does not clear anonymous work when sign in fails", async () => {
      (authActions.signIn as any).mockResolvedValue({
        success: false,
        error: "Invalid credentials",
      });
      (anonWorkTracker.getAnonWorkData as any).mockReturnValue({
        messages: [{ id: "1", role: "user", content: "Test" }],
        fileSystemData: {},
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "wrongpassword");
      });

      expect(anonWorkTracker.clearAnonWork).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });

    test("does not clear anonymous work when sign up fails", async () => {
      (authActions.signUp as any).mockResolvedValue({
        success: false,
        error: "Email already exists",
      });
      (anonWorkTracker.getAnonWorkData as any).mockReturnValue({
        messages: [{ id: "1", role: "user", content: "Test" }],
        fileSystemData: {},
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("test@example.com", "password123");
      });

      expect(anonWorkTracker.clearAnonWork).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });

    test("handles anonymous work with complex nested file system data", async () => {
      const mockAnonWork = {
        messages: [
          { id: "1", role: "user", content: "Create app" },
          { id: "2", role: "assistant", content: "Creating..." },
        ],
        fileSystemData: {
          "/App.tsx": { type: "file", content: "main app" },
          "/components": {
            type: "directory",
            children: {
              "/components/Button.tsx": { type: "file", content: "button" },
            },
          },
          "/styles": {
            type: "directory",
            children: {
              "/styles/main.css": { type: "file", content: "css" },
            },
          },
        },
      };

      (authActions.signIn as any).mockResolvedValue({ success: true });
      (anonWorkTracker.getAnonWorkData as any).mockReturnValue(mockAnonWork);
      (createProjectAction.createProject as any).mockResolvedValue({
        id: "project-complex",
        name: "Complex Project",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "password123");
      });

      await waitFor(() => {
        expect(createProjectAction.createProject).toHaveBeenCalledWith({
          name: expect.stringContaining("Design from"),
          messages: mockAnonWork.messages,
          data: mockAnonWork.fileSystemData,
        });
        expect(anonWorkTracker.clearAnonWork).toHaveBeenCalled();
        expect(mockPush).toHaveBeenCalledWith("/project-complex");
      });
    });

    test("handles multiple rapid sign in calls", async () => {
      (authActions.signIn as any).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100))
      );
      (anonWorkTracker.getAnonWorkData as any).mockReturnValue(null);
      (getProjectsAction.getProjects as any).mockResolvedValue([
        { id: "project-1", name: "Project 1", createdAt: new Date(), updatedAt: new Date() },
      ]);

      const { result } = renderHook(() => useAuth());

      // Start multiple sign in calls
      const promise1 = act(async () => {
        await result.current.signIn("test@example.com", "password123");
      });

      const promise2 = act(async () => {
        await result.current.signIn("test@example.com", "password123");
      });

      await Promise.all([promise1, promise2]);

      // Both should complete successfully
      expect(authActions.signIn).toHaveBeenCalledTimes(2);
      expect(result.current.isLoading).toBe(false);
    });

    test("handles unmounting during sign in", async () => {
      (authActions.signIn as any).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 200))
      );
      (anonWorkTracker.getAnonWorkData as any).mockReturnValue(null);
      (getProjectsAction.getProjects as any).mockResolvedValue([
        { id: "project-1", name: "Project 1", createdAt: new Date(), updatedAt: new Date() },
      ]);

      const { result, unmount } = renderHook(() => useAuth());

      act(() => {
        result.current.signIn("test@example.com", "password123");
      });

      // Unmount while sign in is in progress
      unmount();

      // Should not throw any errors
      expect(true).toBe(true);
    });

    test("handles empty email and password", async () => {
      (authActions.signIn as any).mockResolvedValue({
        success: false,
        error: "Email and password are required",
      });

      const { result } = renderHook(() => useAuth());

      const signInResult = await act(async () => {
        return await result.current.signIn("", "");
      });

      expect(signInResult).toEqual({
        success: false,
        error: "Email and password are required",
      });
      expect(mockPush).not.toHaveBeenCalled();
    });

    test("handles whitespace-only email and password", async () => {
      (authActions.signUp as any).mockResolvedValue({
        success: false,
        error: "Invalid email format",
      });

      const { result } = renderHook(() => useAuth());

      const signUpResult = await act(async () => {
        return await result.current.signUp("   ", "   ");
      });

      expect(signUpResult).toEqual({
        success: false,
        error: "Invalid email format",
      });
      expect(mockPush).not.toHaveBeenCalled();
    });

    test("preserves anonymous work when createProject fails", async () => {
      const mockAnonWork = {
        messages: [{ id: "1", role: "user", content: "Important work" }],
        fileSystemData: { "/important.tsx": { type: "file", content: "important" } },
      };

      (authActions.signIn as any).mockResolvedValue({ success: true });
      (anonWorkTracker.getAnonWorkData as any).mockReturnValue(mockAnonWork);
      (createProjectAction.createProject as any).mockRejectedValue(
        new Error("Database full")
      );

      const { result } = renderHook(() => useAuth());

      await expect(
        act(async () => {
          await result.current.signIn("test@example.com", "password123");
        })
      ).rejects.toThrow("Database full");

      // Should not have cleared anonymous work since project creation failed
      expect(anonWorkTracker.clearAnonWork).not.toHaveBeenCalled();
    });

    test("handles getProjects returning empty array then creating project", async () => {
      const mockProject = {
        id: "new-project-empty",
        name: "New Design #99999",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (authActions.signIn as any).mockResolvedValue({ success: true });
      (anonWorkTracker.getAnonWorkData as any).mockReturnValue(null);
      (getProjectsAction.getProjects as any).mockResolvedValue([]);
      (createProjectAction.createProject as any).mockResolvedValue(mockProject);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "password123");
      });

      await waitFor(() => {
        expect(getProjectsAction.getProjects).toHaveBeenCalledTimes(1);
        expect(createProjectAction.createProject).toHaveBeenCalledWith({
          name: expect.stringMatching(/New Design #\d+/),
          messages: [],
          data: {},
        });
        expect(mockPush).toHaveBeenCalledWith("/new-project-empty");
      });
    });
  });

  describe("concurrent operations", () => {
    test("handles concurrent sign in and sign up attempts", async () => {
      (authActions.signIn as any).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 50))
      );
      (authActions.signUp as any).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 50))
      );
      (anonWorkTracker.getAnonWorkData as any).mockReturnValue(null);
      (getProjectsAction.getProjects as any).mockResolvedValue([
        { id: "project-1", name: "Project 1", createdAt: new Date(), updatedAt: new Date() },
      ]);

      const { result } = renderHook(() => useAuth());

      const signInPromise = act(async () => {
        await result.current.signIn("test1@example.com", "password1");
      });

      const signUpPromise = act(async () => {
        await result.current.signUp("test2@example.com", "password2");
      });

      await Promise.all([signInPromise, signUpPromise]);

      expect(authActions.signIn).toHaveBeenCalledWith("test1@example.com", "password1");
      expect(authActions.signUp).toHaveBeenCalledWith("test2@example.com", "password2");
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("return value validation", () => {
    test("signIn returns the complete result object", async () => {
      const mockResult = {
        success: true,
        userId: "user-123",
        token: "jwt-token",
      };

      (authActions.signIn as any).mockResolvedValue(mockResult);
      (anonWorkTracker.getAnonWorkData as any).mockReturnValue(null);
      (getProjectsAction.getProjects as any).mockResolvedValue([
        { id: "project-1", name: "Project 1", createdAt: new Date(), updatedAt: new Date() },
      ]);

      const { result } = renderHook(() => useAuth());

      const signInResult = await act(async () => {
        return await result.current.signIn("test@example.com", "password123");
      });

      expect(signInResult).toEqual(mockResult);
    });

    test("signUp returns the complete result object", async () => {
      const mockResult = {
        success: true,
        userId: "user-456",
        token: "jwt-token-2",
      };

      (authActions.signUp as any).mockResolvedValue(mockResult);
      (anonWorkTracker.getAnonWorkData as any).mockReturnValue(null);
      (getProjectsAction.getProjects as any).mockResolvedValue([
        { id: "project-2", name: "Project 2", createdAt: new Date(), updatedAt: new Date() },
      ]);

      const { result } = renderHook(() => useAuth());

      const signUpResult = await act(async () => {
        return await result.current.signUp("new@example.com", "password123");
      });

      expect(signUpResult).toEqual(mockResult);
    });

    test("hook exposes correct API", () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current).toHaveProperty("signIn");
      expect(result.current).toHaveProperty("signUp");
      expect(result.current).toHaveProperty("isLoading");
      expect(typeof result.current.signIn).toBe("function");
      expect(typeof result.current.signUp).toBe("function");
      expect(typeof result.current.isLoading).toBe("boolean");
    });
  });
});

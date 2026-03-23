import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { useAuth } from "@/hooks/use-auth";
import { signIn as signInAction, signUp as signUpAction } from "@/actions";
import { getAnonWorkData, clearAnonWork } from "@/lib/anon-work-tracker";
import { getProjects } from "@/actions/get-projects";
import { createProject } from "@/actions/create-project";
import { useRouter } from "next/navigation";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

describe("useAuth", () => {
  const mockPush = vi.fn();
  const mockRouter = { push: mockPush };

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as Mock).mockReturnValue(mockRouter);
  });

  describe("signIn", () => {
    it("should successfully sign in and redirect with anonymous work", async () => {
      const mockAnonWork = {
        messages: [{ role: "user", content: "test message" }],
        fileSystemData: { "/": {} },
      };
      const mockProject = { id: "project-123", name: "Design from 12:00:00 PM" };

      (signInAction as Mock).mockResolvedValue({ success: true });
      (getAnonWorkData as Mock).mockReturnValue(mockAnonWork);
      (createProject as Mock).mockResolvedValue(mockProject);

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(false);

      const signInPromise = result.current.signIn("test@example.com", "password123");

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      const authResult = await signInPromise;

      expect(authResult).toEqual({ success: true });
      expect(signInAction).toHaveBeenCalledWith("test@example.com", "password123");
      expect(getAnonWorkData).toHaveBeenCalled();
      expect(createProject).toHaveBeenCalledWith({
        name: expect.stringContaining("Design from"),
        messages: mockAnonWork.messages,
        data: mockAnonWork.fileSystemData,
      });
      expect(clearAnonWork).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/project-123");

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("should successfully sign in and redirect to most recent project", async () => {
      const mockProjects = [
        { id: "project-1", name: "Project 1", createdAt: new Date(), updatedAt: new Date() },
        { id: "project-2", name: "Project 2", createdAt: new Date(), updatedAt: new Date() },
      ];

      (signInAction as Mock).mockResolvedValue({ success: true });
      (getAnonWorkData as Mock).mockReturnValue(null);
      (getProjects as Mock).mockResolvedValue(mockProjects);

      const { result } = renderHook(() => useAuth());

      const authResult = await result.current.signIn("test@example.com", "password123");

      expect(authResult).toEqual({ success: true });
      expect(getProjects).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/project-1");
      expect(createProject).not.toHaveBeenCalled();
    });

    it("should successfully sign in and create new project when no projects exist", async () => {
      const mockProject = { id: "new-project-123", name: "New Design #12345" };

      (signInAction as Mock).mockResolvedValue({ success: true });
      (getAnonWorkData as Mock).mockReturnValue(null);
      (getProjects as Mock).mockResolvedValue([]);
      (createProject as Mock).mockResolvedValue(mockProject);

      const { result } = renderHook(() => useAuth());

      await result.current.signIn("test@example.com", "password123");

      expect(createProject).toHaveBeenCalledWith({
        name: expect.stringMatching(/^New Design #\d+$/),
        messages: [],
        data: {},
      });
      expect(mockPush).toHaveBeenCalledWith("/new-project-123");
    });

    it("should handle sign in failure without redirecting", async () => {
      (signInAction as Mock).mockResolvedValue({
        success: false,
        error: "Invalid credentials",
      });

      const { result } = renderHook(() => useAuth());

      const authResult = await result.current.signIn("test@example.com", "wrongpassword");

      expect(authResult).toEqual({ success: false, error: "Invalid credentials" });
      expect(mockPush).not.toHaveBeenCalled();
      expect(getAnonWorkData).not.toHaveBeenCalled();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("should handle anonymous work with no messages", async () => {
      const mockAnonWork = {
        messages: [],
        fileSystemData: {},
      };
      const mockProjects = [{ id: "project-1", name: "Project 1", createdAt: new Date(), updatedAt: new Date() }];

      (signInAction as Mock).mockResolvedValue({ success: true });
      (getAnonWorkData as Mock).mockReturnValue(mockAnonWork);
      (getProjects as Mock).mockResolvedValue(mockProjects);

      const { result } = renderHook(() => useAuth());

      await result.current.signIn("test@example.com", "password123");

      expect(createProject).not.toHaveBeenCalled();
      expect(getProjects).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/project-1");
    });

    it("should set loading state correctly during sign in", async () => {
      (signInAction as Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100))
      );
      (getAnonWorkData as Mock).mockReturnValue(null);
      (getProjects as Mock).mockResolvedValue([{ id: "project-1", name: "Project 1", createdAt: new Date(), updatedAt: new Date() }]);

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(false);

      const signInPromise = result.current.signIn("test@example.com", "password123");

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      await signInPromise;

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("should reset loading state even if sign in action throws", async () => {
      (signInAction as Mock).mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useAuth());

      await expect(result.current.signIn("test@example.com", "password123")).rejects.toThrow(
        "Network error"
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe("signUp", () => {
    it("should successfully sign up and redirect with anonymous work", async () => {
      const mockAnonWork = {
        messages: [{ role: "user", content: "test message" }],
        fileSystemData: { "/": {}, "/App.jsx": {} },
      };
      const mockProject = { id: "project-456", name: "Design from 3:00:00 PM" };

      (signUpAction as Mock).mockResolvedValue({ success: true });
      (getAnonWorkData as Mock).mockReturnValue(mockAnonWork);
      (createProject as Mock).mockResolvedValue(mockProject);

      const { result } = renderHook(() => useAuth());

      const authResult = await result.current.signUp("newuser@example.com", "password123");

      expect(authResult).toEqual({ success: true });
      expect(signUpAction).toHaveBeenCalledWith("newuser@example.com", "password123");
      expect(createProject).toHaveBeenCalledWith({
        name: expect.stringContaining("Design from"),
        messages: mockAnonWork.messages,
        data: mockAnonWork.fileSystemData,
      });
      expect(clearAnonWork).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/project-456");
    });

    it("should successfully sign up and create new project when no anonymous work", async () => {
      const mockProject = { id: "new-project-789", name: "New Design #99999" };

      (signUpAction as Mock).mockResolvedValue({ success: true });
      (getAnonWorkData as Mock).mockReturnValue(null);
      (getProjects as Mock).mockResolvedValue([]);
      (createProject as Mock).mockResolvedValue(mockProject);

      const { result } = renderHook(() => useAuth());

      await result.current.signUp("newuser@example.com", "password123");

      expect(createProject).toHaveBeenCalledWith({
        name: expect.stringMatching(/^New Design #\d+$/),
        messages: [],
        data: {},
      });
      expect(mockPush).toHaveBeenCalledWith("/new-project-789");
    });

    it("should handle sign up failure without redirecting", async () => {
      (signUpAction as Mock).mockResolvedValue({
        success: false,
        error: "Email already registered",
      });

      const { result } = renderHook(() => useAuth());

      const authResult = await result.current.signUp("existing@example.com", "password123");

      expect(authResult).toEqual({ success: false, error: "Email already registered" });
      expect(mockPush).not.toHaveBeenCalled();
      expect(getAnonWorkData).not.toHaveBeenCalled();
    });

    it("should set loading state correctly during sign up", async () => {
      (signUpAction as Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100))
      );
      (getAnonWorkData as Mock).mockReturnValue(null);
      (getProjects as Mock).mockResolvedValue([]);
      (createProject as Mock).mockResolvedValue({ id: "project-1", name: "Project 1" });

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(false);

      const signUpPromise = result.current.signUp("newuser@example.com", "password123");

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      await signUpPromise;

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("should reset loading state even if sign up action throws", async () => {
      (signUpAction as Mock).mockRejectedValue(new Error("Database error"));

      const { result } = renderHook(() => useAuth());

      await expect(result.current.signUp("newuser@example.com", "password123")).rejects.toThrow(
        "Database error"
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe("edge cases", () => {
    it("should handle empty string credentials", async () => {
      (signInAction as Mock).mockResolvedValue({
        success: false,
        error: "Email and password are required",
      });

      const { result } = renderHook(() => useAuth());

      const authResult = await result.current.signIn("", "");

      expect(authResult).toEqual({
        success: false,
        error: "Email and password are required",
      });
    });

    it("should handle null anonymous work data", async () => {
      const mockProjects = [{ id: "project-1", name: "Project 1", createdAt: new Date(), updatedAt: new Date() }];

      (signInAction as Mock).mockResolvedValue({ success: true });
      (getAnonWorkData as Mock).mockReturnValue(null);
      (getProjects as Mock).mockResolvedValue(mockProjects);

      const { result } = renderHook(() => useAuth());

      await result.current.signIn("test@example.com", "password123");

      expect(clearAnonWork).not.toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/project-1");
    });

    it("should handle anonymous work with messages but empty file system", async () => {
      const mockAnonWork = {
        messages: [{ role: "user", content: "create a button" }],
        fileSystemData: {},
      };
      const mockProject = { id: "project-999", name: "Design from 5:00:00 PM" };

      (signInAction as Mock).mockResolvedValue({ success: true });
      (getAnonWorkData as Mock).mockReturnValue(mockAnonWork);
      (createProject as Mock).mockResolvedValue(mockProject);

      const { result } = renderHook(() => useAuth());

      await result.current.signIn("test@example.com", "password123");

      expect(createProject).toHaveBeenCalledWith({
        name: expect.stringContaining("Design from"),
        messages: mockAnonWork.messages,
        data: mockAnonWork.fileSystemData,
      });
      expect(mockPush).toHaveBeenCalledWith("/project-999");
    });

    it("should handle concurrent sign in requests correctly", async () => {
      let resolveSignIn: (value: any) => void;
      const signInPromise = new Promise((resolve) => {
        resolveSignIn = resolve;
      });

      (signInAction as Mock).mockReturnValue(signInPromise);
      (getAnonWorkData as Mock).mockReturnValue(null);
      (getProjects as Mock).mockResolvedValue([{ id: "project-1", name: "Project 1", createdAt: new Date(), updatedAt: new Date() }]);

      const { result } = renderHook(() => useAuth());

      const firstSignIn = result.current.signIn("test@example.com", "password123");
      const secondSignIn = result.current.signIn("test@example.com", "password123");

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      resolveSignIn!({ success: true });

      await Promise.all([firstSignIn, secondSignIn]);

      expect(signInAction).toHaveBeenCalledTimes(2);
    });

    it("should handle project creation failure gracefully", async () => {
      (signInAction as Mock).mockResolvedValue({ success: true });
      (getAnonWorkData as Mock).mockReturnValue(null);
      (getProjects as Mock).mockResolvedValue([]);
      (createProject as Mock).mockRejectedValue(new Error("Database connection failed"));

      const { result } = renderHook(() => useAuth());

      await expect(result.current.signIn("test@example.com", "password123")).rejects.toThrow(
        "Database connection failed"
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("should handle getProjects failure gracefully", async () => {
      (signInAction as Mock).mockResolvedValue({ success: true });
      (getAnonWorkData as Mock).mockReturnValue(null);
      (getProjects as Mock).mockRejectedValue(new Error("Failed to fetch projects"));

      const { result } = renderHook(() => useAuth());

      await expect(result.current.signIn("test@example.com", "password123")).rejects.toThrow(
        "Failed to fetch projects"
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe("return values", () => {
    it("should return correct interface with all methods and state", () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current).toHaveProperty("signIn");
      expect(result.current).toHaveProperty("signUp");
      expect(result.current).toHaveProperty("isLoading");
      expect(typeof result.current.signIn).toBe("function");
      expect(typeof result.current.signUp).toBe("function");
      expect(typeof result.current.isLoading).toBe("boolean");
    });

    it("should initialize with loading state as false", () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(false);
    });
  });
});

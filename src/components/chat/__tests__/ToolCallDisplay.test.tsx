import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ToolCallDisplay } from "../ToolCallDisplay";

describe("ToolCallDisplay", () => {
  describe("str_replace_editor tool", () => {
    it("displays creating message for create command", () => {
      const toolInvocation = {
        toolName: "str_replace_editor",
        state: "result",
        args: {
          command: "create",
          path: "/App.jsx",
        },
      };

      render(<ToolCallDisplay toolInvocation={toolInvocation} />);
      expect(screen.getByText("Creating /App.jsx")).toBeDefined();
    });

    it("displays editing message for str_replace command", () => {
      const toolInvocation = {
        toolName: "str_replace_editor",
        state: "result",
        args: {
          command: "str_replace",
          path: "/Card.jsx",
        },
      };

      render(<ToolCallDisplay toolInvocation={toolInvocation} />);
      expect(screen.getByText("Editing /Card.jsx")).toBeDefined();
    });

    it("displays editing message for insert command", () => {
      const toolInvocation = {
        toolName: "str_replace_editor",
        state: "result",
        args: {
          command: "insert",
          path: "/utils.js",
        },
      };

      render(<ToolCallDisplay toolInvocation={toolInvocation} />);
      expect(screen.getByText("Editing /utils.js")).toBeDefined();
    });

    it("displays viewing message for view command", () => {
      const toolInvocation = {
        toolName: "str_replace_editor",
        state: "result",
        args: {
          command: "view",
          path: "/README.md",
        },
      };

      render(<ToolCallDisplay toolInvocation={toolInvocation} />);
      expect(screen.getByText("Viewing /README.md")).toBeDefined();
    });

    it("displays default modifying message for unknown command", () => {
      const toolInvocation = {
        toolName: "str_replace_editor",
        state: "result",
        args: {
          command: "unknown",
          path: "/test.js",
        },
      };

      render(<ToolCallDisplay toolInvocation={toolInvocation} />);
      expect(screen.getByText("Modifying /test.js")).toBeDefined();
    });
  });

  describe("file_manager tool", () => {
    it("displays renaming message for rename command", () => {
      const toolInvocation = {
        toolName: "file_manager",
        state: "result",
        args: {
          command: "rename",
          path: "/old.jsx",
          new_path: "/new.jsx",
        },
      };

      render(<ToolCallDisplay toolInvocation={toolInvocation} />);
      expect(screen.getByText("Renaming /old.jsx to /new.jsx")).toBeDefined();
    });

    it("displays deleting message for delete command", () => {
      const toolInvocation = {
        toolName: "file_manager",
        state: "result",
        args: {
          command: "delete",
          path: "/temp.jsx",
        },
      };

      render(<ToolCallDisplay toolInvocation={toolInvocation} />);
      expect(screen.getByText("Deleting /temp.jsx")).toBeDefined();
    });

    it("displays default managing message for unknown command", () => {
      const toolInvocation = {
        toolName: "file_manager",
        state: "result",
        args: {
          command: "unknown",
          path: "/file.jsx",
        },
      };

      render(<ToolCallDisplay toolInvocation={toolInvocation} />);
      expect(screen.getByText("Managing /file.jsx")).toBeDefined();
    });
  });

  describe("loading state", () => {
    it("shows loading spinner when state is not result", () => {
      const toolInvocation = {
        toolName: "str_replace_editor",
        state: "pending",
        args: {
          command: "create",
          path: "/App.jsx",
        },
      };

      const { container } = render(
        <ToolCallDisplay toolInvocation={toolInvocation} />
      );
      const spinner = container.querySelector(".animate-spin");
      expect(spinner).toBeDefined();
    });

    it("shows success indicator when state is result", () => {
      const toolInvocation = {
        toolName: "str_replace_editor",
        state: "result",
        args: {
          command: "create",
          path: "/App.jsx",
        },
      };

      const { container } = render(
        <ToolCallDisplay toolInvocation={toolInvocation} />
      );
      const successDot = container.querySelector(".bg-emerald-500");
      expect(successDot).toBeDefined();
    });
  });

  describe("unknown tools", () => {
    it("displays tool name for unknown tools", () => {
      const toolInvocation = {
        toolName: "unknown_tool",
        state: "result",
      };

      render(<ToolCallDisplay toolInvocation={toolInvocation} />);
      expect(screen.getByText("unknown_tool")).toBeDefined();
    });
  });

  describe("edge cases", () => {
    it("handles missing args gracefully", () => {
      const toolInvocation = {
        toolName: "str_replace_editor",
        state: "result",
      };

      render(<ToolCallDisplay toolInvocation={toolInvocation} />);
      expect(screen.getByText("str_replace_editor")).toBeDefined();
    });

    it("handles undefined path gracefully", () => {
      const toolInvocation = {
        toolName: "str_replace_editor",
        state: "result",
        args: {
          command: "create",
        },
      };

      render(<ToolCallDisplay toolInvocation={toolInvocation} />);
      expect(screen.getByText("Creating undefined")).toBeDefined();
    });
  });
});

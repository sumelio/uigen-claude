import { Loader2, FileEdit, FilePlus, Trash2, FolderEdit } from "lucide-react";

interface ToolInvocation {
  toolName: string;
  state: string;
  args?: {
    command?: string;
    path?: string;
    new_path?: string;
  };
  result?: any;
}

interface ToolCallDisplayProps {
  toolInvocation: ToolInvocation;
}

export function ToolCallDisplay({ toolInvocation }: ToolCallDisplayProps) {
  const { toolName, args, state } = toolInvocation;

  const getToolMessage = (): { icon: React.ReactNode; message: string } => {
    if (toolName === "str_replace_editor" && args) {
      const { command, path } = args;

      switch (command) {
        case "create":
          return {
            icon: <FilePlus className="w-3 h-3" />,
            message: `Creating ${path}`,
          };
        case "str_replace":
        case "insert":
          return {
            icon: <FileEdit className="w-3 h-3" />,
            message: `Editing ${path}`,
          };
        case "view":
          return {
            icon: <FileEdit className="w-3 h-3" />,
            message: `Viewing ${path}`,
          };
        default:
          return {
            icon: <FileEdit className="w-3 h-3" />,
            message: `Modifying ${path}`,
          };
      }
    }

    if (toolName === "file_manager" && args) {
      const { command, path, new_path } = args;

      switch (command) {
        case "rename":
          return {
            icon: <FolderEdit className="w-3 h-3" />,
            message: `Renaming ${path} to ${new_path}`,
          };
        case "delete":
          return {
            icon: <Trash2 className="w-3 h-3" />,
            message: `Deleting ${path}`,
          };
        default:
          return {
            icon: <FolderEdit className="w-3 h-3" />,
            message: `Managing ${path}`,
          };
      }
    }

    return {
      icon: <FileEdit className="w-3 h-3" />,
      message: toolName,
    };
  };

  const { icon, message } = getToolMessage();
  const isComplete = state === "result";

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs border border-neutral-200">
      {isComplete ? (
        <>
          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
          <span className="text-neutral-600">{icon}</span>
          <span className="text-neutral-700">{message}</span>
        </>
      ) : (
        <>
          <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
          <span className="text-neutral-600">{icon}</span>
          <span className="text-neutral-700">{message}</span>
        </>
      )}
    </div>
  );
}

import { Loader2 } from "lucide-react";

interface ToolInvocationBadgeProps {
  toolName: string;
  args: Record<string, any>;
  state: "partial-call" | "call" | "result";
}

/**
 * Extracts the filename from a file path
 * Handles various path formats: absolute, relative, and alias paths
 */
function extractFilename(path: string | undefined): string {
  if (!path || path.trim() === '' || path === '/') return 'file';
  const parts = path.split('/');
  return parts[parts.length - 1] || 'file';
}

/**
 * Generates a user-friendly message based on the tool name and arguments
 */
function getToolMessage(toolName: string, args: Record<string, any>): string {
  if (toolName === 'str_replace_editor') {
    const { command, path } = args;
    const filename = extractFilename(path);

    switch (command) {
      case 'create':
        return `Creating ${filename}`;
      case 'view':
        return `Viewing ${filename}`;
      case 'str_replace':
        return `Editing ${filename}`;
      case 'insert':
        return `Editing ${filename}`;
      case 'undo_edit':
        return `Undoing changes to ${filename}`;
      default:
        return `Editing ${filename}`;
    }
  }

  if (toolName === 'file_manager') {
    const { command, path, new_path } = args;
    const filename = extractFilename(path);

    switch (command) {
      case 'delete':
        return `Deleting ${filename}`;
      case 'rename': {
        const newFilename = extractFilename(new_path);
        return `Renaming ${filename} to ${newFilename}`;
      }
      default:
        return `Managing ${filename}`;
    }
  }

  return `Using ${toolName}`;
}

/**
 * Displays user-friendly badges for AI tool invocations
 * Shows specific actions like "Creating Button.tsx" instead of generic "Editing file"
 */
export function ToolInvocationBadge({ toolName, args, state }: ToolInvocationBadgeProps) {
  const message = getToolMessage(toolName, args);
  const isCompleted = state === "result";

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {isCompleted ? (
        <>
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-neutral-700">{message}</span>
        </>
      ) : (
        <>
          <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
          <span className="text-neutral-700">{message}</span>
        </>
      )}
    </div>
  );
}

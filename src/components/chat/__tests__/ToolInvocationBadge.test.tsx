import { test, expect, vi, afterEach, describe } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolInvocationBadge } from "../ToolInvocationBadge";

// Mock lucide-react to avoid rendering actual icons
vi.mock("lucide-react", () => ({
  Loader2: ({ className }: { className?: string }) => (
    <div data-testid="loader" className={className} />
  ),
}));

afterEach(() => {
  cleanup();
});

describe("ToolInvocationBadge - str_replace_editor commands", () => {
  test("shows 'Creating [filename]' for create command", () => {
    render(
      <ToolInvocationBadge
        toolName="str_replace_editor"
        args={{ command: 'create', path: '/components/Button.tsx' }}
        state="call"
      />
    );
    expect(screen.getByText('Creating Button.tsx')).toBeDefined();
  });

  test("shows 'Viewing [filename]' for view command", () => {
    render(
      <ToolInvocationBadge
        toolName="str_replace_editor"
        args={{ command: 'view', path: '/src/App.tsx' }}
        state="call"
      />
    );
    expect(screen.getByText('Viewing App.tsx')).toBeDefined();
  });

  test("shows 'Editing [filename]' for str_replace command", () => {
    render(
      <ToolInvocationBadge
        toolName="str_replace_editor"
        args={{ command: 'str_replace', path: '/components/Card.tsx' }}
        state="call"
      />
    );
    expect(screen.getByText('Editing Card.tsx')).toBeDefined();
  });

  test("shows 'Editing [filename]' for insert command", () => {
    render(
      <ToolInvocationBadge
        toolName="str_replace_editor"
        args={{ command: 'insert', path: '/utils/helpers.ts' }}
        state="call"
      />
    );
    expect(screen.getByText('Editing helpers.ts')).toBeDefined();
  });

  test("shows 'Undoing changes to [filename]' for undo_edit command", () => {
    render(
      <ToolInvocationBadge
        toolName="str_replace_editor"
        args={{ command: 'undo_edit', path: '/components/Form.tsx' }}
        state="call"
      />
    );
    expect(screen.getByText('Undoing changes to Form.tsx')).toBeDefined();
  });

  test("defaults to 'Editing [filename]' for unknown command", () => {
    render(
      <ToolInvocationBadge
        toolName="str_replace_editor"
        args={{ command: 'unknown', path: '/test.tsx' }}
        state="call"
      />
    );
    expect(screen.getByText('Editing test.tsx')).toBeDefined();
  });
});

describe("ToolInvocationBadge - file_manager commands", () => {
  test("shows 'Deleting [filename]' for delete command", () => {
    render(
      <ToolInvocationBadge
        toolName="file_manager"
        args={{ command: 'delete', path: '/components/OldComponent.tsx' }}
        state="call"
      />
    );
    expect(screen.getByText('Deleting OldComponent.tsx')).toBeDefined();
  });

  test("shows 'Renaming [old] to [new]' for rename command", () => {
    render(
      <ToolInvocationBadge
        toolName="file_manager"
        args={{
          command: 'rename',
          path: '/components/OldName.tsx',
          new_path: '/components/NewName.tsx'
        }}
        state="call"
      />
    );
    expect(screen.getByText('Renaming OldName.tsx to NewName.tsx')).toBeDefined();
  });

  test("defaults to 'Managing [filename]' for unknown command", () => {
    render(
      <ToolInvocationBadge
        toolName="file_manager"
        args={{ command: 'unknown', path: '/test.tsx' }}
        state="call"
      />
    );
    expect(screen.getByText('Managing test.tsx')).toBeDefined();
  });
});

describe("ToolInvocationBadge - filename extraction", () => {
  test("extracts filename from absolute path", () => {
    render(
      <ToolInvocationBadge
        toolName="str_replace_editor"
        args={{ command: 'create', path: '/components/Button.tsx' }}
        state="call"
      />
    );
    expect(screen.getByText('Creating Button.tsx')).toBeDefined();
  });

  test("extracts filename from relative path", () => {
    render(
      <ToolInvocationBadge
        toolName="str_replace_editor"
        args={{ command: 'create', path: './Button.tsx' }}
        state="call"
      />
    );
    expect(screen.getByText('Creating Button.tsx')).toBeDefined();
  });

  test("extracts filename from alias path (@/)", () => {
    render(
      <ToolInvocationBadge
        toolName="str_replace_editor"
        args={{ command: 'create', path: '@/components/Button.tsx' }}
        state="call"
      />
    );
    expect(screen.getByText('Creating Button.tsx')).toBeDefined();
  });

  test("extracts filename from nested path", () => {
    render(
      <ToolInvocationBadge
        toolName="str_replace_editor"
        args={{ command: 'create', path: '/src/components/ui/Button.tsx' }}
        state="call"
      />
    );
    expect(screen.getByText('Creating Button.tsx')).toBeDefined();
  });

  test("handles missing path with default 'file'", () => {
    render(
      <ToolInvocationBadge
        toolName="str_replace_editor"
        args={{ command: 'create' }}
        state="call"
      />
    );
    expect(screen.getByText('Creating file')).toBeDefined();
  });

  test("handles undefined path with default 'file'", () => {
    render(
      <ToolInvocationBadge
        toolName="str_replace_editor"
        args={{ command: 'create', path: undefined }}
        state="call"
      />
    );
    expect(screen.getByText('Creating file')).toBeDefined();
  });

  test("handles empty path with default 'file'", () => {
    render(
      <ToolInvocationBadge
        toolName="str_replace_editor"
        args={{ command: 'create', path: '' }}
        state="call"
      />
    );
    expect(screen.getByText('Creating file')).toBeDefined();
  });

  test("handles root path with default 'file'", () => {
    render(
      <ToolInvocationBadge
        toolName="str_replace_editor"
        args={{ command: 'create', path: '/' }}
        state="call"
      />
    );
    expect(screen.getByText('Creating file')).toBeDefined();
  });

  test("handles path ending with slash", () => {
    render(
      <ToolInvocationBadge
        toolName="str_replace_editor"
        args={{ command: 'create', path: '/components/' }}
        state="call"
      />
    );
    expect(screen.getByText('Creating file')).toBeDefined();
  });
});

describe("ToolInvocationBadge - visual states", () => {
  test("shows loader for 'partial-call' state", () => {
    render(
      <ToolInvocationBadge
        toolName="str_replace_editor"
        args={{ command: 'create', path: '/Button.tsx' }}
        state="partial-call"
      />
    );
    expect(screen.getByTestId('loader')).toBeDefined();
  });

  test("shows loader for 'call' state", () => {
    render(
      <ToolInvocationBadge
        toolName="str_replace_editor"
        args={{ command: 'create', path: '/Button.tsx' }}
        state="call"
      />
    );
    expect(screen.getByTestId('loader')).toBeDefined();
  });

  test("shows success dot for 'result' state", () => {
    const { container } = render(
      <ToolInvocationBadge
        toolName="str_replace_editor"
        args={{ command: 'create', path: '/Button.tsx' }}
        state="result"
      />
    );
    const successDot = container.querySelector('.bg-emerald-500');
    expect(successDot).toBeDefined();
    expect(successDot?.classList.contains('w-2')).toBe(true);
    expect(successDot?.classList.contains('h-2')).toBe(true);
    expect(successDot?.classList.contains('rounded-full')).toBe(true);
  });

  test("does not show loader for 'result' state", () => {
    render(
      <ToolInvocationBadge
        toolName="str_replace_editor"
        args={{ command: 'create', path: '/Button.tsx' }}
        state="result"
      />
    );
    expect(screen.queryByTestId('loader')).toBeNull();
  });
});

describe("ToolInvocationBadge - unknown tools", () => {
  test("shows 'Using [toolName]' for unknown tool", () => {
    render(
      <ToolInvocationBadge
        toolName="unknown_tool"
        args={{ some_arg: 'value' }}
        state="call"
      />
    );
    expect(screen.getByText('Using unknown_tool')).toBeDefined();
  });
});

describe("ToolInvocationBadge - edge cases", () => {
  test("handles missing new_path in rename gracefully", () => {
    render(
      <ToolInvocationBadge
        toolName="file_manager"
        args={{ command: 'rename', path: '/old.tsx' }}
        state="call"
      />
    );
    expect(screen.getByText('Renaming old.tsx to file')).toBeDefined();
  });

  test("handles undefined args gracefully", () => {
    render(
      <ToolInvocationBadge
        toolName="str_replace_editor"
        args={{}}
        state="call"
      />
    );
    expect(screen.getByText('Editing file')).toBeDefined();
  });

  test("applies correct styling classes", () => {
    const { container } = render(
      <ToolInvocationBadge
        toolName="str_replace_editor"
        args={{ command: 'create', path: '/Button.tsx' }}
        state="call"
      />
    );
    const badge = container.querySelector('.inline-flex');
    expect(badge?.classList.contains('items-center')).toBe(true);
    expect(badge?.classList.contains('gap-2')).toBe(true);
    expect(badge?.classList.contains('mt-2')).toBe(true);
    expect(badge?.classList.contains('px-3')).toBe(true);
    expect(badge?.classList.contains('py-1.5')).toBe(true);
    expect(badge?.classList.contains('bg-neutral-50')).toBe(true);
    expect(badge?.classList.contains('rounded-lg')).toBe(true);
    expect(badge?.classList.contains('text-xs')).toBe(true);
    expect(badge?.classList.contains('font-mono')).toBe(true);
    expect(badge?.classList.contains('border')).toBe(true);
    expect(badge?.classList.contains('border-neutral-200')).toBe(true);
  });
});

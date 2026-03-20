# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UIGen is an AI-powered React component generator with live preview. It uses Claude AI via the Vercel AI SDK to generate React components through tool calling, renders them in a virtual file system, and provides live preview without writing to disk.

## Development Commands

### Setup
```bash
npm run setup              # Install dependencies, generate Prisma client, run migrations
```

### Development
```bash
npm run dev               # Start Next.js dev server with Turbopack
npm run dev:daemon        # Start dev server in background (logs to logs.txt)
```

### Database
```bash
npx prisma generate       # Generate Prisma client
npx prisma migrate dev    # Run database migrations
npm run db:reset          # Reset database (warning: deletes all data)
```

### Testing
```bash
npm test                  # Run Vitest tests
```

### Linting & Building
```bash
npm run lint             # Run ESLint
npm run build            # Build for production
npm start                # Start production server
```

## Core Architecture

### Virtual File System (`src/lib/file-system.ts`)

The `VirtualFileSystem` class is central to the application. It provides an in-memory file system that **never writes to disk**. All generated components exist only in memory.

Key methods:
- `createFile(path, content)` - Create files with automatic parent directory creation
- `updateFile(path, content)` - Update file content
- `readFile(path)` - Read file content
- `deleteFile(path)` - Delete files/directories recursively
- `rename(oldPath, newPath)` - Rename/move files
- `serialize()` / `deserialize()` - Convert to/from JSON for database storage

### AI Component Generation (`src/app/api/chat/route.ts`)

The chat endpoint orchestrates AI-powered component generation:

1. Receives messages and current file system state
2. Reconstructs `VirtualFileSystem` from serialized data
3. Streams responses from Claude (or mock provider if no API key)
4. Provides two AI tools:
   - **`str_replace_editor`**: Create, view, and edit files using string replacement
   - **`file_manager`**: Rename, move, or delete files
5. Saves conversation and file system state to database on completion

**Mock Provider**: When `ANTHROPIC_API_KEY` is not set, the system uses a `MockLanguageModel` that generates pre-defined Counter, Card, or Form components based on keywords in the prompt.

### JSX Transformation (`src/lib/transform/jsx-transformer.ts`)

Transforms JSX/TSX code into ES modules for browser execution:

- Uses `@babel/standalone` to transform React code
- Creates **import maps** with blob URLs for each module
- Supports `@/` path aliases (maps to root directory)
- Handles third-party packages via `https://esm.sh`
- Collects and injects CSS from `.css` files
- Creates placeholder modules for missing imports
- Returns syntax errors without breaking the preview

Key function: `createImportMap(files)` returns:
- `importMap`: JSON import map with blob URLs
- `styles`: Concatenated CSS content
- `errors`: Array of transformation errors per file

### Preview System (`src/components/preview/PreviewFrame.tsx`)

The preview iframe:
- Receives transformed HTML with import map
- Uses Tailwind CDN for styling
- Includes error boundary for runtime errors
- Dynamically imports and renders the App component
- Shows syntax errors in a styled error UI

### Database Schema

**The database schema is defined in `prisma/schema.prisma`. Reference it anytime you need to understand the structure of data stored in the database.**

Key models:
- **User**: Email/password authentication
- **Project**: Stores conversation messages and file system state as JSON
  - `messages`: JSON array of chat messages
  - `data`: Serialized VirtualFileSystem state
  - `userId`: Optional - supports anonymous users

The Prisma client is generated to `src/generated/prisma` (custom output path specified in schema).

### File Structure

```
src/
├── actions/           # Server actions (create-project, get-project, etc.)
├── app/
│   ├── api/chat/     # AI streaming endpoint
│   ├── [projectId]/  # Project-specific pages
│   └── layout.tsx    # Root layout
├── components/
│   ├── auth/         # Authentication forms
│   ├── chat/         # Chat interface & message list
│   ├── editor/       # Code editor & file tree
│   ├── preview/      # Preview iframe
│   └── ui/           # Reusable UI components
├── lib/
│   ├── contexts/     # React contexts (FileSystemContext, ChatContext)
│   ├── prompts/      # AI system prompts
│   ├── tools/        # AI tool definitions (str-replace, file-manager)
│   ├── transform/    # JSX transformer & import map builder
│   ├── auth.ts       # JWT-based session management
│   ├── file-system.ts # Virtual file system implementation
│   ├── provider.ts   # Language model provider (Anthropic or mock)
│   └── prisma.ts     # Prisma client singleton
└── hooks/            # React hooks
```

## Important Patterns

### Path Resolution

The system supports multiple import styles:
- Absolute: `/components/Button.jsx`
- Relative: `./components/Button.jsx` or `../Button.jsx`
- Alias: `@/components/Button.jsx` (maps to root)
- Extensions are optional: `@/components/Button` works for `.jsx`, `.tsx`, `.js`, `.ts`

### State Management

- **File system state**: Managed in `FileSystemContext`, synced to database
- **Chat state**: Managed in `ChatContext`, messages streamed from AI SDK
- **Session**: JWT tokens stored in cookies, validated server-side

### Testing

Tests use Vitest with `jsdom` environment. The project includes unit tests for:
- File system operations
- JSX transformation
- Component rendering
- Chat interface

Run tests in watch mode: `npm test -- --watch`

## Environment Variables

```bash
ANTHROPIC_API_KEY=sk-...    # Optional - uses mock provider if not set
```

## Key Design Decisions

1. **No disk writes**: All generated code exists only in memory or database, preventing file system pollution
2. **Blob URLs**: Each transformed module gets a unique blob URL for browser import
3. **Import maps**: Modern browser feature used for module resolution
4. **Tool calling**: AI generates components by calling tools rather than directly outputting code
5. **Mock provider**: Allows development/testing without API keys or costs
6. **Anonymous mode**: Users can generate components without creating an account (ephemeral sessions)

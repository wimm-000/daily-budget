# AGENTS.md - AI Agent Guidelines for daily-budget

This document provides guidelines for AI coding agents working in this repository.

## Project Overview

A daily budget tracking application built with TanStack Start (React meta-framework), TanStack Router, Drizzle ORM, and Tailwind CSS v4.

## Build/Test/Lint Commands

> **Note:** This project prefers `bun` over `npm`. All commands below use `bun`.

| Command | Description |
|---------|-------------|
| `bun run dev` | Start dev server on port 3000 |
| `bun run build` | Production build |
| `bun run test` | Run all tests with Vitest |
| `bun vitest run src/path/to/file.test.ts` | Run a single test file |
| `bun vitest run -t "test name"` | Run tests matching a pattern |
| `bun run db:generate` | Generate Drizzle migrations |
| `bun run db:migrate` | Apply database migrations |
| `bun run db:push` | Push schema changes directly (dev) |
| `bun run db:studio` | Open Drizzle Studio UI |

### Running Tests

```bash
# Run all tests
bun run test

# Run a single test file
bun vitest run src/components/Button.test.tsx

# Run tests matching a pattern
bun vitest run -t "should render button"

# Run tests in watch mode
bun vitest src/components/
```

## Project Structure

```
src/
├── components/      # Reusable React components
├── data/            # Data utilities and mock data
├── db/              # Database layer (Drizzle ORM)
│   ├── index.ts     # DB connection
│   └── schema.ts    # Table schemas
├── hooks/           # Custom React hooks
├── lib/             # Utility functions (cn(), etc.)
├── routes/          # File-based routing (TanStack Router)
├── router.tsx       # Router configuration
├── routeTree.gen.ts # AUTO-GENERATED - DO NOT EDIT
└── styles.css       # Global styles + Tailwind CSS variables
```

## Code Style Guidelines

### Import Order

Organize imports in this order, with blank lines between groups:

```typescript
// 1. Node.js built-ins
import fs from 'node:fs'

// 2. React
import { useState, useEffect } from 'react'

// 3. Framework/routing
import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'

// 4. Third-party libraries
import { z } from 'zod'
import { desc } from 'drizzle-orm'

// 5. Path-aliased local imports
import { db } from '@/db'
import { cn } from '@/lib/utils'

// 6. Relative imports
import { Header } from '../components/Header'

// 7. Type-only imports (at the end)
import type { Person } from '@/data/types'
```

### Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Route files | kebab-case or dot.notation | `form.simple.tsx`, `api.names.ts` |
| Components | PascalCase | `Header.tsx`, `UserProfile.tsx` |
| Hooks | camelCase with `use` prefix | `useAppForm.ts` |
| Utilities | camelCase | `formatCurrency.ts` |
| Types/Interfaces | PascalCase | `type Person`, `interface Config` |
| Functions | camelCase, verb prefix for actions | `getTodos`, `createUser` |
| Constants | SCREAMING_SNAKE_CASE | `const MAX_ITEMS = 100` |
| State variables | camelCase | `isOpen`, `userData` |

### TypeScript Guidelines

- **Strict mode enabled** - No implicit any, unused locals, or unused parameters
- **Use path alias** - Import from `src/` using `@/` prefix
- **Prefer `type` over `interface`** for object shapes
- **Co-locate types** with their related code when possible
- **Use Zod for runtime validation** on user inputs and API data

```typescript
// Type definition
export type Todo = {
  id: number
  title: string
  completed: boolean
  createdAt: Date
}

// Zod schema for validation
const todoSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  completed: z.boolean().default(false),
})
```

### Component Patterns

#### Route Component

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { getTodos } from '@/server/todos'

export const Route = createFileRoute('/todos')({
  component: TodosPage,
  loader: async () => await getTodos(),
})

function TodosPage() {
  const todos = Route.useLoaderData()
  
  return (
    <div className="container mx-auto p-4">
      {/* Component JSX */}
    </div>
  )
}
```

#### Server Functions

```typescript
import { createServerFn } from '@tanstack/react-start'
import { db } from '@/db'
import { todos } from '@/db/schema'

export const getTodos = createServerFn({
  method: 'GET',
}).handler(async () => {
  return await db.query.todos.findMany()
})

export const createTodo = createServerFn({
  method: 'POST',
})
  .inputValidator((data: { title: string }) => data)
  .handler(async ({ data }) => {
    await db.insert(todos).values({ title: data.title })
    return { success: true }
  })
```

### Error Handling

```typescript
// Server function errors
try {
  await createTodo({ data: { title } })
  router.invalidate()
} catch (error) {
  console.error('Failed to create todo:', error)
  // Handle error appropriately
}

// Form validation (onBlur)
validators={{
  onBlur: ({ value }) => {
    if (!value?.trim()) {
      return 'Field is required'
    }
    return undefined
  },
}}
```

### Styling with Tailwind CSS

- Use the `cn()` utility for conditional classes
- Prefer Tailwind utilities over custom CSS
- Theme colors use CSS variables (defined in `styles.css`)

```typescript
import { cn } from '@/lib/utils'

<button
  className={cn(
    'px-4 py-2 rounded-md font-medium',
    'bg-primary text-primary-foreground',
    isDisabled && 'opacity-50 cursor-not-allowed'
  )}
>
  Submit
</button>
```

### Database (Drizzle ORM)

Schema location: `src/db/schema.ts`

```typescript
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const todos = sqliteTable('todos', {
  id: integer({ mode: 'number' }).primaryKey({ autoIncrement: true }),
  title: text().notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .default(sql`(unixepoch())`),
})
```

## Important Rules

1. **NEVER modify `routeTree.gen.ts`** - Auto-generated by TanStack Router
2. **Use `@/` path alias** - Always import from `src/` using `@/` prefix
3. **Demo files can be deleted** - Files prefixed with `demo` are examples
4. **Environment variables** - Store in `.env.local`, access via `process.env`
5. **shadcn/ui components** - Add with `npx shadcn@latest add <component>`

## Adding shadcn/ui Components

```bash
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add input
npx shadcn@latest add dialog
```

Components are added to `src/components/ui/` and are fully customizable.

## Technology Stack

| Category | Technology |
|----------|------------|
| Framework | TanStack Start (React 19) |
| Routing | TanStack Router (file-based) |
| Styling | Tailwind CSS v4, shadcn/ui |
| Forms | TanStack Form + Zod |
| Database | Drizzle ORM + SQLite |
| Build | Vite 7 |
| Testing | Vitest + Testing Library |
| Deployment | Netlify |

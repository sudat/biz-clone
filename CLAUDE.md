# CLAUDE.md

必ず日本語で回答してください。
This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Biz Clone** is a modern Japanese accounting system (会計システム) built with Next.js 15, Prisma, and Supabase. It implements comprehensive double-entry bookkeeping with master data management for accounts, partners, and analysis codes.

## Development Commands

### Package Management

```bash
bun install          # Install dependencies
bun run dev          # Start development server
bun run build        # Build for production
bun run start        # Start production server
```

### Code Quality

```bash
bun run lint         # Run ESLint
bun run lint:fix     # Fix ESLint errors
```

### Database Operations

```bash
bunx prisma generate              # Generate Prisma client
bunx prisma db push              # Push schema changes to database
bunx prisma studio               # Open Prisma Studio
bunx supabase start              # Start local Supabase
bunx supabase db reset           # Reset database with migrations
bunx supabase gen types typescript --local > types/supabase.ts  # Generate types
```

### Testing

```bash
bun test                        # Run all tests
bun test typeConverters         # Run specific test file
```

## Architecture Overview

### Tech Stack

- **Next.js 15** with App Router and React 19
- **TypeScript** for type safety
- **Prisma** as ORM (camelCase conventions)
- **Supabase** for auth and real-time features (snake_case conventions)
- **Tailwind CSS + Shadcn/UI** for styling
- **PostgreSQL** database with Row Level Security

### Hybrid Data Access Pattern

The codebase implements a dual ORM approach:

- **Prisma** (`/lib/database/`) - Type-safe operations, complex business logic
- **Supabase** (`/lib/supabase/`) - Authentication, real-time features
- **Type converters** (`/lib/utils/typeConverters.ts`) - Handle camelCase ↔ snake_case conversion
- **Client adapters** (`/lib/adapters/`) - Unified interface for UI components

### Key Directories

- `/app/` - Next.js App Router pages and Server Actions
- `/components/accounting/` - Business-specific UI components
- `/lib/database/` - Prisma services and business logic
- `/lib/adapters/` - Client-side data adapters
- `/prisma/` - Database schema and migrations
- `/supabase/` - Supabase configuration and migrations

## Database Schema (Japanese Accounting)

### Core Business Entities

- **勘定科目 (accounts)** - Chart of accounts with hierarchical structure
- **補助科目 (sub_accounts)** - Subsidiary accounts linked to main accounts
- **取引先 (partners)** - Business partners (customers, vendors, banks)
- **分析コード (analysis_codes)** - Cost centers and analysis dimensions
- **仕訳 (journal_entries)** - Double-entry journal entries with automatic numbering

### Journal Number Format

Automatic journal numbering follows: `YYYYMMDDXXXXXXX` (date + 7-digit sequence)

## Development Patterns

### Form Components

All master data forms use:

- **React Hook Form** with **Zod** validation
- **Server Actions** for mutations
- **Client adapters** for data fetching
- Consistent error handling and loading states

### Data Flow

1. UI components call client adapters
2. Adapters invoke Server Actions or Prisma services
3. Type converters handle Prisma ↔ Supabase format conversion
4. Database operations use appropriate ORM (Prisma for business logic, Supabase for auth)

### Authentication

- **Supabase Auth** with middleware-based route protection
- **RLS policies** enforce row-level security
- User roles: admin, manager, user

## Important Files

### Configuration

- `/middleware.ts` - Route protection and auth
- `/prisma/schema.prisma` - Database schema definition
- `/lib/database/types.ts` - Core type definitions

### Services

- `/lib/database/master.ts` - Master data CRUD operations
- `/lib/database/journal.ts` - Journal entry services
- `/app/lib/actions/` - Server Actions for forms

### UI Components

- `/components/accounting/` - Business forms and lists
- `/components/layout/header.tsx` - Main navigation
- `/components/ui/` - Base UI components (Shadcn/UI)

## Development Notes

### Type Safety

Always use the type converters when working between Prisma and Supabase data. The `typeConverters.ts` utilities handle automatic conversion between camelCase (Prisma) and snake_case (Supabase) formats.

### Testing

Run tests after making changes to type converters or core business logic. Tests are located in `__tests__/` and use the standard Jest patterns.

### Database Changes

1. Update `/prisma/schema.prisma`
2. Run `bunx prisma db push` to sync changes
3. Run `bunx prisma generate` to update client
4. Update Supabase types if needed: `bunx supabase gen types typescript --local > types/supabase.ts`

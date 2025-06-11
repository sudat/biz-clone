# CLAUDE.md

必ず日本語で回答してください。
This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Biz Clone** is a modern Japanese accounting system (会計システム) built with Next.js 15 and Prisma. It implements comprehensive double-entry bookkeeping with master data management for accounts, partners, and analysis codes using a simplified architecture optimized for individual development.

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
- **Prisma** as primary ORM (unified camelCase approach)
- **PostgreSQL** database
- **Tailwind CSS + Shadcn/UI** for styling

### Simplified Architecture

The codebase implements a streamlined 3-layer approach optimized for individual development:

- **UI Layer** (`/app/`, `/components/`) - Next.js pages and React components
- **Server Actions** (`/app/actions/`) - Direct business logic and data operations
- **Database Layer** (`/lib/database/`) - Prisma-based data access

### Key Directories

- `/app/` - Next.js App Router pages and Server Actions
- `/components/accounting/` - Business-specific UI components
- `/lib/database/` - Prisma client and database utilities
- `/lib/schemas/` - Zod validation schemas
- `/prisma/` - Database schema and migrations
- `/types/` - Unified TypeScript type definitions

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
- **Server Actions** for direct data mutations
- Consistent error handling and loading states

### Data Flow

1. UI components directly call Server Actions
2. Server Actions handle validation and business logic
3. Prisma client performs database operations
4. All data uses unified camelCase types from Prisma

### Authentication

Authentication has been simplified and may be added in future versions as needed.

## Important Files

### Configuration

- `/middleware.ts` - Route protection (if auth is enabled)
- `/prisma/schema.prisma` - Database schema definition
- `/types/unified.ts` - Unified type definitions

### Server Actions

- `/app/actions/accounts.ts` - Account management operations
- `/app/actions/partners.ts` - Partner management operations
- `/app/actions/analysis-codes.ts` - Analysis code operations
- `/app/actions/sub-accounts.ts` - Sub-account operations

### Database Services

- `/lib/database/journal.ts` - Journal entry services
- `/lib/database/journal-number.ts` - Journal numbering system

### UI Components

- `/components/accounting/` - Business forms and lists
- `/components/layout/header.tsx` - Main navigation
- `/components/ui/` - Base UI components (Shadcn/UI)

## Development Notes

### Type Safety

The application uses a unified type system based on Prisma-generated types. All components use the same camelCase types defined in `/types/unified.ts`.

### Testing

Run tests using `bun test`. Tests should be added for new business logic and Server Actions.

### Database Changes

1. Update `/prisma/schema.prisma`
2. Run `bunx prisma db push` to sync changes
3. Run `bunx prisma generate` to update client

# Momentum

A goal-oriented coaching platform built with Next.js, Supabase, and Deno Edge Functions.

## Project Structure

This is a pnpm workspace monorepo with the following packages:

- `/apps/web` - Next.js 14 + TypeScript web application
- `/apps/edge` - Supabase Edge Functions (Deno 1.40)
- `/packages/db` - SQL migrations + generated Supabase types

## Getting Started

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Run development servers:
   ```bash
   pnpm dev
   ```

3. Run tests:
   ```bash
   pnpm test
   ```

4. Run linting:
   ```bash
   pnpm lint
   ```

5. Run type checking:
   ```bash
   pnpm type-check
   ```

## CI/CD

The project uses GitHub Actions for continuous integration. The workflow runs:
- `pnpm install`
- `pnpm lint`
- `pnpm type-check`
- `pnpm test`

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **Edge Functions**: Deno 1.40
- **Testing**: Vitest
- **Linting**: ESLint with @next/core-web-vitals
- **Package Manager**: pnpm 
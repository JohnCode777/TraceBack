# Architecture

TraceBack is a single Next.js App Router application. Server code uses Prisma against SQLite in local development and tests. Session 3 adds authenticated bug workflows; project management and the later reporting features remain in their planned sessions.

## Layout

| Path                          | Purpose                                                                                      |
| ----------------------------- | -------------------------------------------------------------------------------------------- |
| `src/app/`                    | Routes, layouts and UI. Bug API routes validate input and call the domain service.           |
| `src/lib/policy.ts`           | Central authorization policy for project membership and bug role permissions.                |
| `src/lib/state-machine.ts`    | Pure lifecycle transition rules; `transitionBug` applies them transactionally on the server. |
| `src/lib/`                    | Shared domain, validation, completeness, statistics and report code as sessions add them.    |
| `prisma/schema.prisma`        | Persistent data model and indexes. SQLite enum values are stored as strings.                 |
| `prisma/migrations/`          | Committed SQL migrations, applied by `scripts/migrate.ts`.                                   |
| `prisma/seed-plan.ts`         | Deterministic plan for fake demo reports and histories.                                      |
| `prisma/seed.ts`              | Idempotent seed writer; it does not overwrite existing seeded bugs.                          |
| `tests/` and `e2e/`           | Vitest business logic tests and Playwright browser tests.                                    |
| `scripts/generate-prisma.mjs` | Generates the Prisma client without fetching unused Rust binaries.                           |
| `scripts/pdf-spike.ts`        | Disposable PDFKit environment proof; remove in Session 5.                                    |

## Intended data flow

1. App Router receives a request. Auth.js identifies an existing user through credentials.
2. A route or server action validates input with a shared Zod schema, then calls the central policy module. A project non-member gets a 404.
3. Domain services use Prisma transactions for mutations. Bug creation allocates `nextBugNumber` inside a transaction. Lifecycle changes call the pure state machine and append a `StatusChange` in the same transaction.
4. Reads are scoped to project membership before data is returned. UI checks only guide the user; server checks decide access.
5. Later PDF and dashboard functions will read scoped data and produce output without mutating history.

The migration makes `StatusChange` append-only with database triggers and restricts cascade deletion. Session 3 route and service tests cover the server policy and lifecycle.

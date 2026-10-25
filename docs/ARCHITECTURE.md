# Architecture

TraceBack is a single Next.js App Router application. Server code uses Prisma against SQLite in local development and tests. The initial scaffold has a static landing page and no product actions yet.

## Layout

| Path                          | Purpose                                                                                            |
| ----------------------------- | -------------------------------------------------------------------------------------------------- |
| `src/app/`                    | Routes, layouts and UI. API routes and server actions will live here in later sessions.            |
| `src/lib/policy.ts`           | Planned single authorization policy module for project membership and the role matrix.             |
| `src/lib/state-machine.ts`    | Planned pure lifecycle transition rules; a single server function will apply them transactionally. |
| `src/lib/`                    | Shared domain, validation, completeness, statistics and report code as sessions add them.          |
| `prisma/schema.prisma`        | Persistent data model and indexes. SQLite enum values are stored as strings.                       |
| `prisma/migrations/`          | Committed SQL migrations, applied by `scripts/migrate.ts`.                                         |
| `prisma/seed-plan.ts`         | Deterministic plan for fake demo reports and histories.                                            |
| `prisma/seed.ts`              | Idempotent seed writer; it does not overwrite existing seeded bugs.                                |
| `tests/` and `e2e/`           | Vitest business logic tests and Playwright browser tests.                                          |
| `scripts/generate-prisma.mjs` | Generates the Prisma client without fetching unused Rust binaries.                                 |
| `scripts/pdf-spike.ts`        | Disposable PDFKit environment proof; remove in Session 5.                                          |

## Intended data flow

1. App Router receives a request. Auth.js will identify the user in Session 2.
2. A route or server action validates input with a shared Zod schema, then calls the central policy module. A project non-member gets a 404.
3. Domain services use Prisma transactions for mutations. Bug creation will allocate `nextBugNumber` inside a transaction. Lifecycle changes will call the pure state machine and append a `StatusChange` in the same transaction.
4. Reads are scoped to project membership before data is returned. UI checks only guide the user; server checks decide access.
5. Later PDF and dashboard functions will read scoped data and produce output without mutating history.

The migration makes `StatusChange` append-only with database triggers and restricts cascade deletion. The server write policy and transition tests arrive with the lifecycle in Session 3.

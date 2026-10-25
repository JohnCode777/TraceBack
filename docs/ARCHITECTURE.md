# Architecture

TraceBack is a single Next.js App Router application. Server code uses Prisma against SQLite in local development and tests. Auth.js credentials sessions identify users; project and bug services scope Prisma queries to memberships.

## Layout

| Path                          | Purpose                                                                                    |
| ----------------------------- | ------------------------------------------------------------------------------------------ |
| `src/app/`                    | Routes, layouts, auth API endpoint, project actions and bug API routes.                    |
| `src/lib/policy.ts`           | Single authorization policy module for project membership and the Section 5.1 role matrix. |
| `src/lib/state-machine.ts`    | Pure lifecycle transition rules; `transitionBug` applies them transactionally.             |
| `src/lib/`                    | Shared validation, completeness, statistics, report and database code.                     |
| `prisma/schema.prisma`        | Persistent data model and indexes. SQLite enum values are stored as strings.               |
| `prisma/migrations/`          | Committed SQL migrations, applied by `scripts/migrate.ts`.                                 |
| `prisma/seed-plan.ts`         | Deterministic plan for fake demo reports and histories.                                    |
| `prisma/seed.ts`              | Idempotent seed writer; it does not overwrite existing seeded bugs.                        |
| `tests/` and `e2e/`           | Vitest business logic tests and Playwright browser tests.                                  |
| `scripts/generate-prisma.mjs` | Generates the Prisma client without fetching unused Rust binaries.                         |
| `scripts/pdf-spike.ts`        | Disposable PDFKit environment proof; remove in Session 5.                                  |

## Data flow

1. App Router receives a request. Auth.js identifies the user from a JWT session.
2. A server action validates input with a shared Zod schema, then calls a project service. The service checks membership and the central policy module. A project non-member gets a 404.
3. Project services use Prisma for scoped reads and mutations. Bug creation allocates `nextBugNumber` inside a transaction. Lifecycle changes call the pure state machine and append a `StatusChange` in the same transaction.
4. Reads are scoped to project membership before data is returned. UI checks only guide the user; server checks decide access.
5. Bug create and edit use the pure completeness evaluator before persisting scores. The Session 4 migration backfills old scores. The member-scoped PDF route and project dashboard read existing data without mutating history.

The initial migration makes `StatusChange` append-only with database triggers and restricts cascade deletion. Session 3 tests cover server authorization and lifecycle transitions.

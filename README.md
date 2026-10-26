# TraceBack

TraceBack helps a tester write reproducible bug reports, a developer investigate and fix them, and a tester verify the original steps. Project roles keep reports private to project members. This repository runs locally with SQLite and needs no external service.

## Run it in under 10 minutes

Use Node.js 24 and npm on macOS or Linux. From a fresh clone, run:

```bash
npm ci
cp .env.example .env
node -e 'const fs=require("node:fs"),crypto=require("node:crypto");const p=".env";fs.writeFileSync(p,fs.readFileSync(p,"utf8").replace(/AUTH_SECRET=.*/,`AUTH_SECRET="${crypto.randomBytes(32).toString("hex")}"`))'
npm run migrate
npm run seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign in as `tester1@example.test` or `developer1@example.test` with the **fake local demo password** `traceback-demo-password`. The seed also creates `admin1@example.test`, two projects and 50 synthetic bugs. The seeded users and data are for local evaluation only. Registration is available; a new account starts without a project until it creates one or an Admin adds it.

The `.env` file and SQLite databases are ignored by Git. `npm run seed` can be rerun without replacing existing seeded bugs. The first `npm ci` needs access to the npm registry; the Prisma client generator is configured to avoid downloading unused Rust engines.

## Environment variables

| Variable       | Purpose                                                                                             |
| -------------- | --------------------------------------------------------------------------------------------------- |
| `DATABASE_URL` | Required at runtime. For local SQLite, use `file:./dev.db`; this is resolved to `prisma/dev.db`.    |
| `AUTH_SECRET`  | Required for Auth.js session signing. Use a new random value per deployment and keep it out of Git. |
| `AUTH_URL`     | Set to the public HTTPS origin when deploying behind a proxy if Auth.js cannot infer it.            |

For deployment, use HTTPS, a persistent database volume, a unique `AUTH_SECRET`, and run migrations before starting the server. The reverse proxy must send the public `Host` and `X-Forwarded-Proto` headers for the same-origin API checks. SQLite is suited to a single app instance; use Postgres for multiple writers or instances. Do not run the public app with demo accounts or demo passwords.

## Scripts

| Command                           | What it does                                                                |
| --------------------------------- | --------------------------------------------------------------------------- |
| `npm run dev`                     | Start the local Next.js server.                                             |
| `npm run migrate`                 | Apply checked-in SQLite SQL migrations, tracked by checksum.                |
| `npm run seed`                    | Add synthetic demo users, projects and bugs.                                |
| `npm run lint`                    | Run ESLint.                                                                 |
| `npm run type-check`              | Run strict TypeScript checking.                                             |
| `npm test`                        | Run Vitest unit and integration tests.                                      |
| `npx playwright install chromium` | Install the browser needed for end-to-end tests.                            |
| `npm run e2e`                     | Run the Playwright lifecycle and PDF download flow. Migrate and seed first. |
| `npm run perf:check`              | Benchmark list and stats on a disposable 1,200-bug SQLite database.         |
| `npm run build` / `npm run start` | Build and run the production app.                                           |
| `npm run format:check`            | Check Prettier formatting.                                                  |

If Chromium is already installed outside Playwright's cache, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to its executable when running `npm run e2e`. The CI workflow runs install, migration, seed, lint, type-check, tests and build.

## Architecture

- `src/app/` contains App Router pages, server actions and authenticated bug API routes. `src/auth.ts` configures Auth.js credentials and JWT sessions.
- `src/lib/policy.ts` holds project-role permissions; `src/lib/state-machine.ts` holds the pure lifecycle rules. Services in `src/lib/projects.ts` and `src/lib/bugs.ts` enforce both on the server and scope reads to project membership.
- Zod schemas in `src/lib/validation.ts` and `src/lib/validators.ts` validate inputs. `src/lib/completeness.ts` scores reports. `src/lib/stats.ts` calculates dashboard numbers, and `src/lib/report.ts` creates PDFKit reports.
- Prisma uses the libSQL SQLite adapter. `prisma/schema.prisma` defines the model; `prisma.config.ts` provides the datasource URL. `scripts/migrate.ts` applies committed SQLite migrations, and `prisma/seed.ts` creates fake demo data.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/SECURITY.md](docs/SECURITY.md), [docs/PERFORMANCE.md](docs/PERFORMANCE.md) and [docs/STATUS.md](docs/STATUS.md) for the detailed design, audit, load check and current limitations.

## Switching to Postgres

This is a code and migration change, not just a `DATABASE_URL` change:

1. Change the datasource provider in `prisma/schema.prisma` to `postgresql` and set a PostgreSQL URL in the environment and `prisma.config.ts`.
2. Replace `@prisma/adapter-libsql` with Prisma's PostgreSQL adapter in `src/lib/db.ts` and `prisma/seed.ts`. Pin compatible versions of `@prisma/adapter-pg` and `pg`, then regenerate the Prisma client.
3. Create PostgreSQL migrations for the schema, indexes and append-only history protection. The checked-in SQLite SQL and `scripts/migrate.ts` use `node:sqlite` and cannot run on Postgres. Use a PostgreSQL migration runner (for example Prisma Migrate) and migrate existing data separately if needed.
4. Update the test database setup, CI and performance script to use Postgres, then run lint, type-check, tests, migration/seed, end-to-end and build checks before deploying.

Keep `nextBugNumber` allocation transactional and preserve the unique `(projectId, number)` index on Postgres.

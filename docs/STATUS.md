# Status

## Session 1

- Done: roadmap Section 5 copied into `SPEC.md`; agent guide, architecture and decision records.
- Done: Next.js App Router, strict TypeScript, Tailwind, ESLint, Prettier, Vitest, Playwright and CI scaffold.
- Done: Prisma data model, initial migration, environment example and Git ignore rules.
- Done: repeatable fake seed with nine users, two projects, 50 bugs, ordered steps, notes and valid status histories.
- Done: disposable PDFKit spike and scaffold browser smoke test.
- Checks: clean `npm ci`, lint, type-check, tests (6), build, migration, repeatable seed, PDF spike and Playwright scaffold smoke test passed locally.
- Partial: none within Session 1.
- Known broken: none within Session 1.
- Deferred by roadmap: authentication, policy, projects, bug workflow, completeness engine, production reports, dashboard and full lifecycle end-to-end test belong to Sessions 2–5.

## Session 3

- Done: create and edit forms with shared Zod validation and add/remove reproduction steps; race-safe per-project `KEY-number` IDs.
- Done: scoped bug list with status, severity, area, reporter, assignee and text filters, sorting and pagination; bug detail with assignment and structured resolution.
- Done: pure server-enforced state machine, immutable status records, reopen and regression counts, timeline, typed notes with sanitised Markdown and edited markers, and a combined activity feed with before/after edit logs.
- Done: existing-user Auth.js sign-in and centralized bug policy, required because Session 2 was absent from the starting checkout.
- Checks: clean `npm ci`, migration, seed, lint, type-check, 46 unit/integration tests, format check, build and two Playwright browser tests passed locally. The tests cover all 16 status pairs, including every invalid pair, endpoint permissions and nonmember 404s, concurrent numbering, sanitisation and history immutability.
- Partial: none within Session 3. Session 2 registration, project and membership management, login rate limiting and the full app shell are still absent.
- Known broken: none found within Session 3.
- Deferred by roadmap: completeness, PDF reports and dashboard are Session 4; the report-download end-to-end flow and hardening are Session 5.

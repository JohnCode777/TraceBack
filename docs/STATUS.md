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

## Session 2

- Done: Auth.js registration, credentials sign in/out, JWT sessions, bcrypt password hashing and persistent five-attempt, 15-minute login throttling.
- Done: centralized Section 5.1 role policy and project-scoped server services. Non-members receive 404 for project details.
- Done: project creation, member-only listing and details, Admin editing and archiving, and adding an existing user by email with a project role. Archived projects are read-only.
- Done: app shell with navigation, project switcher, empty, loading and error states.
- Done: 26 Session 2 tests. All 32 tests pass alongside the Session 1 suite.
- Checks: lint, type-check, tests, build, migration, seed and format check pass locally on Node 24. Runtime smoke confirms credential sign-in, seeded project access, empty project lists and HTTP 404 for a non-member.
- Partial: none within Session 2.
- Known broken: none within Session 2.
- Deferred by roadmap: bug workflow and all later product features remain for Sessions 3–5. CI results are pending the pull request.

## Session 3

- Done: create and edit forms with shared Zod validation and add/remove reproduction steps; race-safe per-project `KEY-number` IDs.
- Done: scoped bug list with status, severity, area, reporter, assignee and text filters, sorting and pagination; bug detail with assignment and structured resolution.
- Done: pure server-enforced state machine, immutable status records, reopen and regression counts, timeline, typed notes with sanitised Markdown and edited markers, and a combined activity feed with before/after edit logs.
- Done: integrated the Session 2 Auth.js flow, policy and project shell that reached `main` after this workspace started; bug pages now live under the project shell.
- Checks: clean `npm ci`, migration, seed, lint, type-check, 72 unit/integration tests, format check, build and two Playwright browser tests passed locally. Tests cover all 16 status pairs, including invalid pairs, endpoint permissions and nonmember 404s, concurrent numbering, sanitisation and history immutability.
- Partial: none within Session 3.
- Known broken: none found within Session 3.
- Deferred by roadmap: completeness, PDF reports and dashboard are Session 4; the report-download end-to-end flow and hardening are Session 5.

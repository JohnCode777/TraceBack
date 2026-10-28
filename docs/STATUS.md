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

## Session 4

- Done: pure completeness rules and warning-only vague-phrase detection, with per-rule fixtures and 69/70/89/90 boundary tests. The same evaluator powers the live create/edit preview, persisted create/edit scores, seed scores and a one-time migration backfill of existing reports.
- Done: completeness badge and exact fix suggestions on project bug lists and details, plus an “Incomplete only” filter.
- Done: member-authorized PDFKit download on every bug with all Section 5.7 sections, grouped notes, state durations, page footers, long-text wrapping and a bundled Unicode font.
- Done: project and date-filtered dashboard with severity, status and 30/90-day area charts, recurring-area flags, average fix/verify times and links into the filtered project bug list.
- Done: composite SQLite indexes for project, date and filtered list queries. Stats are checked against raw seeded counts; PDF permission and smoke tests cover the report endpoint.
- Checks: clean `npm ci`, fresh migration and seed, lint, type-check, 101 unit/integration tests, format check, production build and two existing Playwright browser tests passed locally. SQLite query plans use the new composite indexes.
- Partial: none within Session 4.
- Known broken: none found within Session 4.
- Deferred by roadmap: the full lifecycle to report-download end-to-end flow and hardening are Session 5.

## Session 5

- Done: upgraded exact-version runtime dependencies, including Auth.js and Prisma 7, without `--force`. `npm audit --omit=dev` reports 0 vulnerabilities. A clean `npm ci`, migration and seed succeed.
- Done: reviewed every app page, custom API route and server action in `docs/SECURITY.md`. JSON mutations now enforce browser origin/fetch metadata, JSON content type and a request size limit; global security headers and route tests are in place. Markdown remains sanitised and rendered text is escaped by React.
- Done: Playwright covers a tester filing a report, developer investigation and fix, tester reopen and verification, PDF download, and regression. CI now installs Chromium and runs this flow with an ephemeral Auth.js secret.
- Done: `npm run perf:check` creates 1,200 synthetic bugs and checks list pagination, dashboard totals, query counts and the SQLite index plan. Local medians were 2.68 ms for page 1, 2.71 ms for page 50, and 14.30 ms for stats; list used 5 queries per page and stats used 4. See `docs/PERFORMANCE.md`.
- Done: README quick start, environment and script reference, architecture and deployment notes, and Postgres migration instructions; a linked reporting-help page; transition confirmations, clearer labels/focus, and an empty dashboard message. Removed the PDF spike and redundant scaffold browser test.
- Local checks: lint, type-check, 104 unit/integration tests, one full lifecycle Playwright test, formatting and production build passed. CI result is pending the pull request.
- Partial: full `npm audit` still reports 3 moderate findings in Tailwind 3's development/build dependency tree; the production audit reports 0. The CSP still permits inline scripts/styles required by the current rendering. Dashboard stats materialize all selected bugs; project membership and bug history views are not paginated. Accessibility basics were reviewed and improved, but no automated WCAG/contrast audit was run.
- Personal-data finding: the history scan found no tracked secrets, `.env` or database files, and demo records are synthetic. It did find real contributor email addresses in the bundled font license and personal author emails in existing `main` commit metadata. This PR cannot remove that historical metadata; a literal no-personal-data claim is not met.
- Known broken: none in the local checks above. Remote CI and deployment behavior are not yet verified.
- Skipped: an external penetration test, large-scale load testing beyond 1,200 bugs, a working Postgres migration, and rewriting existing `main` history. The README documents the Postgres switch; implementation was outside Session 5.

## Session 6

- Done: responsive dark sidebar and light content shell, reusable cards, buttons, badges, avatars, tabs, empty states, headers, skeletons and completeness ring; shared CSS tokens, system font and optional device dark palette.
- Done: dashboard summary cards and 30-day trend, refined Recharts styling, bug list and detail presentation, sectioned report form with sticky live completeness, richer project and login layouts, reporting help styling, branded PDF header and colored labels, favicon and page titles.
- Done: deterministic fake seed expanded to 80 reports across both projects, spanning the last 90 days with varied severity, status, area, completeness and note types. Existing demo accounts remain.
- Checks: lint, type-check, 108 unit/integration tests, production build, the full Playwright lifecycle and PDF download test, format check, and `npm audit --omit=dev` (0 vulnerabilities) passed locally. Fresh migration and seed succeeded, and a second seed run kept 9 accounts and 80 bugs without duplicates.
- Partial: none within the requested Session 6 scope. Remote CI is pending the pull request.
- Known broken: none in the local checks above.

## Session 6 area follow-up

- Done: new projects receive four default areas; Admins can add unique area names and remove unused areas in Project settings. Areas assigned to bugs remain protected.
- Done: service permission and data tests plus a Playwright flow covering project creation, area management, area selection on a new bug and the dashboard area chart.
- Checks: lint, type-check, 111 unit/integration tests, production build, formatting, and both Playwright flows passed locally. Fresh migration and seed also passed.
- Partial: none in this follow-up. Remote CI is pending the updated pull request.
- Known broken: none found in local checks.

## Session 6 permanent deletion follow-up

- Done: archived project deletion for Admins with exact project-key confirmation and the existing JSON mutation origin checks. The service removes project children in one transaction, including status history, while preserving user accounts.
- Done: central `deleteProject` policy permission, migration for the narrow status-history trigger exception, updated specification and decision record, route and migration tests, and browser coverage of the confirmation flow.
- Checks: lint, type-check, 121 unit/integration tests, production build, format check and both Playwright flows passed locally. The new migration applied successfully.
- Partial: none within this follow-up. Remote CI is pending the updated pull request.
- Known broken: none found in local checks.

## Session 6 activity timeline follow-up

- Done: edit audit entries render as distinct Edit activity with readable field labels, assignee names and area names. Historical no-op entries are hidden; stored note bodies and permissions are unchanged.
- Done: unchanged assignments no longer append audit notes; unchanged report edits remain no-ops. Parser, formatter, service and browser assertions cover the behavior.
- Checks: lint, type-check, 125 unit/integration tests, production build, formatting and both Playwright flows passed locally.
- Partial: none within this follow-up.
- Known broken: none found in local checks.

## Session 6 PDF edit-log follow-up

- Done: reserved edit logs are omitted from PDF Investigation notes, while the distinct Edit timeline display and no-op guards remain in place. The PDF label is “Extra context,” and optional font ligatures are disabled for reliable verification labels.
- Done: tests cover PDF note filtering and font mapping; rendered output and extracted text show complete “Verification record,” “Verified by” and “Verified at” labels.
- Checks: lint, type-check, 127 unit/integration tests, production build, formatting, fresh migration and seed, and both Playwright flows passed locally.
- Partial: none within this follow-up.
- Known broken: none found in local checks.

## Session 7

- Done: confirmed current `main` includes Sessions 1–6 and rebased Session 7 onto the Session 6 follow-ups.
- Done: ordered Fixed-state verification checklist with Pass/Fail marks, optional comments, required original-problem answer, progress, suggested editable Reopen reason, and server-enforced outcomes through the existing transition function.
- Done: immutable SQLite verification attempts and step snapshots for every accepted Fixed → Verified or Fixed → Investigating transition, with read-only bug detail history, timeline summaries, all-attempt PDF output, and a legacy “No checklist recorded” fallback.
- Done: insert-only checklist examples for selected seeded Verified and reopened bugs; existing nine demo accounts remain. Archived projects with verification records are protected from permanent deletion to keep those records immutable.
- Checks: fresh migration and seed produced 9 users, 80 bugs and 10 checklist attempts; a second seed run stayed idempotent. Lint, type-check, 135 unit/integration tests, formatting, production build and both Playwright flows passed locally. PDF text extraction confirmed multiple attempts, failed-step comments and the legacy fallback. Build and Playwright used the managed environment's approved process access and system Chromium.
- Partial: remote CI is pending the pull request. No setup or script changes were needed, so README setup instructions remain current.
- Known broken: none found in the local checks above.

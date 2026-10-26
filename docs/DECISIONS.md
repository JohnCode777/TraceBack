# Decisions

## Session 1

1. **SQLite and Prisma 6.** The roadmap calls for SQLite locally. Prisma 6 keeps a straightforward checked-in SQL migration and generated client. `DATABASE_URL` points to a local ignored file by default. A PostgreSQL switch will be documented in the Session 5 README.
2. **String domain values.** SQLite does not provide native Prisma enums, so role, status, severity and other domain categories are strings. Shared Zod schemas and server policy in later sessions will validate them, as Section 3 allows.
3. **Nullable report details.** Severity, area, environment, reproduction fields and other report details may be missing. This lets incomplete reports be submitted and scored per Section 5.4. Title, reporter, project and status remain required. Database constraints cover uniqueness and references; application validation will cover field content.
4. **Project roles in memberships.** The nine seeded users each hold one demo role in each of two projects. The composite project/user key permits different roles in different projects when membership editing is implemented.
5. **Seed history and scores.** The 50 fake bugs are spread across 25 numbers per project, all four statuses, recent and older dates, notes, one reopen and two regression cycles. Seed scores are illustrative until the completeness engine is implemented in Session 4; that session must recompute them using the pure scoring function.
6. **No initial `StatusChange` on creation.** The Submitted state is recorded on the bug at creation. A status history row is added only when a transition occurs, because `fromStatus` has no preceding state at creation.
7. **Fixed and verified timestamps.** Seed data stores the most recent time each bug entered Fixed or Verified. Later transition code should clear `verifiedAt` on Reopen or Regression, and set it on a subsequent verification.
8. **PDFKit for the spike.** A standalone script creates a throwaway hardcoded PDF in the operating system temporary directory. This proves PDF generation in the runtime while keeping the report feature for Session 4. A bundled Unicode font will be needed for the final non-ASCII report requirement.
9. **End-to-end scope.** Session 1 has a browser smoke test for the scaffold. The complete tester-to-report scenario belongs to Session 5.
10. **Dependency boundaries.** Auth.js, Zod and Recharts are deferred until the sessions that use them. All installed package versions are exact and locked.
11. **Offline-safe Prisma setup.** This environment blocks Prisma's binary CDN. The supported `engineType = "client"` uses the libSQL SQLite adapter at runtime. A small postinstall wrapper points Prisma's generator's unused Rust binary probes to the Node executable; the generated client uses its bundled WASM and adapter. The checked-in Prisma-style SQL migration is applied by a local SQLite runner that tracks the standard `_prisma_migrations` ledger and checksums. This makes clean install and seed independent of the blocked CDN. Future schema changes must include SQL migrations, and the PostgreSQL switch will need its own adapter and migration setup.

## Session 2

1. **Registration and project roles.** A new account has no global role or project membership. Creating a project grants its creator the Admin role on that project.
2. **Project keys and archiving.** Keys stay fixed after creation because later bug IDs use them. Members can view archived projects, but settings and membership mutations are blocked.
3. **Login throttling.** Failed credential attempts are counted by normalized email in a persistent SQLite table. Five failures block further attempts for 15 minutes; success clears the counter. The response stays generic.
4. **Auth sessions.** Auth.js uses JWT sessions with its credentials provider; bcryptjs hashes passwords. This fits the existing User table without an adapter schema change.
5. **Migration continuity.** Session 2 adds only the `LoginThrottle` table through an incremental SQL migration in the Session 1 checksum-tracked runner. The existing 50-bug seed and PDF spike remain intact.
6. **404 response behavior.** The new-project route owns the loading boundary. A parent boundary caused non-member project detail pages to stream a 200 response before rendering not-found content; the scoped boundary allows a true HTTP 404.

## Session 3

1. **Edit audit.** The existing schema has no edit-history model. Bug edits and assignments append a reserved, uneditable Observation note showing previous and new values. The activity feed shows these entries alongside notes and status changes. This avoids a schema change outside the specified data model while preserving a durable trail for non-trivial edits.
2. **Bug creation.** The database atomically increments `nextBugNumber` in the same transaction as bug insertion. A bounded retry handles transient SQLite write contention.

## Session 4

1. **Integrating current `main`.** Sessions 2 and 3 landed on `main` while this task was in progress. Session 4 uses their Auth.js session, policy, project shell, bug services and routes so it preserves the existing workflow.
2. **Scoring existing reports.** The Session 4 migration backfills existing scores with the pure evaluator. Create, edit and seed paths use the same evaluator. An absent severity does not auto-award evidence points; only Medium and Low do.
3. **Dashboard project filter.** One member project is selected at a time so every chart segment can link to its existing project bug list. The selected created-date range applies to all metrics; 30/90-day area windows apply inside that range.
4. **PDF font and packaging.** PDFKit uses bundled DejaVu Sans for supported Unicode text. Next.js leaves PDFKit external so its built-in font metrics remain available at runtime.
5. **Query indexes.** Composite project/status, severity, area and completeness indexes with created date match list filters. The existing project/date index serves the dashboard date query.

## Session 5

1. **Dependency remediation.** Upgrade Auth.js, Zod, Next.js, Playwright, Vitest and Prisma to exact versions with no reported production dependency advisories. Prisma 7 keeps the existing SQLite adapter and checked-in SQL migration runner; its datasource URL now lives in `prisma.config.ts`. Next.js builds with webpack because its default Turbopack build cannot bind a subprocess port in this managed sandbox. Three moderate audit findings remain in Tailwind 3's build-time dependency tree; changing to Tailwind 4 requires a separate CSS migration.
2. **CSRF and browser headers.** The six cookie-authenticated JSON mutation routes require JSON content type and at least one of `Origin` or `Sec-Fetch-Site`. Any supplied origin must match the public Host/protocol, and any supplied fetch metadata must be `same-origin`. Next.js can normalize the internal request URL to localhost, so the check uses Host and forwarded protocol. Auth.js and Next.js handle CSRF for their own forms and server actions. The global CSP allows inline scripts and styles required by the current Next.js rendering and charts; a nonce-based policy would be stricter but needs a rendering change.
3. **Load check.** A disposable 1,200-bug database and Prisma query events provide a repeatable list/stats benchmark and detect relation query count growth. The benchmark records observed times rather than enforcing machine-dependent latency thresholds.
4. **Reporting help.** The help page lives inside the signed-in app layout and is linked from navigation and the new-bug form so guidance is available where a tester writes a report. It contains no project data.
5. **Cleanup and CI.** Remove the Session 1 PDF spike and the redundant scaffold browser test. CI now runs the full lifecycle Playwright test after its normal checks, with an ephemeral Auth.js secret. Next.js 16 generated an agent guidance block in `AGENTS.md`; it is kept to avoid a recurring uncommitted change during development.
6. **Cross-platform SQLite path.** Resolve relative `file:` paths against the repository root in one helper and pass its absolute URL to Prisma CLI, seed and app. This prevents the CLI's schema-relative interpretation from opening a different database. Invoke the Prisma generator through Node's JS entry point because Node 24 on Windows can reject direct `spawnSync` of `prisma.cmd` with `EINVAL`.

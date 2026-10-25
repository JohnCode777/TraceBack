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

## Session 3

1. **Missing Session 2 prerequisite.** This checkout has Session 1 merged, but no Session 2. Session 3 needs an authenticated actor and centralized project policy, so it includes only credentials sign-in for existing seeded users and the bug-specific policy. Registration, project management, membership management, rate limiting, and the full app shell remain Session 2 work.
2. **Edit audit.** The existing schema has no edit-history model. Bug edits and assignments append a reserved, uneditable Observation note showing previous and new values. The activity feed shows these entries alongside notes and status changes. This avoids a schema change outside the specified data model while preserving a durable trail for non-trivial edits.
3. **Bug creation.** The database atomically increments `nextBugNumber` in the same transaction as bug insertion. A bounded retry handles transient SQLite write contention.

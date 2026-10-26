# Session 5 load check

Run `npm run perf:check` to create a disposable SQLite database, apply the committed migrations, seed 1,200 synthetic bugs with one reproduction step each, and exercise the same list service and stats query used by the app. The script asserts result counts and 20-row list pages, records Prisma query events, checks the SQLite query plan, then removes the database.

On 26 October 2026 in the managed Node 24 workspace with Prisma 7 and SQLite, five sequential samples gave:

| Operation                                              | Median elapsed time | SQL queries |
| ------------------------------------------------------ | ------------------: | ----------: |
| First bug-list page (20 rows) and count                |             2.68 ms |           5 |
| Bug-list page 50 (20 rows, offset 980) and count       |             2.71 ms |           5 |
| Dashboard stats query and calculation (all 1,200 rows) |            14.30 ms |           4 |

Prisma batches the list's `area`, `assignee` and `steps` relations; the observed query count stayed at five for both pages. The stats query's area relation used a fixed four queries for 1,200 rows. This is the N+1 check for these paths. SQLite used `Bug_projectId_createdAt_idx` for the paginated project/date list plan.

These are local synthetic results, not latency targets or a production capacity guarantee. The list is capped at 20 bugs per request. Dashboard statistics currently load every selected bug into application memory, and bug detail history and project membership views have no pagination. Larger projects may need SQL aggregation and pagination for those views.

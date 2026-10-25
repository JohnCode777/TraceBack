# TraceBack agent guide

## Commands

From the repository root:

| Task                              | Command                           |
| --------------------------------- | --------------------------------- |
| Install exact locked dependencies | `npm ci`                          |
| Set up local environment          | `cp .env.example .env`            |
| Apply committed migrations        | `npm run migrate`                 |
| Seed demo data                    | `npm run seed`                    |
| Run development server            | `npm run dev`                     |
| Lint                              | `npm run lint`                    |
| Type-check                        | `npm run type-check`              |
| Unit/integration tests            | `npm test`                        |
| Install the end-to-end browser    | `npx playwright install chromium` |
| End-to-end tests                  | `npm run e2e`                     |
| Production build                  | `npm run build`                   |
| Check formatting                  | `npm run format:check`            |
| Generate the disposable PDF spike | `npm run pdf:spike`               |

Schema changes require a matching SQL file under `prisma/migrations/`, followed by `npm run migrate`. The local migration runner applies checked-in Prisma-style migrations and tracks their checksums.
If Chromium is already installed outside Playwright's cache, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to its executable when running `npm run e2e`.

## Definition of done

A task is done only when lint, type-check, unit/integration tests and build all pass. Never mark work complete with failing checks, skipped tests or disabled lint rules. Run relevant migration, seed and end-to-end checks when those parts change.

## Working rules

1. Follow `docs/SPEC.md`. Do not add features outside it.
2. Never ask the human questions. Decide, record the decision and rationale in `docs/DECISIONS.md`, and continue.
3. Never hand-roll crypto or authentication.
4. All authorization lives in one policy module (`src/lib/policy.ts` or similar). No scattered role checks in routes or components.
5. Enforce state transitions and permissions on the server. UI checks are cosmetic only.
6. Every API route and server action validates input with Zod and checks permissions before touching data.
7. Sanitise all rendered Markdown. Never use `dangerouslySetInnerHTML` on unsanitised content.
8. Commit after each phase with a clear message. Small, logical commits.
9. Do not commit secrets, `.env`, real personal data or database files. Keep `.gitignore` correct.
10. If a spec requirement turns out to be infeasible, implement the closest safe alternative, document it in `docs/DECISIONS.md`, and flag it in the final summary.
11. Do not silently skip a hard requirement. List anything unfinished in `docs/STATUS.md`.

Maintain `docs/STATUS.md` with what is done, partial, known broken and skipped. Complete only the requested session; do not start the next one.

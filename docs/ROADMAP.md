# TraceBack Roadmap v2 (Agent-Build Edition)

*The Bug Reproduction & Investigation Platform. Revised for autonomous build with Codex and minimal human supervision.*

---

## 0. How to use this document

This roadmap is written to be handed to a coding agent. Follow this order:

1. Save this file in the repo as `docs/ROADMAP.md`.
2. Run **Session 1** (Section 8). It generates `AGENTS.md`, `docs/SPEC.md`, architecture docs, the scaffold, the schema and seed data.
3. Run Sessions 2 to 5, one at a time, each ending in a commit and a green check run.
4. Do the **human review** (Section 11) before making the repo public or deploying.

**Precedence rule:** `docs/SPEC.md` (Section 5 of this document, copied verbatim) overrides everything else. If anything conflicts, the spec wins.

**Core principle for unsupervised work:** the agent decides, documents and moves on. It never waits for answers. Every ambiguity is resolved with a reasonable default and recorded in `docs/DECISIONS.md`.

---

## 1. Product framing

**Pitch:** TraceBack turns vague bug complaints into reproducible, verifiable investigations.

**Differentiator:** a bug isn't done when a developer says so. It's done when a tester confirms the original reproduction steps no longer fail.

**Users**

- **Tester:** submits structured reports, verifies fixes.
- **Developer:** investigates, adds notes, marks fixes.
- **Admin:** manages projects and members, views statistics.

**Design principles**

1. Structure over free text.
2. Every state change is recorded permanently.
3. Report quality is measurable and explained.
4. Verification is a first-class step.
5. Every feature must serve reproduction, investigation or verification. Anything else is out of scope.

---

## 2. MVP definition (trimmed for agent build)

### In the MVP

- Email/password auth with three project roles: Tester, Developer, Admin
- Projects and project membership
- Bug creation: title, severity, area, environment, reproducibility, ordered reproduction steps, expected vs actual, extra context (pasted text or links)
- Workflow: Submitted → Investigating → Fixed → Verified, with Reopen and Regression paths
- Investigation notes with types and Markdown
- Immutable status history and resolution record (root cause category, resolution summary, fix reference, reproduced-by-developer field)
- Rule-based completeness score with an Incomplete flag and visible reasons
- Bug list with filters, search, sorting and pagination
- Per-bug downloadable PDF investigation report
- Dashboard with four core statistics
- Seed data, tests, CI, README

### Deliberately cut from the first build

Wireframes, autosave drafts, drag-to-reorder steps (use up/down buttons or add/remove only), note revision history (show an "edited" marker only), strictness setting, "Needs info" action, HTML/Markdown export, password reset, email, attachments, monitoring/Sentry, closed beta, dogfooding, and everything from Phase 9 onward (Section 12).

Cutting scope matters: agents handle a tight spec well and a sprawling one badly.

---

## 3. Stack (simplified to reduce failure points)

| Layer | Choice | Notes |
| --- | --- | --- |
| App | Next.js (App Router) + TypeScript strict | One app, no separate backend |
| Database | SQLite for local dev and tests | Zero setup. Document a Postgres switch in the README |
| ORM | Prisma | Typed schema and migrations. If the provider lacks native enums, store enums as strings validated by Zod |
| Auth | Auth.js with credentials provider | No hand-rolled crypto. Use bcrypt or argon2 via a maintained library |
| Validation | Zod | One shared schema for client and server |
| UI | Tailwind CSS | Keep it plain and accessible |
| Charts | Recharts | Bar, donut, simple trend |
| PDF | `@react-pdf/renderer` or `pdfkit` | **Not Puppeteer.** It is flaky in sandboxes |
| Unit/integration tests | Vitest |  |
| End-to-end | Playwright (one happy-path flow) |  |
| CI | GitHub Actions | lint, type-check, test, build |

**Rules:** pin exact dependency versions; commit the lockfile; provide `.env.example`; no secrets in the repo.

---

## 4. AGENTS.md (the agent generates this in Session 1)

The agent must create `AGENTS.md` at the repo root containing at least the following.

**Commands:** exact commands to install, run dev, lint, type-check, test, e2e, build, migrate, and seed.

**Definition of done:** a task is done only when **lint, type-check, unit/integration tests and build all pass**. Never mark work complete with failing checks, skipped tests, or disabled lint rules.

**Working rules**

1. Follow `docs/SPEC.md`. Do not add features outside it.
2. Never ask the human questions. Decide, record the decision and rationale in `docs/DECISIONS.md`, and continue.
3. Never hand-roll crypto or authentication.
4. All authorization lives in **one policy module** (`src/lib/policy.ts` or similar). No scattered role checks in routes or components.
5. Enforce state transitions and permissions **on the server**. UI checks are cosmetic only.
6. Every API route and server action validates input with Zod and checks permissions before touching data.
7. Sanitise all rendered Markdown. Never use `dangerouslySetInnerHTML` on unsanitised content.
8. Commit after each phase with a clear message. Small, logical commits.
9. Do not commit secrets, `.env`, real personal data, or database files. Keep `.gitignore` correct.
10. If a spec requirement turns out to be infeasible, implement the closest safe alternative, document it in `DECISIONS.md`, and flag it in the final summary.
11. Do not silently skip a hard requirement. List anything unfinished in `docs/STATUS.md`.

**Status file:** maintain `docs/STATUS.md` with what is done, what is partial, what is known broken, and what was skipped.

---

## 5. SPEC (copy verbatim into `docs/SPEC.md`)

### 5.1 Roles and permissions

Roles are per project (a user can hold different roles in different projects).

| Action | Tester | Developer | Admin |
| --- | --- | --- | --- |
| View project and its bugs | Yes | Yes | Yes |
| Create bug | Yes | Yes | Yes |
| Edit own bug (before Fixed) | Yes | No | Yes (any) |
| Edit any bug | No | Yes (non-reporter fields, logged) | Yes |
| Assign developer | No | Yes | Yes |
| Add note | Yes | Yes | Yes |
| Move to Investigating | No | Yes | Yes |
| Move to Fixed | No | Yes | Yes |
| Verify | Yes | No | Yes |
| Reopen / Regression | Yes | No | Yes |
| Manage members and project settings | No | No | Yes |
| View dashboard | Yes | Yes | Yes |
| Download report | Yes | Yes | Yes |

A user can never see a project they are not a member of. Non-members receive a 404, not a 403.

### 5.2 Bug lifecycle (state machine)

| From | To | Who | Required input |
| --- | --- | --- | --- |
| Submitted | Investigating | Developer, Admin | none |
| Investigating | Fixed | Developer, Admin | resolution summary, root cause category, reproduced-by-developer value |
| Fixed | Verified | Tester, Admin | optional comment |
| Fixed | Investigating (Reopen) | Tester, Admin | reason; increments `reopenCount` |
| Verified | Investigating (Regression) | Tester, Admin | reason; increments `reopenCount` |

All other transitions are rejected with a clear error. There is **no path** from Submitted or Investigating to Verified. The developer who marked a bug Fixed cannot be the one who verifies it unless they are an Admin.

Every transition writes an **immutable** `StatusChange` record: bug, from, to, actor, comment, timestamp. Records are never updated or deleted.

### 5.3 Fields

- **Severity:** Critical, High, Medium, Low
- **Reproducibility:** Always, Sometimes, Rarely, Once
- **Environment type:** Production, Staging, Development
- **Note types:** Observation, Hypothesis, Ruled out, Root cause, Workaround, Question
- **Root cause categories:** Logic error, Configuration, Data, Race condition, Third party, Environment, Unknown
- **Reproduced by developer:** Yes, Partially, No
- **Bug ID:** per-project sequence, displayed as `KEY-number` (e.g. `TB-142`), unique per project
- **Reproduction steps:** ordered list, one action per row

### 5.4 Completeness rules

Pure function: `evaluate(bug) → { score, level, missing[] }` where each `missing` item includes the rule name and a human-readable fix suggestion.

| Rule | Points | Check |
| --- | --- | --- |
| Descriptive title | 10 | At least 10 characters and not a generic phrase ("bug", "not working", "broken") |
| Severity set | 5 | Present |
| Area set | 5 | Present |
| Environment complete | 20 | OS, browser/device, app version all filled |
| Reproduction steps | 25 | At least 2 steps, each at least 5 characters |
| Expected behaviour | 10 | Present, at least 15 characters |
| Actual behaviour | 10 | Present, at least 15 characters |
| Expected differs from actual | 5 | Texts are not identical |
| Reproducibility stated | 5 | Present |
| Evidence for High/Critical | 5 | Extra context contains logs, error text or a link (auto-awarded for Medium/Low) |

**Levels:** below 70 = Incomplete; 70 to 89 = Acceptable; 90 and above = Strong.

Re-evaluate on create and on every edit. The form shows a live preview via the same function. Vague-phrase detection ("doesn't work", "etc.", "as usual", "same as before") adds a **warning only**, with no score change.

Incomplete bugs can still be submitted. They are flagged with a badge and the exact reasons.

### 5.5 Data model

```
User            id, name, email (unique), passwordHash, createdAt
Project         id, name, key (unique, 2-5 letters), description, archivedAt, nextBugNumber
ProjectMember   projectId, userId, role   (unique projectId+userId)
Area            id, projectId, name       (unique projectId+name)

Bug             id, projectId, number, title, severity, status, reproducibility,
                areaId, reporterId, assigneeId,
                osName, osVersion, browserOrDevice, appVersion, envType,
                expectedBehaviour, actualBehaviour, extraContext,
                completenessScore, completenessLevel,
                reopenCount, reproducedByDev,
                rootCauseCategory, resolutionSummary, fixReference,
                createdAt, updatedAt, fixedAt, verifiedAt
ReproStep       id, bugId, position, instruction
Note            id, bugId, authorId, type, body, editedAt, createdAt
StatusChange    id, bugId, fromStatus, toStatus, actorId, comment, createdAt
```

**Indexes:** unique `(projectId, number)`; `(projectId, status)`; `(projectId, severity)`; `(projectId, areaId)`; `(projectId, createdAt)`.

Bug number allocation must be race-safe (use a transaction that increments `nextBugNumber`).

### 5.6 Dashboard statistics (MVP)

1. **Unresolved bugs by severity** (unresolved = Submitted, Investigating or Fixed)
2. **Bugs by status** (funnel)
3. **Top problem areas** over the last 30 and 90 days, flagging **recurring** areas
4. **Average time to fix** (created → fixed) and **to verify** (fixed → verified)

**Recurring area rule:** an area is recurring if it has **3 or more bugs created in the last 30 days**, or **any bug with `reopenCount` of 2 or more**.

Each chart segment links to the bug list pre-filtered. Stats include a project filter and a date range. Stats functions must have tests asserting results equal raw counts from seeded data.

### 5.7 Report contents (PDF)

1. Header: bug ID, title, project, severity, status
2. Summary and environment table
3. Reproduction steps (numbered)
4. Expected vs actual
5. Completeness score, level and outstanding gaps
6. Investigation notes grouped by type
7. Root cause, resolution, fix reference, reproduced-by-developer
8. Status history with time spent in each state
9. Verification record (who, when)
10. Footer: generated timestamp and generating user

Only project members can generate. The report must handle long text, page breaks and non-ASCII characters.

---

## 6. Milestones

| Milestone | After | Meaning |
| --- | --- | --- |
| Scaffold | Session 1 | Docs, schema, seed, CI green |
| Alpha | Session 3 | Bugs flow through the full lifecycle with history and notes |
| Beta | Session 4 | Completeness, PDF and dashboard added |
| MVP | Session 5 | Hardened, documented, pushed to GitHub |

---

## 7. Test requirements (the safety net)

Because you cannot review all the code, **these tests are your assurance**. The agent must write them and keep them passing.

- **State machine:** every valid transition, and every invalid one rejected
- **Permissions:** for every endpoint or server action, a permitted role succeeds, a forbidden role is refused, and a non-member gets 404
- **Completeness:** every rule tested with a passing and a failing fixture, plus boundary values (exactly 69, 70, 89, 90)
- **Stats:** each statistic equals a raw count from seeded data
- **Bug numbering:** concurrent creation produces unique sequential numbers
- **Markdown sanitisation:** script and event-handler payloads are neutralised
- **History immutability:** no code path updates or deletes `StatusChange`
- **End-to-end (one flow):** tester files a bug → developer investigates → developer fixes → tester verifies → report downloads
- **Fixtures:** a library of "good", "mediocre" and "terrible" reports

**Targets:** 100% of transitions covered; at least 80% coverage on business logic (state machine, completeness, policy, stats).

---

## 8. Build sessions

Run one session at a time. Each session ends with: all checks green, `docs/STATUS.md` updated, a commit.

### Session 1: Docs and scaffold

**Produce**

- `AGENTS.md` (Section 4)
- `docs/SPEC.md` (Section 5 verbatim)
- `docs/ARCHITECTURE.md` (folder structure, data flow, where policy and state-machine code live)
- `docs/DECISIONS.md` and `docs/STATUS.md`
- Next.js + TypeScript strict scaffold, Tailwind, ESLint, Prettier
- Vitest and Playwright configured
- GitHub Actions workflow: lint, type-check, test, build
- Prisma schema from Section 5.5, first migration, `.env.example`, `.gitignore`
- Seed script: 3 users per role, 2 projects, about 50 varied bugs across all statuses with realistic history and notes (use obviously fake data)
- A throwaway **PDF spike**: generate a PDF from a hardcoded bug to prove the library works here

**Exit criteria:** `install`, `lint`, `type-check`, `test`, `build` and `seed` all succeed from a clean clone.

**Prompt**

> Read `docs/ROADMAP.md`. Do not build features yet. Complete Session 1 exactly as described in Section 8, using Section 5 as the spec. Make reasonable decisions on ambiguities and record them in `docs/DECISIONS.md` rather than asking me. Everything must pass lint, type-check, tests and build before you commit.

### Session 2: Auth, projects, roles

**Build**

- Register, login, logout, session handling (Auth.js credentials)
- Centralised **policy module** implementing the Section 5.1 matrix
- Projects: create, list, edit, archive
- Membership: admin adds an existing user by email with a role
- App shell: navigation, project switcher, empty, loading and error states
- Rate limiting on login

**Tests:** a user sees only their own projects; non-members get 404; role matrix enforced.

**Exit criteria:** can sign in, create a project, add a member, and tests prove isolation between projects.

**Prompt**

> Implement Session 2 from `docs/ROADMAP.md` and `docs/SPEC.md`. Add the tests listed. Do not proceed beyond this session. All checks must pass before you commit. Update `docs/STATUS.md`.

### Session 3: Bugs, workflow, history, notes (→ Alpha)

**Build**

- Create-bug form with Zod validation (shared client and server); steps as add/remove rows
- Race-safe `KEY-number` IDs
- Bug detail page and bug list (filters: status, severity, area, reporter, assignee; text search; sorting; pagination)
- Assign developer; edit bug with edits to non-trivial fields logged
- **State machine** module, pure and unit-tested, called by a single server function used by every route
- Immutable status history and timeline view
- Notes with types and sanitised Markdown, "edited" marker
- Structured resolution fields required for Fixed
- Unified activity feed (notes plus status changes)

**Tests:** everything in Section 7 relating to transitions, permissions, numbering, sanitisation, immutability.

**Exit criteria:** a bug can travel Submitted → Investigating → Fixed → Verified, plus Reopen and Regression, with the full story visible on its page.

**Prompt**

> Implement Session 3 from `docs/ROADMAP.md` and `docs/SPEC.md`. The state machine must be a pure module enforced server-side, with 100% transition coverage including invalid ones. All checks must pass before you commit.

### Session 4: Completeness, PDF, dashboard (→ Beta)

**Build**

- Completeness engine (Section 5.4), live form preview, badge and reasons on list and detail, "Incomplete only" filter
- Recompute on create and edit
- PDF report generator (Section 5.7) with a download button on every bug
- Dashboard (Section 5.6) with charts, filters and click-through links
- Indexes confirmed against actual query patterns

**Tests:** all completeness fixtures and boundaries, stats-vs-raw-count checks, PDF endpoint permission checks, PDF generation smoke test (non-empty, valid header, includes bug ID).

**Exit criteria:** every flag explains itself; PDF opens correctly with long and non-ASCII content; dashboard numbers match raw counts.

**Prompt**

> Implement Session 4 from `docs/ROADMAP.md` and `docs/SPEC.md`. Use `@react-pdf/renderer` or `pdfkit`, not Puppeteer. Include the listed tests. All checks must pass before you commit.

### Session 5: Hardening and delivery (→ MVP)

**Do**

- Playwright end-to-end for the full lifecycle and report download
- Security pass: input validation audit, output encoding, CSRF protection, secure headers, authorization audit on **every** route, `npm audit` review, confirm no secrets in git history
- Performance: N+1 check, pagination everywhere, test list and stats on 1,000+ seeded bugs
- Accessibility basics: labels, keyboard navigation, focus states, contrast
- UX polish: empty and error states, confirmation dialogs on transitions
- Docs: README (setup, scripts, env vars, architecture overview, how to switch to Postgres, deployment notes), a short "how to write a good bug report" help page
- Final cleanup: remove spike code and dead files; make `STATUS.md` honest

**Exit checklist**

- [ ] All checks green in CI
- [ ] Full lifecycle passes end-to-end
- [ ] Authorization audit documented in `docs/SECURITY.md`
- [ ] README lets a stranger run the app in under 10 minutes
- [ ] `STATUS.md` lists every known gap

**Prompt**

> Complete Session 5 from `docs/ROADMAP.md`. Perform and document a full authorization audit in `docs/SECURITY.md`. Be honest in `docs/STATUS.md` about anything partial or skipped. All checks must pass before you commit.

---

## 9. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Agent over-builds or drifts | Tight spec, session-by-session scope, "no features outside spec" rule |
| Failing checks quietly ignored | Definition of done in `AGENTS.md`; CI blocks merging |
| Permission holes (most likely real flaw) | Single policy module, per-endpoint tests, your manual review |
| Tests that pass but test nothing | Spot-check three or four tests yourself; confirm invalid transitions truly fail |
| PDF library fails in sandbox | Use pure-JS library; Session 1 spike |
| Skipped hard parts | `STATUS.md` honesty rule; read it at every checkpoint |
| Dependency drift | Pinned versions and lockfile |
| Secrets or data leaked to GitHub | `.env.example`, `.gitignore`, fine-grained token, private repo, review before publishing |
| Completeness rules annoy users | Always show reasons; flag but never block |

---

## 10. GitHub handling

1. **You create** an empty **private** repository first.
2. Give the agent a **fine-grained token limited to that one repo** (contents and pull requests only).
3. Have the agent push each session to a **branch** and open a **pull request**, rather than writing to `main`. Merge after your quick check.
4. Confirm CI runs on the PR.
5. Keep the repo private until the review in Section 11 is done.
6. Revoke the token when finished.

---

## 11. Your review checklist (about 30 to 45 minutes total)

After each session (5 to 10 minutes):

- Read `docs/STATUS.md`
- Check that CI is green on the PR

Once, before publishing:

- [ ] Skim `SPEC.md` and `DECISIONS.md` for wrong assumptions
- [ ] Run the app and click the full lifecycle as tester and developer
- [ ] Read the **policy module** and one or two routes that call it
- [ ] Try to view another project's bug by URL as a non-member (expect 404)
- [ ] Try an invalid transition through the API directly (expect rejection)
- [ ] Run `npm audit`
- [ ] Search the repo and git history for secrets, tokens, real emails
- [ ] Open a downloaded PDF
- [ ] Handle deployment and production secrets yourself

---

## 12. Post-MVP roadmap (do not build in the agent run)

**Phase 9: Evidence and notifications.** Screenshot, video and log attachments (size and type limits, malware scanning); email notifications; in-app notification centre; @mentions; "Needs info" action.

**Phase 10: Integrations.** GitHub PR and commit linking (merge marks Fixed, still requires human verification); Slack/Teams webhooks; public REST API with tokens; CSV, Jira and GitHub Issues import.

**Phase 11: Smarter reproduction.** Duplicate detection; reproduction replay checklist where the verifier ticks each original step pass or fail; browser extension capturing environment and console errors; per-project report templates; "Cannot reproduce" and "Needs info" as formal states; drag-to-reorder steps; note revision history; autosave drafts; strictness setting.

**Phase 12: Team and scale.** Organisations and workspaces; custom fields and configurable workflows; SLAs; bulk project reports; advanced analytics (regression rate, tester quality score, mean time to reproduce); password reset, audit log export, SSO; monitoring.

**Phase 13: Intelligence.** AI-assisted report improvement; suggested area and severity; root-cause clustering.

---

## 13. Quick start

1. Create a private GitHub repo and clone it.
2. Save this document as `docs/ROADMAP.md` and commit.
3. Paste the Session 1 prompt into Codex.
4. Check `STATUS.md` and the PR, then repeat for Sessions 2 to 5.
5. Do the Section 11 review, then deploy.

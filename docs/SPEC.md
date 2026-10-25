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

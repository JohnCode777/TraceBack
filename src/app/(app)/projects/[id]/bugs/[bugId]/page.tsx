import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import { db } from "@/lib/db";
import { getBug } from "@/lib/bugs";
import { projectActor } from "@/lib/request";
import { BugActions, NoteEditor } from "@/components/bug-actions";
import { BugForm } from "@/components/bug-form";
import { evaluate } from "@/lib/completeness";
import { describeEditChanges, isEditLog, parseEditLog } from "@/lib/edit-log";
import {
  Badge,
  Completeness,
  Icon,
  SeverityBadge,
  StatusBadge,
} from "@/components/ui";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Bug detail" };
import { can } from "@/lib/policy";
import { summarizeAttempt } from "@/lib/verification";
import { VerificationChecklist } from "@/components/verification-checklist";

type Attempt = Awaited<
  ReturnType<typeof getBug>
>["verificationAttempts"][number];

function AttemptSummary({ attempt }: { attempt: Attempt }) {
  return (
    <div className="surface-soft mt-3 rounded-xl p-4">
      <p className="font-semibold">{summarizeAttempt(attempt)}</p>
      <p className="text-sm text-slate-600">
        {attempt.verifier.name} ·{" "}
        {attempt.createdAt.toLocaleString("en-US", { timeZone: "UTC" })} UTC
      </p>
      <ol className="mt-2 list-decimal pl-6">
        {attempt.steps.map((step) => (
          <li key={step.id}>
            {step.instruction}: <strong>{step.result}</strong>
            {step.comment ? ` — ${step.comment}` : ""}
          </li>
        ))}
      </ol>
      <p>
        Does the original problem still occur?{" "}
        <strong>{attempt.problemOccurs}</strong>
        {attempt.finalComment ? ` — ${attempt.finalComment}` : ""}
      </p>
    </div>
  );
}

type Props = { params: Promise<{ id: string; bugId: string }> };
const noteTone: Record<
  string,
  { icon: string; className: string; badge: string }
> = {
  Observation: {
    icon: "grid",
    className: "bg-blue-100 text-blue-700",
    badge: "investigating",
  },
  Hypothesis: {
    icon: "spark",
    className: "bg-violet-100 text-violet-700",
    badge: "acceptable",
  },
  "Ruled out": {
    icon: "check",
    className: "bg-slate-200 text-slate-700",
    badge: "submitted",
  },
  "Root cause": {
    icon: "alert",
    className: "bg-red-100 text-red-700",
    badge: "critical",
  },
  Workaround: {
    icon: "clock",
    className: "bg-amber-100 text-amber-800",
    badge: "medium",
  },
  Question: {
    icon: "help",
    className: "bg-sky-100 text-sky-700",
    badge: "investigating",
  },
};
export default async function BugDetailPage({ params }: Props) {
  const { id: projectId, bugId } = await params;
  let actor;
  try {
    actor = await projectActor(projectId);
  } catch {
    notFound();
  }
  let bug;
  try {
    bug = await getBug(projectId, bugId, actor);
  } catch {
    notFound();
  }
  const editChanges = new Map(
    bug.notes
      .filter((note) => isEditLog(note.body))
      .map((note) => [note.id, parseEditLog(note.body)]),
  );
  const assigneeIds = [
    ...new Set(
      [...editChanges.values()].flatMap((changes) =>
        changes
          .filter((change) => change.field === "assigneeId")
          .flatMap((change) => [change.before, change.after])
          .filter((value): value is string => typeof value === "string"),
      ),
    ),
  ];
  const [areas, developers, assignees] = await Promise.all([
    db.area.findMany({ where: { projectId } }),
    db.projectMember.findMany({
      where: { projectId, role: "Developer" },
      include: { user: { select: { name: true } } },
    }),
    db.user.findMany({
      where: { id: { in: assigneeIds } },
      select: { id: true, name: true },
    }),
  ]);
  const editNames = {
    users: new Map(assignees.map((user) => [user.id, user.name])),
    areas: new Map(areas.map((area) => [area.id, area.name])),
  };
  const canEdit =
    actor.role === "Admin" ||
    (actor.role === "Tester" &&
      bug.reporterId === actor.id &&
      !["Fixed", "Verified"].includes(bug.status));
  const activity = [
    ...bug.notes
      .filter(
        (note) =>
          !isEditLog(note.body) || (editChanges.get(note.id)?.length ?? 0) > 0,
      )
      .map((n) => ({
        kind: isEditLog(n.body) ? ("edit" as const) : ("note" as const),
        at: n.createdAt,
        id: n.id,
        item: n,
      })),
    ...bug.statusChanges.map((s) => ({
      kind: "status" as const,
      at: s.createdAt,
      id: s.id,
      item: s,
    })),
    ...bug.verificationAttempts.map((a) => ({
      kind: "verification" as const,
      at: a.createdAt,
      id: a.id,
      item: a,
    })),
  ].sort((a, b) => a.at.getTime() - b.at.getTime() || a.id.localeCompare(b.id));
  const lastFix = [...bug.statusChanges]
    .reverse()
    .find((change) => change.toStatus === "Fixed");
  const canVerify = can(actor.role, "verify", {
    isFixAuthor: lastFix?.actorId === actor.id,
  });
  const completeness = evaluate(bug);
  return (
    <main className="mx-auto max-w-6xl space-y-6">
      <Link
        className="accent-text text-sm font-semibold hover:underline"
        href={`/projects/${projectId}/bugs`}
      >
        ← All bugs
      </Link>
      <h1 className="text-3xl font-bold">
        {bug.project.key}-{bug.number}: {bug.title}
      </h1>
      <p className="muted text-sm">
        {bug.status} · {bug.severity ?? "No severity"} ·{" "}
        {bug.area?.name ?? "No area"}
      </p>
      <p className="muted text-sm">
        Reported by {bug.reporter.name} · Assigned to{" "}
        {bug.assignee?.name ?? "nobody"} · Reopened {bug.reopenCount} times
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <SeverityBadge value={bug.severity} />
        <StatusBadge value={bug.status} />
        <Badge tone="acceptable">{bug.area?.name ?? "No area"}</Badge>
        {completeness.level === "Incomplete" && (
          <Badge tone="incomplete">Incomplete</Badge>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <a
          className="button"
          href={`/api/projects/${projectId}/bugs/${bugId}/report`}
        >
          Download PDF report
        </a>
        <Completeness score={completeness.score} level={completeness.level} />
      </div>
      <ol className="card grid gap-3 sm:grid-cols-4" aria-label="Bug progress">
        {["Submitted", "Investigating", "Fixed", "Verified"].map(
          (stage, index) => (
            <li
              key={stage}
              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold ${["Submitted", "Investigating", "Fixed", "Verified"].indexOf(bug.status) >= index ? "surface-soft accent-text" : "muted"}`}
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs ${bug.status === stage ? "bg-violet-600 text-white" : "border thin-divider"}`}
              >
                {index + 1}
              </span>
              {stage}
            </li>
          ),
        )}
      </ol>
      <section className="card">
        <h2 className="section-title">Completeness reasons</h2>
        {completeness.missing.length ? (
          <ul className="mt-3 list-disc space-y-1 pl-6 text-sm muted">
            {completeness.missing.map((gap) => (
              <li key={gap.rule}>
                {gap.rule}: {gap.suggestion}
              </li>
            ))}
          </ul>
        ) : (
          <p>No outstanding gaps.</p>
        )}
        {completeness.warnings.map((warning) => (
          <p key={warning} className="text-amber-800">
            {warning}
          </p>
        ))}
      </section>
      <section className="card space-y-5">
        <h2 className="section-title">Report</h2>
        <h3 className="font-semibold">Steps</h3>
        <ol className="space-y-2 pl-6 list-decimal marker:font-bold marker:text-violet-600">
          {bug.steps.map((step) => (
            <li key={step.id}>{step.instruction}</li>
          ))}
        </ol>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950">
            <h3 className="mb-2 font-bold">Expected</h3>
            <p>{bug.expectedBehaviour || "Unspecified"}</p>
          </div>
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-950">
            <h3 className="mb-2 font-bold">Actual</h3>
            <p>{bug.actualBehaviour || "Unspecified"}</p>
          </div>
        </div>
        <h3 className="font-semibold">Environment</h3>
        <dl className="grid gap-px overflow-hidden rounded-xl border thin-divider sm:grid-cols-2">
          {[
            ["Reproducibility", bug.reproducibility],
            ["Type", bug.envType],
            ["OS", [bug.osName, bug.osVersion].filter(Boolean).join(" ")],
            ["Browser or device", bug.browserOrDevice],
            ["App version", bug.appVersion],
          ].map(([label, value]) => (
            <div
              key={label}
              className="surface-soft flex justify-between gap-4 p-3 text-sm"
            >
              <dt className="muted">{label}</dt>
              <dd className="font-semibold">{value || "Unspecified"}</dd>
            </div>
          ))}
        </dl>
        {bug.extraContext && (
          <>
            <h3 className="font-semibold">Extra context</h3>
            <p className="whitespace-pre-wrap">{bug.extraContext}</p>
          </>
        )}
        {bug.resolutionSummary && (
          <>
            <h3 className="font-semibold">Resolution</h3>
            <p>{bug.resolutionSummary}</p>
            <p>
              {bug.rootCauseCategory} · Reproduced: {bug.reproducedByDev} ·{" "}
              {bug.fixReference}
            </p>
          </>
        )}
      </section>
      {canEdit && (
        <details className="card">
          <summary className="cursor-pointer font-semibold">
            Edit report
          </summary>
          <BugForm projectId={projectId} areas={areas} initial={bug} />
        </details>
      )}
      {(bug.status === "Fixed" ||
        bug.status === "Verified" ||
        bug.verificationAttempts.length > 0) && (
        <section className="card">
          <h2 className="section-title">Verification</h2>
          {bug.status === "Fixed" && canVerify && (
            <VerificationChecklist
              projectId={projectId}
              bugId={bugId}
              steps={bug.steps}
            />
          )}
          {bug.verificationAttempts[0] && (
            <>
              <h3 className="mt-5 font-semibold">Latest attempt</h3>
              <AttemptSummary attempt={bug.verificationAttempts[0]} />
              {bug.verificationAttempts.length > 1 && (
                <details className="mt-4">
                  <summary className="cursor-pointer font-semibold">
                    Earlier attempts ({bug.verificationAttempts.length - 1})
                  </summary>
                  {bug.verificationAttempts.slice(1).map((attempt) => (
                    <AttemptSummary key={attempt.id} attempt={attempt} />
                  ))}
                </details>
              )}
            </>
          )}
          {bug.status === "Verified" &&
            bug.verificationAttempts.length === 0 && (
              <p className="mt-3">No checklist recorded</p>
            )}
        </section>
      )}
      <BugActions
        projectId={projectId}
        bugId={bugId}
        role={actor.role}
        status={bug.status}
        assigneeId={bug.assigneeId}
        developers={developers}
      />
      <section className="card">
        <h2 className="section-title">Activity and status history</h2>
        {activity.length === 0 ? (
          <p className="mt-2">No activity yet.</p>
        ) : (
          <ol className="mt-5 space-y-5 border-l-2 border-violet-200 pl-6">
            {activity.map((entry) => (
              <li
                key={`${entry.kind}-${entry.id}`}
                className={`relative rounded-xl surface-soft p-4 before:absolute before:-left-[34px] before:top-4 before:h-4 before:w-4 before:rounded-full before:bg-violet-500 before:ring-4 before:ring-white ${entry.kind === "edit" ? "border-l-4 border-violet-500" : ""}`}
              >
                <time className="text-sm text-slate-600">
                  {entry.at.toLocaleString("en-US", { timeZone: "UTC" })} UTC
                </time>
                {entry.kind === "status" ? (
                  <p className="mt-2 flex items-center gap-2">
                    <Icon name="arrow" className="h-4 w-4 text-violet-600" />
                    <strong>{entry.item.actor.name}</strong> moved{" "}
                    {entry.item.fromStatus} → {entry.item.toStatus}
                    {entry.item.comment ? `: ${entry.item.comment}` : ""}
                  </p>
                ) : entry.kind === "verification" ? (
                  <p className="mt-2 flex items-center gap-2">
                    <Icon name="check" className="h-4 w-4 text-violet-600" />
                    <strong>{entry.item.verifier.name}</strong> ·{" "}
                    {summarizeAttempt(entry.item)}
                  </p>
                ) : entry.kind === "edit" ? (
                  <>
                    <p className="mt-2 flex items-center gap-2">
                      <span
                        className="flex h-8 w-8 items-center justify-center rounded-full"
                        style={{
                          background: "var(--accent-soft)",
                          color: "var(--accent)",
                        }}
                      >
                        <Icon name="edit" className="h-4 w-4" />
                      </span>
                      <strong>{entry.item.author.name}</strong> ·{" "}
                      <Badge tone="acceptable">Edit</Badge>
                    </p>
                    <ul className="mt-3 list-disc space-y-1 pl-12 text-sm">
                      {describeEditChanges(
                        editChanges.get(entry.id) ?? [],
                        editNames,
                      ).map((description, index) => (
                        <li key={index}>{description}</li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <>
                    <p className="mt-2 flex items-center gap-2">
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-full ${noteTone[entry.item.type]?.className ?? "bg-violet-100 text-violet-700"}`}
                      >
                        <Icon
                          name={noteTone[entry.item.type]?.icon ?? "spark"}
                          className="h-4 w-4"
                        />
                      </span>
                      <strong>{entry.item.author.name}</strong> ·{" "}
                      <Badge
                        tone={
                          noteTone[entry.item.type]?.badge ?? "investigating"
                        }
                      >
                        {entry.item.type}
                      </Badge>
                      {entry.item.editedAt ? " · edited" : ""}
                    </p>
                    <div className="prose whitespace-pre-wrap">
                      <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
                        {entry.item.body}
                      </ReactMarkdown>
                    </div>
                    {entry.item.authorId === actor.id && (
                      <NoteEditor
                        projectId={projectId}
                        bugId={bugId}
                        noteId={entry.item.id}
                        type={entry.item.type}
                        body={entry.item.body}
                      />
                    )}
                  </>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import { db } from "@/lib/db";
import { getBug } from "@/lib/bugs";
import { projectActor } from "@/lib/request";
import { BugActions, NoteEditor } from "@/components/bug-actions";
import { BugForm } from "@/components/bug-form";

type Props = { params: Promise<{ id: string; bugId: string }> };
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
  const [areas, developers] = await Promise.all([
    db.area.findMany({ where: { projectId } }),
    db.projectMember.findMany({
      where: { projectId, role: "Developer" },
      include: { user: { select: { name: true } } },
    }),
  ]);
  const canEdit =
    actor.role === "Admin" ||
    (actor.role === "Tester" &&
      bug.reporterId === actor.id &&
      !["Fixed", "Verified"].includes(bug.status));
  const activity = [
    ...bug.notes.map((n) => ({
      kind: "note" as const,
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
  ].sort((a, b) => a.at.getTime() - b.at.getTime() || a.id.localeCompare(b.id));
  return (
    <main className="mx-auto max-w-4xl p-8">
      <Link className="underline" href={`/projects/${projectId}/bugs`}>
        ← All bugs
      </Link>
      <h1 className="mt-4 text-3xl font-bold">
        {bug.project.key}-{bug.number}: {bug.title}
      </h1>
      <p className="mt-2">
        {bug.status} · {bug.severity ?? "No severity"} ·{" "}
        {bug.area?.name ?? "No area"}
      </p>
      <p className="text-sm text-slate-600">
        Reported by {bug.reporter.name} · Assigned to{" "}
        {bug.assignee?.name ?? "nobody"} · Reopened {bug.reopenCount} times
      </p>
      <section className="mt-8 grid gap-4">
        <h2 className="text-xl font-semibold">Report</h2>
        <p>Reproducibility: {bug.reproducibility ?? "Unspecified"}</p>
        <p>
          Environment:{" "}
          {[
            bug.osName,
            bug.osVersion,
            bug.browserOrDevice,
            bug.appVersion,
            bug.envType,
          ]
            .filter(Boolean)
            .join(" · ") || "Unspecified"}
        </p>
        <h3 className="font-semibold">Steps</h3>
        <ol className="list-decimal pl-6">
          {bug.steps.map((step) => (
            <li key={step.id}>{step.instruction}</li>
          ))}
        </ol>
        <h3 className="font-semibold">Expected</h3>
        <p>{bug.expectedBehaviour || "Unspecified"}</p>
        <h3 className="font-semibold">Actual</h3>
        <p>{bug.actualBehaviour || "Unspecified"}</p>
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
        <details className="mt-8 border p-4">
          <summary className="cursor-pointer font-semibold">
            Edit report
          </summary>
          <BugForm projectId={projectId} areas={areas} initial={bug} />
        </details>
      )}
      <BugActions
        projectId={projectId}
        bugId={bugId}
        role={actor.role}
        status={bug.status}
        assigneeId={bug.assigneeId}
        developers={developers}
      />
      <section className="mt-10">
        <h2 className="text-xl font-semibold">Activity and status history</h2>
        {activity.length === 0 ? (
          <p className="mt-2">No activity yet.</p>
        ) : (
          <ol className="mt-4 border-l pl-4">
            {activity.map((entry) => (
              <li key={`${entry.kind}-${entry.id}`} className="mb-6">
                <time className="text-sm text-slate-600">
                  {entry.at.toLocaleString("en-US", { timeZone: "UTC" })} UTC
                </time>
                {entry.kind === "status" ? (
                  <p>
                    <strong>{entry.item.actor.name}</strong> moved{" "}
                    {entry.item.fromStatus} → {entry.item.toStatus}
                    {entry.item.comment ? `: ${entry.item.comment}` : ""}
                  </p>
                ) : (
                  <>
                    <p>
                      <strong>{entry.item.author.name}</strong> ·{" "}
                      {entry.item.type}
                      {entry.item.editedAt ? " · edited" : ""}
                    </p>
                    <div className="prose whitespace-pre-wrap">
                      <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
                        {entry.item.body}
                      </ReactMarkdown>
                    </div>
                    {entry.item.authorId === actor.id &&
                      !entry.item.body.startsWith("[Edit log]") && (
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

import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { listBugs } from "@/lib/bugs";
import { projectActor } from "@/lib/request";
import { listSchema } from "@/lib/validation";
import { evaluate } from "@/lib/completeness";
import {
  Avatar,
  Badge,
  Button,
  Completeness,
  EmptyState,
  Icon,
  PageHeader,
  SeverityBadge,
  StatusBadge,
} from "@/components/ui";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Bugs" };

function relativeTime(value: Date) {
  const days = Math.max(
    0,
    Math.floor((Date.now() - value.getTime()) / 86_400_000),
  );
  return days === 0 ? "Today" : days === 1 ? "Yesterday" : `${days}d ago`;
}

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
export default async function BugListPage({ params, searchParams }: Props) {
  const { id: projectId } = await params;
  let actor;
  try {
    actor = await projectActor(projectId);
  } catch {
    notFound();
  }
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: { areas: true, members: { include: { user: true } } },
  });
  if (!project) notFound();
  const raw = await searchParams;
  const query = listSchema.safeParse(
    Object.fromEntries(
      Object.entries(raw).map(([key, value]) => [
        key,
        Array.isArray(value) ? value[0] : value,
      ]),
    ),
  );
  const result = await listBugs(
    projectId,
    actor,
    query.success ? query.data : listSchema.parse({}),
  );
  const url = (page: number) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(raw))
      if (typeof v === "string" && k !== "page") p.set(k, v);
    p.set("page", String(page));
    return `?${p}`;
  };
  return (
    <div className="space-y-6">
      <Link
        href="/projects"
        className="accent-text text-sm font-semibold hover:underline"
      >
        ← Projects
      </Link>
      <PageHeader
        eyebrow={`${project.key} / Issues`}
        title={`${project.name} bugs`}
        description="Review, prioritize, and track every report in one place."
        action={
          <Button href={`/projects/${projectId}/bugs/new`}>
            <Icon name="bug" className="h-4 w-4" />
            New bug
          </Button>
        }
      />
      <form className="card grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        {raw.unresolved === "1" && (
          <input type="hidden" name="unresolved" value="1" />
        )}
        {(raw.window === "30" || raw.window === "90") && (
          <input type="hidden" name="window" value={raw.window} />
        )}
        <label>
          Search
          <input
            className="block w-full border p-2"
            name="q"
            defaultValue={raw.q ?? ""}
          />
        </label>
        <label>
          Status
          <select
            className="block w-full border p-2"
            name="status"
            defaultValue={raw.status ?? ""}
          >
            <option value="">All</option>
            {["Submitted", "Investigating", "Fixed", "Verified"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label>
          Severity
          <select
            className="block w-full border p-2"
            name="severity"
            defaultValue={raw.severity ?? ""}
          >
            <option value="">All</option>
            {["Critical", "High", "Medium", "Low"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label>
          Area
          <select
            className="block w-full border p-2"
            name="area"
            defaultValue={raw.area ?? ""}
          >
            <option value="">All</option>
            {project.areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Reporter
          <select
            className="block w-full border p-2"
            name="reporter"
            defaultValue={raw.reporter ?? ""}
          >
            <option value="">All</option>
            {project.members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.user.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Assignee
          <select
            className="block w-full border p-2"
            name="assignee"
            defaultValue={raw.assignee ?? ""}
          >
            <option value="">All</option>
            {project.members
              .filter((m) => m.role === "Developer")
              .map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.user.name}
                </option>
              ))}
          </select>
        </label>
        <label>
          Sort
          <select
            className="block w-full border p-2"
            name="sort"
            defaultValue={raw.sort ?? "newest"}
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="severity">Severity</option>
            <option value="title">Title</option>
          </select>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="incomplete"
            value="1"
            defaultChecked={raw.incomplete === "1"}
          />
          Incomplete only
        </label>
        <label>
          From
          <input
            className="block w-full border p-2"
            type="date"
            name="from"
            defaultValue={raw.from ?? ""}
          />
        </label>
        <label>
          To
          <input
            className="block w-full border p-2"
            type="date"
            name="to"
            defaultValue={raw.to ?? ""}
          />
        </label>
        <button className="button self-end">Apply filters</button>
      </form>
      <div className="flex items-center justify-between">
        <div>
          <p className="eyebrow">Issue register</p>
          <h2 className="section-title">{result.total} bugs</h2>
        </div>
        <Badge tone="acceptable">{project.key} workspace</Badge>
      </div>
      {result.items.length === 0 ? (
        <EmptyState
          title="No bugs match these filters."
          description="Try clearing a filter or search term to find more reports."
          action={{
            label: "Clear filters",
            href: `/projects/${projectId}/bugs`,
          }}
        />
      ) : (
        <ul className="grid gap-4">
          {result.items.map((bug) => (
            <li
              key={bug.id}
              className="card transition-transform hover:-translate-y-0.5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="eyebrow !mb-0">
                      {project.key}-{bug.number}
                    </span>
                    <SeverityBadge value={bug.severity} />
                    <StatusBadge value={bug.status} />
                    {bug.completenessLevel === "Incomplete" && (
                      <Badge tone="incomplete">Incomplete</Badge>
                    )}
                  </div>
                  <Link
                    className="text-lg font-bold hover:underline"
                    href={`/projects/${projectId}/bugs/${bug.id}`}
                  >
                    {project.key}-{bug.number}: {bug.title}
                  </Link>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                    <span className="badge">{bug.area?.name ?? "No area"}</span>
                    <span className="muted">
                      Reported {relativeTime(bug.createdAt)}
                    </span>
                    <span className="muted">
                      Updated {relativeTime(bug.updatedAt)}
                    </span>
                  </div>
                </div>
                <Completeness
                  score={bug.completenessScore}
                  level={bug.completenessLevel}
                />
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-5 border-t thin-divider pt-4 text-xs">
                <span className="flex items-center gap-2">
                  <Avatar
                    name={
                      project.members.find((m) => m.userId === bug.reporterId)
                        ?.user.name ?? "Reporter"
                    }
                    size="sm"
                  />
                  <span>
                    <span className="muted block">Reporter</span>
                    {project.members.find((m) => m.userId === bug.reporterId)
                      ?.user.name ?? "Reporter"}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <Avatar name={bug.assignee?.name ?? "Unassigned"} size="sm" />
                  <span>
                    <span className="muted block">Assignee</span>
                    {bug.assignee?.name ?? "Unassigned"}
                  </span>
                </span>
              </div>
              {evaluate(bug).missing.length > 0 && (
                <details className="mt-4 text-xs muted">
                  <summary>Completeness reasons</summary>
                  <ul className="list-disc pl-6">
                    {evaluate(bug).missing.map((gap) => (
                      <li key={gap.rule}>
                        {gap.rule}: {gap.suggestion}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </li>
          ))}
        </ul>
      )}
      <nav className="flex items-center justify-center gap-4">
        {result.page > 1 && (
          <Link className="underline" href={url(result.page - 1)}>
            Previous
          </Link>
        )}
        <span className="muted text-sm">
          Page {result.page} of {result.pages}
        </span>
        {result.page < result.pages && (
          <Link className="underline" href={url(result.page + 1)}>
            Next
          </Link>
        )}
      </nav>
    </div>
  );
}

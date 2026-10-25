import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { listBugs } from "@/lib/bugs";
import { projectActor } from "@/lib/request";
import { listSchema } from "@/lib/validation";

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
    <main className="mx-auto max-w-6xl p-8">
      <Link href="/" className="underline">
        Projects
      </Link>
      <div className="mt-4 flex items-center justify-between">
        <h1 className="text-3xl font-bold">{project.name} bugs</h1>
        <Link
          className="rounded bg-slate-900 p-2 text-white"
          href={`/projects/${projectId}/bugs/new`}
        >
          New bug
        </Link>
      </div>
      <form className="mt-6 grid gap-2 md:grid-cols-4">
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
        <button className="self-end rounded bg-slate-900 p-2 text-white">
          Apply filters
        </button>
      </form>
      <p className="mt-6">{result.total} bugs</p>
      {result.items.length === 0 ? (
        <p className="mt-4">No bugs match these filters.</p>
      ) : (
        <ul className="mt-2 divide-y">
          {result.items.map((bug) => (
            <li key={bug.id} className="py-3">
              <Link
                className="font-semibold underline"
                href={`/projects/${projectId}/bugs/${bug.id}`}
              >
                {project.key}-{bug.number}: {bug.title}
              </Link>
              <p className="text-sm text-slate-600">
                {bug.status} · {bug.severity ?? "No severity"} ·{" "}
                {bug.area?.name ?? "No area"} ·{" "}
                {bug.assignee?.name ?? "Unassigned"}
              </p>
            </li>
          ))}
        </ul>
      )}
      <nav className="mt-6 flex gap-4">
        {result.page > 1 && (
          <Link className="underline" href={url(result.page - 1)}>
            Previous
          </Link>
        )}
        <span>
          Page {result.page} of {result.pages}
        </span>
        {result.page < result.pages && (
          <Link className="underline" href={url(result.page + 1)}>
            Next
          </Link>
        )}
      </nav>
    </main>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { listProjects } from "@/lib/projects";
import { can } from "@/lib/policy";
import { roleSchema } from "@/lib/validators";
import { calculateStats } from "@/lib/stats";
import { DashboardCharts } from "./charts";

export const dynamic = "force-dynamic";
const filtersSchema = z.object({
  project: z.string().max(128).optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
});

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session?.user?.id) notFound();
  const raw = await searchParams;
  const parsed = filtersSchema.safeParse({
    project: raw.project,
    from: raw.from,
    to: raw.to,
  });
  if (!parsed.success) notFound();
  const { project, from, to } = parsed.data;
  const projects = (await listProjects(session.user.id)).filter((item) =>
    can(roleSchema.parse(item.members[0].role), "viewDashboard"),
  );
  if (project && !projects.some((item) => item.id === project)) notFound();
  const selected = project ?? projects[0]?.id;
  const rows = selected
    ? await db.bug.findMany({
        where: {
          projectId: selected,
          createdAt: {
            ...(from ? { gte: new Date(`${from}T00:00:00Z`) } : {}),
            ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
          },
        },
        select: {
          id: true,
          projectId: true,
          severity: true,
          status: true,
          areaId: true,
          area: { select: { name: true } },
          reopenCount: true,
          createdAt: true,
          fixedAt: true,
          verifiedAt: true,
        },
      })
    : [];
  const stats = calculateStats(
    rows.map((row) => ({ ...row, areaName: row.area?.name ?? null })),
    { now: new Date() },
  );
  const base = new URLSearchParams();
  if (from) base.set("from", from);
  if (to) base.set("to", to);
  return (
    <main className="mx-auto max-w-6xl p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Link
          className="underline"
          href={selected ? `/projects/${selected}/bugs` : "/projects"}
        >
          Bug list
        </Link>
      </header>
      <form
        className="flex flex-wrap items-end gap-3 rounded border p-4"
        method="get"
      >
        <label>
          Project{" "}
          <select
            className="block border p-2"
            name="project"
            defaultValue={selected ?? ""}
          >
            {!selected && <option value="">No projects</option>}
            {projects.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          From{" "}
          <input
            className="block border p-2"
            name="from"
            type="date"
            defaultValue={from ?? ""}
          />
        </label>
        <label>
          To{" "}
          <input
            className="block border p-2"
            name="to"
            type="date"
            defaultValue={to ?? ""}
          />
        </label>
        <button className="rounded bg-slate-900 px-4 py-2 text-white">
          Apply
        </button>
      </form>
      <p>{stats.total} bugs in the selected range.</p>
      {selected && (
        <DashboardCharts
          stats={stats}
          query={base.toString()}
          projectId={selected}
        />
      )}
      <section className="rounded border p-4">
        <h2 className="text-xl font-semibold">Average time</h2>
        <p>
          Created to fixed: {stats.timeToFix.averageHours?.toFixed(1) ?? "—"}{" "}
          hours ({stats.timeToFix.count} bugs)
        </p>
        <p>
          Fixed to verified:{" "}
          {stats.timeToVerify.averageHours?.toFixed(1) ?? "—"} hours (
          {stats.timeToVerify.count} bugs)
        </p>
      </section>
    </main>
  );
}

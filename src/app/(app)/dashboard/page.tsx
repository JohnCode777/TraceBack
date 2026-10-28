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
import { Badge, Card, EmptyState, Icon, PageHeader } from "@/components/ui";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Dashboard" };

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
  const unresolved = stats.byStatus
    .filter((item) => item.status !== "Verified")
    .reduce((sum, item) => sum + item.count, 0);
  const critical =
    stats.unresolvedBySeverity.find((item) => item.severity === "Critical")
      ?.count ?? 0;
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const verifiedThisMonth = rows.filter(
    (row) =>
      row.status === "Verified" &&
      row.verifiedAt &&
      row.verifiedAt >= monthStart,
  ).length;
  const trend = Array.from({ length: 30 }, (_, index) => {
    const date = new Date();
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() - (29 - index));
    const next = new Date(date.getTime() + 86_400_000);
    return {
      day: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }),
      count: rows.filter((row) => row.createdAt >= date && row.createdAt < next)
        .length,
    };
  });
  const statCards = [
    {
      label: "Total unresolved",
      value: unresolved,
      icon: "bug",
      detail: "Needs attention",
      href: selected ? `/projects/${selected}/bugs?unresolved=1` : "/projects",
    },
    {
      label: "Critical open",
      value: critical,
      icon: "alert",
      detail: "Highest priority",
      href: selected
        ? `/projects/${selected}/bugs?severity=Critical&unresolved=1`
        : "/projects",
    },
    {
      label: "Avg time to fix",
      value:
        stats.timeToFix.averageHours == null
          ? "—"
          : `${stats.timeToFix.averageHours.toFixed(1)}h`,
      icon: "clock",
      detail: `${stats.timeToFix.count} resolved bugs`,
      href: selected ? `/projects/${selected}/bugs` : "/projects",
    },
    {
      label: "Verified this month",
      value: verifiedThisMonth,
      icon: "check",
      detail: "Confirmed fixes",
      href: selected
        ? `/projects/${selected}/bugs?status=Verified`
        : "/projects",
    },
  ];
  return (
    <div className="space-y-6">
      <div className="page-hero flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-[.2em]">
            TraceBack insights
          </p>
          <h1 className="text-3xl font-extrabold sm:text-4xl">Dashboard</h1>
          <p className="mt-3 max-w-xl">
            A clear view of what is open, what is recurring, and how quickly
            your team is resolving issues.
          </p>
        </div>
        <Link
          className="button-secondary"
          href={selected ? `/projects/${selected}/bugs` : "/projects"}
        >
          Bug list <Icon name="arrow" className="h-4 w-4" />
        </Link>
      </div>
      <form className="card flex flex-wrap items-end gap-4" method="get">
        <label>
          Project{" "}
          <select
            className="mt-1 block"
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
            className="mt-1 block"
            name="from"
            type="date"
            defaultValue={from ?? ""}
          />
        </label>
        <label>
          To{" "}
          <input
            className="mt-1 block"
            name="to"
            type="date"
            defaultValue={to ?? ""}
          />
        </label>
        <button className="button">Apply</button>
      </form>
      <PageHeader
        eyebrow="Overview"
        title="At a glance"
        description={`${stats.total} bugs in the selected range.`}
        action={<Badge tone="acceptable">Live project view</Badge>}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="card group block transition-transform hover:-translate-y-1"
          >
            <span
              className="mb-6 flex h-11 w-11 items-center justify-center rounded-xl"
              style={{
                background: "var(--accent-soft)",
                color: "var(--accent)",
              }}
            >
              <Icon name={card.icon} />
            </span>
            <p className="muted text-sm font-medium">{card.label}</p>
            <p className="mt-1 text-3xl font-extrabold tracking-tight">
              {card.value}
            </p>
            <p className="muted mt-2 text-xs">{card.detail}</p>
          </Link>
        ))}
      </div>
      {!selected && (
        <div role="status">
          <EmptyState
            title="Your dashboard starts with a project"
            description="Create or join a project to see dashboard statistics."
            action={{ label: "View projects", href: "/projects" }}
          />
        </div>
      )}
      {selected && (
        <DashboardCharts
          stats={stats}
          trend={trend}
          query={base.toString()}
          projectId={selected}
        />
      )}
      <Card>
        <h2 className="section-title">Resolution pace</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="surface-soft rounded-xl p-4">
            <p className="muted text-sm">Created to fixed</p>
            <p className="mt-1 text-2xl font-bold">
              {stats.timeToFix.averageHours?.toFixed(1) ?? "—"}{" "}
              <span className="text-sm font-normal">hours</span>
            </p>
            <p className="muted text-xs">{stats.timeToFix.count} bugs</p>
          </div>
          <div className="surface-soft rounded-xl p-4">
            <p className="muted text-sm">Fixed to verified</p>
            <p className="mt-1 text-2xl font-bold">
              {stats.timeToVerify.averageHours?.toFixed(1) ?? "—"}{" "}
              <span className="text-sm font-normal">hours</span>
            </p>
            <p className="muted text-xs">{stats.timeToVerify.count} bugs</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

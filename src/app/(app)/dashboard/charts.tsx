"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { calculateStats } from "@/lib/stats";

type Stats = ReturnType<typeof calculateStats>;
const colors = ["#b91c1c", "#ea580c", "#2563eb", "#64748b"];

export function DashboardCharts({
  stats,
  query,
  projectId,
}: {
  stats: Stats;
  query: string;
  projectId: string;
}) {
  const router = useRouter();
  const href = (key: string, value: string, extra?: string) => {
    const params = new URLSearchParams(query);
    params.set(key, value);
    if (extra) params.set("window", extra);
    if (key === "severity") params.set("unresolved", "1");
    return `/projects/${projectId}/bugs?${params}`;
  };
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <section className="rounded border p-4">
        <h2 className="text-xl font-semibold">Unresolved by severity</h2>
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.unresolvedBySeverity}>
              <XAxis dataKey="severity" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar
                dataKey="count"
                onClick={(item) => {
                  const row = item as { payload?: { severity?: string } };
                  if (row.payload?.severity)
                    router.push(href("severity", row.payload.severity));
                }}
              >
                {stats.unresolvedBySeverity.map((row, index) => (
                  <Cell key={row.severity} fill={colors[index]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-3">
          {stats.unresolvedBySeverity.map((row) => (
            <Link
              key={row.severity}
              className="underline"
              href={href("severity", row.severity)}
            >
              {row.severity}: {row.count}
            </Link>
          ))}
        </div>
      </section>
      <section className="rounded border p-4">
        <h2 className="text-xl font-semibold">Bugs by status</h2>
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={stats.byStatus}
                dataKey="count"
                nameKey="status"
                cx="50%"
                cy="50%"
                outerRadius={75}
                onClick={(item) => {
                  const row = item as {
                    status?: string;
                    payload?: { status?: string };
                  };
                  const status = row.status ?? row.payload?.status;
                  if (status) router.push(href("status", status));
                }}
              >
                {stats.byStatus.map((row, index) => (
                  <Cell key={row.status} fill={colors[index]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-3">
          {stats.byStatus.map((row) => (
            <Link
              key={row.status}
              className="underline"
              href={href("status", row.status)}
            >
              {row.status}: {row.count}
            </Link>
          ))}
        </div>
      </section>
      <section className="rounded border p-4 md:col-span-2">
        <h2 className="text-xl font-semibold">Top problem areas</h2>
        {stats.topAreas.length === 0 ? (
          <p>No areas in the last 90 days.</p>
        ) : (
          <>
            <div style={{ height: Math.max(190, stats.topAreas.length * 40) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.topAreas} layout="vertical">
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={130} />
                  <Tooltip />
                  <Legend />
                  <Bar
                    name="30 days"
                    dataKey="count30"
                    fill="#2563eb"
                    onClick={(item) => {
                      const row = item as { payload?: { areaId?: string } };
                      if (row.payload?.areaId)
                        router.push(href("area", row.payload.areaId, "30"));
                    }}
                  />
                  <Bar
                    name="90 days"
                    dataKey="count90"
                    fill="#64748b"
                    onClick={(item) => {
                      const row = item as { payload?: { areaId?: string } };
                      if (row.payload?.areaId)
                        router.push(href("area", row.payload.areaId, "90"));
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {stats.topAreas.map((area) => (
                <div
                  key={area.areaId}
                  className="flex flex-wrap items-center gap-3"
                >
                  <strong className="w-40">{area.name}</strong>
                  <Link
                    className="underline"
                    href={href("area", area.areaId, "30")}
                  >
                    30 days: {area.count30}
                  </Link>
                  <Link
                    className="underline"
                    href={href("area", area.areaId, "90")}
                  >
                    90 days: {area.count90}
                  </Link>
                  {area.recurring && (
                    <span className="rounded bg-amber-100 px-2">Recurring</span>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

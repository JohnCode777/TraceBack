"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { calculateStats } from "@/lib/stats";
import { Badge } from "@/components/ui";

type Stats = ReturnType<typeof calculateStats>;
const severityColors = ["#c84255", "#ed854a", "#e2af41", "#8190aa"];
const statusColors = ["#8894aa", "#5892db", "#a071d8", "#32aa78"];
const chartText = "#8791a8";

export function DashboardCharts({
  stats,
  query,
  projectId,
  trend,
}: {
  stats: Stats;
  query: string;
  projectId: string;
  trend: { day: string; count: number }[];
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
    <div className="grid gap-5 xl:grid-cols-2">
      <section className="card">
        <div className="mb-4">
          <p className="eyebrow">Priority mix</p>
          <h2 className="section-title">Unresolved by severity</h2>
        </div>
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.unresolvedBySeverity}>
              <XAxis
                dataKey="severity"
                tickLine={false}
                axisLine={false}
                tick={{ fill: chartText, fontSize: 12 }}
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                tick={{ fill: chartText, fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 14,
                  border: "1px solid #d9dded",
                  boxShadow: "0 12px 30px #17193d1c",
                }}
              />
              <Bar
                dataKey="count"
                onClick={(item) => {
                  const row = item as { payload?: { severity?: string } };
                  if (row.payload?.severity)
                    router.push(href("severity", row.payload.severity));
                }}
              >
                {stats.unresolvedBySeverity.map((row, index) => (
                  <Cell key={row.severity} fill={severityColors[index]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          {stats.unresolvedBySeverity.map((row) => (
            <Link
              key={row.severity}
              className="accent-text font-semibold hover:underline"
              href={href("severity", row.severity)}
            >
              {row.severity}: {row.count}
            </Link>
          ))}
        </div>
      </section>
      <section className="card">
        <div className="mb-4">
          <p className="eyebrow">Workflow</p>
          <h2 className="section-title">Bugs by status</h2>
        </div>
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={stats.byStatus}
                dataKey="count"
                nameKey="status"
                cx="50%"
                cy="50%"
                outerRadius={86}
                innerRadius={54}
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
                  <Cell key={row.status} fill={statusColors[index]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ borderRadius: 14, border: "1px solid #d9dded" }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          {stats.byStatus.map((row) => (
            <Link
              key={row.status}
              className="accent-text font-semibold hover:underline"
              href={href("status", row.status)}
            >
              {row.status}: {row.count}
            </Link>
          ))}
        </div>
      </section>
      <section className="card xl:col-span-2">
        <div className="mb-4">
          <p className="eyebrow">Patterns</p>
          <h2 className="section-title">Top problem areas</h2>
        </div>
        {stats.topAreas.length === 0 ? (
          <p>No areas in the last 90 days.</p>
        ) : (
          <>
            <div style={{ height: Math.max(190, stats.topAreas.length * 40) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.topAreas} layout="vertical">
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: chartText, fontSize: 12 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={130}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: chartText, fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 14,
                      border: "1px solid #d9dded",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar
                    name="30 days"
                    dataKey="count30"
                    fill="#6850d1"
                    onClick={(item) => {
                      const row = item as { payload?: { areaId?: string } };
                      if (row.payload?.areaId)
                        router.push(href("area", row.payload.areaId, "30"));
                    }}
                  />
                  <Bar
                    name="90 days"
                    dataKey="count90"
                    fill="#aab3c9"
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
                  className="flex flex-wrap items-center gap-3 rounded-xl px-3 py-2 surface-soft"
                >
                  <strong className="w-40">{area.name}</strong>
                  <Link
                    className="accent-text underline"
                    href={href("area", area.areaId, "30")}
                  >
                    30 days: {area.count30}
                  </Link>
                  <Link
                    className="accent-text underline"
                    href={href("area", area.areaId, "90")}
                  >
                    90 days: {area.count90}
                  </Link>
                  {area.recurring && <Badge tone="recurring">Recurring</Badge>}
                </div>
              ))}
            </div>
          </>
        )}
      </section>
      <section className="card xl:col-span-2">
        <div className="mb-4">
          <p className="eyebrow">Last 30 days</p>
          <h2 className="section-title">New bug trend</h2>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend}>
              <XAxis
                dataKey="day"
                minTickGap={28}
                tickLine={false}
                axisLine={false}
                tick={{ fill: chartText, fontSize: 11 }}
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                tick={{ fill: chartText, fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{ borderRadius: 14, border: "1px solid #d9dded" }}
              />
              <Line
                type="monotone"
                dataKey="count"
                name="New bugs"
                stroke="#7654d9"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}

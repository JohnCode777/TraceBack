export type StatsBug = {
  id: string;
  projectId: string;
  severity: string | null;
  status: string;
  areaId: string | null;
  areaName: string | null;
  reopenCount: number;
  createdAt: Date;
  fixedAt: Date | null;
  verifiedAt: Date | null;
};

export type StatsFilters = {
  projectId?: string;
  from?: Date;
  to?: Date;
  now?: Date;
};
const severities = ["Critical", "High", "Medium", "Low"];
const statuses = ["Submitted", "Investigating", "Fixed", "Verified"];
const day = 86_400_000;

export function calculateStats(
  rows: readonly StatsBug[],
  filters: StatsFilters = {},
) {
  const now = filters.now ?? new Date();
  const selected = rows.filter(
    (bug) =>
      (!filters.projectId || bug.projectId === filters.projectId) &&
      (!filters.from || bug.createdAt >= filters.from) &&
      (!filters.to || bug.createdAt <= filters.to),
  );
  const unresolvedBySeverity = severities.map((severity) => ({
    severity,
    count: selected.filter(
      (bug) => bug.severity === severity && bug.status !== "Verified",
    ).length,
  }));
  const byStatus = statuses.map((status) => ({
    status,
    count: selected.filter((bug) => bug.status === status).length,
  }));
  const areaMap = new Map<
    string,
    {
      areaId: string;
      name: string;
      count30: number;
      count90: number;
      recurring: boolean;
    }
  >();
  for (const bug of selected) {
    if (!bug.areaId) continue;
    const area = areaMap.get(bug.areaId) ?? {
      areaId: bug.areaId,
      name: bug.areaName ?? "Unnamed area",
      count30: 0,
      count90: 0,
      recurring: false,
    };
    if (
      bug.createdAt >= new Date(now.getTime() - 30 * day) &&
      bug.createdAt <= now
    )
      area.count30++;
    if (
      bug.createdAt >= new Date(now.getTime() - 90 * day) &&
      bug.createdAt <= now
    )
      area.count90++;
    if (bug.reopenCount >= 2) area.recurring = true;
    areaMap.set(bug.areaId, area);
  }
  const topAreas = [...areaMap.values()]
    .map((area) => ({
      ...area,
      recurring: area.recurring || area.count30 >= 3,
    }))
    .filter((area) => area.count90 > 0 || area.recurring)
    .sort(
      (a, b) =>
        b.count30 - a.count30 ||
        b.count90 - a.count90 ||
        a.name.localeCompare(b.name),
    );
  const durations = (getDuration: (bug: StatsBug) => number | null) => {
    const values = selected
      .map(getDuration)
      .filter((value): value is number => value !== null && value >= 0);
    return {
      count: values.length,
      averageHours: values.length
        ? values.reduce((sum, value) => sum + value, 0) /
          values.length /
          3_600_000
        : null,
    };
  };
  const timeToFix = durations((bug) =>
    bug.fixedAt ? bug.fixedAt.getTime() - bug.createdAt.getTime() : null,
  );
  const timeToVerify = durations((bug) =>
    bug.fixedAt && bug.verifiedAt
      ? bug.verifiedAt.getTime() - bug.fixedAt.getTime()
      : null,
  );
  return {
    total: selected.length,
    unresolvedBySeverity,
    byStatus,
    topAreas,
    timeToFix,
    timeToVerify,
  };
}

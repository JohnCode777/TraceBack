export const seedProjects = [
  {
    id: "seed-project-traceback",
    key: "TB",
    name: "TraceBack Demo",
    description: "Demo issue tracker",
  },
  {
    id: "seed-project-portal",
    key: "WEB",
    name: "Customer Portal Demo",
    description: "Demo customer portal",
  },
] as const;

export const seedAreas = [
  "Interface",
  "API",
  "Authentication",
  "Reports",
  "Performance",
] as const;
export const seedRoles = ["Tester", "Developer", "Admin"] as const;

const titles = [
  "Dashboard count does not refresh after update",
  "Search results omit matching project issues",
  "Login form loses focus after invalid password",
  "Report export truncates long issue summaries",
  "Slow response when opening the issue list",
  "Browser back navigation clears filter selections",
  "API returns stale status after a successful save",
  "Session expires while editing a short comment",
  "Printed report misses the environment version",
  "Pagination repeats the last item on page two",
  "Keyboard focus skips the severity selector",
  "Search query with accents returns no results",
  "New member cannot see the assigned project",
  "PDF filename contains an unexpected timestamp",
  "Large project dashboard takes several seconds",
  "Issue details show an incorrect reporter name",
  "Area filter ignores issues with no assigned area",
  "Verification comment disappears after refresh",
  "Password field reveals typed text on mobile",
  "Download link responds with a blank document",
  "Critical issue badge uses the wrong colour",
  "List sorting changes when loading more issues",
  "Access denied message reveals a project title",
  "Report table overlaps a long device name",
  "Repeated requests create duplicate list entries",
] as const;

export type SeedStatus = "Submitted" | "Investigating" | "Fixed" | "Verified";
export type SeedChange = {
  fromStatus: SeedStatus;
  toStatus: SeedStatus;
  actorId: string;
  comment: string | null;
  createdAt: Date;
};
export type SeedBug = {
  id: string;
  projectId: string;
  number: number;
  title: string;
  severity: string | null;
  status: SeedStatus;
  reproducibility: string;
  areaId: string | null;
  reporterId: string;
  assigneeId: string | null;
  osName: string;
  osVersion: string;
  browserOrDevice: string;
  appVersion: string | null;
  envType: string;
  expectedBehaviour: string;
  actualBehaviour: string;
  extraContext: string;
  completenessScore: number;
  completenessLevel: string;
  reopenCount: number;
  reproducedByDev: string | null;
  rootCauseCategory: string | null;
  resolutionSummary: string | null;
  fixReference: string | null;
  createdAt: Date;
  fixedAt: Date | null;
  verifiedAt: Date | null;
  steps: { position: number; instruction: string }[];
  notes: { authorId: string; type: string; body: string; createdAt: Date }[];
  statusChanges: SeedChange[];
};

export function buildSeedBugs(now = new Date()): SeedBug[] {
  const bugs: SeedBug[] = [];
  for (const [projectIndex, project] of seedProjects.entries()) {
    for (let number = 1; number <= 25; number++) {
      const reporterId = `seed-user-tester-${((number - 1) % 3) + 1}`;
      const developerId = `seed-user-developer-${((number - 1) % 3) + 1}`;
      const createdAt = new Date(
        now.getTime() - (number * 3 + projectIndex * 2 + 3) * 86_400_000,
      );
      const statusChanges: SeedChange[] = [];
      const targetIndex = (number - 1) % 4;
      let status: SeedStatus = "Submitted";
      let reopenCount = 0;
      const addChange = (
        toStatus: SeedStatus,
        actorId: string,
        comment: string | null = null,
      ) => {
        const createdAt = new Date(
          baseTime.getTime() + (statusChanges.length + 1) * 3_600_000,
        );
        statusChanges.push({
          fromStatus: status,
          toStatus,
          actorId,
          comment,
          createdAt,
        });
        status = toStatus;
        if (toStatus === "Investigating" && comment) reopenCount++;
      };
      const baseTime = createdAt;
      if (targetIndex >= 1) addChange("Investigating", developerId);
      if (targetIndex >= 2)
        addChange("Fixed", developerId, "Fix ready for tester verification.");
      if (targetIndex >= 3)
        addChange("Verified", reporterId, "Original steps now pass.");
      if (number === 15) {
        addChange(
          "Investigating",
          reporterId,
          "The original failure still occurs.",
        );
        addChange("Fixed", developerId, "Updated the fix after retesting.");
      }
      if (number === 12) {
        for (let cycle = 0; cycle < 2; cycle++) {
          addChange(
            "Investigating",
            reporterId,
            "The issue returned in a later build.",
          );
          addChange("Fixed", developerId, "Corrected the regression.");
          addChange("Verified", reporterId, "Retested the original steps.");
        }
      }
      const fixedAt =
        statusChanges.filter((change) => change.toStatus === "Fixed").at(-1)
          ?.createdAt ?? null;
      const verifiedAt =
        statusChanges.filter((change) => change.toStatus === "Verified").at(-1)
          ?.createdAt ?? null;
      const title = titles[number - 1];
      const areaIndex = (number - 1) % seedAreas.length;
      const isSparse = number % 7 === 0;
      bugs.push({
        id: `seed-bug-${project.key.toLowerCase()}-${number}`,
        projectId: project.id,
        number,
        title,
        severity:
          number % 13 === 0
            ? null
            : ["Critical", "High", "Medium", "Low"][number % 4],
        status,
        reproducibility: ["Always", "Sometimes", "Rarely", "Once"][number % 4],
        areaId:
          number % 11 === 0
            ? null
            : `seed-area-${project.key.toLowerCase()}-${areaIndex + 1}`,
        reporterId,
        assigneeId: targetIndex === 0 ? null : developerId,
        osName: number % 2 ? "Windows" : "macOS",
        osVersion: number % 2 ? "11" : "14",
        browserOrDevice: number % 2 ? "Chrome desktop" : "Safari desktop",
        appVersion: isSparse ? null : `1.${projectIndex}.${number % 5}`,
        envType: number % 3 === 0 ? "Staging" : "Production",
        expectedBehaviour: isSparse
          ? "It works"
          : `The ${seedAreas[areaIndex].toLowerCase()} workflow completes and displays the latest saved result.`,
        actualBehaviour: isSparse
          ? "Unexpected result"
          : `${title} when using the demo account.`,
        extraContext: `Fake demo evidence: https://example.test/${project.key.toLowerCase()}/${number}`,
        // The completeness engine arrives in Session 4. Seed scores are examples,
        // deliberately varied, and are recomputed by that session's migration.
        completenessScore: isSparse ? 65 : number % 5 === 0 ? 85 : 95,
        completenessLevel: isSparse
          ? "Incomplete"
          : number % 5 === 0
            ? "Acceptable"
            : "Strong",
        reopenCount,
        reproducedByDev: fixedAt
          ? number % 4 === 0
            ? "Partially"
            : "Yes"
          : null,
        rootCauseCategory: fixedAt
          ? [
              "Logic error",
              "Configuration",
              "Data",
              "Race condition",
              "Third party",
            ][areaIndex]
          : null,
        resolutionSummary: fixedAt
          ? `Corrected the ${seedAreas[areaIndex].toLowerCase()} handling and added a regression check.`
          : null,
        fixReference: fixedAt ? `DEMO-${project.key}-${number}` : null,
        createdAt,
        fixedAt,
        verifiedAt,
        steps: isSparse
          ? [
              {
                position: 1,
                instruction: `Open the ${seedAreas[areaIndex].toLowerCase()} screen.`,
              },
            ]
          : [
              {
                position: 1,
                instruction: `Open the ${seedAreas[areaIndex].toLowerCase()} screen in the demo project.`,
              },
              {
                position: 2,
                instruction: `Perform the action described in ${project.key}-${number}.`,
              },
              {
                position: 3,
                instruction: "Compare the result with the expected behaviour.",
              },
            ],
        notes:
          targetIndex === 0
            ? []
            : [
                {
                  authorId: developerId,
                  type: "Observation",
                  body: `Observed the reported ${seedAreas[areaIndex].toLowerCase()} behaviour in the demo environment.`,
                  createdAt: new Date(createdAt.getTime() + 5_400_000),
                },
                ...(fixedAt
                  ? [
                      {
                        authorId: developerId,
                        type: "Root cause",
                        body: `A demo ${seedAreas[areaIndex].toLowerCase()} handler used stale state.`,
                        createdAt: new Date(fixedAt.getTime() - 1_800_000),
                      },
                    ]
                  : []),
              ],
        statusChanges,
      });
    }
  }
  return bugs;
}

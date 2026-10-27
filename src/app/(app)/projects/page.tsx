import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listProjects } from "@/lib/projects";
import { db } from "@/lib/db";
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  Icon,
  PageHeader,
} from "@/components/ui";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Projects" };
export default async function ProjectsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const projects = await listProjects(session.user.id);
  const ids = projects.map((project) => project.id);
  const [members, counts, unresolved] = ids.length
    ? await Promise.all([
        db.projectMember.findMany({
          where: { projectId: { in: ids } },
          include: { user: { select: { name: true } } },
        }),
        db.bug.groupBy({
          by: ["projectId"],
          where: { projectId: { in: ids } },
          _count: { _all: true },
        }),
        db.bug.groupBy({
          by: ["projectId"],
          where: { projectId: { in: ids }, status: { not: "Verified" } },
          _count: { _all: true },
        }),
      ])
    : [[], [], []];
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace"
        title="Your projects"
        description="Every investigation starts with a shared view."
        action={<Button href="/projects/new">Create project</Button>}
      />
      {projects.length === 0 ? (
        <EmptyState
          title="Start with a project"
          description="You are not a member of any projects yet. Create one to get started."
          action={{ label: "Create project", href: "/projects/new" }}
        />
      ) : (
        <ul className="grid gap-5 md:grid-cols-2">
          {projects.map((project) => {
            const total =
              counts.find((row) => row.projectId === project.id)?._count._all ??
              0;
            const open =
              unresolved.find((row) => row.projectId === project.id)?._count
                ._all ?? 0;
            return (
              <li className="card flex flex-col gap-5" key={project.id}>
                <div className="flex items-start justify-between gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                    <Icon name="folder" />
                  </span>
                  <Badge tone="acceptable">{project.members[0]?.role}</Badge>
                </div>
                <Link
                  className="text-xl font-bold hover:underline"
                  href={`/projects/${project.id}`}
                >
                  {project.name}
                </Link>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{project.key}</Badge>
                  {project.archivedAt && <Badge tone="medium">Archived</Badge>}
                </div>
                <p className="muted min-h-10 text-sm">
                  {project.description ||
                    "A shared workspace for clear issue reports."}
                </p>
                <div className="mt-auto border-t thin-divider pt-4">
                  <div className="mb-2 flex justify-between text-sm">
                    <strong>{total} bugs</strong>
                    <span className="muted">{open} unresolved</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full surface-soft">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-violet-500"
                      style={{
                        width: `${total ? Math.max(4, (open / total) * 100) : 0}%`,
                      }}
                    />
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex -space-x-2">
                      {members
                        .filter((member) => member.projectId === project.id)
                        .slice(0, 5)
                        .map((member) => (
                          <Avatar
                            key={member.userId}
                            name={member.user.name}
                            size="sm"
                          />
                        ))}
                    </div>
                    <Link
                      href={`/projects/${project.id}/bugs`}
                      className="accent-text text-sm font-semibold hover:underline"
                    >
                      View bugs →
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

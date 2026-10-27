import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getProject, ProjectError } from "@/lib/projects";
import { can } from "@/lib/policy";
import { roleSchema } from "@/lib/validators";
import { db } from "@/lib/db";
import { Avatar, Badge, Button, Icon, PageHeader, Tabs } from "@/components/ui";
export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;
  let project;
  try {
    project = await getProject(userId, id);
  } catch (error) {
    if (error instanceof ProjectError && error.status === 404) notFound();
    throw error;
  }
  const role = project.members.find((member) => member.userId === userId)?.role;
  const [total, open] = await Promise.all([
    db.bug.count({ where: { projectId: id } }),
    db.bug.count({ where: { projectId: id, status: { not: "Verified" } } }),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`${project.key} / Project`}
        title={project.name}
        description={
          project.description || "A shared workspace for clear issue reports."
        }
        action={
          role &&
          can(roleSchema.parse(role), "manageProject") && (
            <Button variant="secondary" href={`/projects/${id}/settings`}>
              Project settings
            </Button>
          )
        }
      />
      <Tabs
        items={[
          { label: "Overview", href: `/projects/${id}`, active: true },
          { label: "Bugs", href: `/projects/${id}/bugs` },
          { label: "Dashboard", href: `/dashboard?project=${id}` },
        ]}
      />
      {project.archivedAt && (
        <p className="rounded-md bg-amber-50 p-3 text-amber-900">
          This project is archived and read-only.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card">
          <Icon name="bug" className="accent-text h-6 w-6" />
          <p className="muted mt-4 text-sm">All bugs</p>
          <p className="text-3xl font-bold">{total}</p>
        </div>
        <div className="card">
          <Icon name="alert" className="accent-text h-6 w-6" />
          <p className="muted mt-4 text-sm">Unresolved</p>
          <p className="text-3xl font-bold">{open}</p>
        </div>
        <div className="card">
          <Icon name="check" className="accent-text h-6 w-6" />
          <p className="muted mt-4 text-sm">Verified</p>
          <p className="text-3xl font-bold">{total - open}</p>
        </div>
      </div>
      <Button href={`/projects/${id}/bugs`}>
        View bugs <Icon name="arrow" className="h-4 w-4" />
      </Button>
      <section className="card">
        <div className="flex items-center justify-between">
          <h2 className="section-title">Members</h2>
          <Badge tone="acceptable">{project.members.length} teammates</Badge>
        </div>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {project.members.map((member) => (
            <li
              key={member.userId}
              className="surface-soft flex items-center gap-3 rounded-xl p-3 text-sm"
            >
              <Avatar name={member.user.name} />
              <span className="flex-1 font-semibold">{member.user.name}</span>
              <Badge tone="acceptable">{member.role}</Badge>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

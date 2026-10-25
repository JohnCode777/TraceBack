import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getProject, ProjectError } from "@/lib/projects";
import { can } from "@/lib/policy";
import { roleSchema } from "@/lib/validators";
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
  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-600">
            {project.key} · {role}
          </p>
          <h1 className="text-2xl font-bold">{project.name}</h1>
        </div>
        {role && can(roleSchema.parse(role), "manageProject") && (
          <Link className="button-secondary" href={`/projects/${id}/settings`}>
            Project settings
          </Link>
        )}
      </div>
      {project.archivedAt && (
        <p className="rounded-md bg-amber-50 p-3 text-amber-900">
          This project is archived and read-only.
        </p>
      )}
      <p>{project.description || "No description yet."}</p>
      <Link className="button-secondary" href={`/projects/${id}/bugs`}>
        View bugs
      </Link>
      <section className="card">
        <h2 className="text-lg font-semibold">Members</h2>
        <ul className="mt-3 space-y-2">
          {project.members.map((member) => (
            <li key={member.userId}>
              {member.user.name} · {member.role}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

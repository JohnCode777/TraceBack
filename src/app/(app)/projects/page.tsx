import Link from "next/link";
import { auth } from "@/auth";
import { listProjects } from "@/lib/projects";
export default async function ProjectsPage() {
  const session = await auth();
  const projects = await listProjects(session!.user!.id!);
  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Your projects</h1>
        <Link className="button" href="/projects/new">
          Create project
        </Link>
      </div>
      {projects.length === 0 ? (
        <div className="card">
          <p>
            You are not a member of any projects yet. Create one to get started.
          </p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {projects.map((project) => (
            <li className="card" key={project.id}>
              <Link
                className="text-lg font-semibold text-blue-700 underline"
                href={`/projects/${project.id}`}
              >
                {project.name}
              </Link>
              <p className="text-sm text-slate-600">
                {project.key} · {project.members[0]?.role}
                {project.archivedAt ? " · Archived" : ""}
              </p>
              <p className="mt-2">{project.description}</p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

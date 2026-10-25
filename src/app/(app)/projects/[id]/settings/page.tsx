import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import {
  addMemberAction,
  archiveProjectAction,
  editProjectAction,
} from "@/app/actions";
import { ActionForm } from "@/components/action-form";
import { getProject, ProjectError } from "@/lib/projects";
import { can } from "@/lib/policy";
import { roleSchema } from "@/lib/validators";
export default async function SettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; memberAdded?: string }>;
}) {
  const { id } = await params;
  const messages = await searchParams;
  const session = await auth();
  let project;
  try {
    project = await getProject(session!.user!.id!, id);
  } catch (error) {
    if (error instanceof ProjectError && error.status === 404) notFound();
    throw error;
  }
  const role = project.members.find(
    (member) => member.userId === session!.user!.id,
  )?.role;
  if (!role || !can(roleSchema.parse(role), "manageProject"))
    return (
      <div role="alert" className="card">
        <h1 className="text-xl font-semibold">Access denied</h1>
        <p>Only project admins can manage settings.</p>
      </div>
    );
  return (
    <>
      <div>
        <Link className="text-blue-700 underline" href={`/projects/${id}`}>
          ← {project.name}
        </Link>
        <h1 className="mt-3 text-2xl font-bold">Project settings</h1>
      </div>
      {messages.saved && <p className="text-green-700">Project updated.</p>}
      {messages.memberAdded && <p className="text-green-700">Member added.</p>}
      {project.archivedAt ? (
        <div className="card">This project is archived and read-only.</div>
      ) : (
        <>
          <section className="card space-y-4">
            <h2 className="text-lg font-semibold">Details</h2>
            <ActionForm
              action={editProjectAction.bind(null, id)}
              submit="Save changes"
            >
              <div className="field">
                <label htmlFor="name">Name</label>
                <input
                  id="name"
                  name="name"
                  defaultValue={project.name}
                  required
                  maxLength={100}
                />
              </div>
              <div className="field">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  name="description"
                  defaultValue={project.description ?? ""}
                  rows={4}
                  maxLength={2000}
                />
              </div>
            </ActionForm>
            <p className="text-sm text-slate-600">
              Project key: {project.key} (cannot be changed)
            </p>
          </section>
          <section className="card space-y-4">
            <h2 className="text-lg font-semibold">Add existing user</h2>
            <ActionForm
              action={addMemberAction.bind(null, id)}
              submit="Add member"
            >
              <div className="field">
                <label htmlFor="member-email">User email</label>
                <input id="member-email" name="email" type="email" required />
              </div>
              <div className="field">
                <label htmlFor="role">Role</label>
                <select id="role" name="role">
                  <option>Tester</option>
                  <option>Developer</option>
                  <option>Admin</option>
                </select>
              </div>
            </ActionForm>
          </section>
          <section className="card space-y-3">
            <h2 className="text-lg font-semibold">Archive project</h2>
            <p>
              Members can still view an archived project, but it cannot be
              edited.
            </p>
            <ActionForm
              action={archiveProjectAction.bind(null, id)}
              submit="Archive project"
            >
              {null}
            </ActionForm>
          </section>
        </>
      )}
    </>
  );
}

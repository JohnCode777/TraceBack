"use server";

import { AuthError } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { auth, signIn, signOut } from "@/auth";
import {
  addProjectArea,
  addProjectMember,
  archiveProject,
  createProject,
  editProject,
  ProjectError,
  removeProjectArea,
} from "@/lib/projects";
import { registerUser, UserError } from "@/lib/users";
import { ZodError } from "zod";
import { areaIdSchema, loginSchema, projectIdSchema } from "@/lib/validators";

export type FormState = { error: string };
const stateError = (error: unknown): FormState => ({
  error:
    error instanceof ZodError
      ? (error.issues[0]?.message ?? "Invalid input.")
      : error instanceof ProjectError || error instanceof UserError
        ? error.message
        : "Something went wrong.",
});
const value = (form: FormData, name: string) => form.get(name);
async function userId() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}

export async function registerAction(
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  try {
    await registerUser({
      name: value(form, "name"),
      email: value(form, "email"),
      password: value(form, "password"),
    });
  } catch (error) {
    return stateError(error);
  }
  redirect("/login?registered=1");
}

export async function loginAction(
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  try {
    const data = loginSchema.parse({
      email: value(form, "email"),
      password: value(form, "password"),
    });
    await signIn("credentials", { ...data, redirectTo: "/projects" });
  } catch (error) {
    if (error instanceof AuthError)
      return {
        error:
          "Invalid email or password, or too many attempts. Please try again later.",
      };
    if (error instanceof ZodError) return stateError(error);
    throw error;
  }
  return { error: "" };
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

export async function createProjectAction(
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  const id = await userId();
  let projectId: string;
  try {
    const project = await createProject(id, {
      name: value(form, "name"),
      key: value(form, "key"),
      description: value(form, "description"),
    });
    projectId = project.id;
  } catch (error) {
    return stateError(error);
  }
  redirect(`/projects/${projectId}`);
}

export async function editProjectAction(
  projectId: string,
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  const id = await userId();
  try {
    projectId = projectIdSchema.parse(projectId);
    await editProject(id, projectId, {
      name: value(form, "name"),
      description: value(form, "description"),
    });
  } catch (error) {
    if (error instanceof ProjectError && error.status === 404) notFound();
    return stateError(error);
  }
  redirect(`/projects/${projectId}/settings?saved=1`);
}

export async function addMemberAction(
  projectId: string,
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  const id = await userId();
  try {
    projectId = projectIdSchema.parse(projectId);
    await addProjectMember(id, projectId, {
      email: value(form, "email"),
      role: value(form, "role"),
    });
  } catch (error) {
    if (error instanceof ProjectError && error.status === 404) notFound();
    return stateError(error);
  }
  redirect(`/projects/${projectId}/settings?memberAdded=1`);
}

export async function addAreaAction(
  projectId: string,
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  const id = await userId();
  try {
    projectId = projectIdSchema.parse(projectId);
    await addProjectArea(id, projectId, { name: value(form, "name") });
  } catch (error) {
    if (error instanceof ProjectError && error.status === 404) notFound();
    return stateError(error);
  }
  redirect(`/projects/${projectId}/settings?areaAdded=1`);
}

export async function removeAreaAction(
  projectId: string,
  areaId: string,
  _state: FormState,
  _form: FormData,
): Promise<FormState> {
  const id = await userId();
  try {
    projectId = projectIdSchema.parse(projectId);
    areaId = areaIdSchema.parse(areaId);
    await removeProjectArea(id, projectId, areaId);
  } catch (error) {
    if (error instanceof ProjectError && error.status === 404) notFound();
    return stateError(error);
  }
  redirect(`/projects/${projectId}/settings?areaRemoved=1`);
}

export async function archiveProjectAction(
  projectId: string,
): Promise<FormState> {
  const id = await userId();
  try {
    projectId = projectIdSchema.parse(projectId);
    await archiveProject(id, projectId);
  } catch (error) {
    if (error instanceof ProjectError && error.status === 404) notFound();
    return stateError(error);
  }
  redirect(`/projects/${projectId}`);
}

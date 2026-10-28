import { currentUserId, parseJson, responseError } from "@/lib/request";
import { deleteProject, ProjectError } from "@/lib/projects";
import { deleteProjectSchema, projectIdSchema } from "@/lib/validators";

type Context = { params: Promise<{ projectId: string }> };

export async function DELETE(request: Request, context: Context) {
  try {
    const projectId = projectIdSchema.parse((await context.params).projectId);
    const input = await parseJson(request, deleteProjectSchema);
    const userId = await currentUserId();
    await deleteProject(userId, projectId, input);
    return Response.json({ deleted: true });
  } catch (error) {
    if (error instanceof ProjectError)
      return Response.json({ error: error.message }, { status: error.status });
    return responseError(error);
  }
}

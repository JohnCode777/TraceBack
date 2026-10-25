import { editNote } from "@/lib/bugs";
import { projectActor, parseJson, responseError } from "@/lib/request";
import { noteSchema } from "@/lib/validation";

type Context = { params: Promise<{ projectId: string; bugId: string; noteId: string }> };
export async function PATCH(request: Request, context: Context) {
  try {
    const { projectId, bugId, noteId } = await context.params;
    const actor = await projectActor(projectId);
    const input = await parseJson(request, noteSchema);
    return Response.json(await editNote(projectId, bugId, noteId, actor, input));
  } catch (error) { return responseError(error); }
}

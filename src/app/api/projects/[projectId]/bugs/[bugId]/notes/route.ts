import { addNote } from "@/lib/bugs";
import { projectActor, parseJson, responseError } from "@/lib/request";
import { noteSchema } from "@/lib/validation";

type Context = { params: Promise<{ projectId: string; bugId: string }> };
export async function POST(request: Request, context: Context) {
  try {
    const { projectId, bugId } = await context.params;
    const actor = await projectActor(projectId);
    const input = await parseJson(request, noteSchema);
    return Response.json(await addNote(projectId, bugId, actor, input), { status: 201 });
  } catch (error) { return responseError(error); }
}

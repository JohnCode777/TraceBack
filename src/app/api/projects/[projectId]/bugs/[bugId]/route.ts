import { editBug, getBug } from "@/lib/bugs";
import { projectActor, parseJson, responseError } from "@/lib/request";
import { editBugSchema } from "@/lib/validation";

type Context = { params: Promise<{ projectId: string; bugId: string }> };
export async function GET(_request: Request, context: Context) {
  try {
    const { projectId, bugId } = await context.params;
    return Response.json(await getBug(projectId, bugId, await projectActor(projectId)));
  } catch (error) { return responseError(error); }
}
export async function PATCH(request: Request, context: Context) {
  try {
    const { projectId, bugId } = await context.params;
    const actor = await projectActor(projectId);
    const input = await parseJson(request, editBugSchema);
    return Response.json(await editBug(projectId, bugId, actor, input));
  } catch (error) { return responseError(error); }
}

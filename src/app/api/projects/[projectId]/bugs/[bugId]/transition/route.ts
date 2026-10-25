import { transitionBug } from "@/lib/bugs";
import { projectActor, parseJson, responseError } from "@/lib/request";
import { bugParams, transitionSchema } from "@/lib/validation";

type Context = { params: Promise<{ projectId: string; bugId: string }> };
export async function POST(request: Request, context: Context) {
  try {
    const { projectId, bugId } = bugParams.parse(await context.params);
    const actor = await projectActor(projectId);
    const input = await parseJson(request, transitionSchema);
    return Response.json(await transitionBug(projectId, bugId, actor, input));
  } catch (error) {
    return responseError(error);
  }
}

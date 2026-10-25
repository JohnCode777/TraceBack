import { assignBug } from "@/lib/bugs";
import { projectActor, parseJson, responseError } from "@/lib/request";
import { assignSchema, bugParams } from "@/lib/validation";

type Context = { params: Promise<{ projectId: string; bugId: string }> };
export async function POST(request: Request, context: Context) {
  try {
    const { projectId, bugId } = bugParams.parse(await context.params);
    const actor = await projectActor(projectId);
    const input = await parseJson(request, assignSchema);
    return Response.json(
      await assignBug(projectId, bugId, actor, input.assigneeId),
    );
  } catch (error) {
    return responseError(error);
  }
}

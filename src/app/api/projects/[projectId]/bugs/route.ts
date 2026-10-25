import { createBug, listBugs } from "@/lib/bugs";
import { projectActor, parseJson, responseError } from "@/lib/request";
import { createBugSchema, listSchema, projectParams } from "@/lib/validation";

type Context = { params: Promise<{ projectId: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const { projectId } = projectParams.parse(await context.params);
    const actor = await projectActor(projectId);
    const query = listSchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    return Response.json(await listBugs(projectId, actor, query));
  } catch (error) {
    return responseError(error);
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const { projectId } = projectParams.parse(await context.params);
    const actor = await projectActor(projectId);
    const input = await parseJson(request, createBugSchema);
    return Response.json(await createBug(projectId, actor, input), {
      status: 201,
    });
  } catch (error) {
    return responseError(error);
  }
}

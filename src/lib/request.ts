import { ZodError, type ZodType } from "zod";
import { auth } from "./auth";
import { db } from "./db";
import { AppError, errorResponse } from "./errors";
import { requireMember } from "./policy";

export async function currentUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new AppError("Sign in required", 401);
  return session.user.id;
}

export async function projectActor(projectId: string) {
  const userId = await currentUserId();
  const membership = await db.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  return requireMember(membership?.role, userId);
}

export async function parseJson<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<T> {
  return schema.parse(await request.json());
}

export function responseError(error: unknown) {
  if (error instanceof ZodError || error instanceof SyntaxError)
    return Response.json(
      {
        error: "Invalid input",
        details: error instanceof ZodError ? error.issues : undefined,
      },
      { status: 400 },
    );
  return errorResponse(error);
}

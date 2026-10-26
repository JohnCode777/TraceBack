import { ZodError, type ZodType } from "zod";
import { auth } from "../auth";
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
  // Cookie-authenticated API writes must come from this exact origin. Requiring
  // JSON also prevents a cross-site HTML form from sending a valid payload.
  const origin = request.headers.get("origin");
  const site = request.headers.get("sec-fetch-site");
  if (
    (origin !== null && origin !== new URL(request.url).origin) ||
    (site !== null && site !== "same-origin") ||
    (origin === null && site === null)
  )
    throw new AppError("Invalid request origin", 403);
  if (
    request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !==
    "application/json"
  )
    throw new AppError("Expected application/json", 415);
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > 262_144) throw new AppError("Request too large", 413);
  const body = await request.text();
  if (body.length > 262_144) throw new AppError("Request too large", 413);
  return schema.parse(JSON.parse(body));
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

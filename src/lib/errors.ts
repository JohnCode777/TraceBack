export class AppError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

export function errorResponse(error: unknown): Response {
  if (error instanceof AppError)
    return Response.json({ error: error.message }, { status: error.status });
  console.error(error);
  return Response.json({ error: "Internal server error" }, { status: 500 });
}

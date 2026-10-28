import { getBug } from "@/lib/bugs";
import { generateReport } from "@/lib/report";
import { AppError } from "@/lib/errors";
import { can } from "@/lib/policy";
import { projectActor, responseError } from "@/lib/request";
import { bugParams } from "@/lib/validation";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string; bugId: string }> },
) {
  try {
    const { projectId, bugId } = bugParams.parse(await context.params);
    const actor = await projectActor(projectId);
    if (!can(actor.role, "downloadReport"))
      throw new AppError("Forbidden", 403);
    const bug = await getBug(projectId, bugId, actor);
    const generator = await db.user.findUnique({
      where: { id: actor.id },
      select: { name: true },
    });
    const pdf = await generateReport({
      ...bug,
      bugId: `${bug.project.key}-${bug.number}`,
      projectName: bug.project.name,
      reporterName: bug.reporter.name,
      generatedAt: new Date(),
      generatedBy: generator?.name ?? "Unknown user",
      notes: bug.notes.map((note) => ({ ...note, author: note.author.name })),
      history: bug.statusChanges.map((change) => ({
        ...change,
        actor: change.actor.name,
      })),
      verificationAttempts: bug.verificationAttempts.map((attempt) => ({
        ...attempt,
        verifierName: attempt.verifier.name,
      })),
    });
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${bug.project.key}-${bug.number}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return responseError(error);
  }
}

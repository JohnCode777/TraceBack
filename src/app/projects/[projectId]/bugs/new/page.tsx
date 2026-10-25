import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { projectActor } from "@/lib/request";
import { BugForm } from "@/components/bug-form";

export default async function NewBugPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  try {
    await projectActor(projectId);
  } catch {
    notFound();
  }
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: { areas: true },
  });
  if (!project) notFound();
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-3xl font-bold">Report a bug in {project.name}</h1>
      <BugForm projectId={projectId} areas={project.areas} />
    </main>
  );
}

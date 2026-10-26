import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { projectActor } from "@/lib/request";
import { BugForm } from "@/components/bug-form";

export default async function NewBugPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = await params;
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
      <p className="mt-2">
        <Link className="text-blue-700 underline" href="/help/reporting">
          Tips for a good bug report
        </Link>
      </p>
      <BugForm projectId={projectId} areas={project.areas} />
    </main>
  );
}

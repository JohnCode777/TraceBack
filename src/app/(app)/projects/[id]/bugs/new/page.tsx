import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { projectActor } from "@/lib/request";
import { BugForm } from "@/components/bug-form";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "New bug" };

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
    <div className="space-y-2">
      <p className="eyebrow">New report</p>
      <h1 className="text-3xl font-bold">Report a bug in {project.name}</h1>
      <p className="muted text-sm">
        Good reports make the path to a fix easier to follow.
      </p>
      <p className="pt-2">
        <Link
          className="accent-text text-sm font-semibold underline"
          href="/help/reporting"
        >
          Tips for a good bug report
        </Link>
      </p>
      <BugForm projectId={projectId} areas={project.areas} />
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { logoutAction } from "@/app/actions";
import { listProjects } from "@/lib/projects";
import { ProjectSwitcher } from "@/components/project-switcher";
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const projects = await listProjects(session.user.id);
  return (
    <div className="min-h-screen">
      <header className="border-b bg-white">
        <nav
          aria-label="Main navigation"
          className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4"
        >
          <Link href="/projects" className="text-xl font-bold">
            TraceBack
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <ProjectSwitcher projects={projects} />
            <Link className="text-blue-700 underline" href="/projects">
              Projects
            </Link>
            <Link className="text-blue-700 underline" href="/dashboard">
              Dashboard
            </Link>
            <Link className="text-blue-700 underline" href="/help/reporting">
              Reporting help
            </Link>
            <Link className="text-blue-700 underline" href="/projects/new">
              New project
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600">{session.user.name}</span>
            <form action={logoutAction}>
              <button className="button-secondary" type="submit">
                Sign out
              </button>
            </form>
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">{children}</main>
    </div>
  );
}

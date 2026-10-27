import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { logoutAction } from "@/app/actions";
import { listProjects } from "@/lib/projects";
import { ProjectSwitcher } from "@/components/project-switcher";
import { ShellNav } from "@/components/shell-nav";
import { Avatar, Icon } from "@/components/ui";
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const projects = await listProjects(session.user.id);
  return (
    <div className="min-h-screen lg:flex">
      <aside className="bg-[#17193d] text-white lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:py-8">
        <Link
          href="/projects"
          className="flex items-center gap-3 px-8 py-5 text-xl font-extrabold tracking-tight lg:mb-10 lg:py-0"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-400 to-indigo-600">
            <Icon name="bug" />
          </span>
          TraceBack
        </Link>
        <p className="hidden px-8 pb-3 text-xs font-bold uppercase tracking-[.2em] text-indigo-300 lg:block">
          Workspace
        </p>
        <ShellNav />
        <div className="hidden px-8 pt-10 text-xs leading-6 text-indigo-300 lg:block">
          Capture clearly.
          <br />
          Resolve confidently.
        </div>
      </aside>
      <div className="min-w-0 flex-1 lg:ml-64">
        <header
          className="border-b thin-divider"
          style={{ background: "var(--surface)" }}
        >
          <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-5 py-4 lg:px-10">
            <ProjectSwitcher projects={projects} />
            <div className="flex items-center gap-3">
              <Avatar name={session.user.name ?? "User"} />
              <span className="hidden text-sm font-semibold sm:inline">
                {session.user.name}
              </span>
              <form action={logoutAction}>
                <button className="button-secondary" type="submit">
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1440px] space-y-6 px-5 py-8 lg:px-10 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}

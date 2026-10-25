import { auth, signOut } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";

export default async function Home() {
  const session = await auth();
  const projects = session?.user?.id
    ? await db.projectMember.findMany({
        where: { userId: session.user.id },
        include: { project: true },
      })
    : [];
  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-3xl font-bold">TraceBack</h1>
      {!session?.user ? (
        <Link href="/login" className="mt-4 block underline">
          Sign in
        </Link>
      ) : (
        <>
          <p className="mt-4">Signed in as {session.user.name}</p>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button className="underline">Sign out</button>
          </form>
          <h2 className="mt-6 text-xl font-semibold">Your projects</h2>
          {projects.length === 0 ? (
            <p>No projects available.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {projects.map(({ project, role }) => (
                <li key={project.id}>
                  <Link
                    className="underline"
                    href={`/projects/${project.id}/bugs`}
                  >
                    {project.name}
                  </Link>{" "}
                  ({role})
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  );
}

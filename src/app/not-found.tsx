import Link from "next/link";
export default function NotFound() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-12">
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p>This project may not exist or you may not have access.</p>
      <Link className="text-blue-700 underline" href="/projects">
        Back to projects
      </Link>
    </main>
  );
}

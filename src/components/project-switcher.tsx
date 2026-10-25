"use client";
import { usePathname, useRouter } from "next/navigation";
export function ProjectSwitcher({
  projects,
}: {
  projects: { id: string; name: string; key: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const current = projects.find((project) =>
    pathname.startsWith(`/projects/${project.id}`),
  );
  return (
    <label className="flex items-center gap-2">
      Project
      <select
        aria-label="Switch project"
        value={current?.id ?? ""}
        onChange={(event) =>
          router.push(
            event.target.value
              ? `/projects/${event.target.value}`
              : "/projects",
          )
        }
      >
        <option value="">All projects</option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.key} · {project.name}
          </option>
        ))}
      </select>
    </label>
  );
}

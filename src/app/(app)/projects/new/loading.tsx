import { Skeleton } from "@/components/ui";
export default function Loading() {
  return (
    <div
      className="card max-w-xl space-y-6"
      role="status"
      aria-label="Loading project form"
    >
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-28 w-full" />
    </div>
  );
}

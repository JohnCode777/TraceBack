import { Skeleton } from "@/components/ui";
export default function Loading() {
  return (
    <div role="status" aria-label="Loading dashboard" className="space-y-6">
      <Skeleton className="h-44 w-full" />
      <div className="grid gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-40 w-full" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    </div>
  );
}

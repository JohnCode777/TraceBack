import { Skeleton } from "@/components/ui";
export default function Loading() {
  return (
    <div role="status" aria-label="Loading bugs" className="space-y-6">
      <Skeleton className="h-12 w-72" />
      <Skeleton className="h-48 w-full" />
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} className="h-44 w-full" />
      ))}
    </div>
  );
}

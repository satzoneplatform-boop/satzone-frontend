import { Skeleton } from '@/components/ui/Skeleton';

/**
 * Loading placeholder shaped like a result card. Rendered in a grid while the
 * CMS data loads so the section keeps its height and feels instant.
 */
export function ResultCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="space-y-4 p-6">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex gap-3 pt-2">
          <Skeleton className="h-14 flex-1 rounded-xl" />
          <Skeleton className="h-14 flex-1 rounded-xl" />
        </div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
      </div>
    </div>
  );
}

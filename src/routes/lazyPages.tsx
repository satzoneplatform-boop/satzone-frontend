import { lazy, Suspense } from 'react';
import { Spinner } from '@/components/ui/Spinner';

// Lazy-load the lesson player so hls.js is only fetched when a learner opens a video.
const LessonPlayerPage = lazy(() =>
  import('@/pages/learning/LessonPlayerPage').then((m) => ({
    default: m.LessonPlayerPage,
  })),
);

export function LazyLessonPlayerPage() {
  return (
    <Suspense
      fallback={
        <div className="grid place-items-center py-24">
          <Spinner size="lg" />
        </div>
      }
    >
      <LessonPlayerPage />
    </Suspense>
  );
}

// Dev-only local results editor. The whole declaration is guarded by
// import.meta.env.DEV so production builds drop the page and its chunk —
// the /admin/results route is likewise only registered in dev (router.tsx).
const ResultsAdminPage = import.meta.env.DEV
  ? lazy(() =>
      import('@/pages/admin/ResultsAdminPage').then((m) => ({
        default: m.ResultsAdminPage,
      })),
    )
  : null;

export function LazyResultsAdminPage() {
  if (!ResultsAdminPage) return null;
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center">
          <Spinner size="lg" />
        </div>
      }
    >
      <ResultsAdminPage />
    </Suspense>
  );
}

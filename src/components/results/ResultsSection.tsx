import { useQuery } from '@tanstack/react-query';
import { Reveal } from '@/components/motion/Reveal';
import { Stagger, StaggerItem } from '@/components/motion/Stagger';
import { Button } from '@/components/ui/Button';
import { resultsApi } from '@/api/results';
import type { MathResult, UniversityResult } from '@/features/results/types';
import { useT } from '@/i18n/I18nProvider';
import { UniversitySpotlight } from './UniversitySpotlight';
import { MathImprovementCard } from './MathImprovementCard';
import { ResultCardSkeleton } from './ResultCardSkeleton';

/**
 * Public "Results" section on the landing page. Both CMS-managed categories
 * are shown stacked — a large University Acceptances spotlight first, then the
 * SAT Math Improvements grid — with loading skeletons and graceful
 * empty/error states per category. Data comes live from the Results CMS, so
 * admins change what shows here without any code edits.
 */
export function ResultsSection() {
  const t = useT();

  const university = useQuery({
    queryKey: ['results', 'university'],
    queryFn: () => resultsApi.listPublished('university'),
    staleTime: 60_000,
  });
  const math = useQuery({
    queryKey: ['results', 'math'],
    queryFn: () => resultsApi.listPublished('math'),
    staleTime: 60_000,
  });

  return (
    <section id="results" className="relative overflow-hidden py-24 text-white">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-300">
            {t('landing.results.eyebrow')}
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            {t('landing.results.title')}
          </h2>
          <p className="mt-4 text-base text-white/60">{t('landing.results.subtitle')}</p>
        </Reveal>

        {/* University acceptances — featured spotlight */}
        <Reveal className="mt-14">
          <SubHeading>{t('landing.results.university.title')}</SubHeading>
          {university.isLoading ? (
            <div className="mx-auto max-w-4xl">
              <ResultCardSkeleton />
            </div>
          ) : university.isError ? (
            <ErrorBlock message={t('landing.results.error')} onRetry={() => university.refetch()} retryLabel={t('landing.results.retry')} />
          ) : (university.data?.length ?? 0) === 0 ? (
            <EmptyBlock message={t('landing.results.empty')} />
          ) : (
            <UniversitySpotlight results={university.data as UniversityResult[]} />
          )}
        </Reveal>

        {/* SAT Math improvements — grid */}
        <Reveal className="mt-20">
          <SubHeading>{t('landing.results.math.title')}</SubHeading>
          {math.isLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <ResultCardSkeleton key={i} />
              ))}
            </div>
          ) : math.isError ? (
            <ErrorBlock message={t('landing.results.error')} onRetry={() => math.refetch()} retryLabel={t('landing.results.retry')} />
          ) : (math.data?.length ?? 0) === 0 ? (
            <EmptyBlock message={t('landing.results.empty')} />
          ) : (
            <Stagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" stagger={0.09}>
              {math.data!.map((result) => (
                <StaggerItem key={result.id} className="h-full">
                  <MathImprovementCard result={result as MathResult} />
                </StaggerItem>
              ))}
            </Stagger>
          )}
        </Reveal>
      </div>
    </section>
  );
}

/** Centered sub-section heading with short flanking hairlines. */
function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-8 flex items-center justify-center gap-4">
      <span className="h-px w-10 bg-white/15 sm:w-16" aria-hidden />
      <h3 className="text-center text-xl font-bold tracking-tight text-white sm:text-2xl">
        {children}
      </h3>
      <span className="h-px w-10 bg-white/15 sm:w-16" aria-hidden />
    </div>
  );
}

function ErrorBlock({ message, onRetry, retryLabel }: { message: string; onRetry: () => void; retryLabel: string }) {
  return (
    <StateBlock>
      <p className="text-sm text-white/55">{message}</p>
      <Button size="sm" variant="secondary" className="mt-4" onClick={onRetry}>
        {retryLabel}
      </Button>
    </StateBlock>
  );
}

function EmptyBlock({ message }: { message: string }) {
  return (
    <StateBlock>
      <p className="text-sm text-white/55">{message}</p>
    </StateBlock>
  );
}

function StateBlock({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid place-items-center rounded-3xl border border-dashed border-white/15 bg-white/[0.03] px-6 py-20 text-center">
      <div>{children}</div>
    </div>
  );
}

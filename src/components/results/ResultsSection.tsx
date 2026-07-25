import { Reveal } from '@/components/motion/Reveal';
import { Stagger, StaggerItem } from '@/components/motion/Stagger';
import { mathResults, universityResults } from '@/content/results';
import { useT } from '@/i18n/I18nProvider';
import { UniversitySpotlight } from './UniversitySpotlight';
import { MathImprovementCard } from './MathImprovementCard';

/**
 * Public "Results" section on the landing page. Both categories are shown
 * stacked — a large University Acceptances spotlight first, then the SAT Math
 * Improvements grid. Content is checked into the repo (src/content/results)
 * and ships inside the bundle, so there is no fetch and no failure state —
 * only an empty state per category while new entries are on the way.
 */
export function ResultsSection() {
  const t = useT();

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
          {universityResults.length === 0 ? (
            <EmptyBlock message={t('landing.results.empty')} />
          ) : (
            <UniversitySpotlight results={universityResults} />
          )}
        </Reveal>

        {/* SAT Math improvements — grid */}
        <Reveal className="mt-20">
          <SubHeading>{t('landing.results.math.title')}</SubHeading>
          {mathResults.length === 0 ? (
            <EmptyBlock message={t('landing.results.empty')} />
          ) : (
            <Stagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" stagger={0.09}>
              {mathResults.map((result) => (
                <StaggerItem key={result.id} className="h-full">
                  <MathImprovementCard result={result} />
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

function EmptyBlock({ message }: { message: string }) {
  return (
    <div className="grid place-items-center rounded-3xl border border-dashed border-white/15 bg-white/[0.03] px-6 py-20 text-center">
      <p className="text-sm text-white/55">{message}</p>
    </div>
  );
}

import type { CSSProperties, ReactNode } from 'react';
import { useReducedMotion } from 'motion/react';
import { Reveal } from '@/components/motion/Reveal';
import { CountUp } from '@/components/motion/CountUp';
import { mathResults, universityResults } from '@/content/results';
import type { MathResult, UniversityResult } from '@/features/results/types';
import { useT } from '@/i18n/I18nProvider';
import { ResultPhoto } from './ResultPhoto';

/**
 * Public "Results" section on the landing page. Aggregate proof first — top
 * scores and acceptance count computed live from the repo content — then two
 * autonomous carousels: acceptance/top-score stories (with photos) and
 * single SAT Math scores (name + score, optional certificate image; students
 * sat the test once, so there is no before/after). Content is checked into
 * the repo (src/content/results) and ships inside the bundle — no fetch, no
 * failure state, only an empty state per category.
 */
export function ResultsSection() {
  const t = useT();

  const topOverall = universityResults.length
    ? Math.max(...universityResults.map((r) => r.overallScore))
    : 0;
  const acceptances = universityResults.filter((r) => r.universityName).length;
  const topMath = mathResults.length ? Math.max(...mathResults.map((r) => r.mathScore)) : 0;

  const stats = [
    topOverall > 0 && { to: topOverall, label: t('landing.results.stat.topSat') },
    topMath > 0 && { to: topMath, label: t('landing.results.stat.topMath') },
    acceptances > 0 && { to: acceptances, label: t('landing.results.stat.acceptances') },
  ].filter(Boolean) as { to: number; label: string }[];

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

        {/* Aggregate proof, straight from the data */}
        {stats.length > 0 && (
          <Reveal className="mx-auto mt-12 grid max-w-3xl grid-cols-1 gap-8 text-center sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-white/10">
            {stats.map((s) => (
              <div key={s.label} className="px-4">
                <p className="text-4xl font-extrabold tracking-tight sm:text-5xl">
                  <CountUp to={s.to} />
                </p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.1em] text-white/40">
                  {s.label}
                </p>
              </div>
            ))}
          </Reveal>
        )}

        {/* Acceptances & top scores — autonomous carousel */}
        <Reveal className="mt-16">
          <SubHeading>{t('landing.results.university.title')}</SubHeading>
          {universityResults.length === 0 ? (
            <EmptyBlock message={t('landing.results.empty')} />
          ) : (
            <Marquee itemCount={universityResults.length} secondsPerItem={6}>
              {fill(universityResults, 6).map((result, i) => (
                <UniversityCard key={`${result.id}-${i}`} result={result} />
              ))}
            </Marquee>
          )}
        </Reveal>

        {/* SAT Math scores — autonomous carousel (opposite drift) */}
        <Reveal className="mt-16">
          <SubHeading>{t('landing.results.math.title')}</SubHeading>
          {mathResults.length === 0 ? (
            <EmptyBlock message={t('landing.results.empty')} />
          ) : (
            <Marquee itemCount={mathResults.length} secondsPerItem={5} reverse>
              {fill(mathResults, 8).map((result, i) => (
                <MathCard key={`${result.id}-${i}`} result={result} />
              ))}
            </Marquee>
          )}
        </Reveal>
      </div>
    </section>
  );
}

/** Repeat short lists so the carousel loop never shows a gap. */
function fill<T>(items: T[], min: number): T[] {
  if (items.length === 0) return items;
  const out = [...items];
  while (out.length < min) out.push(items[out.length % items.length]);
  return out;
}

/**
 * Endlessly drifting row: two identical halves, CSS-animated to -50% for a
 * seamless loop. Pauses on hover; under reduced motion it becomes a plain
 * scrollable row instead.
 */
function Marquee({
  children,
  itemCount,
  secondsPerItem,
  reverse = false,
}: {
  children: ReactNode;
  itemCount: number;
  secondsPerItem: number;
  reverse?: boolean;
}) {
  const reduce = useReducedMotion();
  if (reduce) {
    return <div className="flex gap-5 overflow-x-auto pb-3">{children}</div>;
  }
  return (
    <div className="lp-results-marquee">
      <div
        className="lp-results-track"
        style={
          {
            '--dur': `${Math.max(itemCount, 6) * secondsPerItem}s`,
            animationDirection: reverse ? 'reverse' : undefined,
          } as CSSProperties
        }
      >
        <div className="flex shrink-0 gap-5 pr-5">{children}</div>
        <div className="flex shrink-0 gap-5 pr-5" aria-hidden>
          {children}
        </div>
      </div>
    </div>
  );
}

/** Acceptance story — or, with no university set, a standalone top score. */
function UniversityCard({ result }: { result: UniversityResult }) {
  const t = useT();
  return (
    <figure className="w-80 shrink-0 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur">
      <div className="relative">
        <ResultPhoto
          src={result.photoUrl}
          alt={t('landing.results.photoAlt', { name: result.studentName })}
          className="aspect-[4/3] w-full"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-navy-900/75 to-transparent" />
        <figcaption className="absolute inset-x-4 bottom-3 flex items-baseline justify-between gap-2 text-white">
          <span className="truncate text-base font-bold drop-shadow-sm">{result.studentName}</span>
          <span className="shrink-0 text-xs font-semibold text-white/70">{result.country}</span>
        </figcaption>
      </div>

      <div className="flex items-center gap-3 p-5">
        {result.universityLogoUrl ? (
          <img
            src={result.universityLogoUrl}
            alt=""
            loading="lazy"
            onError={(e) => (e.currentTarget.style.display = 'none')}
            className="size-11 shrink-0 rounded-xl bg-white/5 object-contain p-1"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          {result.universityName ? (
            <>
              <p className="truncate text-sm font-semibold">{result.universityName}</p>
              {result.acceptanceStatus && (
                <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-accent-400">
                  {result.acceptanceStatus}
                </p>
              )}
            </>
          ) : (
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-accent-400">
              {t('landing.results.highScore')}
            </p>
          )}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-2xl font-extrabold tabular-nums tracking-tight">{result.overallScore}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">
            {t('landing.results.overall')}
          </p>
        </div>
      </div>
    </figure>
  );
}

/** Single Math score: name + score, optionally the certificate image. */
function MathCard({ result }: { result: MathResult }) {
  const t = useT();
  return (
    <figure className="w-64 shrink-0 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur">
      {result.certificateUrl && (
        <img
          src={result.certificateUrl}
          alt=""
          loading="lazy"
          onError={(e) => (e.currentTarget.style.display = 'none')}
          className="aspect-[4/3] w-full border-b border-white/10 object-cover"
        />
      )}
      <div className="flex items-center justify-between gap-3 p-5">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{result.studentName}</p>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">
            {t('landing.results.mathLabel')}
          </p>
        </div>
        <p className="shrink-0 bg-gradient-to-br from-brand-300 to-accent-400 bg-clip-text text-3xl font-extrabold tabular-nums tracking-tight text-transparent">
          {result.mathScore}
        </p>
      </div>
    </figure>
  );
}

/** Centered sub-section heading with short flanking hairlines. */
function SubHeading({ children }: { children: ReactNode }) {
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

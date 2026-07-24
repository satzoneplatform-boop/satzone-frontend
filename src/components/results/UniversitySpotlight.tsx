import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { CountUp } from '@/components/motion/CountUp';
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons';
import { cn } from '@/lib/cn';
import { useT } from '@/i18n/I18nProvider';
import type { UniversityResult } from '@/features/results/types';
import { ResultPhoto } from './ResultPhoto';

/** Small graduation-cap glyph (no matching icon exists in the shared set). */
function CapIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M12 4 2 9l10 5 10-5-10-5Z" />
      <path d="M6 11v4c0 1.1 2.7 2.5 6 2.5s6-1.4 6-2.5v-4" />
      <path d="M22 9v5" />
    </svg>
  );
}

/**
 * Featured "university acceptance" showcase — one big story at a time instead
 * of a grid of small cards. A scrollable strip of student avatars selects the
 * spotlight; the stage pairs a large photo with a prominent university logo,
 * the overall SAT score, and the student's quote. Prev/next arrows page
 * through stories with a soft crossfade.
 */
export function UniversitySpotlight({ results }: { results: UniversityResult[] }) {
  const t = useT();
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const stripRef = useRef<HTMLDivElement>(null);

  const count = results.length;
  const active = results[Math.min(index, count - 1)];

  // Keep the selected avatar visible when paging with the arrows.
  useEffect(() => {
    const strip = stripRef.current;
    const el = strip?.children[index] as HTMLElement | undefined;
    el?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', inline: 'center', block: 'nearest' });
  }, [index, reduce]);

  if (!active) return null;

  const go = (delta: number) => setIndex((i) => (i + delta + count) % count);

  return (
    <div>
      {/* Avatar strip */}
      <div
        ref={stripRef}
        className="scrollbar-none -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 pt-1 sm:justify-center"
        role="tablist"
        aria-label={t('landing.results.university.title')}
      >
        {results.map((r, i) => (
          <button
            key={r.id}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={t('landing.results.photoAlt', { name: r.studentName })}
            onClick={() => setIndex(i)}
            className={cn(
              'relative size-14 shrink-0 overflow-hidden rounded-full border-2 transition-all duration-300 sm:size-16',
              i === index
                ? 'border-brand-500 shadow-[0_0_0_3px_rgb(31_168_248/0.2)]'
                : 'border-transparent opacity-70 hover:opacity-100',
            )}
          >
            <ResultPhoto
              src={r.photoUrl}
              alt=""
              className="h-full w-full rounded-full"
            />
          </button>
        ))}
      </div>

      {/* Spotlight stage */}
      <div className="lp-card mt-6 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] shadow-[0_28px_70px_-30px_rgb(2_6_23/0.8)] backdrop-blur">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={active.id}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="grid md:grid-cols-2"
          >
            {/* Big, clear photo — absolutely positioned on desktop so the
                story panel (not the image's intrinsic size) sets card height. */}
            <figure className="relative md:min-h-[520px]">
              <ResultPhoto
                src={active.photoUrl}
                alt={t('landing.results.photoAlt', { name: active.studentName })}
                className="aspect-[4/3] w-full md:absolute md:inset-0 md:aspect-auto md:h-full"
              />
              <figcaption className="absolute inset-x-4 bottom-4 flex items-baseline justify-between gap-3 rounded-2xl border border-white/10 bg-navy-900/85 px-4 py-3 shadow-[var(--shadow-dropdown)] backdrop-blur">
                <span className="truncate text-lg font-bold text-white">{active.studentName}</span>
                <span className="shrink-0 text-sm font-semibold text-white/50">{active.country}</span>
              </figcaption>
            </figure>

            {/* Story panel. University details are optional — a strong score
                can be showcased before any acceptance comes in. */}
            <div className="flex flex-col p-6 sm:p-10 md:text-center">
              {active.acceptanceStatus && (
                <p className="mb-6 text-xs font-semibold uppercase tracking-[0.2em] text-brand-300">
                  {active.acceptanceStatus}
                </p>
              )}

              {(active.universityName || active.universityLogoUrl) && (
                <>
                  <div className="flex flex-col items-start gap-3 md:items-center">
                    {active.universityLogoUrl ? (
                      <img
                        src={active.universityLogoUrl}
                        alt=""
                        className="h-16 w-auto max-w-[260px] object-contain sm:h-20"
                        loading="lazy"
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                      />
                    ) : (
                      <span className="grid size-16 place-items-center rounded-2xl bg-brand-500/15 text-brand-300 sm:size-20">
                        <CapIcon className="size-9" />
                      </span>
                    )}
                    {active.universityName && (
                      <p className="text-xl font-bold text-white">{active.universityName}</p>
                    )}
                  </div>

                  <hr className="my-6 border-white/10 sm:my-8" />
                </>
              )}

              <div className="grid grid-cols-2 divide-x divide-white/10">
                <div className="pr-4">
                  <p className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
                    <CountUp to={active.overallScore} />
                  </p>
                  <p className="mt-1.5 text-xs font-semibold uppercase tracking-wide text-white/50">
                    {t('landing.results.overall')}
                  </p>
                </div>
                <div className="flex flex-col justify-center pl-4">
                  <p className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                    {active.country}
                  </p>
                  <p className="mt-1.5 text-xs font-semibold uppercase tracking-wide text-white/50">
                    {t('landing.results.country')}
                  </p>
                </div>
              </div>

              {active.testimonial && (
                <blockquote className="mt-6 border-l-2 border-brand-400 pl-4 text-left text-base italic leading-relaxed text-white/70 sm:mt-8 md:mx-auto md:max-w-md">
                  “{active.testimonial}”
                </blockquote>
              )}

              {count > 1 && (
                <div className="mt-8 flex items-center justify-between gap-4 pt-2 md:mt-auto">
                  <p className="text-sm font-medium tabular-nums text-white/40">
                    {index + 1} / {count}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => go(-1)}
                      aria-label={t('landing.results.prev')}
                      className="grid size-11 place-items-center rounded-full border border-white/15 text-white/70 transition-colors hover:border-accent-400/50 hover:bg-white/10 hover:text-white"
                    >
                      <ChevronLeftIcon className="size-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => go(1)}
                      aria-label={t('landing.results.next')}
                      className="grid size-11 place-items-center rounded-full border border-white/15 text-white/70 transition-colors hover:border-accent-400/50 hover:bg-white/10 hover:text-white"
                    >
                      <ChevronRightIcon className="size-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

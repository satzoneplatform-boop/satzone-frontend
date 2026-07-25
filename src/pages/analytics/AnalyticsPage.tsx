import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { Reveal } from '@/components/motion/Reveal';
import { Stagger, StaggerItem } from '@/components/motion/Stagger';
import { ArrowRightIcon, ClockIcon, FlagIcon } from '@/components/icons';
import { useHomeFeed, useWeeklyActivity } from '@/features/home/hooks';
import { useT } from '@/i18n/I18nProvider';

/**
 * Analytics / progress dashboard.
 *
 * Only renders data the backend actually exposes:
 * - Weekly study activity from GET /me/activity/weekly.
 * - Course completions from the home feed (GET /home).
 * There is no student-facing scoring/analytics API, so score projections,
 * subject breakdowns, accuracy trends, etc. are intentionally not shown.
 */

export function AnalyticsPage() {
  const t = useT();
  const home = useHomeFeed();

  const enrollments = home.data?.continue_learning ?? [];
  const coursesCompleted = enrollments.filter((e) => e.completed_at).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Reveal onView={false}>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-900">
            {t('analytics.title')}
          </h1>
          <p className="mt-1 text-sm text-ink-500">{t('analytics.subtitle')}</p>
        </div>
      </Reveal>

      {/* This week — real study activity */}
      <Reveal>
        <ThisWeekCard coursesCompleted={coursesCompleted} homeReady={!home.isLoading} />
      </Reveal>

      {/* Recommended next actions — generic, truthful suggestions */}
      <section>
        <SectionHeader
          icon={<FlagIcon className="size-4" />}
          title={t('analytics.nextActions')}
        />
        <Stagger className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3" stagger={0.08}>
          <StaggerItem className="h-full">
            <ActionCard
              to="/quizzes"
              title={t('analytics.action.practice.title')}
              body={t('analytics.action.practice.body')}
              cta={t('analytics.action.practice.cta')}
            />
          </StaggerItem>
          <StaggerItem className="h-full">
            <ActionCard
              to="/explore"
              title={t('analytics.action.course.title')}
              body={t('analytics.action.course.body')}
              cta={t('analytics.action.course.cta')}
            />
          </StaggerItem>
          <StaggerItem className="h-full">
            <ActionCard
              to="/learning-path"
              title={
                coursesCompleted > 0
                  ? t('analytics.action.keepGoing.title')
                  : t('analytics.action.mock.title')
              }
              body={t('analytics.action.mock.body')}
              cta={t('analytics.action.mock.cta')}
            />
          </StaggerItem>
        </Stagger>
      </section>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * Real weekly study activity — GET /me/activity/weekly via the existing
 * `useWeeklyActivity()` hook. Truthful loading / error / zero states.
 */
function ThisWeekCard({
  coursesCompleted,
  homeReady,
}: {
  coursesCompleted: number;
  homeReady: boolean;
}) {
  const t = useT();
  const activity = useWeeklyActivity();

  const studiedMinutes = activity.data?.minutes_learned_total ?? 0;
  const goal = activity.data?.weekly_goal_minutes ?? 0;
  const activeDays = (activity.data?.days ?? []).filter((d) => d.minutes_learned > 0).length;
  const hours = Math.floor(studiedMinutes / 60);
  const mins = studiedMinutes % 60;

  return (
    <section className="rounded-2xl border border-ink-200 bg-white p-6 shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-lg bg-brand-50 text-brand-600">
            <ClockIcon className="size-4" />
          </span>
          <h2 className="text-base font-semibold text-navy-900">{t('analytics.thisWeekTitle')}</h2>
        </div>
        <p className="text-xs text-ink-500">{t('analytics.thisWeekHint')}</p>
      </div>

      {activity.isLoading ? (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : activity.error ? (
        <div className="mt-5 flex flex-col items-start gap-3">
          <p className="text-sm text-danger-600">{t('analytics.thisWeekError')}</p>
          <Button variant="outline" size="sm" onClick={() => void activity.refetch()}>
            {t('analytics.retry')}
          </Button>
        </div>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <RealStat
              label={t('analytics.studied')}
              value={t('analytics.hoursMinutes', { h: hours, m: mins })}
            />
            <RealStat label={t('analytics.activeDays')} value={`${activeDays}/7`} />
            <RealStat
              label={t('analytics.coursesCompleted')}
              value={homeReady ? String(coursesCompleted) : '—'}
            />
          </div>

          <div className="mt-5">
            {goal > 0 ? (
              <>
                <div className="mb-1.5 flex items-center justify-between text-xs text-ink-500">
                  <span>{t('analytics.goalProgress', { done: studiedMinutes, goal })}</span>
                  <span className="font-medium text-navy-900">
                    {Math.min(100, Math.round((studiedMinutes / goal) * 100))}%
                  </span>
                </div>
                <ProgressBar value={studiedMinutes} max={goal} />
              </>
            ) : (
              <p className="text-xs text-ink-400">{t('analytics.noGoal')}</p>
            )}
          </div>

          {studiedMinutes === 0 && (
            <p className="mt-4 rounded-xl border border-dashed border-ink-300 bg-ink-50/50 px-4 py-3 text-sm text-ink-500">
              {t('analytics.thisWeekEmpty')}{' '}
              <Link to="/dashboard" className="font-medium text-brand-600 hover:underline">
                {t('analytics.action.mock.cta')}
              </Link>
            </p>
          )}
        </>
      )}
    </section>
  );
}

function RealStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-ink-100 bg-ink-50/50 p-3">
      <p className="text-xs text-ink-500">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums text-navy-900">{value}</p>
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  hint,
}: {
  icon: ReactNode;
  title: string;
  hint?: string;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="grid size-7 place-items-center rounded-lg bg-brand-50 text-brand-600">
          {icon}
        </span>
        <h2 className="text-base font-semibold text-navy-900">{title}</h2>
      </div>
      {hint && <p className="ml-9 mt-0.5 text-xs text-ink-500">{hint}</p>}
    </div>
  );
}

function ActionCard({
  to,
  title,
  body,
  cta,
}: {
  to: string;
  title: string;
  body: string;
  cta: string;
}) {
  const reduce = useReducedMotion();
  return (
    <Link to={to} className="block h-full">
      <motion.div
        whileHover={reduce ? undefined : { y: -4 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        className="flex h-full flex-col rounded-2xl border border-ink-200 bg-white p-5 shadow-[var(--shadow-card)] transition-shadow hover:border-brand-200 hover:shadow-[var(--shadow-card-hover)]"
      >
        <h3 className="text-base font-semibold text-navy-900">{title}</h3>
        <p className="mt-1.5 flex-1 text-sm leading-relaxed text-ink-500">{body}</p>
        <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600">
          {cta}
          <ArrowRightIcon className="size-4" />
        </span>
      </motion.div>
    </Link>
  );
}

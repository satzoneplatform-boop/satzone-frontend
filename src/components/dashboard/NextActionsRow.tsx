import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRightIcon } from '@/components/icons';
import { Stagger, StaggerItem } from '@/components/motion/Stagger';
import { useT } from '@/i18n/I18nProvider';

interface NextActionsRowProps {
  /** Drives the third card's copy — encouraging vs. get-started. */
  coursesCompleted: number;
}

/**
 * Generic, truthful next-step suggestions (moved here from the old analytics
 * page). These are navigation shortcuts to real pages — no fabricated data.
 */
export function NextActionsRow({ coursesCompleted }: NextActionsRowProps) {
  const t = useT();
  return (
    <section>
      <header className="mb-4">
        <h2 className="text-lg font-semibold text-ink-900">{t('analytics.nextActions')}</h2>
      </header>
      <Stagger className="grid grid-cols-1 gap-4 md:grid-cols-3" stagger={0.08}>
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

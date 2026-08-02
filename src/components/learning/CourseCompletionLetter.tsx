import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Button } from '@/components/ui/Button';
import { ArrowRightIcon, StarIcon } from '@/components/icons';
import { launchConfetti } from '@/lib/confetti';
import { useT } from '@/i18n/I18nProvider';

// A different one greets each completion — smart words with a reference.
const QUOTES = [
  {
    text: 'learning.courseComplete.quote1',
    author: 'learning.courseComplete.quote1Author',
  },
  {
    text: 'learning.courseComplete.quote2',
    author: 'learning.courseComplete.quote2Author',
  },
  {
    text: 'learning.courseComplete.quote3',
    author: 'learning.courseComplete.quote3Author',
  },
  {
    text: 'learning.courseComplete.quote4',
    author: 'learning.courseComplete.quote4Author',
  },
] as const;

interface CourseCompletionLetterProps {
  open: boolean;
  onClose: () => void;
  /** Navigate back to the learner's course list. */
  onBackToCourses: () => void;
  courseTitle: string;
  studentName?: string | null;
}

/**
 * A thank-you letter shown once when a learner finishes the last lesson of
 * a course — personal congratulations, good wishes, and a quote to carry
 * forward. Opens under a full confetti celebration.
 */
export function CourseCompletionLetter({
  open,
  onClose,
  onBackToCourses,
  courseTitle,
  studentName,
}: CourseCompletionLetterProps) {
  const t = useT();
  const reduce = useReducedMotion();
  // One quote per letter — picked lazily so each completion gets a fresh
  // draw (the letter mounts anew with each lesson page).
  const [quoteIdx] = useState(() => Math.floor(Math.random() * QUOTES.length));

  useEffect(() => {
    if (open) launchConfetti(1.6);
  }, [open]);

  const quote = QUOTES[quoteIdx];

  const name = studentName?.trim().split(/\s+/)[0] || t('learning.courseComplete.fallbackName');

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-navy-950/60 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={t('learning.courseComplete.title')}
        >
          <motion.article
            onClick={(e) => e.stopPropagation()}
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 240, damping: 24 }}
            className="my-8 w-full max-w-lg overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-modal"
          >
            {/* Letterhead */}
            <div className="h-1.5 bg-gradient-to-r from-brand-600 via-accent-400 to-brand-600" />
            <div className="px-8 pt-8 sm:px-10">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold tracking-[0.2em] text-ink-400 uppercase">
                  SAT Zone
                </span>
                {/* Wax-seal nod — a small gold star medallion. */}
                <span className="grid size-10 place-items-center rounded-full bg-warn-500/15 text-warn-600">
                  <StarIcon className="size-5" />
                </span>
              </div>
              <h2 className="mt-4 text-2xl font-bold tracking-tight text-navy-900">
                {t('learning.courseComplete.title')}
              </h2>
            </div>

            {/* Body of the letter */}
            <div className="space-y-4 px-8 py-6 text-[15px] leading-relaxed text-ink-700 sm:px-10">
              <p className="font-semibold text-navy-900">
                {t('learning.courseComplete.dear', { name })}
              </p>
              <p>{t('learning.courseComplete.body1', { course: courseTitle })}</p>
              <p>{t('learning.courseComplete.body2')}</p>

              <blockquote className="my-5 border-l-2 border-brand-300 py-1 pl-4">
                <p className="font-serif text-base leading-relaxed text-navy-900 italic">
                  “{t(quote.text)}”
                </p>
                <footer className="mt-2 text-xs font-medium tracking-wide text-ink-500">
                  — {t(quote.author)}
                </footer>
              </blockquote>

              <p>
                {t('learning.courseComplete.signoff')}
                <br />
                <span className="font-semibold text-navy-900">
                  {t('learning.courseComplete.team')}
                </span>
              </p>
            </div>

            <div className="flex flex-col gap-2 border-t border-ink-100 bg-ink-50/60 px-8 py-5 sm:px-10">
              <Button fullWidth rightIcon={<ArrowRightIcon />} onClick={onBackToCourses}>
                {t('learning.courseComplete.back')}
              </Button>
              <Button fullWidth variant="ghost" onClick={onClose}>
                {t('learning.courseComplete.close')}
              </Button>
            </div>
          </motion.article>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

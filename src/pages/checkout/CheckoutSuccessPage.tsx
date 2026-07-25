import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Avatar } from '@/components/ui/Avatar';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { CommitmentModal } from '@/pages/course/CommitmentModal';
import { CourseThumbnail } from '@/components/course/CourseThumbnail';
import { ClockIcon } from '@/components/icons';
import { ordersApi } from '@/api/orders';
import { useCourseDetail } from '@/features/course/hooks';
import { formatPrice } from '@/lib/format';
import { launchConfetti } from '@/lib/confetti';
import { useT } from '@/i18n/I18nProvider';
import type { EnrollmentRead, OrderStatus } from '@/types/api';

const COMMITMENT_KEY = (courseId: string) => `satzone.commitment.${courseId}`;
const TERMINAL: OrderStatus[] = ['paid', 'cancelled', 'refunded', 'failed'];
/** Give up active polling after this long and show a "still processing" screen
 * (§4.13) — the Payme callback usually settles in seconds, but a delayed one
 * shouldn't leave the user staring at an infinite spinner. */
const POLL_TIMEOUT_MS = 30_000;

export function CheckoutSuccessPage() {
  const t = useT();
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order');
  const freeEnrollment =
    (location.state as { enrollment?: EnrollmentRead } | null)?.enrollment ?? null;
  const course = useCourseDetail(slug);
  const [commitmentOpen, setCommitmentOpen] = useState(false);
  const [gaveUp, setGaveUp] = useState(false);

  // Paid flow: poll the order until it reaches a terminal state. Payment is
  // confirmed server-side by the Payme merchant callback, so we never mark
  // an order paid on the client — we only read the authoritative status.
  const orderQuery = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => ordersApi.detail(orderId!),
    enabled: Boolean(orderId) && !gaveUp,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && TERMINAL.includes(status) ? false : 2000;
    },
  });

  const order = orderQuery.data;
  const isPaidFlow = Boolean(orderId);
  const status: OrderStatus | 'free' = isPaidFlow ? order?.status ?? 'pending' : 'free';
  const settled = status === 'paid' || status === 'free';
  const failed = status === 'cancelled' || status === 'refunded' || status === 'failed';
  const timedOut = isPaidFlow && gaveUp && !settled && !failed;
  const pending = isPaidFlow && !settled && !failed && !timedOut;

  // Stop polling after the deadline if the order hasn't settled. Restarts when
  // the user hits "Check again" (gaveUp → false re-enables the query + timer).
  useEffect(() => {
    if (!isPaidFlow || gaveUp || settled || failed) return;
    const id = window.setTimeout(() => setGaveUp(true), POLL_TIMEOUT_MS);
    return () => window.clearTimeout(id);
  }, [isPaidFlow, gaveUp, settled, failed]);

  // Once the order is paid, the entitlement (enrollment) exists — refresh the
  // surfaces that gate on it so "My Learning"/the course page reflect it.
  useEffect(() => {
    if (order?.status !== 'paid') return;
    void queryClient.invalidateQueries({ queryKey: ['home'] });
    void queryClient.invalidateQueries({ queryKey: ['enrollments'] });
    if (slug) void queryClient.invalidateQueries({ queryKey: ['course', slug] });
  }, [order?.status, slug, queryClient]);

  function onCheckAgain() {
    setGaveUp(false);
    void orderQuery.refetch();
  }

  // Celebrate once when the enrollment is confirmed and the card is visible.
  const celebrated = useRef(false);
  const showSuccess = settled && Boolean(course.data);
  useEffect(() => {
    if (showSuccess && !celebrated.current) {
      celebrated.current = true;
      launchConfetti();
    }
  }, [showSuccess]);

  if (course.isLoading) {
    return (
      <div className="grid place-items-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  const c = course.data;
  if (!c) {
    return (
      <div className="grid place-items-center py-24 text-center">
        <p className="text-sm text-ink-500">{t('checkout.unavailable')}</p>
      </div>
    );
  }

  const startUrl = freeEnrollment?.last_lesson
    ? `/lessons/${freeEnrollment.last_lesson.id}`
    : `/courses/${c.slug}`;

  const totalLabel =
    status === 'free'
      ? formatPrice(0, c.currency, true)
      : order
        ? formatPrice(order.amount_cents, order.currency, false)
        : '—';

  function onGetStarted() {
    const seen =
      typeof window !== 'undefined' && window.localStorage.getItem(COMMITMENT_KEY(c!.id));
    if (seen) navigate(startUrl);
    else setCommitmentOpen(true);
  }

  function onAccept() {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(COMMITMENT_KEY(c!.id), '1');
    }
    navigate(startUrl);
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: t('course.breadcrumb.explore'), to: '/explore' },
          { label: t('course.breadcrumb.detail'), to: `/courses/${c.slug}` },
          { label: t('course.breadcrumb.payment') },
        ]}
      />

      <div className="grid place-items-center py-16">
        <article className="w-full max-w-md overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-[var(--shadow-card)]">
          {pending ? (
            <div className="px-8 py-14 text-center">
              <Spinner size="lg" className="mx-auto" />
              <h1 className="mt-6 text-xl font-semibold tracking-tight text-navy-900">
                {t('checkout.success.confirmingTitle')}
              </h1>
              <p className="mt-2 text-sm text-ink-500">
                {t('checkout.success.confirmingBody')}
              </p>
            </div>
          ) : timedOut ? (
            <div className="px-8 py-14 text-center">
              <div className="mx-auto grid size-16 place-items-center rounded-full bg-warn-50 text-warn-600">
                <ClockIcon className="size-8" />
              </div>
              <h1 className="mt-5 text-xl font-semibold tracking-tight text-navy-900">
                {t('checkout.success.stillProcessingTitle')}
              </h1>
              <p className="mt-2 text-sm text-ink-500">
                {t('checkout.success.stillProcessingBody')}
              </p>
              <div className="mt-6 flex flex-col items-center gap-2">
                <Button onClick={onCheckAgain} loading={orderQuery.isFetching}>
                  {t('checkout.success.checkAgain')}
                </Button>
                <Button variant="ghost" onClick={() => navigate('/learning-path')}>
                  {t('checkout.success.goToLearning')}
                </Button>
              </div>
            </div>
          ) : failed ? (
            <div className="px-8 py-14 text-center">
              <div className="mx-auto grid size-16 place-items-center rounded-full bg-danger-50 text-danger-600">
                <span className="text-2xl font-bold">!</span>
              </div>
              <h1 className="mt-5 text-xl font-semibold tracking-tight text-navy-900">
                {t('checkout.success.failedTitle')}
              </h1>
              <p className="mt-2 text-sm text-ink-500">
                {t('checkout.success.failedBody')}
              </p>
              <Button
                variant="outline"
                className="mt-6"
                onClick={() => navigate(`/courses/${c.slug}/checkout`, { replace: true })}
              >
                {t('checkout.success.tryAgain')}
              </Button>
            </div>
          ) : (
            <>
              <div className="bg-gradient-to-b from-success-50 to-white px-8 pt-12 pb-8 text-center">
                <div className="mx-auto grid size-24 place-items-center rounded-full bg-white shadow-md">
                  <SuccessBadge />
                </div>
                <h1 className="mt-6 text-2xl font-semibold tracking-tight text-navy-900">
                  {t('checkout.success.title')}
                </h1>
                <p className="mt-2 text-sm text-ink-500">
                  {t('checkout.success.body')}
                </p>
              </div>

              <div className="space-y-4 border-t border-ink-100 px-6 py-5">
                <div className="flex gap-3 rounded-xl border border-ink-200 bg-white p-3">
                  <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-ink-100">
                    <CourseThumbnail url={c.thumbnail_url} title={c.title} markSize={24} />
                  </div>
                  <div className="min-w-0">
                    {c.instructor && (
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-ink-100 px-2 py-0.5 text-[11px] font-medium text-ink-700">
                        <Avatar src={c.instructor.avatar_url} name={c.instructor.full_name} size={14} />
                        {c.instructor.full_name}
                      </span>
                    )}
                    <p className="mt-1 line-clamp-2 text-sm font-semibold text-navy-900">{c.title}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-ink-100 pt-3 text-sm">
                  <span className="text-ink-500">{t('checkout.success.totalPaid')}</span>
                  <span className="font-semibold text-navy-900">{totalLabel}</span>
                </div>

                <Button fullWidth size="lg" onClick={onGetStarted} disabled={!settled}>
                  {t('checkout.success.getStarted')}
                </Button>
              </div>
            </>
          )}
        </article>
      </div>

      <CommitmentModal
        open={commitmentOpen}
        onClose={() => setCommitmentOpen(false)}
        onStart={onAccept}
      />
    </div>
  );
}

function SuccessBadge() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden>
      <path
        d="M32 4l5.7 4.3 7-1 2 6.8 6.8 2-1 7L57 32l-4.3 5.7 1 7-6.8 2-2 6.8-7-1L32 56l-5.7-4.3-7 1-2-6.8-6.8-2 1-7L7 32l4.3-5.7-1-7 6.8-2 2-6.8 7 1L32 4Z"
        fill="var(--color-success-500)"
      />
      <path
        d="M22 32.5l7 7 13-14"
        stroke="white"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

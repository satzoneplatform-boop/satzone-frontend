import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Skeleton } from '@/components/ui/Skeleton';
import { CheckoutSummary } from '@/components/checkout/CheckoutSummary';
import { PromoCodeInput } from '@/components/checkout/PromoCodeInput';
import type { PromocodePreview } from '@/api/promocodes';
import { LockIcon, PaymeIcon } from '@/components/icons';
import { ApiError } from '@/api/errors';
import { enrollmentsApi } from '@/api/enrollments';
import { ordersApi } from '@/api/orders';
import { useCourseDetail } from '@/features/course/hooks';
import type { EnrollmentRead, OrderRead, PayResponse } from '@/types/api';
import { useT } from '@/i18n/I18nProvider';

/**
 * Backend promo/order error codes → friendly i18n keys for the pay banner.
 * A promo code that lapsed between preview and order creation lands here — we
 * drop the applied code and let the user retry at full price.
 */
const PAY_ERROR_KEY: Record<string, string> = {
  promocode_not_found: 'checkout.promo.err.notFound',
  promocode_wrong_course: 'checkout.promo.err.wrongCourse',
  promocode_inactive: 'checkout.promo.err.inactive',
  promocode_expired: 'checkout.promo.err.expired',
  promocode_not_started: 'checkout.promo.err.notStarted',
  promocode_exhausted: 'checkout.promo.err.exhausted',
  promocode_min_amount: 'checkout.promo.err.minAmount',
  promocode_first_purchase_only: 'checkout.promo.err.firstPurchase',
  promocode_user_limit: 'checkout.promo.err.userLimit',
  promocode_already_used: 'checkout.promo.err.alreadyUsed',
  promocode_makes_free: 'checkout.promo.err.makesFree',
};

/**
 * Payme / provider failures (§4.13). `payment_provider_unconfigured` is an
 * infra problem (no credentials); `payment_provider_error` is Payme refusing
 * or being unreachable and is retryable. Both keep the user on the page.
 */
const PROVIDER_ERROR_KEY: Record<string, string> = {
  payment_provider_unconfigured: 'checkout.err.unavailable',
  payment_provider_error: 'checkout.err.providerFailed',
  payment_no_url: 'checkout.err.providerFailed',
};

export function CheckoutPage() {
  const t = useT();
  const { slug } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const course = useCourseDetail(slug);
  const [promo, setPromo] = useState<PromocodePreview | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** Grant is confirmed: refresh the surfaces that show entitlement, then
   * route into the success screen. Used by both the free path and the
   * free-item fallback below. */
  function onFreeEnrolled(enrollment: EnrollmentRead) {
    void queryClient.invalidateQueries({ queryKey: ['home'] });
    void queryClient.invalidateQueries({ queryKey: ['enrollments'] });
    if (slug) void queryClient.invalidateQueries({ queryKey: ['course', slug] });
    navigate(`/courses/${slug}/checkout/success`, {
      state: { enrollment },
      replace: true,
    });
  }

  // Free courses use the legitimate free-enrollment path; paid courses go
  // through the real order → Payme hosted-checkout flow.
  const freeEnroll = useMutation<EnrollmentRead, ApiError, void>({
    mutationFn: () => enrollmentsApi.enroll(course.data!.id),
    onSuccess: onFreeEnrolled,
    onError: (err) => handleMutationError(err),
  });

  const payWithPayme = useMutation<void, ApiError, void>({
    mutationFn: async () => {
      // Create a pending order at the server-computed price, passing the
      // applied promo code so the server re-validates + reprices. Amount is
      // server-authoritative — we never send a price from the client.
      let order: OrderRead;
      try {
        order = await ordersApi.create({
          item_kind: 'course',
          course_id: course.data!.id,
          promocode: promo?.code ?? null,
        });
      } catch (err) {
        // The item is free server-side (price changed, or our `is_free` was
        // stale): the orders API refuses free items, so enroll directly.
        if (err instanceof ApiError && err.code === 'free_item') {
          onFreeEnrolled(await enrollmentsApi.enroll(course.data!.id));
          return;
        }
        throw err;
      }

      const returnUrl = `${window.location.origin}/courses/${slug}/checkout/success?order=${order.id}`;
      let res: PayResponse;
      try {
        res = await ordersApi.payPayme(order.id, returnUrl);
      } catch (err) {
        // Don't leak a stale `pending` order (and its reserved promo code) if
        // the hand-off fails — release it best-effort, then surface the error.
        void ordersApi.cancel(order.id).catch(() => {});
        throw err;
      }
      if (!res.checkout_url) {
        void ordersApi.cancel(order.id).catch(() => {});
        throw new ApiError(502, 'payment_no_url', 'No checkout URL', null);
      }
      // Hand off to Payme's hosted page (full-page nav, not XHR). Payme
      // confirms the order via the merchant callback and redirects back to
      // returnUrl, where CheckoutSuccessPage polls for the authoritative status.
      window.location.assign(res.checkout_url);
    },
    onError: (err) => handleMutationError(err),
  });

  function handleMutationError(err: ApiError) {
    if (err.code === 'phone_not_verified') {
      navigate('/verify-phone');
      return;
    }
    // A promo that lapsed between preview and order creation: drop it so the
    // user can retry at full price, and surface the precise reason.
    if (err.code in PAY_ERROR_KEY) {
      setPromo(null);
      setError(t(PAY_ERROR_KEY[err.code] as never));
      return;
    }
    if (err.code in PROVIDER_ERROR_KEY) {
      setError(t(PROVIDER_ERROR_KEY[err.code] as never));
      return;
    }
    setError(err.message || t('checkout.payError'));
  }

  if (course.isLoading) {
    return <CheckoutSkeleton />;
  }

  if (course.error || !course.data) {
    return (
      <div className="grid place-items-center py-24 text-center">
        <p className="text-sm text-ink-500">{t('checkout.unavailable')}</p>
      </div>
    );
  }

  const isFree = course.data.is_free;
  const submitting = freeEnroll.isPending || payWithPayme.isPending;

  function onCheckout() {
    setError(null);
    if (isFree) freeEnroll.mutate();
    else payWithPayme.mutate();
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: t('course.breadcrumb.explore'), to: '/explore' },
          { label: course.data.title, to: `/courses/${slug}` },
          { label: t('course.breadcrumb.payment') },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <header>
            <h1 className="text-2xl font-bold tracking-tight text-navy-900">
              {t('checkout.title')}
            </h1>
            <p className="mt-1 text-sm text-ink-500">{t('checkout.subtitle')}</p>
          </header>

          {!isFree && (
            <>
              <section>
                <h2 className="text-sm font-semibold text-navy-900">
                  {t('checkout.chooseMethod')}
                </h2>
                <div className="mt-3 flex items-start gap-3 rounded-2xl border border-brand-500/40 bg-brand-50/50 p-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-brand-600 shadow-sm">
                    <PaymeIcon className="size-6" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-navy-900">
                      {t('checkout.payme.title')}
                    </p>
                    <p className="mt-1 text-sm text-ink-600">
                      {t('checkout.payme.body')}
                    </p>
                    <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-ink-500">
                      <LockIcon className="size-3.5" />
                      {t('checkout.payme.secure')}
                    </p>
                  </div>
                </div>
              </section>

              <PromoCodeInput
                courseId={course.data.id}
                applied={promo}
                onApplied={setPromo}
                onRemoved={() => setPromo(null)}
              />
            </>
          )}

          {isFree && (
            <section className="rounded-2xl border border-ink-200 bg-white p-5 text-sm text-ink-600 shadow-[var(--shadow-card)]">
              {t('checkout.freeBody')}
            </section>
          )}

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-danger-500/30 bg-danger-50 px-3.5 py-2.5 text-sm text-danger-600"
            >
              {error}
            </div>
          )}
        </div>

        <CheckoutSummary
          course={course.data}
          promo={promo}
          loading={submitting}
          ctaLabel={isFree ? t('checkout.freeCta') : t('checkout.payCta')}
          onSubmit={onCheckout}
        />
      </div>
    </div>
  );
}

/** Truthful loading frame that mirrors the checkout's two-column layout. */
function CheckoutSkeleton() {
  return (
    <div aria-hidden className="space-y-6">
      <Skeleton className="h-4 w-64" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-7 w-52" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-11 w-full rounded-xl sm:w-96" />
        </div>
        <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-[var(--shadow-card)]">
          <div className="flex gap-3">
            <Skeleton className="size-16 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
          <div className="mt-5 space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

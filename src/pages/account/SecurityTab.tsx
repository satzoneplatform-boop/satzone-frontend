import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Skeleton } from '@/components/ui/Skeleton';
import { ApiError } from '@/api/errors';
import { meApi, type SessionRead } from '@/api/me';
import { useAuth } from '@/features/auth/AuthProvider';
import { authErrorMessage } from '@/features/auth/hooks';
import { evaluatePassword } from '@/lib/password';
import { useT } from '@/i18n/I18nProvider';
import type { TranslationKey } from '@/i18n/en';

export function SecurityTab() {
  const t = useT();
  const { user } = useAuth();
  const sessions = useQuery({
    queryKey: ['me', 'sessions'],
    queryFn: () => meApi.listSessions(),
  });
  const [pwOpen, setPwOpen] = useState(false);

  // Google-only accounts get "set a password" (no current-password field);
  // everyone else gets the regular change flow.
  const hasPassword = user?.has_password ?? true;

  // ?setpw=1 (from the post-sign-in prompt) auto-opens the set form once;
  // the param is stripped so back/refresh doesn't re-open it.
  const [params, setParams] = useSearchParams();
  useEffect(() => {
    if (params.get('setpw') !== '1') return;
    if (user && !user.has_password) setPwOpen(true);
    const next = new URLSearchParams(params);
    next.delete('setpw');
    setParams(next, { replace: true });
  }, [params, user, setParams]);

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-base font-semibold text-ink-900">{t('account.security.title')}</h2>
      </header>

      <SecurityCard
        title={t('account.security.password.title')}
        description={
          hasPassword
            ? t('account.security.password.description')
            : t('account.security.password.setDescription')
        }
        ctaLabel={
          hasPassword
            ? t('account.security.password.cta')
            : t('account.security.password.setCta')
        }
        onClick={() => setPwOpen(true)}
      />

      <section className="rounded-2xl border border-ink-200 bg-white shadow-[var(--shadow-card)]">
        <header className="border-b border-ink-100 px-5 py-4">
          <h3 className="text-base font-semibold text-ink-900">{t('account.security.activeSessions')}</h3>
          <p className="mt-1 max-w-prose text-xs text-ink-500">{t('account.security.sessionsHint')}</p>
        </header>

        {sessions.isLoading ? (
          <div className="space-y-3 p-5">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        ) : sessions.error ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-danger-600">{t('account.security.noSessions')}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => void sessions.refetch()}
            >
              {t('common.refresh')}
            </Button>
          </div>
        ) : (sessions.data?.length ?? 0) === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-ink-500">{t('account.security.noSessions')}</p>
        ) : (
          <>
            {/* Card list at <sm keeps rows readable without sideways scroll. */}
            <ul className="divide-y divide-ink-100 sm:hidden">
              {sessions.data!.map((s) => (
                <SessionCard key={s.id} session={s} />
              ))}
            </ul>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[480px] text-sm">
                <thead className="text-xs uppercase tracking-wider text-ink-500">
                  <tr className="border-b border-ink-100">
                    <th className="px-5 py-3 text-left font-medium">{t('account.security.col.device')}</th>
                    <th className="px-5 py-3 text-left font-medium">{t('account.security.col.location')}</th>
                    <th className="px-5 py-3 text-left font-medium">{t('account.security.col.lastActive')}</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.data!.map((s) => (
                    <SessionRow key={s.id} session={s} />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {hasPassword ? (
        <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
      ) : (
        <SetPasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
      )}
    </div>
  );
}

function SecurityCard({
  title,
  description,
  ctaLabel,
  onClick,
  disabled,
  ctaVariant = 'outline',
}: {
  title: string;
  description: string;
  ctaLabel: string;
  onClick?: () => void;
  disabled?: boolean;
  ctaVariant?: 'primary' | 'outline';
}) {
  return (
    <article className="rounded-2xl border border-ink-200 bg-white p-5 shadow-[var(--shadow-card)]">
      <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
      <p className="mt-2 text-xs text-ink-500">{description}</p>
      <Button
        variant={ctaVariant}
        className="mt-4"
        onClick={onClick}
        disabled={disabled}
      >
        {ctaLabel}
      </Button>
    </article>
  );
}

function SessionRow({ session }: { session: SessionRead }) {
  const t = useT();
  const ua = session.user_agent ?? t('account.security.unknown');
  // Snapshot the clock once per row mount — Date.now() is impure and must
  // not run during render; the lazy initializer runs exactly once.
  const [now] = useState(() => Date.now());
  const isRecent = now - new Date(session.created_at).getTime() < 60 * 60 * 1000;
  return (
    <tr className="border-b border-ink-100 last:border-b-0">
      <td className="px-5 py-3 text-ink-900">{shortBrowser(ua, t)}</td>
      <td className="px-5 py-3 text-ink-600">{session.ip_address ?? '—'}</td>
      <td className="px-5 py-3">
        <Badge tone={isRecent ? 'success' : 'neutral'}>
          {isRecent ? t('account.security.activeNow') : relativeTime(session.created_at, t)}
        </Badge>
      </td>
    </tr>
  );
}

/** Stacked session row for narrow screens (<sm). */
function SessionCard({ session }: { session: SessionRead }) {
  const t = useT();
  const ua = session.user_agent ?? t('account.security.unknown');
  // Same lazy clock snapshot as SessionRow — impure Date.now() runs once.
  const [now] = useState(() => Date.now());
  const isRecent = now - new Date(session.created_at).getTime() < 60 * 60 * 1000;
  return (
    <li className="px-5 py-3">
      <p className="truncate text-sm font-medium text-ink-900">{shortBrowser(ua, t)}</p>
      <p className="mt-0.5 truncate text-xs text-ink-500">{session.ip_address ?? '—'}</p>
      <div className="mt-1.5">
        <Badge tone={isRecent ? 'success' : 'neutral'}>
          {isRecent ? t('account.security.activeNow') : relativeTime(session.created_at, t)}
        </Badge>
      </div>
    </li>
  );
}

function shortBrowser(ua: string, t: (k: TranslationKey) => string): string {
  if (/edg/i.test(ua)) return 'Edge';
  if (/chrome/i.test(ua)) return 'Chrome';
  if (/firefox/i.test(ua)) return 'Firefox';
  if (/safari/i.test(ua)) return 'Safari';
  return ua.split(' ')[0] ?? t('account.security.unknown');
}

function relativeTime(
  iso: string,
  t: (k: TranslationKey, vars?: Record<string, string | number>) => string,
): string {
  const ms = Date.now() - new Date(iso).getTime();
  const h = Math.floor(ms / (1000 * 60 * 60));
  if (h < 1) return t('account.security.justNow');
  if (h < 24) {
    return h === 1
      ? t('account.security.hoursAgo', { n: h })
      : t('account.security.hoursAgoPlural', { n: h });
  }
  const d = Math.floor(h / 24);
  return d === 1
    ? t('account.security.daysAgo', { n: d })
    : t('account.security.daysAgoPlural', { n: d });
}

function ChangePasswordModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const t = useT();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [error, setError] = useState<string | null>(null);

  const change = useMutation({
    mutationFn: () => meApi.changePassword({ current_password: current, new_password: next }),
    onSuccess: () => {
      setCurrent('');
      setNext('');
      setError(null);
      onClose();
    },
    onError: (err) => {
      setError(err instanceof ApiError ? authErrorMessage(err) : t('account.security.changePassword.failed'));
    },
  });

  const checks = evaluatePassword(next);
  const passwordValid = checks.uppercase && checks.number && checks.length;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!passwordValid) {
      setError(t('account.security.changePassword.invalid'));
      return;
    }
    change.mutate();
  }

  return (
    <Modal open={open} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <h2 className="text-xl font-semibold text-ink-900">{t('account.security.changePassword.title')}</h2>
          <p className="mt-1 text-sm text-ink-500">
            {t('account.security.changePassword.subtitle')}
          </p>
        </div>

        {error && (
          <div role="alert" className="rounded-md border border-danger-500/30 bg-danger-50 px-3 py-2 text-sm text-danger-600">
            {error}
          </div>
        )}

        <PasswordInput
          label={t('account.security.changePassword.current')}
          required
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
        />

        <PasswordInput
          label={t('account.security.changePassword.new')}
          required
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          hint={t('account.security.changePassword.hint')}
        />

        <Button
          type="submit"
          fullWidth
          size="lg"
          loading={change.isPending}
          disabled={!current || !passwordValid}
        >
          {t('account.security.changePassword.submit')}
        </Button>
      </form>
    </Modal>
  );
}

/**
 * First-password form for Google-only accounts — POST /me/password/set takes
 * no current password. On success the auth user is refreshed so has_password
 * flips everywhere (card switches to "change", the sign-in prompt stops).
 */
function SetPasswordModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const t = useT();
  const { refresh } = useAuth();
  const [next, setNext] = useState('');
  const [error, setError] = useState<string | null>(null);

  const set = useMutation({
    mutationFn: () => meApi.setPassword({ new_password: next }),
    onSuccess: async () => {
      setNext('');
      setError(null);
      onClose();
      await refresh();
    },
    onError: (err) => {
      setError(
        err instanceof ApiError
          ? authErrorMessage(err)
          : t('account.security.setPassword.failed'),
      );
    },
  });

  const checks = evaluatePassword(next);
  const passwordValid = checks.uppercase && checks.number && checks.length;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!passwordValid) {
      setError(t('account.security.changePassword.invalid'));
      return;
    }
    set.mutate();
  }

  return (
    <Modal open={open} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <h2 className="text-xl font-semibold text-ink-900">
            {t('account.security.setPassword.title')}
          </h2>
          <p className="mt-1 text-sm text-ink-500">
            {t('account.security.setPassword.subtitle')}
          </p>
        </div>

        {error && (
          <div role="alert" className="rounded-md border border-danger-500/30 bg-danger-50 px-3 py-2 text-sm text-danger-600">
            {error}
          </div>
        )}

        <PasswordInput
          label={t('account.security.changePassword.new')}
          required
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          hint={t('account.security.changePassword.hint')}
        />

        <Button
          type="submit"
          fullWidth
          size="lg"
          loading={set.isPending}
          disabled={!passwordValid}
        >
          {t('account.security.setPassword.submit')}
        </Button>
      </form>
    </Modal>
  );
}

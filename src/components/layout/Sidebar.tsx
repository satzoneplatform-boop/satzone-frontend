import { NavLink } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { Logo, LogoMark } from '@/components/brand/Logo';
import {
  BookIcon,
  FlagIcon,
  GiftIcon,
  GridIcon,
  HomeIcon,
  PanelLeftIcon,
  PhoneIcon,
} from '@/components/icons';
import { cn } from '@/lib/cn';
import { useHomeFeed } from '@/features/home/hooks';
import { useAuth } from '@/features/auth/AuthProvider';
import { useT } from '@/i18n/I18nProvider';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

interface NavItemConfig {
  to: string;
  label: string;
  icon: typeof HomeIcon;
  badge?: number;
}

/**
 * Authed app sidebar — matches the Explore / Search Results layout in Figma:
 *  - Brand wordmark + collapse toggle
 *  - MAIN MENU group
 *  - LATEST LEARNINGS group (continue-learning history)
 *  - Contacts footer
 */
export function Sidebar({ collapsed, onToggleCollapsed }: SidebarProps) {
  const home = useHomeFeed();
  const { user } = useAuth();
  const t = useT();

  // Show 4 most recent in-progress courses (FRONTEND.md §4.4 — `continue_learning`).
  const recent = (home.data?.continue_learning ?? []).slice(0, 4);

  const main: NavItemConfig[] = [
    { to: '/dashboard', label: t('nav.dashboard'), icon: HomeIcon },
    { to: '/explore', label: t('nav.explore'), icon: GridIcon },
    { to: '/learning-path', label: t('nav.myLearnings'), icon: BookIcon },
    { to: '/quizzes', label: t('nav.quizzes'), icon: FlagIcon },
  ];

  const adminItems: NavItemConfig[] =
    user?.role === 'admin'
      ? [{ to: '/admin/promocodes', label: t('nav.promocodes'), icon: GiftIcon }]
      : [];

  return (
    <aside
      className={cn(
        // Hidden on mobile — BottomNav takes over below the lg breakpoint.
        'hidden lg:flex h-full shrink-0 flex-col bg-ink-900 py-4 text-ink-300 transition-[width] duration-200',
        collapsed ? 'w-[72px] px-2' : 'w-[260px] px-3',
      )}
    >
      <div
        className={cn(
          'flex items-center pb-4',
          collapsed ? 'flex-col gap-3 px-0' : 'justify-between px-2',
        )}
      >
        {collapsed ? (
          <LogoMark size={26} variant="white" />
        ) : (
          <Logo withWordmark size={26} variant="white" />
        )}
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="grid size-8 place-items-center rounded-md text-ink-500 transition-colors duration-150 hover:bg-ink-800 hover:text-white"
          aria-label={collapsed ? t('nav.expandSidebar') : t('nav.collapseSidebar')}
          title={collapsed ? t('nav.expandSidebar') : t('nav.collapseSidebar')}
          aria-expanded={!collapsed}
        >
          <PanelLeftIcon />
        </button>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto pr-1 pt-2">
        <NavGroup title={t('nav.mainMenu')} collapsed={collapsed}>
          {main.map((item) => (
            <NavRow key={item.to} item={item} collapsed={collapsed} />
          ))}
        </NavGroup>

        {adminItems.length > 0 && (
          <NavGroup title={t('nav.admin')} collapsed={collapsed}>
            {adminItems.map((item) => (
              <NavRow key={item.to} item={item} collapsed={collapsed} />
            ))}
          </NavGroup>
        )}

        {recent.length > 0 && !collapsed && (
          <NavGroup title={t('nav.latestLearnings')} collapsed={collapsed}>
            {recent.map((e) => (
              <NavLink
                key={e.id}
                to={`/courses/${e.course.slug}/learn`}
                className="flex h-9 items-center gap-3 rounded-lg px-3 text-sm text-ink-400 hover:bg-ink-800 hover:text-white"
              >
                <RecentBadge progress={e.progress_percent} />
                <span className="truncate">{e.course.title}</span>
              </NavLink>
            ))}
          </NavGroup>
        )}
      </nav>

      <div className="space-y-1 border-t border-ink-800 pt-3">
        <NavRow
          item={{ to: '/contacts', label: t('nav.contacts'), icon: PhoneIcon }}
          collapsed={collapsed}
        />
      </div>
    </aside>
  );
}

function NavGroup({
  title,
  children,
  collapsed,
}: {
  title: string;
  children: React.ReactNode;
  collapsed: boolean;
}) {
  return (
    <div className="space-y-1">
      {!collapsed && (
        <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-500">
          {title}
        </p>
      )}
      {children}
    </div>
  );
}

function NavRow({ item, collapsed }: { item: NavItemConfig; collapsed: boolean }) {
  const reduce = useReducedMotion();
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        cn(
          'relative flex h-10 items-center rounded-lg text-sm font-medium transition-colors duration-150',
          collapsed ? 'justify-center px-0' : 'gap-3 px-3',
          isActive ? 'text-white' : 'text-ink-400 hover:bg-ink-800 hover:text-white',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span
              layoutId="sidebar-active"
              transition={
                reduce
                  ? { duration: 0 }
                  : { type: 'spring', stiffness: 400, damping: 32 }
              }
              className="absolute inset-0 -z-0 rounded-lg bg-brand-600"
            >
              {/* Small accent indicator hugging the pill's leading edge. */}
              {!collapsed && (
                <span className="absolute left-0 top-1/2 h-4 w-1 -translate-y-1/2 rounded-r-full bg-accent-400" />
              )}
            </motion.span>
          )}
          <span
            className={cn(
              'relative z-10 flex min-w-0 items-center',
              collapsed ? 'justify-center' : 'w-full gap-3',
            )}
          >
            <item.icon />
            {!collapsed && <span className="truncate">{item.label}</span>}
            {!collapsed && item.badge ? (
              <span className="ml-auto grid size-5 place-items-center rounded-full bg-white text-[10px] font-semibold text-ink-900">
                {item.badge}
              </span>
            ) : null}
          </span>
        </>
      )}
    </NavLink>
  );
}

function RecentBadge({ progress }: { progress: number }) {
  // Tiny circular progress dot.
  const r = 7;
  const c = 2 * Math.PI * r;
  const filled = c * (Math.min(100, Math.max(0, progress)) / 100);
  return (
    <svg width={18} height={18} viewBox="0 0 18 18" aria-hidden className="shrink-0">
      <circle
        cx="9"
        cy="9"
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-ink-700"
      />
      <circle
        cx="9"
        cy="9"
        r={r}
        fill="none"
        stroke="currentColor"
        className="text-brand-400"
        strokeWidth="2"
        strokeDasharray={`${filled} ${c - filled}`}
        strokeLinecap="round"
        transform="rotate(-90 9 9)"
      />
    </svg>
  );
}

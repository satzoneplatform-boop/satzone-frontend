import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Logo } from '@/components/brand/Logo';
import { transitions } from '@/components/motion/variants';
import { useT } from '@/i18n/I18nProvider';
import { LanguageDropdown } from './LanguageDropdown';

interface AuthCenteredLayoutProps {
  children: ReactNode;
  showHeader?: boolean;
  showFooter?: boolean;
  headerSlot?: ReactNode;
}

/**
 * Centered-card layout used by:
 *  - "Complete data" wizard step
 *  - Reset password form
 *  - Reset success card
 *
 * Header has the SAT Zone wordmark + locale switcher (slot).
 * Footer has © + legal links.
 */
export function AuthCenteredLayout({
  children,
  showHeader = true,
  showFooter = true,
  headerSlot,
}: AuthCenteredLayoutProps) {
  const t = useT();
  const reduce = useReducedMotion();
  return (
    <div className="flex min-h-screen flex-col bg-ink-50">
      {showHeader && (
        <header className="flex h-[72px] items-center justify-between border-b border-ink-200 bg-white px-4 sm:px-8">
          <Logo withWordmark size={32} />
          {headerSlot ?? <LanguageDropdown variant="light" />}
        </header>
      )}

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={transitions.base}
          className="flex w-full justify-center"
        >
          {children}
        </motion.div>
      </main>

      {showFooter && (
        <footer className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-transparent px-4 py-5 text-sm text-ink-500 sm:px-8">
          <span>© 2026 SAT Zone</span>
          <div className="flex items-center gap-6">
            <a href="#" className="underline-offset-2 hover:underline">
              {t('auth.signUp.privacy')}
            </a>
            <a href="#" className="underline-offset-2 hover:underline">
              {t('auth.signUp.terms')}
            </a>
          </div>
        </footer>
      )}
    </div>
  );
}

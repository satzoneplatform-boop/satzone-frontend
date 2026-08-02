import { cn } from '@/lib/cn';
import logoFull from '@/assets/logo/logo-full.webp';
import logoFullDark from '@/assets/logo/logo-full-dark.webp';
import logoMark from '@/assets/logo/logo-mark.webp';

type LogoVariant = 'color' | 'white' | 'mono';

/* Natural aspect ratios (width / height) of the exported artwork. Explicit
   width + height keep flex `align-items: stretch` parents from distorting
   the image and avoid layout shift while it loads. */
const FULL_RATIO = 1417 / 512;
const MARK_RATIO = 404 / 512;

interface LogoProps {
  size?: number;
  withWordmark?: boolean;
  variant?: LogoVariant;
  className?: string;
}

/**
 * SAT Zone brand lockup — official artwork from src/assets/logo.
 *
 * `withWordmark` renders the full lockup (shield/acorn mark + SAT Zone +
 * tagline); otherwise just the mark. `variant="white"` swaps in the
 * dark-surface lockup (white wordmark) for navy backgrounds.
 */
export function Logo({
  size = 32,
  withWordmark = false,
  variant = 'color',
  className,
}: LogoProps) {
  if (!withWordmark) {
    return <LogoMark size={size} variant={variant} className={className} />;
  }

  // In the lockup artwork the wordmark is small relative to the shield, so
  // render taller than the old mark-only `size` to keep the text legible.
  const height = Math.round(size * 1.45);

  return (
    <img
      src={variant === 'white' ? logoFullDark : logoFull}
      alt="SAT Zone"
      style={{ height, width: Math.round(height * FULL_RATIO) }}
      className={cn('block shrink-0 select-none', className)}
      draggable={false}
    />
  );
}

/**
 * The bare shield/acorn mark. The artwork is a split navy/blue shield with a
 * white-outlined acorn, so the same image works on light and dark surfaces;
 * `variant` is accepted for call-site compatibility.
 */
export function LogoMark({
  size = 32,
  className,
}: {
  size?: number;
  variant?: LogoVariant;
  className?: string;
}) {
  return (
    <img
      src={logoMark}
      alt="SAT Zone"
      style={{ height: size, width: Math.round(size * MARK_RATIO) }}
      className={cn('block shrink-0 select-none', className)}
      draggable={false}
    />
  );
}

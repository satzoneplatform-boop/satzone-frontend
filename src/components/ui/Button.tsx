import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { motion, useReducedMotion, type HTMLMotionProps } from 'motion/react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type Size = 'sm' | 'md' | 'lg';

type MotionButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  keyof HTMLMotionProps<'button'>
> &
  HTMLMotionProps<'button'>;

export interface ButtonProps extends MotionButtonProps {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
  /** Narrow motion's widened children type back to plain ReactNode. */
  children?: ReactNode;
}

const VARIANT_STYLES: Record<Variant, string> = {
  primary:
    'bg-brand-600 text-white shadow-[0_2px_10px_-2px_rgb(37_99_235/0.45)] hover:bg-brand-700 active:bg-brand-800 disabled:bg-brand-300 disabled:shadow-none',
  secondary:
    'bg-ink-100 text-ink-900 hover:bg-ink-200 active:bg-ink-300 disabled:bg-ink-50 disabled:text-ink-400',
  ghost:
    'text-ink-700 hover:bg-ink-100 active:bg-ink-200 disabled:text-ink-400',
  danger:
    'bg-danger-500 text-white hover:bg-danger-600 active:bg-danger-600 disabled:bg-danger-300',
  outline:
    'border border-ink-200 bg-white text-ink-900 hover:bg-ink-50 hover:border-ink-300 active:bg-ink-100 disabled:bg-ink-50 disabled:text-ink-400 shadow-[var(--shadow-input)]',
};

const SIZE_STYLES: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm gap-1.5',
  md: 'h-11 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
};

/**
 * Primary interactive button for SAT Zone.
 *
 * Adds a subtle lift on hover and a press "squish" on tap for a tactile,
 * premium feel — automatically disabled under prefers-reduced-motion and
 * when the button is disabled/loading. All native button props pass through.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    leftIcon,
    rightIcon,
    fullWidth = false,
    className,
    children,
    disabled,
    type = 'button',
    ...rest
  },
  ref,
) {
  const reduce = useReducedMotion();
  const isInert = disabled || loading;
  const wantsMotion = !reduce && !isInert;

  return (
    <motion.button
      ref={ref}
      type={type}
      disabled={isInert}
      whileHover={wantsMotion ? { y: -1 } : undefined}
      whileTap={wantsMotion ? { scale: 0.97 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 24 }}
      className={cn(
        'relative inline-flex items-center justify-center rounded-xl font-medium transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
        'disabled:cursor-not-allowed',
        VARIANT_STYLES[variant],
        SIZE_STYLES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? (
        <span className="inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
      ) : (
        leftIcon
      )}
      {children}
      {!loading && rightIcon}
    </motion.button>
  );
});

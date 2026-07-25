import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { landingApi } from '@/api/landing';
import { Link, Navigate } from 'react-router-dom';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react';
import macbookMockup from '@/assets/macbook-mockup.webp';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import {
  ArrowRightIcon,
  BookIcon,
  CheckIcon,
  ClockIcon,
  FlagIcon,
  PathIcon,
  StarIcon,
  TrendingUpIcon,
  UsersIcon,
} from '@/components/icons';
import { LanguageDropdown } from '@/components/layout/LanguageDropdown';
import { CountUp } from '@/components/motion/CountUp';
import { Reveal } from '@/components/motion/Reveal';
import { Stagger, StaggerItem } from '@/components/motion/Stagger';
import { staggerContainer, transitions } from '@/components/motion/variants';
import { ResultsSection } from '@/components/results/ResultsSection';
import { instructor } from '@/components/auth/marketing/config';
import { UZ_CITIES, UZ_OUTLINE_PATH, UZ_POP_POINTS, UZ_VIEWBOX } from '@/components/brand/uzbekistanOutline';
import { useAuth } from '@/features/auth/AuthProvider';
import { useT } from '@/i18n/I18nProvider';
import { cn } from '@/lib/cn';

/**
 * Public marketing landing page shown at `/`.
 *
 * Rebuilt for the SATZONE brand: deep-navy hero with animated gradient mesh,
 * an animated SAT score dashboard, count-up proof metrics, a rocket-flown
 * score climb over the three steps, instructor spotlight, and repo-managed
 * student results. Authed users redirect to the dashboard.
 */
export function LandingPage() {
  const { user, status } = useAuth();

  if (status === 'loading') {
    return (
      <div className="grid min-h-screen place-items-center">
        <Spinner size="lg" />
      </div>
    );
  }
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-navy-950">
      {/* Page-wide slow gradient mesh — the sections sit transparently on
          top so the whole page shares one continuous navy atmosphere. */}
      <div className="lp-mesh pointer-events-none fixed inset-0 opacity-50" aria-hidden />
      {/* Ambient spots drifting up through the entire page, endlessly */}
      <div className="pointer-events-none fixed inset-0 z-[1]" aria-hidden>
        {SPOTS.map((s, i) => (
          <span
            key={i}
            className="lp-spot"
            style={{
              left: s.left,
              width: s.size,
              height: s.size,
              animationDuration: s.dur,
              animationDelay: s.delay,
              filter: i % 3 === 0 ? 'blur(1px)' : undefined,
            }}
          />
        ))}
      </div>
      <PublicTopBar />
      <main className="flex-1">
        {/* Conversion-funnel order: promise (hero) → instant credibility
            (metrics floating over the hero edge) → the plan (summit rocket +
            3 steps) → exam expertise (blueprint ticker) → product (features →
            demo video) → the guide (instructor) → strongest social proof
            (results) → the ask. */}
        <HeroSection />
        <MetricsBand />
        <SummitSection />
        <BlueprintStrip />
        <FeaturesSection />
        <DemoSection />
        <InstructorSection />
        <ResultsSection />
        <FinalCtaSection />
      </main>
      <PublicFooter />
    </div>
  );
}

/**
 * Deterministic drifting-spot field: left offset, diameter, rise duration,
 * and a negative delay so every spot is already mid-flight on first paint.
 */
const SPOTS = [
  { left: '4%', size: 3, dur: '26s', delay: '-2s' },
  { left: '11%', size: 2, dur: '21s', delay: '-9s' },
  { left: '18%', size: 4, dur: '30s', delay: '-15s' },
  { left: '26%', size: 2, dur: '19s', delay: '-5s' },
  { left: '33%', size: 3, dur: '24s', delay: '-12s' },
  { left: '41%', size: 2, dur: '28s', delay: '-20s' },
  { left: '48%', size: 5, dur: '34s', delay: '-8s' },
  { left: '55%', size: 2, dur: '22s', delay: '-16s' },
  { left: '62%', size: 3, dur: '27s', delay: '-4s' },
  { left: '69%', size: 2, dur: '20s', delay: '-11s' },
  { left: '76%', size: 4, dur: '31s', delay: '-18s' },
  { left: '83%', size: 2, dur: '23s', delay: '-7s' },
  { left: '90%', size: 3, dur: '26s', delay: '-14s' },
  { left: '96%', size: 2, dur: '19s', delay: '-3s' },
] as const;

/* -------------------------------------------------------------------------- */
/* Scroll-aware header                                                        */
/* -------------------------------------------------------------------------- */

function useScrolled(threshold = 24) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);
  return scrolled;
}

function PublicTopBar() {
  const t = useT();
  const scrolled = useScrolled();

  return (
    <header
      className={cn(
        'sticky top-0 z-30 transition-colors duration-300',
        scrolled
          ? 'border-b border-white/10 bg-navy-950/85 backdrop-blur'
          : 'border-b border-transparent bg-transparent',
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link to="/" aria-label={t('landing.nav.homeAria')} className="shrink-0">
          <Logo withWordmark size={30} variant="white" />
        </Link>

        <nav className="ml-8 hidden items-center gap-7 text-sm font-medium text-white/80 lg:flex">
          <a href="#features" className="lp-nav-link transition-colors hover:opacity-100 hover:text-current">
            {t('landing.nav.features')}
          </a>
          <a href="#how-it-works" className="lp-nav-link transition-colors hover:text-current">
            {t('landing.nav.howItWorks')}
          </a>
          <a href="#results" className="lp-nav-link transition-colors hover:text-current">
            {t('landing.nav.testimonials')}
          </a>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <LanguageDropdown />
          <Link to="/sign-in" className="hidden sm:block">
            <Button size="sm" variant="ghost" className="text-white hover:bg-white/10">
              {t('landing.nav.signIn')}
            </Button>
          </Link>
          <Link to="/sign-up">
            <Button size="sm">{t('landing.nav.signUp')}</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

/* -------------------------------------------------------------------------- */
/* Hero                                                                       */
/* -------------------------------------------------------------------------- */

function HeroSection() {
  const t = useT();
  const reduce = useReducedMotion();

  return (
    <section className="relative -mt-16 overflow-hidden pt-16 text-white">
      {/* Drifting orbs backdrop (page-level mesh provides the gradient) */}
      <div className="lp-orb lp-orb--a absolute -left-32 top-6 h-80 w-80 bg-brand-500/25" />
      <div className="lp-orb lp-orb--b absolute -right-24 bottom-16 h-96 w-96 bg-accent-500/20" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 py-20 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:py-28">
        <motion.div
          variants={staggerContainer(0.1, 0.05)}
          initial="hidden"
          animate="visible"
        >
          <HeroItem>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-brand-300 backdrop-blur">
              <StarIcon className="size-3.5" />
              {t('landing.hero.tag')}
            </span>
          </HeroItem>

          <HeroItem>
            <h1 className="mt-6 text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl xl:text-7xl">
              {t('landing.hero.titleLine1')}
              <br />
              <span className="bg-gradient-to-r from-brand-300 to-accent-400 bg-clip-text text-transparent">
                {t('landing.hero.titleLine2')}
              </span>
            </h1>
          </HeroItem>

          <HeroItem>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-white/70 sm:text-lg">
              {t('landing.hero.subtitle')}
            </p>
          </HeroItem>

          <HeroItem>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link to="/sign-up">
                <Button size="lg" className="lp-cta" rightIcon={<ArrowRightIcon />}>
                  {t('landing.hero.ctaPrimary')}
                </Button>
              </Link>
              <a href="#features">
                <Button
                  size="lg"
                  variant="ghost"
                  className="lp-btn-glass border border-white/25 text-white hover:bg-white/10"
                >
                  {t('landing.hero.ctaSecondary')}
                </Button>
              </a>
            </div>
          </HeroItem>

          <HeroItem>
            <ul className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-sm text-white/80">
              {[
                t('landing.hero.bullet1'),
                t('landing.hero.bullet2'),
                t('landing.hero.bullet3'),
              ].map((b) => (
                <li key={b} className="flex items-center gap-2">
                  <span className="grid size-5 place-items-center rounded-full bg-success-500/20 text-success-500">
                    <CheckIcon className="size-3.5" />
                  </span>
                  {b}
                </li>
              ))}
            </ul>
          </HeroItem>
        </motion.div>

        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ ...transitions.base, delay: 0.25 }}
        >
          <HeroVisual />
        </motion.div>
      </div>
    </section>
  );
}

function HeroItem({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      variants={{
        hidden: reduce ? { opacity: 0 } : { opacity: 0, y: 18 },
        visible: { opacity: 1, y: 0, transition: transitions.base },
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Frameless hero scene: the accurate neon outline of Uzbekistan, as big as
 * the column allows, with pulsing city nodes and rotating result callouts
 * whose dotted pointer lines aim at real (never named) towns. SVG layers and
 * %-anchored HTML share the map's own 800×523 canvas, so everything stays
 * registered to the geography at every width. The mountain-climb visual now
 * lives in its own SummitSection below the hero.
 */
function HeroVisual() {
  return (
    <div className="relative mx-auto aspect-[800/523] w-full max-w-2xl">
      {/* The map IS the hero visual now — full-bleed on its own canvas,
          with live result callouts pointing at (unnamed) towns. */}
      <UzbekistanMap className="absolute inset-0 h-full w-full" />
      <MapCallouts />
    </div>
  );
}

/**
 * Accurate neon Uzbekistan (geoBoundaries outline, 366 points) that draws
 * itself in, then its major cities pulse like a constellation.
 */
function UzbekistanMap({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  return (
    <svg
      viewBox={UZ_VIEWBOX}
      className={cn('lp-map-glow', className)}
      fill="none"
      aria-hidden
    >
      {/* Faint interior tint so the country reads as a shape, not a wire */}
      <motion.path
        d={UZ_OUTLINE_PATH}
        fill="var(--color-accent-400)"
        fillOpacity={0.05}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8, duration: 1.2 }}
      />
      <motion.path
        d={UZ_OUTLINE_PATH}
        stroke="var(--color-accent-400)"
        strokeOpacity={0.65}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reduce ? undefined : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 2.6, ease: 'easeInOut', delay: 0.4 }}
      />
      {UZ_CITIES.map((c, i) => (
        <motion.g
          key={`${c.x}-${c.y}`}
          initial={reduce ? undefined : { scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 1.6 + i * 0.15, type: 'spring', stiffness: 260, damping: 18 }}
          style={{ transformBox: 'fill-box', transformOrigin: '50% 50%' }}
        >
          <circle
            cx={c.x}
            cy={c.y}
            r={c.r * 2.4}
            fill="var(--color-accent-400)"
            fillOpacity={0.35}
            className="lp-node-ping"
            style={{ animationDelay: `${i * 0.55}s` }}
          />
          <circle cx={c.x} cy={c.y} r={c.r} fill="var(--color-accent-400)" />
        </motion.g>
      ))}
    </svg>
  );
}

/**
 * A neon mountain rising in the canvas's north-east sky, entirely clear of
 * the map below it. The climbing ridge doubles as the score-growth chart —
 * a jagged ascent with milestone knees and an endless light pulse riding it
 * to the summit, where the projected-score ring floats. A fainter back peak
 * and far-side descent give the mountain depth.
 */
/**
 * Rotating result callouts pinned to the hero map. Three speech-bubble chips
 * sit directly over real — never named — towns, each with a triangular tail
 * whose tip touches its town. Every swap sends that bubble to a NEW random
 * town from UZ_POP_POINTS (never one another bubble occupies), so results
 * appear all over the country instead of a fixed few spots. One bubble swaps
 * at a time. Decorative sample data → aria-hidden.
 */
const CALLOUT_SLOTS = [0, 1, 2] as const;
/** Starting towns: far west, far east, deep south — instant spread. */
const INITIAL_TARGETS = [1, 0, 6];

function MapCallouts() {
  const t = useT();
  const reduce = useReducedMotion();
  const [tick, setTick] = useState(0);
  const [targets, setTargets] = useState<number[]>(INITIAL_TARGETS);

  useEffect(() => {
    if (reduce) return;
    let ticks = 0;
    const id = setInterval(() => {
      ticks += 1;
      // Exactly one slot's phase advances per tick (see contentFor); send
      // that bubble to a random town far enough from the other bubbles that
      // chips can't overlap (several real towns cluster in the east).
      const slot = (3 - (ticks % 3)) % 3;
      setTargets((prev) => {
        const clear = (i: number) =>
          prev.every((cur, s) => {
            if (s === slot) return true;
            const a = UZ_POP_POINTS[i];
            const b = UZ_POP_POINTS[cur];
            return Math.hypot(a.x - b.x, a.y - b.y) > 140;
          });
        let pick = prev[slot];
        for (let guard = 0; guard < 50 && (pick === prev[slot] || !clear(pick)); guard++) {
          pick = Math.floor(Math.random() * UZ_POP_POINTS.length);
        }
        const next = [...prev];
        next[slot] = pick;
        return next;
      });
      setTick(ticks);
    }, 3000);
    return () => clearInterval(id);
  }, [reduce]);

  const names = t('landing.hero.popNames').split(',');
  // Each slot advances once every three ticks, offset by its index, so only
  // one chip swaps at a time. Co-prime strides keep name/score pairs fresh.
  const contentFor = (slot: number) => {
    const phase = Math.floor((tick + slot) / 3);
    const n = phase * 3 + slot;
    return {
      phase,
      name: names[(n * 3) % names.length],
      score: POP_SCORES[(n * 5 + 2) % POP_SCORES.length],
    };
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-10" aria-hidden>
      {CALLOUT_SLOTS.map((slot) => {
        const { phase, name, score } = contentFor(slot);
        const town = UZ_POP_POINTS[targets[slot]];
        // Keep wide chips on-canvas near the map edges; the tail below stays
        // glued to the town no matter how the chip itself is shifted.
        const chipShift = town.x > 690 ? '-82%' : town.x < 140 ? '-18%' : '-50%';
        return (
          <AnimatePresence key={slot} mode="wait">
            <motion.div
              key={phase}
              className="absolute"
              style={{ left: `${(town.x / 800) * 100}%`, top: `${(town.y / 523) * 100}%` }}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.85 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.9 }}
              transition={{
                type: 'spring',
                stiffness: 320,
                damping: 26,
                delay: tick === 0 ? 2 + slot * 0.25 : 0,
              }}
            >
              {/* Town marker under the tail tip */}
              <span className="absolute left-0 top-0 size-2.5 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full bg-accent-400/60" />
              <span className="absolute left-0 top-0 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-400 shadow-[0_0_10px_2px_rgb(56_189_248/0.6)]" />
              {/* Tail — triangle tip aimed straight down at the town */}
              <span className="absolute -top-[13px] left-0 -translate-x-1/2 border-x-[7px] border-t-[9px] border-x-transparent border-t-navy-900/85" />
              {/* The bubble itself */}
              <span
                className="absolute bottom-[12px] flex items-center gap-2 whitespace-nowrap rounded-xl border border-white/10 bg-navy-900/85 py-1.5 pl-1.5 pr-3 shadow-[0_14px_36px_-10px_rgb(8_16_38/0.85)] backdrop-blur-md"
                style={{ transform: `translateX(${chipShift})` }}
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 text-[11px] font-bold text-white">
                  {name.charAt(0)}
                </span>
                <span className="leading-tight">
                  <span className="block text-[11px] text-white/55">{name}</span>
                  <span className="flex items-center gap-1 text-sm font-bold leading-none text-white">
                    {score}
                    <TrendingUpIcon className="size-3 text-success-500" />
                  </span>
                </span>
              </span>
            </motion.div>
          </AnimatePresence>
        );
      })}
    </div>
  );
}

/** Sample overall results cycled through the map callouts (decorative). */
const POP_SCORES = ['1480', '1520', '1450', '1560', '1500', '1430', '1540', '1470'];

/* -------------------------------------------------------------------------- */
/* Summit — the climb to the dream score                                      */
/* -------------------------------------------------------------------------- */

/**
 * The rocket-flight story merged with the three "how it works" steps, right
 * under the hero: a neon trajectory that IS the score journey. Each
 * checkpoint sits exactly above its step card in the grid below — milestone
 * scores over steps 1 and 2, and the Moon with the dream result over step 3.
 */
function SummitSection() {
  const t = useT();
  const reduce = useReducedMotion();
  const steps = [1, 2, 3] as const;
  return (
    <section id="how-it-works" className="relative overflow-hidden pb-24 pt-20 text-white sm:pt-24">
      <div className="lp-orb lp-orb--c absolute -left-24 bottom-24 h-72 w-72 bg-brand-500/15" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            {t('landing.summit.title')}
          </h2>
          <p className="mt-4 text-base text-white/60">{t('landing.summit.subtitle')}</p>
        </Reveal>

        <div className="mx-auto mt-8 max-w-5xl">
          {/* Anchor wrapper holds ONLY the range + score block, so the
              %-based summit anchor isn't skewed by the card grid below. */}
          <div className="relative">
          {/* Dream score over the Moon: static above the scene on phones,
              floating just above the moon from sm up. Appears the moment the
              rocket touches down (0.9s delay + 1.6s flight). */}
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.9 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ delay: 2.55, type: 'spring', stiffness: 240, damping: 18 }}
            className="relative z-10 mx-auto w-max text-center sm:absolute sm:bottom-[calc(81.2%+10px)] sm:left-[83.3%] sm:mx-0 sm:-translate-x-1/2"
          >
            <div className="brand-glow absolute -inset-x-16 -inset-y-10 -z-10" aria-hidden />
            <StarIcon
              className="lp-sparkle absolute -left-8 top-2 size-3.5 text-teal-300"
              style={{ animationDelay: '0.4s' }}
              aria-hidden
            />
            <StarIcon
              className="lp-sparkle absolute -right-9 top-8 size-2.5 text-accent-400"
              style={{ animationDelay: '1.3s' }}
              aria-hidden
            />
            <span
              className="lp-sparkle absolute -right-4 -top-2 size-1.5 rounded-full bg-teal-300 shadow-[0_0_8px_2px_rgb(56_189_248/0.7)]"
              style={{ animationDelay: '2s' }}
              aria-hidden
            />
            <p className="lp-score-glow text-4xl font-bold leading-none sm:text-5xl">
              <CountUp to={1590} />
            </p>
            <p className="mx-auto mt-2 hidden max-w-44 text-xs leading-snug text-white/60 sm:block">
              {t('landing.hero.scoreCaption')}
            </p>
          </motion.div>

          <RocketClimb className="lp-tree-glow mt-4 w-full sm:mt-0" />
          </div>

          {/* The three steps of the climb — each card sits under its knee
              of the ridge (1250 → 1380 → summit). */}
          <Stagger as="ol" className="relative mt-8 grid gap-5 sm:grid-cols-3" stagger={0.12}>
            {steps.map((n) => (
              <StaggerItem as="li" key={n}>
                <div className="lp-card group h-full rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur hover:-translate-y-1.5 hover:border-white/20 hover:bg-white/[0.07]">
                  <span className="lp-icon grid size-11 place-items-center rounded-xl bg-gradient-to-br from-brand-600 to-accent-500 text-base font-bold text-white shadow-[0_6px_16px_-4px_rgb(37_99_235/0.5)]">
                    {n}
                  </span>
                  <h3 className="mt-5 text-lg font-semibold">
                    {t(`landing.steps.s${n}.title` as never)}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/60">
                    {t(`landing.steps.s${n}.body` as never)}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </div>
    </section>
  );
}

/**
 * The score journey, flown: a rocket lifts off the valley floor, passes the
 * milestone scores, and lands on the Moon under the 1590 dream score — where
 * it stays parked for good (flame off, nose to the surface). Pure sky, no
 * mountains. Checkpoints land at x=150 / 450 and the Moon at x=750 — exactly
 * 1/6, 1/2 and 5/6 of the 900-unit canvas — so each aligns with its step
 * card below. The trajectory endpoint sits ON the moon's lower-left edge
 * (center 770,128, r=30), so the flight needs no separate landing move.
 */
const TRAJECTORY =
  'M60 470 C100 462 128 448 150 430 C230 392 370 325 450 280 ' +
  'C540 230 660 188 750 150';

function RocketClimb({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  const [landed, setLanded] = useState(false);
  const viewport = { once: true, amount: 0.35 } as const;
  const ease = [0.22, 1, 0.36, 1] as const;

  const draw = (delay: number, duration = 0.8) => ({
    initial: reduce ? undefined : { pathLength: 0, opacity: 0 },
    whileInView: { pathLength: 1, opacity: 1 },
    viewport,
    transition: { delay, duration, ease },
  });
  const pop = (delay: number) => ({
    initial: reduce ? undefined : { scale: 0, opacity: 0 },
    whileInView: { scale: 1, opacity: 1 },
    viewport,
    transition: { delay, type: 'spring' as const, stiffness: 260, damping: 18 },
    style: { transformBox: 'fill-box' as const, transformOrigin: '50% 100%' },
  });

  // The trajectory draws LINEARLY over 1.6s from t=0.9 with the rocket riding
  // its tip, so each milestone pops exactly as the rocket passes: delay =
  // 0.9 + 1.6 × (its fraction of the total path length — 13% and 57%).
  const milestones = [
    { x: 150, y: 430, label: '1250', at: 1.11 },
    { x: 450, y: 280, label: '1380', at: 1.81 },
  ] as const;

  return (
    <svg viewBox="0 0 900 520" className={className} fill="none" aria-hidden>
      <defs>
        <linearGradient
          id="lp-flight-stroke"
          gradientUnits="userSpaceOnUse"
          x1="60"
          y1="470"
          x2="750"
          y2="150"
        >
          <stop offset="0%" stopColor="var(--color-brand-500)" stopOpacity="0.25" />
          <stop offset="55%" stopColor="var(--color-brand-400)" stopOpacity="0.7" />
          <stop offset="100%" stopColor="var(--color-accent-400)" />
        </linearGradient>
        <linearGradient
          id="lp-summit-ground"
          gradientUnits="userSpaceOnUse"
          x1="20"
          y1="514"
          x2="880"
          y2="514"
        >
          <stop offset="0%" stopColor="var(--color-brand-500)" stopOpacity="0" />
          <stop offset="18%" stopColor="var(--color-brand-400)" stopOpacity="0.45" />
          <stop offset="82%" stopColor="var(--color-accent-400)" stopOpacity="0.45" />
          <stop offset="100%" stopColor="var(--color-accent-500)" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="lp-moon-fill" cx="38%" cy="32%" r="78%">
          <stop offset="0%" stopColor="#f5f9ff" />
          <stop offset="55%" stopColor="var(--color-brand-100)" />
          <stop offset="100%" stopColor="var(--color-brand-300)" />
        </radialGradient>
      </defs>

      {/* Ground line the launch pad sits on */}
      <motion.path d="M20 514 H880" stroke="url(#lp-summit-ground)" strokeWidth={2} {...draw(0, 1.2)} />

      {/* The Moon — the destination; the rocket lands here and stays */}
      <motion.g {...pop(0.5)} style={{ transformBox: 'fill-box', transformOrigin: '50% 50%' }}>
        <circle cx={770} cy={128} r={42} fill="var(--color-accent-400)" fillOpacity={0.1} />
        <circle cx={770} cy={128} r={30} fill="url(#lp-moon-fill)" />
        <circle cx={760} cy={116} r={6} fill="var(--color-brand-300)" fillOpacity={0.4} />
        <circle cx={781} cy={137} r={4.5} fill="var(--color-brand-300)" fillOpacity={0.35} />
        <circle cx={766} cy={140} r={3} fill="var(--color-brand-300)" fillOpacity={0.3} />
        <circle cx={784} cy={119} r={2.5} fill="var(--color-brand-300)" fillOpacity={0.35} />
      </motion.g>

      {/* Launch pad on the valley floor */}
      <motion.path
        d="M38 470 H92"
        stroke="var(--color-accent-400)"
        strokeOpacity={0.3}
        strokeWidth={2}
        {...draw(0.6, 0.3)}
      />

      {/* The flight path — the score journey. Linear so time maps 1:1 to
          distance along the path (milestones sync to the rocket). */}
      <motion.path
        d={TRAJECTORY}
        stroke="url(#lp-flight-stroke)"
        strokeWidth={3.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="lp-growth-glow"
        initial={reduce ? undefined : { pathLength: 0, opacity: 0 }}
        whileInView={{ pathLength: 1, opacity: 1 }}
        viewport={viewport}
        transition={{ delay: 0.9, duration: 1.6, ease: 'linear' }}
      />

      {/* Exhaust puffs at liftoff */}
      {!reduce && (
        <>
          <motion.circle
            cx={54}
            cy={466}
            r={9}
            fill="#fff"
            initial={{ opacity: 0, scale: 0.3 }}
            whileInView={{ opacity: [0, 0.4, 0], scale: [0.3, 1.7, 2] }}
            viewport={viewport}
            transition={{ delay: 0.95, duration: 1.1, times: [0, 0.25, 1] }}
            style={{ transformBox: 'fill-box', transformOrigin: '50% 50%' }}
          />
          <motion.circle
            cx={74}
            cy={470}
            r={6}
            fill="#fff"
            initial={{ opacity: 0, scale: 0.3 }}
            whileInView={{ opacity: [0, 0.3, 0], scale: [0.3, 1.6, 1.9] }}
            viewport={viewport}
            transition={{ delay: 1.1, duration: 1, times: [0, 0.25, 1] }}
            style={{ transformBox: 'fill-box', transformOrigin: '50% 50%' }}
          />
        </>
      )}

      {/* The rocket — one flight, nose leading the trail tip, ending parked
          on the Moon for good (the flame cuts out on touchdown). Under
          reduced motion it renders already landed — either way it never
          leaves the page. */}
      <motion.g
        className="lp-growth-glow"
        style={{
          offsetPath: `path("${TRAJECTORY}")`,
          offsetRotate: 'auto',
          ...(reduce ? { offsetDistance: '100%' } : {}),
        }}
        initial={reduce ? undefined : { offsetDistance: '0%', opacity: 0 }}
        whileInView={reduce ? undefined : { offsetDistance: '100%', opacity: 1 }}
        viewport={viewport}
        transition={{
          delay: 0.9,
          duration: 1.6,
          ease: 'linear',
          opacity: { delay: 0.9, duration: 0.2 },
        }}
        onAnimationComplete={() => setLanded(true)}
      >
        {/* Artwork shifted back so the NOSE rides the trajectory tip and
            rests against the moon's surface after touchdown. */}
        <g transform="translate(-16 0)">
          {!reduce && !landed && (
            <path
              className="lp-rocket-flame"
              d="M-13 0 C-20 -3.5 -26 -1.5 -31 0 C-26 1.5 -20 3.5 -13 0 Z"
              fill="var(--color-accent-400)"
              fillOpacity={0.9}
            />
          )}
          <path d="M16 0 C11 -6 2 -7 -9 -5 L-13 0 L-9 5 C2 7 11 6 16 0 Z" fill="#fff" />
          <circle cx={4} cy={0} r={2.8} fill="var(--color-navy-900)" />
          <path d="M-8 -5 L-15 -10 L-11 0 L-15 10 L-8 5" fill="var(--color-brand-400)" />
        </g>
      </motion.g>

      {/* Milestone scores appear the moment the rocket passes them */}
      {milestones.map((m) => (
        <motion.g key={m.label} {...pop(m.at)}>
          <circle
            cx={m.x}
            cy={m.y}
            r={6}
            fill="var(--color-navy-900)"
            stroke="var(--color-accent-400)"
            strokeWidth={2.5}
          />
          <text
            x={m.x - 16}
            y={m.y - 16}
            textAnchor="end"
            fontSize="17"
            fontWeight="600"
            fill="rgba(255,255,255,0.65)"
          >
            {m.label}
          </text>
        </motion.g>
      ))}

    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Metrics band                                                               */
/* -------------------------------------------------------------------------- */

function MetricsBand() {
  const t = useT();
  // Live admin-curated figures from GET /landing/stats. The backend returns
  // zeros until an admin sets them, so each field falls back to the
  // marketing defaults — the band must never read "0+ students".
  const stats = useQuery({
    queryKey: ['landing', 'stats'],
    queryFn: () => landingApi.stats(),
    staleTime: 5 * 60_000,
  });
  const live = (value: number | undefined, fallback: number) =>
    value && value > 0 ? value : fallback;
  const s = stats.data;
  const metrics = [
    { to: live(s?.students_count, 25000), suffix: '+', sep: true, label: t('landing.metrics.students') },
    { to: live(s?.average_score_gain, 180), prefix: '+', label: t('landing.metrics.avgGain') },
    { to: live(s?.practice_questions, 12000), suffix: '+', sep: true, label: t('landing.metrics.questions') },
    { to: live(s?.top_student_sat_score, 1570), label: t('landing.metrics.topScore') },
  ];
  return (
    // Floating glass proof-band, pulled up over the hero's bottom edge on
    // desktop so the navy → white hand-off feels layered instead of stacked.
    <section className="relative z-10 px-4 sm:px-6">
      <Stagger
        className="mx-auto grid max-w-7xl grid-cols-2 gap-y-8 rounded-2xl border border-white/10 bg-white/[0.06] px-6 py-9 shadow-[0_28px_70px_-30px_rgb(2_6_23/0.8)] backdrop-blur-md lg:-mt-14 lg:grid-cols-4 lg:divide-x lg:divide-white/10"
        stagger={0.1}
      >
        {metrics.map((m) => (
          <StaggerItem key={m.label} className="text-center lg:px-6">
            <p className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
              <CountUp
                to={m.to}
                prefix={m.prefix ?? ''}
                suffix={m.suffix ?? ''}
                separator={m.sep}
              />
            </p>
            <p className="mt-1 text-sm text-white/55">{m.label}</p>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}

/**
 * Slim infinite strip spelling out the anatomy of the Digital SAT — sections,
 * question counts, timing, score scale. The page trains for a very specific
 * exam; this strip says "we know it cold" with facts, not slogans. Pauses on
 * hover.
 */
function BlueprintStrip() {
  const t = useT();
  const items = [
    t('landing.blueprint.b1'),
    t('landing.blueprint.b2'),
    t('landing.blueprint.b3'),
    t('landing.blueprint.b4'),
    t('landing.blueprint.b5'),
    t('landing.blueprint.b6'),
  ];
  return (
    <div className="mt-12 overflow-hidden border-y border-white/10 bg-navy-900/40 py-4">
      <div className="lp-marquee">
        {[0, 1].map((copy) => (
          <ul key={copy} aria-hidden={copy === 1} className="flex shrink-0 items-center gap-10 pr-10">
            {items.map((label) => (
              <li
                key={label}
                className="flex items-center gap-3 whitespace-nowrap text-xs font-semibold uppercase tracking-[0.14em] text-white/45"
              >
                <span className="size-1.5 shrink-0 rounded-full bg-accent-400" aria-hidden />
                {label}
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Features                                                                    */
/* -------------------------------------------------------------------------- */

function FeaturesSection() {
  const t = useT();
  const features = [
    { icon: <PathIcon className="size-6" />, key: 'f1', viz: <AdaptivePlanViz /> },
    { icon: <FlagIcon className="size-6" />, key: 'f2', viz: null },
    { icon: <TrendingUpIcon className="size-6" />, key: 'f3', viz: null },
    { icon: <UsersIcon className="size-6" />, key: 'f4', viz: <MentorNoteViz /> },
  ] as const;

  return (
    <section id="features" className="py-24 text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-300">
            {t('landing.nav.features')}
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            {t('landing.features.title')}
          </h2>
          <p className="mt-4 text-base text-white/60">{t('landing.features.subtitle')}</p>
        </Reveal>

        {/* Bento layout: the first and last cards stretch wide on desktop. */}
        <Stagger className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" stagger={0.09}>
          {features.map((f, i) => (
            <StaggerItem key={f.key} className={cn(i === 0 || i === 3 ? 'lg:col-span-2' : '')}>
              <motion.article
                whileHover={{ y: -6 }}
                transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                className="lp-card group relative h-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur transition-shadow hover:border-white/20 hover:bg-white/[0.06] lg:p-7"
              >
                {/* Soft corner glow that wakes up on hover */}
                <div
                  className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br from-brand-500/25 to-accent-500/10 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
                  aria-hidden
                />
                <div
                  className={cn(
                    f.viz &&
                      'lg:grid lg:h-full lg:grid-cols-[minmax(0,1fr)_15rem] lg:items-center lg:gap-10',
                  )}
                >
                  <div>
                    <div className="lp-icon grid size-12 place-items-center rounded-xl bg-brand-500/15 text-brand-300 transition-colors group-hover:bg-brand-600 group-hover:text-white">
                      {f.icon}
                    </div>
                    <h3 className="mt-5 text-lg font-semibold">
                      {t(`landing.features.${f.key}.title` as never)}
                    </h3>
                    <p className="mt-2 max-w-lg text-sm leading-relaxed text-white/60">
                      {t(`landing.features.${f.key}.body` as never)}
                    </p>
                  </div>
                  {f.viz ? (
                    <div className="hidden lg:block" aria-hidden>
                      {f.viz}
                    </div>
                  ) : null}
                </div>
              </motion.article>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

/**
 * Mini product vignette for the wide "Adaptive learning" card: a today's-plan
 * panel with mastery bars, the weakest topic flagged as up next. Decorative
 * (aria-hidden by the caller) — it shows the product instead of describing it.
 */
function AdaptivePlanViz() {
  const t = useT();
  const rows = [
    { label: t('landing.features.f1.viz.r1'), pct: 42, focus: true },
    { label: t('landing.features.f1.viz.r2'), pct: 68, focus: false },
    { label: t('landing.features.f1.viz.r3'), pct: 86, focus: false },
  ];
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.05] p-4 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-white/80">{t('landing.features.f1.viz.title')}</p>
        <span className="rounded-full bg-brand-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-200">
          {t('landing.features.f1.viz.badge')}
        </span>
      </div>
      <ul className="mt-3 space-y-2.5">
        {rows.map((r) => (
          <li key={r.label}>
            <div className="mb-1 flex items-center justify-between gap-2 text-[11px]">
              <span className={cn('truncate', r.focus ? 'font-semibold text-white' : 'text-white/55')}>
                {r.label}
              </span>
              {r.focus ? (
                <span className="shrink-0 rounded-full bg-accent-500/20 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-accent-400">
                  {t('landing.features.f1.viz.focus')}
                </span>
              ) : null}
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500"
                style={{ width: `${r.pct}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Mini product vignette for the wide "Expert mentors" card: one line of real
 * mentor feedback from the same instructor featured further down the page.
 */
function MentorNoteViz() {
  const t = useT();
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.05] p-4 backdrop-blur-sm">
      <div className="flex items-center gap-2.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-600 to-accent-500 text-[11px] font-bold text-white">
          {instructor.initials}
        </span>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-xs font-semibold text-white">
            {t('auth.brand.instructor.name')}
          </p>
          <p className="text-[10px] text-white/40">{t('landing.features.f4.viz.meta')}</p>
        </div>
      </div>
      <p className="mt-3 rounded-lg rounded-tl-none border border-white/10 bg-white/[0.06] px-3 py-2.5 text-[11px] leading-relaxed text-white/70">
        {t('landing.features.f4.viz.quote')}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Demo — the platform on a MacBook                                           */
/* -------------------------------------------------------------------------- */

/** YouTube video ID for the demo player (the part after `watch?v=`). */
const DEMO_VIDEO_ID = 'JPY0mRdoLA0';

/**
 * Product-demo band: the MacBook Pro mockup photo (transparent WebP derived
 * from assets/mackbook mockup@3x.png with its white-background drop shadow
 * stripped for the navy theme), with a YouTube embed overlaid on its
 * measured screen area (left 9.15%, top 3.57%, 81.7% × 74.29% of the
 * trimmed image). The video starts automatically — muted, as browsers
 * require for autoplay — once the laptop scrolls into view; under reduced
 * motion the player loads but waits for the visitor to press play.
 */
function DemoSection() {
  const t = useT();
  const reduce = useReducedMotion();
  const screenRef = useRef<HTMLDivElement>(null);
  const inView = useInView(screenRef, { once: true, amount: 0.5 });
  const showVideo = inView && DEMO_VIDEO_ID.length > 0;

  return (
    <section className="relative overflow-hidden py-10 text-white sm:py-16">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            {t('landing.demo.title')}
          </h2>
          <p className="mt-4 text-base text-white/60">{t('landing.demo.subtitle')}</p>
        </Reveal>

        <Reveal className="relative mx-auto mt-12 max-w-5xl">
          {/* Halo behind the laptop */}
          <div className="brand-glow absolute -inset-x-24 -inset-y-16 -z-10" aria-hidden />

          <motion.div
            whileHover={reduce ? undefined : { y: -5 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            className="relative"
          >
            <img src={macbookMockup} alt="" className="w-full" draggable={false} aria-hidden />
            {/* Video layer, registered on the mockup's measured screen area */}
            <div
              ref={screenRef}
              className="absolute left-[9.15%] top-[3.57%] h-[74.29%] w-[81.7%] overflow-hidden rounded-[6px] bg-ink-950"
            >
              {showVideo ? (
                <iframe
                  className="absolute inset-0 h-full w-full"
                  src={`https://www.youtube-nocookie.com/embed/${DEMO_VIDEO_ID}?autoplay=${reduce ? 0 : 1}&mute=1&playsinline=1&rel=0`}
                  title={t('landing.demo.title')}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : (
                /* Thumbnail placeholder shown until the laptop scrolls into
                   view; gradient beneath if the thumbnail fails to load. */
                <div className="absolute inset-0 bg-gradient-to-br from-navy-900 via-navy-950 to-brand-900">
                  {DEMO_VIDEO_ID && (
                    <img
                      src={`https://i.ytimg.com/vi/${DEMO_VIDEO_ID}/maxresdefault.jpg`}
                      alt=""
                      loading="lazy"
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                      className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-80"
                    />
                  )}
                </div>
              )}
            </div>
            {/* Soft glow reflection under the laptop */}
            <div className="mx-auto -mt-2 h-5 w-2/3 rounded-full bg-brand-500/20 blur-2xl" aria-hidden />
          </motion.div>
        </Reveal>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Meet your instructor                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Instructor spotlight — the "learn from someone who's been there" section.
 * Photo path/initials come from the shared instructor config (same source as
 * the auth marketing panel) so swapping the photo updates both places.
 */
function InstructorSection() {
  const t = useT();
  const [photoFailed, setPhotoFailed] = useState(false);
  const showPhoto = Boolean(instructor.photoUrl) && !photoFailed;

  const chips = [
    t('landing.instructor.chip1'),
    t('landing.instructor.chip2'),
    t('landing.instructor.chip3'),
  ];

  const stats = [
    { to: 2, suffix: '+', icon: <ClockIcon className="size-6" />, label: t('landing.instructor.stat.years') },
    { to: 500, suffix: '+', icon: <UsersIcon className="size-6" />, label: t('landing.instructor.stat.students') },
    { to: 44, suffix: '+', icon: <BookIcon className="size-6" />, label: t('landing.instructor.stat.mocks') },
    { to: 1480, icon: <TrendingUpIcon className="size-6" />, label: t('landing.instructor.stat.avgScore') },
  ];

  return (
    // Navy band between the demo video and the results section.
    <section id="instructor" className="relative overflow-hidden py-24 text-white">
      <div className="lp-orb lp-orb--b absolute -left-16 bottom-24 h-72 w-72 bg-brand-500/20" />
      <div className="lp-orb lp-orb--a absolute -right-20 top-16 h-80 w-80 bg-accent-500/15" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16">
          {/* Portrait with floating name card */}
          <Reveal>
            <motion.div
              whileHover={{ y: -6 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              className="relative mx-auto w-full max-w-md lg:max-w-lg"
            >
              {/* Offset outline for depth, echoing the brand pattern */}
              <div
                className="pointer-events-none absolute -left-4 -top-4 h-40 w-40 rounded-tl-3xl border-l-2 border-t-2 border-brand-400/40"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute -inset-6 opacity-60 blur-3xl"
                style={{ background: 'radial-gradient(circle at 30% 30%, rgb(59 130 246 / 0.4), transparent 65%)' }}
                aria-hidden
              />
              <div className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-white/10 bg-navy-800 shadow-[0_32px_80px_-32px_rgb(37_99_235/0.6)]">
                {showPhoto ? (
                  <img
                    src={instructor.photoUrl}
                    alt={t(instructor.photoAltKey)}
                    loading="lazy"
                    onError={() => setPhotoFailed(true)}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div
                    className="grid h-full w-full place-items-center bg-gradient-to-br from-brand-600/40 to-accent-500/25 text-7xl font-bold text-white/90"
                    role="img"
                    aria-label={t(instructor.photoAltKey)}
                  >
                    {instructor.initials}
                  </div>
                )}
              </div>

              {/* Neon line with a bright sparkling head endlessly circling the
                  photo frame. Sibling of the overflow-hidden box so the glow
                  isn't clipped; rect geometry set in CSS to track the frame. */}
              <svg
                className="lp-map-glow pointer-events-none absolute inset-0 z-10 h-full w-full"
                aria-hidden
              >
                <rect pathLength={100} className="lp-frame-rect lp-frame-dash" />
                <rect pathLength={100} className="lp-frame-rect lp-frame-dash-head" />
              </svg>
              {[
                { pos: '-right-1.5 top-16', delay: '0s' },
                { pos: '-left-1.5 bottom-32', delay: '0.9s' },
                { pos: 'right-10 -bottom-1.5', delay: '1.7s' },
                { pos: 'left-14 -top-1.5', delay: '2.5s' },
              ].map((s) => (
                <span
                  key={s.pos}
                  aria-hidden
                  className={cn(
                    'lp-sparkle absolute z-10 size-1.5 rounded-full bg-teal-300 shadow-[0_0_8px_2px_rgb(56_189_248/0.7)]',
                    s.pos,
                  )}
                  style={{ animationDelay: s.delay }}
                />
              ))}
              <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/10 bg-navy-900/85 px-5 py-4 backdrop-blur sm:right-auto sm:min-w-[240px]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-300">
                  {t('landing.instructor.badge')}
                </p>
                <p className="mt-1 text-xl font-bold leading-tight">{t('auth.brand.instructor.name')}</p>
                <p className="mt-0.5 text-sm text-white/60">{t('auth.brand.instructor.role')}</p>
              </div>
            </motion.div>
          </Reveal>

          {/* Story, specialties, stats, CTA */}
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-300">
              {t('landing.instructor.eyebrow')}
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-[2.75rem] lg:leading-[1.15]">
              {t('landing.instructor.title')}
            </h2>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-white/70 sm:text-lg">
              {t('landing.instructor.bio')}
            </p>

            <ul className="mt-8 flex flex-wrap gap-3">
              {chips.map((chip) => (
                <li
                  key={chip}
                  className="flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white/90"
                >
                  <CheckIcon className="size-4 text-accent-400" />
                  {chip}
                </li>
              ))}
            </ul>

            <hr className="my-9 border-white/10" />

            <Stagger as="ul" className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4" stagger={0.08}>
              {stats.map((s) => (
                <StaggerItem as="li" key={s.label}>
                  <div className="grid size-11 place-items-center rounded-xl border border-white/10 bg-white/[0.06] text-brand-300">
                    {s.icon}
                  </div>
                  <p className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                    <CountUp to={s.to} suffix={s.suffix} />
                  </p>
                  <p className="mt-1.5 text-sm text-white/60">{s.label}</p>
                </StaggerItem>
              ))}
            </Stagger>

            <div className="mt-10">
              <Link to="/sign-up">
                <Button size="lg" className="lp-cta" rightIcon={<ArrowRightIcon />}>
                  {t('landing.instructor.cta')}
                </Button>
              </Link>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Final CTA                                                                   */
/* -------------------------------------------------------------------------- */

function FinalCtaSection() {
  const t = useT();
  return (
    <section className="px-4 py-24 sm:px-6">
      <Reveal className="mx-auto max-w-6xl">
        <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-navy-900 via-navy-900 to-navy-950 px-6 py-16 text-center text-white sm:px-12 sm:py-20">
          <div className="lp-mesh pointer-events-none absolute inset-0 opacity-80" />
          <div className="lp-orb lp-orb--a absolute -left-10 top-0 h-64 w-64 bg-brand-500/25" />
          <div className="lp-orb lp-orb--b absolute -right-10 bottom-0 h-72 w-72 bg-accent-500/20" />
          <div className="relative">
            <Logo size={52} variant="white" className="mx-auto" />
            <h2 className="mx-auto mt-6 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              {t('landing.cta.title')}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-white/70">
              {t('landing.cta.subtitle')}
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link to="/sign-up">
                <Button size="lg" className="lp-cta" rightIcon={<ArrowRightIcon />}>
                  {t('landing.cta.button')}
                </Button>
              </Link>
              <Link to="/sign-in">
                <Button
                  size="lg"
                  variant="ghost"
                  className="lp-btn-glass border border-white/25 text-white hover:bg-white/10"
                >
                  {t('landing.nav.signIn')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Footer                                                                      */
/* -------------------------------------------------------------------------- */

function PublicFooter() {
  const t = useT();
  return (
    <footer className="relative border-t border-white/10 py-12 text-white">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-4 sm:px-6 lg:flex-row">
        <div className="max-w-xs">
          <Logo withWordmark size={28} variant="white" />
          <p className="mt-4 text-sm text-white/55">{t('landing.footer.tagline')}</p>
        </div>
        <nav className="flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-white/60">
          <a href="#features" className="lp-nav-link hover:text-white">
            {t('landing.nav.features')}
          </a>
          <a href="#how-it-works" className="lp-nav-link hover:text-white">
            {t('landing.nav.howItWorks')}
          </a>
          <a href="#results" className="lp-nav-link hover:text-white">
            {t('landing.nav.testimonials')}
          </a>
          <Link to="/contacts" className="lp-nav-link hover:text-white">
            {t('landing.footer.contacts')}
          </Link>
        </nav>
      </div>
      <div className="mx-auto mt-8 max-w-7xl border-t border-white/10 px-4 pt-6 text-sm text-white/40 sm:px-6">
        {t('landing.footer.copyright')}
      </div>
    </footer>
  );
}

import type { TranslationKey } from '@/i18n/en';

/**
 * Config for the auth marketing panel. Everything user-facing is an i18n key
 * so copy stays localized (uz/ru/en); everything else (numbers, image paths,
 * initials) lives here so the panel is trivial to re-skin without touching JSX.
 */

/** Rotating value-prop lines shown under the hero headline. */
export const sloganKeys: TranslationKey[] = [
  'auth.brand.slogan1',
  'auth.brand.slogan2',
  'auth.brand.slogan3',
  'auth.brand.slogan4',
];

export interface InstructorConfig {
  nameKey: TranslationKey;
  roleKey: TranslationKey;
  promiseKey: TranslationKey;
  photoAltKey: TranslationKey;
  /** Path under /public. Falls back to initials if the file is missing. */
  photoUrl?: string;
  /** Fallback shown while/if the photo is unavailable. */
  initials: string;
}

export const instructor: InstructorConfig = {
  nameKey: 'auth.brand.instructor.name',
  roleKey: 'auth.brand.instructor.role',
  promiseKey: 'auth.brand.instructor.promise',
  photoAltKey: 'auth.brand.instructor.photoAlt',
  photoUrl: '/assets/instructors/instructor.jpg',
  initials: 'QI',
};

export interface StatConfig {
  /** Value the count-up animates to. */
  to: number;
  suffix?: string;
  labelKey: TranslationKey;
}

export const stats: StatConfig[] = [
  { to: 500, suffix: '+', labelKey: 'auth.brand.stat.students' },
  { to: 1480, labelKey: 'auth.brand.stat.avgScore' },
  { to: 44, suffix: '+', labelKey: 'auth.brand.stat.mocks' },
];

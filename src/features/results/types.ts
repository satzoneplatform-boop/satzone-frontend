/**
 * Student result shapes shown on the landing page.
 *
 * The data itself lives in the repo (`src/content/results/*.json`, photos in
 * `public/results/`) and ships inside the bundle — see src/content/results.
 */

/** Fields shared by every result, regardless of category. */
export interface BaseResult {
  id: string;
  studentName: string;
  photoUrl: string;
  testimonial?: string;
  /** Unpublished entries stay in the JSON but never render. */
  published: boolean;
}

export interface UniversityResult extends BaseResult {
  /** Optional — a strong score can be showcased before any acceptance. */
  universityName?: string;
  universityLogoUrl?: string;
  /** Displayed as "Region" (viloyat) — JSON field name kept for data compat. */
  country: string;
  overallScore: number;
  /** Optional — see universityName. */
  acceptanceStatus?: string;
}

export interface MathResult extends BaseResult {
  mathBefore: number;
  mathAfter: number;
  /** Derived in src/content/results: mathAfter - mathBefore. */
  improvement: number;
  overallScore?: number;
}

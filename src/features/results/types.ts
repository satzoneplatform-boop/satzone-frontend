/**
 * Student result shapes shown on the landing page.
 *
 * The data itself lives in the repo (`src/content/results/*.json`, images in
 * `public/results/`) and ships inside the bundle — see src/content/results.
 */

/** Fields shared by every result, regardless of category. */
export interface BaseResult {
  id: string;
  studentName: string;
  /** Unpublished entries stay in the JSON but never render. */
  published: boolean;
}

/**
 * An acceptance story OR a standalone high overall score — universityName
 * empty means "top score" (no acceptance yet), and the card adapts.
 */
export interface UniversityResult extends BaseResult {
  photoUrl: string;
  testimonial?: string;
  universityName?: string;
  universityLogoUrl?: string;
  /** Displayed as "Region" (viloyat) — JSON field name kept for data compat. */
  country: string;
  overallScore: number;
  /** Optional — e.g. "Accepted", "Full Scholarship". */
  acceptanceStatus?: string;
}

/**
 * A single SAT Math score — students sat the test once, so there is no
 * before/after. Name plus score only; no student photo, optionally a
 * certificate / score-report image.
 */
export interface MathResult extends BaseResult {
  mathScore: number;
  certificateUrl?: string;
}

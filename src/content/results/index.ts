import type { MathResult, UniversityResult } from '@/features/results/types';
import universityJson from './university.json';
import mathJson from './math.json';

/**
 * Student results content, checked into the repo.
 *
 * To add or edit a result:
 *   1. Drop the student photo (webp/jpg) into `public/results/` — kebab-case
 *      filename, e.g. `aziza-karimova.webp` — and reference it as
 *      `/results/aziza-karimova.webp`. External https URLs also work.
 *   2. Add the entry to `university.json` or `math.json` next to this file.
 *      Entries appear on the landing page in file order; set
 *      `"published": false` to stage one without showing it.
 *   3. Commit. The data ships inside the bundle — there is no results server.
 *
 * `improvement` is derived here so the JSON can never hold a stale value.
 */

interface PublishableEntry {
  published: boolean;
}

const visible = <T extends PublishableEntry>(entries: T[]): T[] =>
  entries.filter((entry) => entry.published);

export const universityResults: UniversityResult[] = visible(
  universityJson.results,
);

export const mathResults: MathResult[] = visible(mathJson.results).map(
  (entry) => ({
    ...entry,
    improvement: entry.mathAfter - entry.mathBefore,
  }),
);

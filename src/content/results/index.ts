import type { MathResult, UniversityResult } from '@/features/results/types';
import universityJson from './university.json';
import mathJson from './math.json';

/**
 * Student results content, checked into the repo.
 *
 * To add or edit a result:
 *   1. Prefer the local editor: `npm run dev` → http://localhost:5173/admin/results
 *      — it writes these files for you (photos/certificates land in
 *      `public/results/` as optimized webp).
 *   2. Or edit by hand: university entries go in `university.json` (photo
 *      required; leave `universityName` empty to present the entry as a top
 *      score instead of an acceptance). Math entries go in `math.json` —
 *      name + single `mathScore`, plus an optional `certificateUrl` image.
 *   3. Entries appear on the landing page in file order; set
 *      `"published": false` to stage one without showing it. Commit to ship —
 *      the data is bundled at build time; there is no results server.
 */

interface PublishableEntry {
  published: boolean;
}

const visible = <T extends PublishableEntry>(entries: T[]): T[] =>
  entries.filter((entry) => entry.published);

export const universityResults: UniversityResult[] = visible(
  universityJson.results,
);

export const mathResults: MathResult[] = visible(mathJson.results);

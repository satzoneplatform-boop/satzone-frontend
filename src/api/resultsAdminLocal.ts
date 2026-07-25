import type { MathResult, UniversityResult } from '@/features/results/types';

/**
 * Client for the dev-only results editor API (dev/resultsAdminPlugin.ts).
 *
 * Only the /admin/results panel talks to this, and that route exists only on
 * the local dev server — the middleware behind these endpoints edits
 * `src/content/results/*.json` and `public/results/` in place. There is no
 * auth: the API is reachable only on localhost while `npm run dev` runs.
 */

export type ResultCategory = 'university' | 'math';

/** Result type for a given category discriminant. */
export type ResultOf<C extends ResultCategory> = C extends 'university'
  ? UniversityResult
  : MathResult;

/** Editable payloads (the middleware assigns ids). */
export type ResultInput<C extends ResultCategory> = C extends 'university'
  ? Omit<UniversityResult, 'id'>
  : Omit<MathResult, 'id'>;

export class AdminApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'AdminApiError';
    this.status = status;
  }
}

const BASE = '/__results-admin';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init);
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const payload = (await res.json()) as { error?: { message?: string } };
      if (payload.error?.message) message = payload.error.message;
    } catch {
      /* non-JSON */
    }
    throw new AdminApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

const post = <T>(path: string, body: unknown): Promise<T> =>
  request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

export const localAdminApi = {
  list: <C extends ResultCategory>(category: C) =>
    request<{ results: ResultOf<C>[] }>(`/list?category=${category}`).then((r) => r.results),

  create: <C extends ResultCategory>(category: C, data: ResultInput<C>) =>
    post<{ result: ResultOf<C> }>('/create', { category, data }).then((r) => r.result),

  update: <C extends ResultCategory>(category: C, id: string, data: ResultInput<C>) =>
    post<{ result: ResultOf<C> }>('/update', { category, id, data }).then((r) => r.result),

  setPublished: (category: ResultCategory, id: string, published: boolean) =>
    post<{ result: UniversityResult | MathResult }>('/publish', { category, id, published }).then(
      (r) => r.result,
    ),

  remove: (category: ResultCategory, id: string) => post<void>('/delete', { category, id }),

  uploadImage: async (file: File): Promise<{ url: string }> =>
    request<{ url: string }>('/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'x-filename': encodeURIComponent(file.name),
      },
      body: file,
    }),
};

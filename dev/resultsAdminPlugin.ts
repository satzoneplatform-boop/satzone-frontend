import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import type { Plugin, Connect } from 'vite';
import type { ServerResponse } from 'node:http';

/**
 * Dev-only editor API behind the /admin/results panel.
 *
 * Registers `/__results-admin/*` middleware on the Vite dev server that edits
 * the repo's results content in place: `src/content/results/*.json` for data
 * and `public/results/` for photos. Nothing here exists in production — the
 * built site ships the JSON inside the bundle, and publishing an edit means
 * committing the changed files like any other code change.
 */

const CATEGORIES = ['university', 'math'] as const;
type Category = (typeof CATEGORIES)[number];

interface ResultRecord {
  id: string;
  studentName: string;
  published: boolean;
  [key: string]: unknown;
}

/** Optional string fields: '' from the form means "unset" — drop the key. */
const OPTIONAL_STRINGS = [
  'testimonial',
  'universityName',
  'universityLogoUrl',
  'acceptanceStatus',
  'certificateUrl',
];

export function resultsAdminPlugin(): Plugin {
  let root = process.cwd();

  const dataFile = (category: Category) =>
    path.join(root, 'src', 'content', 'results', `${category}.json`);
  const photosDir = () => path.join(root, 'public', 'results');

  // Serialize writes so two rapid saves can't interleave on the same file.
  let queue: Promise<unknown> = Promise.resolve();
  const enqueue = <T>(fn: () => Promise<T>): Promise<T> => {
    const run = queue.then(fn, fn);
    queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  };

  async function readAll(category: Category): Promise<ResultRecord[]> {
    const raw = await readFile(dataFile(category), 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.results) ? parsed.results : [];
  }

  async function writeAll(category: Category, results: ResultRecord[]): Promise<void> {
    // Pretty-print + trailing newline to match the checked-in formatting, so
    // hand edits and panel edits produce identical git diffs.
    await writeFile(dataFile(category), `${JSON.stringify({ results }, null, 2)}\n`, 'utf8');
  }

  function cleanRecord(id: string, data: Record<string, unknown>): ResultRecord {
    const record: Record<string, unknown> = { id };
    const copy = { ...data };
    delete copy.id;
    for (const [key, value] of Object.entries(copy)) {
      if (OPTIONAL_STRINGS.includes(key) && (value == null || value === '')) continue;
      if (value === undefined) continue;
      record[key] = value;
    }
    return record as ResultRecord;
  }

  function validate(category: Category, data: Record<string, unknown>): string | null {
    if (!String(data.studentName ?? '').trim()) return 'Student name is required.';
    if (category === 'university') {
      if (!String(data.photoUrl ?? '').trim()) return 'A student photo is required.';
      if (!String(data.country ?? '').trim()) return 'Region is required.';
      const score = Number(data.overallScore);
      if (!Number.isFinite(score) || score < 400 || score > 1600)
        return 'Overall SAT must be between 400 and 1600.';
    } else {
      const score = Number(data.mathScore);
      if (!Number.isFinite(score) || score < 200 || score > 800)
        return 'Math score must be between 200 and 800.';
    }
    return null;
  }

  function makeId(category: Category, studentName: string, taken: Set<string>): string {
    const slug =
      slugify(studentName) || `${category}-result`;
    let id = `${category}-${slug}`;
    let n = 2;
    while (taken.has(id)) id = `${category}-${slug}-${n++}`;
    return id;
  }

  function send(res: ServerResponse, status: number, body?: unknown): void {
    res.statusCode = status;
    if (body === undefined) {
      res.end();
      return;
    }
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(body));
  }

  function sendError(res: ServerResponse, status: number, message: string): void {
    send(res, status, { error: { code: `http_${status}`, message } });
  }

  async function readBody(req: Connect.IncomingMessage): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    return Buffer.concat(chunks);
  }

  function categoryOf(params: URLSearchParams | Record<string, unknown>): Category | null {
    const value =
      params instanceof URLSearchParams ? params.get('category') : params.category;
    return CATEGORIES.includes(value as Category) ? (value as Category) : null;
  }

  return {
    name: 'satzone:results-admin',
    apply: 'serve', // dev server only — never part of a build
    configResolved(config) {
      root = config.root;
    },
    configureServer(server) {
      server.middlewares.use('/__results-admin', (req, res) => {
        void handle(req, res).catch((err: unknown) => {
          console.error('[results-admin]', err);
          if (!res.writableEnded)
            sendError(res, 500, err instanceof Error ? err.message : 'Editor error');
        });
      });

      async function handle(req: Connect.IncomingMessage, res: ServerResponse): Promise<void> {
        const url = new URL(req.url ?? '/', 'http://localhost');
        const route = `${req.method} ${url.pathname}`;

        if (route === 'GET /list') {
          const category = categoryOf(url.searchParams);
          if (!category) return sendError(res, 400, 'Unknown or missing category');
          const all = await readAll(category);
          return send(res, 200, { results: all });
        }

        if (route === 'POST /upload') {
          const body = await readBody(req);
          if (!body.length) return sendError(res, 400, 'No image provided');
          const original = decodeURIComponent(String(req.headers['x-filename'] ?? 'photo'));
          const { default: sharp } = await import('sharp');
          const optimized = await sharp(body)
            .rotate() // honor EXIF orientation
            .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 82 })
            .toBuffer();
          await mkdir(photosDir(), { recursive: true });
          const base = slugify(original.replace(/\.[a-z0-9]+$/i, '')) || 'photo';
          let name = `${base}.webp`;
          let n = 2;
          while (existsSync(path.join(photosDir(), name))) name = `${base}-${n++}.webp`;
          await writeFile(path.join(photosDir(), name), optimized);
          return send(res, 201, { url: `/results/${name}` });
        }

        if (req.method !== 'POST') return sendError(res, 404, 'Unknown editor endpoint');

        const payload = JSON.parse((await readBody(req)).toString('utf8') || '{}') as {
          category?: string;
          id?: string;
          published?: boolean;
          data?: Record<string, unknown>;
        };
        const category = categoryOf(payload);
        if (!category) return sendError(res, 400, 'Unknown or missing category');

        if (url.pathname === '/create') {
          const data = payload.data ?? {};
          const problem = validate(category, data);
          if (problem) return sendError(res, 422, problem);
          return enqueue(async () => {
            const all = await readAll(category);
            const record = cleanRecord(
              makeId(category, String(data.studentName), new Set(all.map((r) => r.id))),
              data,
            );
            all.push(record);
            await writeAll(category, all);
            send(res, 201, { result: record });
          });
        }

        if (url.pathname === '/update') {
          const data = payload.data ?? {};
          const problem = validate(category, data);
          if (problem) return sendError(res, 422, problem);
          return enqueue(async () => {
            const all = await readAll(category);
            const idx = all.findIndex((r) => r.id === payload.id);
            if (idx === -1) return sendError(res, 404, 'Result not found');
            all[idx] = cleanRecord(all[idx].id, { ...all[idx], ...data });
            await writeAll(category, all);
            send(res, 200, { result: all[idx] });
          });
        }

        if (url.pathname === '/publish') {
          return enqueue(async () => {
            const all = await readAll(category);
            const record = all.find((r) => r.id === payload.id);
            if (!record) return sendError(res, 404, 'Result not found');
            record.published = Boolean(payload.published);
            await writeAll(category, all);
            send(res, 200, { result: record });
          });
        }

        if (url.pathname === '/delete') {
          return enqueue(async () => {
            const all = await readAll(category);
            const next = all.filter((r) => r.id !== payload.id);
            if (next.length === all.length) return sendError(res, 404, 'Result not found');
            await writeAll(category, next);
            send(res, 204);
          });
        }

        return sendError(res, 404, 'Unknown editor endpoint');
      }
    },
  };
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

# Idrokhub Frontend

React + TypeScript + Vite frontend for the Idrokhub / Edure learning platform.
Talks to the [satzone](https://github.com/Quvonchbek-Qurbonov/satzone) FastAPI
backend (`/api/v1/...`).

## Quick start

```bash
npm install
npm run dev      # http://localhost:5173, proxied to the backend
npm run build    # tsc -b && vite build → dist/
```

Backend URL is configured in [`vite.config.ts`](./vite.config.ts) — the dev
server proxies `/api/*` and `/media/*` to whatever is set there (with
`xfwd: true` so the backend sees the real client IP, required for IP-bound
HLS playback tokens).

## Architecture in one screen

```
src/
├── api/                # Typed thin wrappers around fetch()
│   ├── client.ts       # The only place fetch() is called. Adds auth header,
│   │                   #   handles 401 → /auth/refresh → retry.
│   ├── normalize.ts    # Backend → frontend shape adapters (rating_avg → rating
│   │                   #   etc). See "Backend quirks" below.
│   ├── auth.ts, me.ts, courses.ts, assessments.ts, ...
│   └── instructor.ts   # Instructor + admin endpoints
├── features/           # React Query hooks layered on top of api/
│   ├── auth/AuthProvider.tsx   # In-memory access token, refresh token in
│   │                            #   localStorage. `useAuth()` exposes user
│   │                            #   + login/logout/refresh.
│   ├── course/hooks.ts, learning/hooks.ts, ...
│   └── learning/completionStore.ts   # localStorage-backed lesson completion
│                                     #   tracker (no backend GET for this)
├── components/         # Reusable UI (ui/), feature surfaces (course/, learning/,
│   │                   #   dashboard/, ...), and layout (DashboardShell etc.)
│   └── player/         # hls.js wiring + custom video chrome
├── pages/              # Route components, grouped by feature
│   ├── auth/           # sign-in, sign-up, reset, google callback
│   ├── learning/       # lesson player, course-learn, assessment runner
│   ├── instructor/     # AssessmentsAdminPage
│   └── ...
├── routes/router.tsx   # Single source of truth for routes + auth guards
├── i18n/               # en/uz/ru dictionaries + I18nProvider
└── types/api.ts        # Shared backend response types
```

### The request pipeline (one example end-to-end)

```
<CurriculumNav>          (component)
  └── useQuery({ queryFn: () => assessmentsApi.sectionQuizStatus(id) })
        └── api.get<SectionQuizStatus>(`/sections/${id}/quiz/status`)
              └── request('GET', path)  ← src/api/client.ts
                    └── fetch('/api/v1/sections/.../quiz/status',
                              { headers: { Authorization: `Bearer ${token}` } })
                          → Vite dev proxy → backend
```

Every API call follows this pattern. Components never touch `fetch()`.

## Backend quirks worth knowing

These bit us during integration — read before changing related code:

- **Field-name mismatches.** Backend uses `rating_avg` (string), `ratings_count`,
  `enrollments_count`, `lectures_count`; frontend types declare `rating`,
  `reviews_count`, `students_count`, `lessons_count`. Don't change the
  frontend types — instead, every `coursesApi` / `enrollmentsApi` response
  goes through [`src/api/normalize.ts`](./src/api/normalize.ts) which adapts
  the shape. Add new endpoints there too if you hit a similar mismatch.
- **Instructor shape:** backend `name`/`title`/`rating_avg` → frontend
  `full_name`/`headline`/`rating`. Same normalization layer.
- **IP-bound HLS tokens.** `GET /lessons/{id}/playback` returns a manifest
  URL signed against the request's client IP. Vite's proxy must forward
  `X-Forwarded-For` (`xfwd: true`) or every segment fetch 401s. The HLS
  loader in [`VideoPlayer.tsx`](./src/components/player/VideoPlayer.tsx)
  also rewrites absolute manifest URLs back through the proxy origin
  (Safari's native HLS can't be intercepted, so we always prefer hls.js
  when available).
- **Lesson completion has no backend GET.** Only `PUT` to write. We mirror
  completion in localStorage via
  [`completionStore.ts`](./src/features/learning/completionStore.ts) and
  use it to drive the sequential lesson lock + section-quiz lock. It's
  per-device — clearing localStorage re-locks the curriculum.
- **Section quiz visibility.** For the "Section quiz" row to appear under
  a module, the backend's `assessments` row must have `is_section_quiz=true`,
  `section_id` set, and `status='published'`. Use the instructor admin
  page (`/instructor/courses/:slug/assessments`) to inspect / fix.
- **Rate limits.** The backend caps API calls per IP (`120 req / 60 s` by
  default). React Query's `staleTime` and `retry` defaults are tuned in
  [`src/lib/queryClient.ts`](./src/lib/queryClient.ts) to avoid blowing
  the budget.

## Auth flow

- **Tokens:** access in memory only; refresh in `localStorage`
  (see [`tokenStore.ts`](./src/api/tokenStore.ts)). On any refreshable
  401 the client mints a new pair via `/auth/refresh` and retries the
  original request once. Hard-logout codes wipe the store and dispatch
  `auth:logout` → `<AuthProvider>` redirects to `/sign-in`.
- **Email/password:** `authApi.login` → tokens persisted → `AuthProvider`
  reads `/auth/me`.
- **Google OAuth:** button on `/sign-in` → `window.location` to the
  backend's `/auth/google/login` → backend redirects through Google →
  Google redirects back to `<backend>/auth/google/callback` → backend
  redirects to `<frontend>/auth/google/callback#access_token=...&refresh_token=...`.
  The frontend's [`GoogleCallbackPage`](./src/pages/auth/GoogleCallbackPage.tsx)
  parses the fragment, persists tokens, wipes the fragment from history,
  and routes to `/`. The backend env var pointing to the frontend callback
  URL must match this path or the user lands on a 404.
- **Phone verify** is a backend gate on every authed endpoint (`403
  phone_not_verified`). Email/password sign-in routes to `/verify-phone`
  if not done; Google OAuth users skip this redirect.

## i18n

Three dictionaries: [`en.ts`](./src/i18n/en.ts), [`uz.ts`](./src/i18n/uz.ts),
[`ru.ts`](./src/i18n/ru.ts). The `TranslationKey` type is derived from `en.ts`
via `keyof typeof en`, so adding a key to `en.ts` immediately gives every
caller `t('your.key')` autocomplete — but `uz.ts` and `ru.ts` are typed as
`Record<TranslationKey, string>`, which means **every key in `en.ts` must also
exist in `uz.ts` and `ru.ts`** or TypeScript will fail the build.

Usage:
```tsx
import { useT } from '@/i18n/I18nProvider';
const t = useT();
<h1>{t('account.tabs.personal')}</h1>
<p>{t('learning.courseLearn.lessons', { n: 5 })}</p>   // {n} interpolation
```

Don't translate backend-driven content (course titles, instructor names,
lesson titles, descriptions, tags) — those come from the API as-is.

## Sequential lesson + quiz lock

Lessons unlock in curriculum order — clicking "next" before finishing the
current video is blocked. The signal is written by the lesson player's
`onProgress` when `position ≥ duration - 1`:

```ts
completionStore.markComplete(enrollment.id, lessonId);
```

Read by `useCompletedLessons(enrollmentId)` (subscribes to in-tab and
cross-tab `storage` events). The same store also gates section quizzes —
a quiz is unlocked only when every lesson in its section is in the set
(plus a separate `passed` short-circuit so retakes work).

The URL guard in `LessonPlayerPage` redirects locked lessons to the next
unlocked one — typing the URL bypasses the nav but not the gate.

## Instructor / admin tooling

`/instructor/courses/:slug/assessments` (visible to roles `instructor` and
`admin`) lists every assessment attached to a course with a per-row Edit
panel for `section_id` / `is_section_quiz` / `status`, and a one-click
"Pre-fill: make visible" that sets all three at once.

For admins, the same page surfaces a "Take ownership" button on the 403
panel — it upserts an instructor profile via `PUT /instructor/me/profile`
then PATCHes `/admin/courses/{id}` to reassign `instructor_id` to the admin.

## File-naming conventions

- `*Api` for typed API modules (e.g. `coursesApi`)
- `use*` for hooks (e.g. `useCourseDetail`)
- Pages live under `src/pages/<feature>/` and are PascalCase with the
  suffix `Page` (e.g. `LessonPlayerPage.tsx`)
- Layout shells under `src/components/layout/`, reusable primitives under
  `src/components/ui/`

## Scripts

| | |
|---|---|
| `npm run dev` | Vite dev server with API proxy |
| `npm run build` | Production build (`tsc -b && vite build`) |
| `npm run preview` | Serve the production build locally |
| `npx tsc --noEmit` | Type-check without emitting |

## Student results content

The landing page's "Results" section (university acceptances + SAT Math
improvements) is plain repo content — no server, no CMS, it ships inside the
built bundle:

- **Editor UI (recommended):** run `npm run dev` and open
  <http://localhost:5173/admin/results>. It's the full panel — add/edit/delete,
  publish toggle, photo upload with automatic webp optimization — and it writes
  the files below directly. Dev-server only: the route and its API middleware
  ([`dev/resultsAdminPlugin.ts`](./dev/resultsAdminPlugin.ts)) don't exist in
  production builds, so there's no password and nothing to host.
- Data: [`src/content/results/university.json`](./src/content/results/university.json)
  and [`src/content/results/math.json`](./src/content/results/math.json).
  Entries render in file order; set `"published": false` to stage an entry
  without showing it. `improvement` is derived at build time from
  `mathBefore`/`mathAfter` — don't add it to the JSON.
- Photos: drop a webp/jpg into [`public/results/`](./public/results/)
  (kebab-case, e.g. `aziza-karimova.webp`) and reference it as
  `/results/aziza-karimova.webp`. External https URLs also work.
- Either way, finish with a commit and deploy as usual — updating results is a
  normal git change, and the diff is the review.

## Deploy

This is checked in as a standalone git repo (origin `satzoneplatform-boop/satzone-frontend`).
On the EC2 box:

```bash
cd /home/deploy/frontend
git pull
npm install        # if package.json changed
npm run build
# whatever serves dist/ (nginx, etc.) picks up the new bundle
```

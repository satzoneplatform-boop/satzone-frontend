import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Switch } from '@/components/ui/Switch';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tabs } from '@/components/ui/Tabs';
import { Logo } from '@/components/brand/Logo';
import { TrendingUpIcon } from '@/components/icons';
import {
  AdminApiError,
  localAdminApi,
  type ResultCategory,
} from '@/api/resultsAdminLocal';
import type { MathResult, UniversityResult } from '@/features/results/types';

/**
 * Local results editor (route: /admin/results, dev server only).
 *
 * A UI over the repo's results content: it talks to the dev-only Vite
 * middleware (dev/resultsAdminPlugin.ts), which edits
 * `src/content/results/*.json` and saves photos into `public/results/`.
 * The route is not registered in production builds, so there is no auth —
 * publishing an edit means committing the changed files. Strings are inline
 * English on purpose; this is an internal ops tool, not part of the
 * localized public site.
 */
export function ResultsAdminPage() {
  return <ResultsManager />;
}

/* -------------------------------------------------------------------------- */
/* Manager                                                                    */
/* -------------------------------------------------------------------------- */

const TABS = [
  { value: 'university' as const, label: 'University Acceptances' },
  { value: 'math' as const, label: 'SAT Math Improvements' },
];

function ResultsManager() {
  const qc = useQueryClient();
  const [category, setCategory] = useState<ResultCategory>('university');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<UniversityResult | MathResult | null>(null);
  const [deleting, setDeleting] = useState<UniversityResult | MathResult | null>(null);

  const list = useQuery({
    queryKey: ['admin-results', category],
    queryFn: () => localAdminApi.list(category),
  });

  // The public landing section imports the JSON statically, so no query
  // invalidation is needed for it — Vite hot-reloads it when the file changes.
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin-results', category] });
  };

  const publish = useMutation<unknown, AdminApiError, { id: string; published: boolean }>({
    mutationFn: ({ id, published }) => localAdminApi.setPublished(category, id, published),
    onSuccess: invalidate,
  });

  const remove = useMutation<void, AdminApiError, string>({
    mutationFn: (id) => localAdminApi.remove(category, id),
    onSuccess: () => {
      setDeleting(null);
      invalidate();
    },
  });

  const items = list.data ?? [];

  return (
    <div className="min-h-screen bg-ink-50">
      <header className="border-b border-ink-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-4 sm:px-6">
          <Logo withWordmark size={26} />
          <span className="rounded-md bg-ink-100 px-2 py-0.5 text-xs font-semibold text-ink-600">
            Local editor
          </span>
          <span className="ml-auto text-xs text-ink-400">
            Edits write to <code className="font-mono">src/content/results</code> — commit &amp;
            deploy to publish
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-navy-900">Student results</h1>
            <p className="mt-1 text-sm text-ink-500">
              Manage what appears in the Results section of the landing page.
            </p>
          </div>
          <Button onClick={() => setCreating(true)}>Add result</Button>
        </div>

        <div className="flex justify-between gap-3">
          <Tabs items={TABS} value={category} onChange={setCategory} variant="underline" className="flex-1" />
        </div>

        {list.isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-2xl" />
            ))}
          </div>
        ) : list.isError ? (
          <ErrorBlock onRetry={() => list.refetch()} />
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ink-300 bg-white py-16 text-center">
            <p className="text-sm text-ink-500">No results yet in this category.</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => setCreating(true)}>
              Add the first one
            </Button>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.id}>
                <ResultRow
                  category={category}
                  result={item}
                  publishBusy={publish.isPending && publish.variables?.id === item.id}
                  onTogglePublish={() => publish.mutate({ id: item.id, published: !item.published })}
                  onEdit={() => setEditing(item)}
                  onDelete={() => setDeleting(item)}
                />
              </li>
            ))}
          </ul>
        )}
      </main>

      {(creating || editing) && (
        <ResultFormModal
          category={category}
          result={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            setCreating(false);
            setEditing(null);
            invalidate();
          }}
        />
      )}

      {deleting && (
        <Modal open onClose={() => setDeleting(null)} className="max-w-sm">
          <h2 className="text-lg font-bold text-navy-900">Delete this result?</h2>
          <p className="mt-2 text-sm text-ink-500">
            “{deleting.studentName}” will be permanently removed. This cannot be undone.
          </p>
          {remove.isError && (
            <p role="alert" className="mt-3 rounded-md bg-danger-50 px-3 py-2 text-sm text-danger-600">
              Couldn't delete — please try again.
            </p>
          )}
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button variant="danger" loading={remove.isPending} onClick={() => remove.mutate(deleting.id)}>
              Delete
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ErrorBlock({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-danger-500/30 bg-danger-50 py-14 text-center">
      <p className="text-sm text-danger-600">
        Couldn't load results. This editor only works on the local dev server (npm run dev).
      </p>
      <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* List row                                                                   */
/* -------------------------------------------------------------------------- */

function ResultRow({
  category,
  result,
  publishBusy,
  onTogglePublish,
  onEdit,
  onDelete,
}: {
  category: ResultCategory;
  result: UniversityResult | MathResult;
  publishBusy: boolean;
  onTogglePublish: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-ink-200 bg-white p-3 shadow-[var(--shadow-card)] sm:flex-nowrap">
      {(() => {
        const thumb =
          category === 'university'
            ? (result as UniversityResult).photoUrl
            : (result as MathResult).certificateUrl;
        return thumb ? (
          <img
            src={thumb}
            alt=""
            className="size-14 shrink-0 rounded-xl object-cover"
            onError={(e) => (e.currentTarget.style.visibility = 'hidden')}
          />
        ) : (
          <div className="grid size-14 shrink-0 place-items-center rounded-xl bg-ink-100 text-xs font-bold text-ink-400">
            {result.studentName.trim().charAt(0).toUpperCase()}
          </div>
        );
      })()}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-semibold text-navy-900">{result.studentName}</p>
          <Badge tone={result.published ? 'success' : 'neutral'}>
            {result.published ? 'Published' : 'Draft'}
          </Badge>
        </div>
        <p className="mt-0.5 truncate text-sm text-ink-500">
          {category === 'university'
            ? [
                (result as UniversityResult).universityName,
                (result as UniversityResult).country,
                (result as UniversityResult).overallScore,
              ]
                .filter(Boolean)
                .join(' · ')
            : 'SAT Math'}
        </p>
      </div>

      {category === 'math' && (
        <span className="inline-flex items-center gap-1 rounded-lg bg-brand-50 px-2.5 py-1 text-sm font-bold text-brand-600">
          <TrendingUpIcon className="size-4" />
          {(result as MathResult).mathScore}
        </span>
      )}

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-ink-500">
          <Switch
            checked={result.published}
            onChange={onTogglePublish}
            disabled={publishBusy}
            label="Published"
          />
        </label>
        <Button size="sm" variant="ghost" onClick={onEdit}>
          Edit
        </Button>
        <Button size="sm" variant="ghost" className="text-danger-600" onClick={onDelete}>
          Delete
        </Button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Create / edit form                                                         */
/* -------------------------------------------------------------------------- */

interface FormState {
  studentName: string;
  photoUrl: string;
  photoFile: File | null;
  testimonial: string;
  published: boolean;
  universityName: string;
  universityLogoUrl: string;
  logoFile: File | null;
  country: string;
  overallScore: string;
  acceptanceStatus: string;
  mathScore: string;
  certificateUrl: string;
  certificateFile: File | null;
}

function initialForm(result: UniversityResult | MathResult | null, category: ResultCategory): FormState {
  const uni = category === 'university' ? (result as UniversityResult | null) : null;
  const math = category === 'math' ? (result as MathResult | null) : null;
  return {
    studentName: result?.studentName ?? '',
    photoUrl: uni?.photoUrl ?? '',
    photoFile: null,
    testimonial: uni?.testimonial ?? '',
    published: result?.published ?? false,
    universityName: uni?.universityName ?? '',
    universityLogoUrl: uni?.universityLogoUrl ?? '',
    logoFile: null,
    country: uni?.country ?? '',
    overallScore: uni?.overallScore != null ? String(uni.overallScore) : '',
    acceptanceStatus: uni?.acceptanceStatus ?? '',
    mathScore: math?.mathScore != null ? String(math.mathScore) : '',
    certificateUrl: math?.certificateUrl ?? '',
    certificateFile: null,
  };
}

function ResultFormModal({
  category,
  result,
  onClose,
  onSaved,
}: {
  category: ResultCategory;
  result: UniversityResult | MathResult | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = Boolean(result);
  const [form, setForm] = useState<FormState>(() => initialForm(result, category));
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const save = useMutation<unknown, AdminApiError, void>({
    mutationFn: async () => {
      // Upload any newly-picked images first, then persist the record.
      if (category === 'university') {
        let photoUrl = form.photoUrl;
        if (form.photoFile) photoUrl = (await localAdminApi.uploadImage(form.photoFile)).url;
        let logoUrl = form.universityLogoUrl;
        if (form.logoFile) logoUrl = (await localAdminApi.uploadImage(form.logoFile)).url;

        // Optional fields are sent as '' (not dropped) so an edit can clear
        // them — the middleware turns '' into "unset" and merge-updates.
        const payload = {
          studentName: form.studentName.trim(),
          photoUrl,
          testimonial: form.testimonial.trim(),
          published: form.published,
          universityName: form.universityName.trim(),
          universityLogoUrl: logoUrl,
          country: form.country.trim(),
          overallScore: Number(form.overallScore),
          acceptanceStatus: form.acceptanceStatus.trim(),
        };
        return isEdit
          ? localAdminApi.update('university', result!.id, payload)
          : localAdminApi.create('university', payload);
      }
      let certificateUrl = form.certificateUrl;
      if (form.certificateFile)
        certificateUrl = (await localAdminApi.uploadImage(form.certificateFile)).url;
      const payload = {
        studentName: form.studentName.trim(),
        published: form.published,
        mathScore: Number(form.mathScore),
        certificateUrl,
      };
      return isEdit
        ? localAdminApi.update('math', result!.id, payload)
        : localAdminApi.create('math', payload);
    },
    onSuccess: onSaved,
    onError: (err) => setError(err.message || 'Something went wrong. Please try again.'),
  });

  function validate(): string | null {
    if (!form.studentName.trim()) return 'Student name is required.';
    if (category === 'university') {
      if (!form.photoUrl && !form.photoFile) return 'A student photo is required.';
      if (!form.country.trim()) return 'Region is required.';
      const score = Number(form.overallScore);
      if (!form.overallScore || score < 400 || score > 1600) return 'Overall SAT must be between 400 and 1600.';
    } else {
      const score = Number(form.mathScore);
      if (!form.mathScore || score < 200 || score > 800) return 'Math score must be between 200 and 800.';
    }
    return null;
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    save.mutate();
  }

  return (
    <Modal open onClose={onClose} className="max-w-lg">
      <form onSubmit={onSubmit} className="-mr-2 max-h-[82vh] space-y-5 overflow-y-auto pr-2">
        <h2 className="text-lg font-bold text-navy-900">
          {isEdit ? 'Edit result' : 'Add result'} ·{' '}
          <span className="text-ink-500">{category === 'university' ? 'University' : 'SAT Math'}</span>
        </h2>

        {category === 'university' && (
          <ImageField
            label="Student photo"
            url={form.photoUrl}
            file={form.photoFile}
            onPick={(file) => set('photoFile', file)}
            onClear={() => {
              set('photoFile', null);
              set('photoUrl', '');
            }}
            onError={setError}
          />
        )}

        <Input
          label="Student name"
          value={form.studentName}
          onChange={(e) => set('studentName', e.target.value)}
          required
        />

        {category === 'university' ? (
          <>
            <Input
              label="University name (optional)"
              hint="Leave empty if the student isn't accepted anywhere yet"
              value={form.universityName}
              onChange={(e) => set('universityName', e.target.value)}
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                label="Region"
                value={form.country}
                onChange={(e) => set('country', e.target.value)}
                required
              />
              <Input
                label="Overall SAT score"
                type="number"
                min={400}
                max={1600}
                value={form.overallScore}
                onChange={(e) => set('overallScore', e.target.value)}
                required
              />
            </div>
            <Input
              label="Acceptance status (optional)"
              hint="e.g. Accepted, Full Scholarship, Waitlist → Accepted"
              value={form.acceptanceStatus}
              onChange={(e) => set('acceptanceStatus', e.target.value)}
            />
            <ImageField
              label="University logo (optional)"
              url={form.universityLogoUrl}
              file={form.logoFile}
              onPick={(file) => set('logoFile', file)}
              onClear={() => {
                set('logoFile', null);
                set('universityLogoUrl', '');
              }}
              onError={setError}
              compact
            />
          </>
        ) : (
          <>
            <Input
              label="SAT Math score"
              hint="They sat the test once — a single score, no before/after"
              type="number"
              min={200}
              max={800}
              value={form.mathScore}
              onChange={(e) => set('mathScore', e.target.value)}
              required
            />
            <ImageField
              label="Certificate / score report (optional)"
              url={form.certificateUrl}
              file={form.certificateFile}
              onPick={(file) => set('certificateFile', file)}
              onClear={() => {
                set('certificateFile', null);
                set('certificateUrl', '');
              }}
              onError={setError}
            />
          </>
        )}

        {category === 'university' && (
          <Textarea
            label="Testimonial (optional)"
            rows={3}
            value={form.testimonial}
            onChange={(e) => set('testimonial', e.target.value)}
          />
        )}

        <div className="rounded-xl border border-ink-200 p-4">
          <Switch
            checked={form.published}
            onChange={(v) => set('published', v)}
            label="Published (visible on the landing page)"
          />
        </div>

        {error && (
          <p role="alert" className="rounded-md border border-danger-500/30 bg-danger-50 px-3 py-2 text-sm text-danger-600">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={save.isPending}>
            {isEdit ? 'Save changes' : 'Create result'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/* Image upload field (with live preview)                                     */
/* -------------------------------------------------------------------------- */

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function ImageField({
  label,
  url,
  file,
  onPick,
  onClear,
  onError,
  compact = false,
}: {
  label: string;
  url: string;
  file: File | null;
  onPick: (file: File) => void;
  onClear: () => void;
  onError: (message: string) => void;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Local preview URL for the pending file; revoked on change/unmount so we
  // don't leak object URLs. Derived (not stored in state) to keep the effect
  // side-effect-free apart from cleanup.
  const objectUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  const preview = objectUrl ?? (url || null);

  function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file
    if (!picked) return;
    if (!picked.type.startsWith('image/')) {
      onError('Please choose an image file.');
      return;
    }
    if (picked.size > MAX_IMAGE_BYTES) {
      onError('Image must be 5 MB or smaller.');
      return;
    }
    onPick(picked);
  }

  const box = compact ? 'size-16' : 'size-24';

  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-ink-700">{label}</span>
      <div className="flex items-center gap-4">
        <div className={`relative shrink-0 overflow-hidden rounded-2xl border border-ink-200 bg-ink-50 ${box}`}>
          {preview ? (
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center text-xs text-ink-400">No image</div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handlePick} />
          <Button type="button" size="sm" variant="outline" onClick={() => inputRef.current?.click()}>
            {preview ? 'Replace image' : 'Upload image'}
          </Button>
          {preview && (
            <Button type="button" size="sm" variant="ghost" className="text-danger-600" onClick={onClear}>
              Remove
            </Button>
          )}
          {file && <span className="text-xs text-ink-400">Will upload on save · optimized automatically</span>}
        </div>
      </div>
    </div>
  );
}

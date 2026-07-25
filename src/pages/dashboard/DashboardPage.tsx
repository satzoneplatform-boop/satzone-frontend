import { useState } from 'react';
import { DashboardGreeting } from '@/components/dashboard/DashboardGreeting';
import { LatestCourseCard } from '@/components/dashboard/LatestCourseCard';
import { LearningPathCard } from '@/components/dashboard/LearningPathCard';
import { NextActionsRow } from '@/components/dashboard/NextActionsRow';
import { ProgressOverviewCard } from '@/components/dashboard/ProgressOverviewCard';
import { RecommendationsRow } from '@/components/dashboard/RecommendationsRow';
import { WeeklyActivityCard } from '@/components/dashboard/WeeklyActivityCard';
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';
import { Stagger, StaggerItem } from '@/components/motion/Stagger';
import { useAuth } from '@/features/auth/AuthProvider';
import {
  useHomeFeed,
  useOnboarding,
  useWeeklyActivity,
} from '@/features/home/hooks';
import { useT } from '@/i18n/I18nProvider';
import { WeeklyGoalModal } from './WeeklyGoalModal';

/** Sunday-first weekday index (0..6) from an ISO date, parsed as local time
 * so the day never shifts across timezones. */
function weekdayIndex(isoDate: string): number {
  const [y, m, d] = isoDate.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

export function DashboardPage() {
  const { user } = useAuth();
  const home = useHomeFeed();
  const onboarding = useOnboarding();
  const activity = useWeeklyActivity();
  const t = useT();
  const [goalOpen, setGoalOpen] = useState(false);

  if (home.isLoading || onboarding.isLoading || activity.isLoading) {
    return <DashboardSkeleton />;
  }

  if (home.error) {
    return (
      <div className="grid place-items-center py-24 text-center">
        <p className="text-sm text-ink-500">{t('dashboard.errorLoading')}</p>
      </div>
    );
  }

  const continueLearning = home.data?.continue_learning ?? [];
  const recommended = home.data?.recommended ?? [];
  const weeklyGoalMinutes = onboarding.data?.profile?.weekly_goal_minutes ?? 0;
  const coursesCompleted = continueLearning.filter((e) => e.completed_at).length;

  // Real study activity from GET /me/activity/weekly (previously hardcoded
  // to empty). Days with any learned minutes count as study days.
  const studyDays = (activity.data?.days ?? [])
    .filter((d) => d.minutes_learned > 0)
    .map((d) => weekdayIndex(d.activity_date));
  const studiedMinutes = activity.data?.minutes_learned_total ?? 0;
  const lessonsCompleted = (activity.data?.days ?? []).reduce(
    (sum, d) => sum + d.lessons_completed,
    0,
  );

  return (
    <div className="space-y-6">
      <DashboardGreeting
        user={user}
        enrollments={continueLearning}
        weeklyGoalMinutes={weeklyGoalMinutes}
      />

      <Stagger
        className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]"
        onView={false}
        stagger={0.1}
      >
        <StaggerItem className="h-full [&>*]:h-full">
          <LatestCourseCard enrollment={continueLearning[0] ?? null} />
        </StaggerItem>
        <StaggerItem className="h-full [&>*]:h-full">
          <WeeklyActivityCard
            user={user}
            weeklyGoalMinutes={weeklyGoalMinutes}
            studyDays={studyDays}
            studiedMinutes={studiedMinutes}
            lessonsCompleted={lessonsCompleted}
            onSetPlan={() => setGoalOpen(true)}
          />
        </StaggerItem>
      </Stagger>

      <Stagger className="grid grid-cols-1 gap-6 lg:grid-cols-2" stagger={0.1}>
        <StaggerItem className="h-full [&>*]:h-full">
          <LearningPathCard enrollments={continueLearning} />
        </StaggerItem>
        <StaggerItem className="h-full [&>*]:h-full">
          <ProgressOverviewCard enrollments={continueLearning} />
        </StaggerItem>
      </Stagger>

      <NextActionsRow coursesCompleted={coursesCompleted} />

      {recommended.length > 0 && (
        <RecommendationsRow title={t('dashboard.recommendedTitle')} courses={recommended} />
      )}

      <WeeklyGoalModal
        open={goalOpen}
        onClose={() => setGoalOpen(false)}
        initialMinutes={weeklyGoalMinutes}
      />
    </div>
  );
}

/** Skeleton mirroring the dashboard layout while the feed loads. */
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-2xl border border-ink-200 bg-white p-6 shadow-[var(--shadow-card)]">
        <div className="space-y-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-3 w-64" />
        </div>
        <Skeleton circle className="size-28" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <SkeletonCard className="h-56" />
        <SkeletonCard className="h-56" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SkeletonCard className="h-64" />
        <SkeletonCard className="h-64" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SkeletonCard className="h-36" />
        <SkeletonCard className="h-36" />
        <SkeletonCard className="h-36" />
      </div>
    </div>
  );
}

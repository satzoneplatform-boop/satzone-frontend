import { createBrowserRouter, Navigate } from 'react-router-dom';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { ExplorePage } from '@/pages/explore/ExplorePage';
import { SearchResultsPage } from '@/pages/explore/SearchResultsPage';
import { CourseDetailPage } from '@/pages/course/CourseDetailPage';
import { CheckoutPage } from '@/pages/checkout/CheckoutPage';
import { CheckoutSuccessPage } from '@/pages/checkout/CheckoutSuccessPage';
import { MyLearningsPage } from '@/pages/learning/MyLearningsPage';
import { CourseLearnPage } from '@/pages/learning/CourseLearnPage';
import { AssessmentOverviewPage } from '@/pages/learning/AssessmentOverviewPage';
import { AssessmentTakePage } from '@/pages/learning/AssessmentTakePage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { SignInPage } from '@/pages/auth/SignInPage';
import { SignUpStartPage } from '@/pages/auth/SignUpStartPage';
import { CompleteDataPage } from '@/pages/auth/CompleteDataPage';
import { CheckEmailPage } from '@/pages/auth/CheckEmailPage';
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage';
import { ResetSuccessPage } from '@/pages/auth/ResetSuccessPage';
import { VerifyPhonePage } from '@/pages/auth/VerifyPhonePage';
import { AccountPage } from '@/pages/account/AccountPage';
import { AnalyticsPage } from '@/pages/analytics/AnalyticsPage';
import { ContactsPage } from '@/pages/contacts/ContactsPage';
import { AssessmentsAdminPage } from '@/pages/instructor/AssessmentsAdminPage';
import { PromocodesAdminPage } from '@/pages/admin/PromocodesAdminPage';
import { QuizzesPage } from '@/pages/quizzes/QuizzesPage';
import { QuizCoursePage } from '@/pages/quizzes/QuizCoursePage';
import { QuizSetupPage } from '@/pages/quizzes/QuizSetupPage';
import { QuizPlayPage } from '@/pages/quizzes/QuizPlayPage';
import { GoogleCallbackPage } from '@/pages/auth/GoogleCallbackPage';
import { VerifyEmailPage } from '@/pages/auth/VerifyEmailPage';
import { LandingPage } from '@/pages/LandingPage';
import { ComingSoon } from '@/pages/ComingSoonPage';
import { RedirectIfAuthed, RequireAuth } from './guards';
import { LazyLessonPlayerPage, LazyResultsAdminPage } from './lazyPages';

export const router = createBrowserRouter([
  // Public auth-flow pages — bounce away if already signed in.
  {
    element: <RedirectIfAuthed />,
    children: [
      { path: '/sign-in', element: <SignInPage /> },
      { path: '/sign-up', element: <SignUpStartPage /> },
      { path: '/sign-up/details', element: <CompleteDataPage /> },
      { path: '/login', element: <Navigate to="/sign-in" replace /> },
    ],
  },

  // Public marketing landing — visible to everyone (authed or not). When
  // authed, the page surfaces a "Go to dashboard" CTA but doesn't auto-
  // redirect (so authed users can still share / browse the public site).
  { path: '/', element: <LandingPage /> },

  // Local results editor — dev server only. Not in navigation; it edits the
  // repo's results content through the dev-only middleware and the route
  // simply doesn't exist in production builds.
  ...(import.meta.env.DEV ? [{ path: '/admin/results', element: <LazyResultsAdminPage /> }] : []),

  // Always-public pages.
  { path: '/sign-up/check-email', element: <CheckEmailPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
  { path: '/reset-password/success', element: <ResetSuccessPage /> },
  // OAuth handoff — must be always-public because the user arrives
  // unauthenticated and this page is the one that completes sign-in.
  { path: '/auth/google/callback', element: <GoogleCallbackPage /> },
  { path: '/auth/verify-email', element: <VerifyEmailPage /> },

  // Full-screen authed pages (no dashboard shell).
  // /verify-phone must live here — RequireAuth lets it through specifically
  // so the user can clear the phone-verify gate (FRONTEND.md §2).
  {
    element: <RequireAuth />,
    children: [
      { path: '/verify-phone', element: <VerifyPhonePage /> },
      { path: '/courses/:slug/assessments/:assessmentId/take', element: <AssessmentTakePage /> },
    ],
  },

  // Authenticated app surface.
  {
    element: <RequireAuth />,
    children: [
      {
        element: <DashboardShell />,
        children: [
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/explore', element: <ExplorePage /> },
          { path: '/explore/search', element: <SearchResultsPage /> },
          { path: '/courses/:slug', element: <CourseDetailPage /> },
          { path: '/courses/:slug/checkout', element: <CheckoutPage /> },
          { path: '/courses/:slug/checkout/success', element: <CheckoutSuccessPage /> },
          { path: '/courses/:slug/learn', element: <CourseLearnPage /> },
          { path: '/courses/:slug/lessons/:lessonId', element: <LazyLessonPlayerPage /> },
          { path: '/courses/:slug/assessments/:assessmentId', element: <AssessmentOverviewPage /> },
          { path: '/instructor/courses/:slug/assessments', element: <AssessmentsAdminPage /> },
          { path: '/admin/promocodes', element: <PromocodesAdminPage /> },
          { path: '/learning-path', element: <MyLearningsPage /> },
          { path: '/analytics', element: <AnalyticsPage /> },
          { path: '/account', element: <AccountPage /> },
          { path: '/contacts', element: <ContactsPage /> },
          { path: '/quizzes', element: <QuizzesPage /> },
          { path: '/quizzes/:slug', element: <QuizCoursePage /> },
          { path: '/quizzes/:slug/q/:quizId', element: <QuizSetupPage /> },
          { path: '/quizzes/:slug/q/:quizId/play', element: <QuizPlayPage /> },
          // Sidebar nav stubs — replace as those pages are designed.
          { path: '/courses', element: <ComingSoon title="Courses" /> },
          { path: '/notifications', element: <ComingSoon title="Notifications" /> },
          { path: '/inbox', element: <ComingSoon title="Inbox" /> },
          { path: '/help', element: <ComingSoon title="Help Center" /> },
        ],
      },
    ],
  },

  { path: '*', element: <NotFoundPage /> },
]);

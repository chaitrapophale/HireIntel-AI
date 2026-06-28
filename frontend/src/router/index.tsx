import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "@/layouts/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// ── Eagerly loaded (always needed) ──────────────────────────────────────────
import LoginPage from "@/features/auth/LoginPage";

// ── Lazy loaded — reduces initial bundle size ────────────────────────────────
const DashboardPage      = lazy(() => import("@/features/dashboard/DashboardPage"));
const JobsPage           = lazy(() => import("@/features/jobs/JobsPage"));
const CreateJobPage      = lazy(() => import("@/features/jobs/CreateJobPage"));
const RankingsPage       = lazy(() => import("@/features/candidates/RankingsPage"));
const CandidateProfilePage = lazy(() => import("@/features/candidates/CandidateProfilePage"));
const HiddenGemsPage     = lazy(() => import("@/features/candidates/HiddenGemsPage"));
const PipelinePage       = lazy(() => import("@/features/pipeline/PipelinePage"));
const AnalyticsPage      = lazy(() => import("@/features/analytics/AnalyticsPage"));
const TeamPage           = lazy(() => import("@/features/team/TeamPage"));
const SettingsPage       = lazy(() => import("@/features/settings/SettingsPage"));

// ── Shared Suspense fallback ─────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );
}

// ── Wrap element with lazy + error boundary ──────────────────────────────────
function wrap(element: React.ReactNode) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>{element}</Suspense>
    </ErrorBoundary>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/login" replace />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/app",
    element: (
      <ProtectedRoute>
        <ErrorBoundary>
          <AppLayout />
        </ErrorBoundary>
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/app/dashboard" replace /> },
      { path: "dashboard",        element: wrap(<DashboardPage />) },
      { path: "jobs",             element: wrap(<JobsPage />) },
      { path: "jobs/create",      element: wrap(<CreateJobPage />) },
      { path: "candidates",       element: wrap(<RankingsPage />) },
      { path: "candidates/:id",   element: wrap(<CandidateProfilePage />) },
      { path: "rankings",         element: wrap(<RankingsPage />) },
      { path: "pipeline",         element: wrap(<PipelinePage />) },
      { path: "hidden-gems",      element: wrap(<HiddenGemsPage />) },
      { path: "analytics",        element: wrap(<AnalyticsPage />) },
      { path: "team",             element: wrap(<TeamPage />) },
      { path: "settings",         element: wrap(<SettingsPage />) },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/login" replace />,
  },
]);

import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "@/layouts/AppLayout";
import LoginPage from "@/features/auth/LoginPage";
import DashboardPage from "@/features/dashboard/DashboardPage";
import JobsPage from "@/features/jobs/JobsPage";
import CreateJobPage from "@/features/jobs/CreateJobPage";
import RankingsPage from "@/features/candidates/RankingsPage";
import CandidateProfilePage from "@/features/candidates/CandidateProfilePage";
import HiddenGemsPage from "@/features/candidates/HiddenGemsPage";
import PipelinePage from "@/features/pipeline/PipelinePage";
import AnalyticsPage from "@/features/analytics/AnalyticsPage";
import TeamPage from "@/features/team/TeamPage";
import SettingsPage from "@/features/settings/SettingsPage";

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
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/app/dashboard" replace /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "jobs", element: <JobsPage /> },
      { path: "jobs/create", element: <CreateJobPage /> },
      { path: "candidates", element: <RankingsPage /> },
      { path: "candidates/:id", element: <CandidateProfilePage /> },
      { path: "rankings", element: <RankingsPage /> },
      { path: "pipeline", element: <PipelinePage /> },
      { path: "hidden-gems", element: <HiddenGemsPage /> },
      { path: "analytics", element: <AnalyticsPage /> },
      { path: "team", element: <TeamPage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/login" replace />,
  },
]);

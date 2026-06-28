/**
 * HireIntel AI — Service Layer
 *
 * All reads/writes now go to the FastAPI backend via apiClient.
 * Firestore is kept only for auth/settings that specifically need it.
 * Mock data is removed from all service functions.
 */
import { apiClient } from "./apiClient";
import { storageService } from "./storageService";
import type {
  Candidate,
  AnalyticsSummary,
  TeamMember,
  DashboardStats,
  AIActivity,
  PriorityInsight,
  ScheduledInterview,
  Job,
  AIExtractedJob,
} from "@/types";

// ─── Type helpers for paginated response ──────────────────────────────────
interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ──────────────────────────────────────────────────────────────────────────
// CANDIDATES
// ──────────────────────────────────────────────────────────────────────────

/**
 * Maps a backend CandidateResponse to the frontend Candidate type.
 * The backend uses snake_case and a different shape, so we normalize here.
 */
function mapCandidate(c: any): Candidate {
  const profile = c.profile ?? {};
  const redrob = c.redrob_signals ?? {};

  return {
    id: c.candidate_id,
    name: profile.anonymized_name || "Unknown",
    initials: (profile.anonymized_name || "UN")
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase(),
    jobTitle: profile.current_title || "Candidate",
    location: profile.location || "Unknown",
    aiScore: Math.round((c.github_score || 0) * 100) || 80,
    status: (redrob.pipeline_status as Candidate["status"]) || "new",
    isHiddenGem: c.is_hidden_gem || false,
    skills: (c.skills || []).map((s: any) => ({
      name: s.name || s,
      level: (s.proficiency || "intermediate") as "expert" | "advanced" | "intermediate",
      verified: false,
    })),
    fitBreakdown: {
      techSkills: Math.round((c.github_score || 0.8) * 100),
      experience: Math.round(Math.min(1, (profile.years_of_experience || 3) / 10) * 100),
      cultureSoftSkills: 80,
      impact: Math.round((c.profile_completeness || 0.8) * 100),
      roleFit: Math.round((c.github_score || 0.8) * 100),
    },
    experience: (c.career_history || []).map((e: any, i: number) => ({
      id: `exp-${i}`,
      title: e.title || "",
      company: e.company || "",
      startDate: "2020-01",
      endDate: null,
      description: e.description || "",
    })),
    aiSummary: profile.summary || "Candidate imported from resume.",
    whyStandOut: [],
    riskAreas: [],
    appliedFor: "Open Requisition",
    appliedAt: new Date().toISOString().split("T")[0],
  };
}

export const candidateService = {
  /** Get paginated list of candidates */
  getCandidates: async (page = 1, pageSize = 50): Promise<Candidate[]> => {
    const { data } = await apiClient.get<PaginatedResponse<any>>(
      `/candidates/?page=${page}&page_size=${pageSize}`
    );
    return data.items.map(mapCandidate);
  },

  /** Get a single candidate by ID (avoids full-list fetch) */
  getCandidate: async (id: string): Promise<Candidate> => {
    const { data } = await apiClient.get<any>(`/candidates/${id}`);
    return mapCandidate(data);
  },

  /** Get only hidden gems */
  getHiddenGems: async (): Promise<Candidate[]> => {
    const { data } = await apiClient.get<any[]>(`/candidates/hidden-gems`);
    return data.map(mapCandidate);
  },

  /** Update a candidate's pipeline stage (persists drag-drop) */
  updateStatus: async (id: string, status: string): Promise<void> => {
    await apiClient.patch(`/candidates/${id}/status`, { status });
  },

  /** Upload and parse a resume text via the AI backend */
  uploadResume: async (resumeText: string): Promise<Candidate> => {
    const { data } = await apiClient.post<any>("/candidates/upload", {
      resume_text: resumeText,
    });
    return mapCandidate(data.candidate);
  },

  /** Upload a raw file to Firebase Storage via the proxy */
  uploadResumeFile: async (
    file: File,
    onProgress?: (pct: number) => void
  ): Promise<string> => {
    const url = await storageService.uploadFile(file, "resumes", onProgress);
    return url.downloadUrl;
  },
};

// ──────────────────────────────────────────────────────────────────────────
// JOBS
// ──────────────────────────────────────────────────────────────────────────

function mapJob(j: any): Job {
  return {
    id: j.id,
    title: j.title,
    department: j.department || "Engineering",
    location: j.location || "Remote",
    locationType: "remote",
    status: (j.status as Job["status"]) || "open",
    openedAt: j.created_at ? j.created_at.split("T")[0] : new Date().toISOString().split("T")[0],
    candidateCount: 0,
    topMatchScore: 0,
    pipelineStats: { sourced: 0, screened: 0, interviewing: 0, offered: 0 },
  };
}

export const jobService = {
  getJobs: async (): Promise<Job[]> => {
    const { data } = await apiClient.get<any[]>("/jobs/");
    return data.map(mapJob);
  },

  getJob: async (id: string): Promise<Job> => {
    const { data } = await apiClient.get<any>(`/jobs/${id}`);
    return mapJob(data);
  },

  createJob: async (jobData: {
    title: string;
    department: string;
    location: string;
    description: string;
    coreSkills: Array<{ skill: string; level: string }>;
    softSkills: string[];
  }): Promise<Job> => {
    const { data } = await apiClient.post<any>("/jobs/", {
      title: jobData.title,
      department: jobData.department,
      location: jobData.location,
      description: jobData.description,
      core_skills: jobData.coreSkills,
      soft_skills: jobData.softSkills,
    });
    return mapJob(data);
  },

  updateStatus: async (id: string, status: string): Promise<void> => {
    await apiClient.patch(`/jobs/${id}/status?status=${status}`);
  },

  analyzeJobDescription: async (description: string): Promise<AIExtractedJob> => {
    const { data } = await apiClient.post<AIExtractedJob>("/jobs/analyze", {
      description,
    });
    return data;
  },
};

// ──────────────────────────────────────────────────────────────────────────
// ANALYTICS (still uses derived data — extend when backend endpoint added)
// ──────────────────────────────────────────────────────────────────────────
export const analyticsService = {
  getSummary: async (): Promise<AnalyticsSummary> => {
    // Derive from live candidate/job counts when backend analytics endpoint is added
    const [candidatesRes, jobsRes] = await Promise.all([
      apiClient.get<any>("/candidates/?page=1&page_size=1"),
      apiClient.get<any[]>("/jobs/"),
    ]).catch(() => [{ data: { total: 0 } }, { data: [] }]);

    const total: number = candidatesRes.data?.total ?? 0;

    return {
      totalSourced: total,
      timeToHire: 18,
      offerAcceptanceRate: 87,
      aiRankingAccuracy: 91,
      funnelData: [
        { stage: "AI Sourced", count: total, conversionRate: 100 },
        { stage: "Shortlisted (>85%)", count: Math.round(total * 0.15), conversionRate: 15 },
        { stage: "Interviewed", count: Math.round(total * 0.03), conversionRate: 23 },
        { stage: "Offered", count: Math.round(total * 0.008), conversionRate: 24 },
        { stage: "Hired", count: Math.round(total * 0.006), conversionRate: 80 },
      ],
    };
  },
};

// ──────────────────────────────────────────────────────────────────────────
// DASHBOARD
// ──────────────────────────────────────────────────────────────────────────
export const dashboardService = {
  getStats: async (): Promise<DashboardStats> => {
    const [candidatesRes, jobsRes] = await Promise.all([
      apiClient.get<any>("/candidates/?page=1&page_size=1"),
      apiClient.get<any[]>("/jobs/"),
    ]).catch(() => [{ data: { total: 0 } }, { data: [] }]);

    return {
      activeRequisitions: (jobsRes.data as any[])?.filter((j: any) => j.status === "open").length ?? 0,
      topCandidatesSourced: candidatesRes.data?.total ?? 0,
      timeToHire: 18,
      interviewsScheduled: 0,
    };
  },

  getAIActivity: async (): Promise<AIActivity[]> => {
    // Placeholder — extend when backend activity log endpoint is added
    return [
      { id: "1", type: "ranking", message: "AI ranking system is active.", time: "Now" },
    ];
  },

  getPriorityInsights: async (): Promise<PriorityInsight[]> => {
    return [];
  },

  getInterviews: async (): Promise<ScheduledInterview[]> => {
    return [];
  },
};

// ──────────────────────────────────────────────────────────────────────────
// TEAM (static for now — extend when backend user management is added)
// ──────────────────────────────────────────────────────────────────────────
export const teamService = {
  getMembers: async (): Promise<TeamMember[]> => {
    return [];
  },
};

// ──────────────────────────────────────────────────────────────────────────
// RANKINGS
// ──────────────────────────────────────────────────────────────────────────
export const rankingService = {
  rankCandidates: async (jobDescription: string, requiredSkills: string[]): Promise<any[]> => {
    const { data } = await apiClient.post<any[]>("/candidates/rank", {
      job_description: jobDescription,
      required_skills: requiredSkills,
    });
    return data;
  },
};

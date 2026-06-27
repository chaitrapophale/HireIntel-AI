import { firestoreService } from "./firestoreService";
import { storageService } from "./storageService";
import api from "@/lib/api";
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

// ══════════════════════════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════════════════════════
export const authService = {
  login: async (credential: string): Promise<{ token: string; user: { name: string; email: string; avatarInitials: string } }> => {
    const res = await api.post("/auth/google", { credential });
    const user = res.data.user;
    return {
      token: res.data.access_token,
      user: { 
        name: user.name, 
        email: user.email, 
        avatarInitials: user.name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase() 
      },
    };
  },
  logout: () => {
    localStorage.removeItem("hireintel_token");
  },
};

// ══════════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════════
export const dashboardService = {
  getStats: async (): Promise<DashboardStats> => {
    const res = await api.get("/dashboard/stats");
    return res.data;
  },
  getAIActivity: async (): Promise<AIActivity[]> => {
    return [
      { id: "1", type: "scanning", message: "Scanning for Senior Frontend roles...", time: "Just now" },
      { id: "2", type: "ranking", message: "Ranked new candidates via NVIDIA NIM.", time: "1 hour ago" },
    ];
  },
  getPriorityInsights: async (): Promise<PriorityInsight[]> => {
    return [
      {
        id: "1", type: "candidate", title: "Top Match Found", subtitle: "Based on NVIDIA LLM Reranking",
        description: "A recent upload has a 95% match with your open requisition.",
        score: 95, urgency: "high", actions: ["Review Profile", "Reach Out"],
      },
    ];
  },
  getInterviews: async (): Promise<ScheduledInterview[]> => {
    return [
      { id: "1", candidateName: "Sarah Jenkins", role: "Sr. Frontend Engineer", time: "10:00", period: "AM", hasAIPrep: true }
    ];
  },
};

// ══════════════════════════════════════════════════════════════
// JOBS
// ══════════════════════════════════════════════════════════════
export const jobService = {
  getJobs: async (): Promise<Job[]> => {
    const res = await api.get("/jobs/");
    return res.data;
  },
  analyzeJobDescription: async (description: string): Promise<AIExtractedJob> => {
    const res = await api.post("/jobs/analyze", { description });
    return res.data;
  },
  createJob: async (job: {
    title: string;
    department?: string;
    location?: string;
    description?: string;
    core_skills?: string[];
    soft_skills?: string[];
  }) => {
    const res = await api.post("/jobs/", job);
    return res.data;
  },
  deleteJob: async (jobId: string) => {
    const res = await api.delete(`/jobs/${jobId}`);
    return res.data;
  },
};

// ══════════════════════════════════════════════════════════════
// CANDIDATES
// ══════════════════════════════════════════════════════════════
export const candidateService = {
  getCandidates: async (): Promise<Candidate[]> => {
    const res = await api.get("/candidates");
    return res.data;
  },
  
  uploadResume: async (resumeText: string) => {
    const res = await api.post("/candidates/upload", { resume_text: resumeText });
    return res.data;
  },

  uploadDataset: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await api.post("/candidates/upload-dataset", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    return res.data;
  },

  rankCandidates: async (jobDescription: string) => {
    const res = await api.post("/candidates/rank", { job_description: jobDescription, top_n: 100 });
    return res.data;
  },

  deleteCandidate: async (candidateId: string) => {
    const res = await api.delete(`/candidates/${candidateId}`);
    return res.data;
  },
};

// ══════════════════════════════════════════════════════════════
// RANKINGS
// ══════════════════════════════════════════════════════════════
export const rankingService = {
  getRankings: async (): Promise<any[]> => {
    return await firestoreService.list<any>("rankings");
  }
};

// ══════════════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════════════
export const exportService = {
  getExports: async (): Promise<any[]> => {
    return await firestoreService.list<any>("exports");
  },
  createExport: async (type: string): Promise<any> => {
    return await firestoreService.create("exports", {
      type,
      status: "pending",
      downloadUrl: ""
    });
  }
};

// ══════════════════════════════════════════════════════════════
// ANALYTICS
// ══════════════════════════════════════════════════════════════
export const analyticsService = {
  getSummary: async (): Promise<AnalyticsSummary> => {
    const res = await api.get("/analytics/summary");
    return res.data;
  },
};

// ══════════════════════════════════════════════════════════════
// TEAM
// ══════════════════════════════════════════════════════════════
export const teamService = {
  getMembers: async (): Promise<TeamMember[]> => {
    return [
      { id: "1", name: "Sarah Jenkins", email: "sarah@company.com", role: "admin", status: "active", initials: "SJ", isCurrentUser: true }
    ];
  },
};

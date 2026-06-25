import { firestoreService } from "./firestoreService";
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

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ══════════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════════
export const dashboardService = {
  getStats: async (): Promise<DashboardStats> => {
    await delay(600);
    return { activeRequisitions: 12, topCandidatesSourced: 48, timeToHire: 18, interviewsScheduled: 24 };
  },
  getAIActivity: async (): Promise<AIActivity[]> => {
    await delay(800);
    return [
      { id: "1", type: "scanning", message: "Scanning GitHub & StackOverflow for Sr. Frontend roles...", time: "Just now" },
      { id: "2", type: "outreach", message: "Sent 12 automated outreach emails for Product Marketing role.", time: "20 mins ago" },
      { id: "3", type: "ranking", message: "Ranked 45 new applicants across 3 active jobs.", time: "1 hour ago" },
    ];
  },
  getPriorityInsights: async (): Promise<PriorityInsight[]> => {
    await delay(700);
    return [
      {
        id: "1", type: "candidate", title: "John Doe", subtitle: "applied for Senior Frontend Engineer",
        description: "AI detected strong crossover in React performance optimization based on his recent open-source contributions.",
        score: 96, urgency: "high", actions: ["Review Profile", "Fast-track Interview"],
      },
      {
        id: "2", type: "market", title: "Market Trend Alert",
        description: "Salary expectations for Product Designers in NYC have increased by 8% in the last 30 days.",
        urgency: "medium",
      },
      {
        id: "3", type: "bottleneck", title: "Pipeline Bottleneck",
        description: "The 'Data Scientist' role has 14 candidates stuck in 'Technical Assessment' for over 5 days.",
        urgency: "high",
      },
    ];
  },
  getInterviews: async (): Promise<ScheduledInterview[]> => {
    await delay(500);
    return [
      { id: "1", candidateName: "Sarah Jenkins", role: "Sr. Frontend Engineer", time: "10:00", period: "AM", hasAIPrep: true },
      { id: "2", candidateName: "Michael Chang", role: "Product Marketing Mgr", time: "1:30", period: "PM", hasAIPrep: false },
    ];
  },
};

// ══════════════════════════════════════════════════════════════
// JOBS
// ══════════════════════════════════════════════════════════════
export const jobService = {
  getJobs: async (): Promise<Job[]> => {
    return await firestoreService.list<Job>("jobs");
  },
  analyzeJobDescription: async (_description: string): Promise<AIExtractedJob> => {
    await delay(2500);
    return {
      title: "Senior Frontend Engineer",
      department: "Engineering",
      coreSkills: [
        { skill: "React", level: "expert" },
        { skill: "TypeScript", level: "expert" },
        { skill: "Next.js", level: "advanced" },
        { skill: "Performance Optimization", level: "advanced" },
      ],
      softSkills: ["Mentorship", "Cross-functional Communication"],
      experience: "5+ years",
      location: "San Francisco / Hybrid",
    };
  },
};

// ══════════════════════════════════════════════════════════════
// CANDIDATES
// ══════════════════════════════════════════════════════════════
export const candidateService = {
  getCandidates: async (): Promise<Candidate[]> => {
    return await firestoreService.list<Candidate>("candidates");
  },
  
  uploadResume: async (file: File) => {
    const uploadResult = await storageService.uploadFile(file, "resumes");
    return await firestoreService.create("candidates", {
      name: "New Upload",
      initials: "NU",
      jobTitle: "Candidate",
      location: "Remote",
      aiScore: 85,
      status: "new",
      isHiddenGem: false,
      skills: [],
      fitBreakdown: { techSkills: 80, experience: 80, cultureSoftSkills: 80, impact: 80, roleFit: 80 },
      experience: [],
      aiSummary: "Parsed from uploaded resume.",
      whyStandOut: [],
      riskAreas: [],
      appliedFor: "Open Role",
      appliedAt: new Date().toISOString().split('T')[0],
      resumeUrl: uploadResult.downloadUrl
    });
  }
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
    await delay(900);
    return {
      totalSourced: 1240,
      timeToHire: 18,
      offerAcceptanceRate: 87,
      aiRankingAccuracy: 87,
      funnelData: [
        { stage: "AI Sourced", count: 1240, conversionRate: 100 },
        { stage: "Shortlisted (>85%)", count: 184, conversionRate: 15 },
        { stage: "Interviewed", count: 42, conversionRate: 23 },
        { stage: "Offered", count: 10, conversionRate: 24 },
        { stage: "Hired", count: 8, conversionRate: 80 },
      ],
    };
  },
};

// ══════════════════════════════════════════════════════════════
// TEAM
// ══════════════════════════════════════════════════════════════
export const teamService = {
  getMembers: async (): Promise<TeamMember[]> => {
    await delay(600);
    return [
      { id: "1", name: "Sarah Jenkins", email: "sarah@company.com", role: "admin", status: "active", initials: "SJ", isCurrentUser: true },
      { id: "2", name: "David Ross", email: "david@company.com", role: "hiring_manager", status: "active", initials: "DR", isCurrentUser: false },
      { id: "3", name: "Priya Nair", email: "priya@company.com", role: "recruiter", status: "active", initials: "PN", isCurrentUser: false },
      { id: "4", name: "James Liu", email: "james@company.com", role: "interviewer", status: "pending", initials: "JL", isCurrentUser: false },
    ];
  },
};

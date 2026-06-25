// ─────────────────────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────────────────────
export interface BaseEntity {
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface User extends BaseEntity {
  id: string;
  name: string;
  email: string;
  role: "admin" | "recruiter" | "hiring_manager";
  avatarInitials: string;
  plan: "starter" | "pro" | "enterprise";
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

// ─────────────────────────────────────────────────────────────
// Jobs / Requisitions
// ─────────────────────────────────────────────────────────────
export type JobStatus = "open" | "on_hold" | "closed" | "draft";
export type JobLocation = "remote" | "onsite" | "hybrid";

export interface Job extends BaseEntity {
  id: string;
  title: string;
  department: string;
  location: string;
  locationType: JobLocation;
  status: JobStatus;
  openedAt: string;
  candidateCount: number;
  topMatchScore: number;
  pipelineStats: {
    sourced: number;
    screened: number;
    interviewing: number;
    offered: number;
  };
}

export interface CreateJobPayload {
  description: string;
}

export interface AIExtractedJob {
  title: string;
  department: string;
  coreSkills: Array<{ skill: string; level: "expert" | "advanced" | "intermediate" }>;
  softSkills: string[];
  experience: string;
  location: string;
}

// ─────────────────────────────────────────────────────────────
// Candidates
// ─────────────────────────────────────────────────────────────
export type CandidateStatus = "new" | "screening" | "interviewing" | "offered" | "hired" | "rejected";

export interface SkillTag {
  name: string;
  level: "expert" | "advanced" | "intermediate";
  verified: boolean;
}

export interface WorkExperience {
  id: string;
  title: string;
  company: string;
  startDate: string;
  endDate: string | null;
  description: string;
  aiContext?: string;
}

export interface FitBreakdown {
  techSkills: number;
  experience: number;
  cultureSoftSkills: number;
  impact: number;
  roleFit: number;
}

export interface Candidate extends BaseEntity {
  id: string;
  name: string;
  initials: string;
  jobTitle: string;
  location: string;
  aiScore: number;
  status: CandidateStatus;
  isHiddenGem: boolean;
  skills: SkillTag[];
  fitBreakdown: FitBreakdown;
  experience: WorkExperience[];
  aiSummary: string;
  whyStandOut: string[];
  riskAreas: string[];
  appliedFor: string;
  appliedAt: string;
  resumeUrl?: string;
}

// ─────────────────────────────────────────────────────────────
// Analytics
// ─────────────────────────────────────────────────────────────
export interface PipelineFunnel {
  stage: string;
  count: number;
  conversionRate: number;
}

export interface AnalyticsSummary {
  totalSourced: number;
  timeToHire: number;
  offerAcceptanceRate: number;
  aiRankingAccuracy: number;
  funnelData: PipelineFunnel[];
}

// ─────────────────────────────────────────────────────────────
// Team
// ─────────────────────────────────────────────────────────────
export type TeamRole = "admin" | "recruiter" | "hiring_manager" | "interviewer";
export type TeamMemberStatus = "active" | "pending" | "inactive";

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
  status: TeamMemberStatus;
  initials: string;
  isCurrentUser: boolean;
}

// ─────────────────────────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────────────────────────
export interface DashboardStats {
  activeRequisitions: number;
  topCandidatesSourced: number;
  timeToHire: number;
  interviewsScheduled: number;
}

export interface AIActivity {
  id: string;
  type: "scanning" | "outreach" | "ranking";
  message: string;
  time: string;
}

export interface PriorityInsight {
  id: string;
  type: "candidate" | "market" | "bottleneck";
  title: string;
  subtitle?: string;
  description: string;
  score?: number;
  urgency: "low" | "medium" | "high";
  actions?: string[];
}

export interface ScheduledInterview {
  id: string;
  candidateName: string;
  role: string;
  time: string;
  period: "AM" | "PM";
  hasAIPrep: boolean;
}

import { firestoreService } from "@/services/firestoreService";


export const MOCK_JOBS: any[] = [
  { title: "Senior Frontend Engineer", department: "Engineering", location: "San Francisco", locationType: "onsite", status: "open", openedAt: "2025-05-01", candidateCount: 42, topMatchScore: 96, pipelineStats: { sourced: 42, screened: 12, interviewing: 4, offered: 0 } },
  { title: "Product Marketing Manager", department: "Marketing", location: "Remote", locationType: "remote", status: "open", openedAt: "2025-05-10", candidateCount: 85, topMatchScore: 88, pipelineStats: { sourced: 85, screened: 5, interviewing: 1, offered: 0 } },
  { title: "Lead UI/UX Designer", department: "Design", location: "New York", locationType: "hybrid", status: "open", openedAt: "2025-04-20", candidateCount: 18, topMatchScore: 92, pipelineStats: { sourced: 18, screened: 8, interviewing: 4, offered: 1 } },
];

export const MOCK_CANDIDATES: any[] = [
  {
    name: "John Doe", initials: "JD", jobTitle: "Senior Frontend Engineer", location: "San Francisco, CA",
    aiScore: 98, status: "interviewing", isHiddenGem: false,
    skills: [
      { name: "React", level: "expert", verified: true },
      { name: "TypeScript", level: "expert", verified: true },
      { name: "Next.js", level: "advanced", verified: true },
      { name: "GraphQL", level: "advanced", verified: false },
      { name: "Node.js", level: "intermediate", verified: false },
    ],
    fitBreakdown: { techSkills: 99, experience: 95, cultureSoftSkills: 92, impact: 97, roleFit: 98 },
    experience: [
      { id: "e1", title: "Lead Frontend Engineer", company: "TechCorp Inc.", startDate: "2021-03", endDate: null, description: "Led a team of 5 engineers building the core customer dashboard. Migrated legacy React app to Next.js, reducing bundle size by 40%.", aiContext: "This role perfectly matches the leadership and technical stack required for our open requisition." },
      { id: "e2", title: "Senior Web Developer", company: "StartupX", startDate: "2018-06", endDate: "2021-02", description: "Built interactive data visualizations using D3.js and React. Improved accessibility score from 65 to 98." },
    ],
    aiSummary: "John is an exceptional match (98%) for the Senior Frontend Engineer role. His deep expertise in React and performance optimization directly aligns with the core requirements.",
    whyStandOut: [
      "Architected a micro-frontend migration at TechCorp that reduced load times by 40%.",
      "Strong open-source presence with accepted PRs in Next.js.",
      "Demonstrated leadership in mentoring junior devs (noted in 3 recommendations).",
    ],
    riskAreas: ["Has primarily worked in small startups (<50 people); may need adjustment to enterprise processes."],
    appliedFor: "Senior Frontend Engineer", appliedAt: "2025-06-01",
  },
  {
    name: "Alice Smith", initials: "AS", jobTitle: "Senior Frontend Engineer", location: "Austin, TX",
    aiScore: 94, status: "screening", isHiddenGem: false,
    skills: [{ name: "Vue", level: "expert", verified: true }, { name: "JavaScript", level: "expert", verified: true }],
    fitBreakdown: { techSkills: 90, experience: 92, cultureSoftSkills: 95, impact: 88, roleFit: 94 },
    experience: [], aiSummary: "Strong candidate with expertise in Vue.js ecosystem.", whyStandOut: [], riskAreas: [],
    appliedFor: "Senior Frontend Engineer", appliedAt: "2025-06-03",
  },
  {
    name: "Robert Jones", initials: "RJ", jobTitle: "Lead Product Designer", location: "New York, NY",
    aiScore: 91, status: "new", isHiddenGem: false,
    skills: [{ name: "Figma", level: "expert", verified: true }, { name: "Prototyping", level: "advanced", verified: false }],
    fitBreakdown: { techSkills: 85, experience: 91, cultureSoftSkills: 93, impact: 90, roleFit: 91 },
    experience: [], aiSummary: "Creative designer with strong user research skills.", whyStandOut: [], riskAreas: [],
    appliedFor: "Lead UI/UX Designer", appliedAt: "2025-06-05",
  },
  {
    name: "Michael Chen", initials: "MC", jobTitle: "Self-taught Developer", location: "Seattle, WA",
    aiScore: 94, status: "new", isHiddenGem: true,
    skills: [{ name: "Go", level: "expert", verified: true }, { name: "System Architecture", level: "expert", verified: false }],
    fitBreakdown: { techSkills: 95, experience: 80, cultureSoftSkills: 88, impact: 96, roleFit: 94 },
    experience: [], aiSummary: "Self-taught developer with extraordinary impact despite non-traditional path.", whyStandOut: ["Single-handedly built an open-source tool used by 10k+ developers."], riskAreas: [],
    appliedFor: "Senior Frontend Engineer", appliedAt: "2025-06-04",
  },
];

export const migrateMockData = async () => {
  try {
    for (const job of MOCK_JOBS) {
      await firestoreService.create("jobs", job);
    }
    console.log("Migrated jobs");

    for (const candidate of MOCK_CANDIDATES) {
      const candDoc = await firestoreService.create("candidates", candidate);
      
      // Seed a ranking for each candidate automatically for demo purposes
      await firestoreService.create("rankings", {
        candidateId: candDoc.id,
        jobId: "mock_job_id", 
        aiScore: candidate.aiScore,
        status: "active"
      });
    }
    console.log("Migrated candidates and rankings");

    // Create a dummy export just to test the collection
    await firestoreService.create("exports", {
      type: "candidates_csv",
      status: "completed",
      downloadUrl: "https://example.com/export.csv"
    });
    console.log("Migrated exports");

    alert("Migration successful! Refresh the page.");
  } catch (error) {
    console.error("Migration failed:", error);
    alert("Migration failed. Ensure you are logged in.");
  }
};


// Development-only helper — NOT exposed to window in production
// To seed data during development, call migrateMockData() directly in DevTools console
// after importing it: import { migrateMockData } from './utils/migrationUtils'
if (import.meta.env.DEV) {
  (window as any).__hireintel_migrateMockData = migrateMockData;
}


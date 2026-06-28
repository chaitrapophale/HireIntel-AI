import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Briefcase, Users, Clock, CalendarCheck, Sparkles,
  TrendingUp, AlertTriangle, ArrowRight, Activity,
} from "lucide-react";
import { useEffect } from "react";
import { dashboardService } from "@/services";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import type { PriorityInsight } from "@/types";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.4 } }),
};

function StatCard({ label, value, badge, icon: Icon, highlight }: {
  label: string; value: string | number; badge?: string; icon: React.FC<{ className?: string }>;
  highlight?: boolean;
}) {
  return (
    <motion.div variants={fadeUp} className={cn("glass-card rounded-2xl p-5 hover:shadow-lg transition-all cursor-pointer group", highlight && "ai-glow-border")}>
      <div className="flex justify-between items-start mb-5">
        <div className="w-10 h-10 rounded-xl bg-primary-fixed flex items-center justify-center">
          <Icon className="w-5 h-5 text-on-primary-fixed" />
        </div>
        {badge && <span className="text-xs font-semibold bg-surface-container-high px-2 py-1 rounded-lg text-on-surface-variant">{badge}</span>}
      </div>
      <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">{label}</p>
      <p className="text-3xl font-bold text-on-surface group-hover:text-primary transition-colors">{value}</p>
    </motion.div>
  );
}

const insightIcon = (type: PriorityInsight["type"]) => {
  if (type === "candidate") return <Sparkles className="w-5 h-5 text-tertiary-container" />;
  if (type === "market") return <TrendingUp className="w-5 h-5 text-secondary" />;
  return <AlertTriangle className="w-5 h-5 text-error" />;
};

const urgencyColor: Record<PriorityInsight["urgency"], string> = {
  high: "bg-tertiary-container",
  medium: "bg-secondary",
  low: "bg-outline-variant",
};

export default function DashboardPage() {
  const { currentUser } = useAuth();
  const stats = useQuery({ queryKey: ["dashboard-stats"], queryFn: dashboardService.getStats });
  const insights = useQuery({ queryKey: ["dashboard-insights"], queryFn: dashboardService.getPriorityInsights });
  const interviews = useQuery({ queryKey: ["dashboard-interviews"], queryFn: dashboardService.getInterviews });
  const activity = useQuery({ queryKey: ["dashboard-activity"], queryFn: dashboardService.getAIActivity });

  useEffect(() => {
    document.title = "Dashboard — HireIntel AI";
    return () => { document.title = "HireIntel AI"; };
  }, []);

  // Dynamic greeting based on time of day
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening";
  const firstName = currentUser?.displayName?.split(" ")[0] ||
    currentUser?.email?.split("@")[0] ||
    "there";

  return (
    <div className="px-6 py-6 space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.05 } } }}>
        <motion.div variants={fadeUp} className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-on-surface tracking-tight">{timeOfDay}, {firstName} 👋</h1>
            <p className="text-on-surface-variant mt-1">
              The AI analyzed <span className="font-bold text-primary">342</span> new candidates overnight.
            </p>
          </div>
          <div className="flex gap-3">
            <button className="border border-outline-variant bg-surface px-4 py-2 rounded-xl text-sm font-semibold hover:bg-surface-container-low transition-all">
              Filter
            </button>
            <button className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-semibold shadow hover:bg-primary-container transition-all flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Smart Review
            </button>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <StatCard label="Active Requisitions" value={stats.data?.activeRequisitions ?? "—"} badge="+2 this week" icon={Briefcase} />
          <StatCard label="Top Candidates Sourced" value={stats.data?.topCandidatesSourced ?? "—"} badge="Avg. 85% match" icon={Users} highlight />
          <StatCard label="Time to Hire" value={stats.data?.timeToHire ? `${stats.data.timeToHire}d` : "—"} badge="-2 days" icon={Clock} />
          <StatCard label="Interviews Scheduled" value={stats.data?.interviewsScheduled ?? "—"} badge="5 pending" icon={CalendarCheck} />
        </div>
      </motion.div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Left (wider) */}
        <div className="xl:col-span-2 space-y-5">

          {/* Priority Insights */}
          <div className="glass-card rounded-2xl border border-outline-variant/50 overflow-hidden">
            <div className="px-5 py-4 border-b border-outline-variant/30 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-tertiary-container" />
                <h2 className="font-bold text-on-surface">Priority Insights</h2>
              </div>
              <button className="text-xs font-bold text-primary hover:underline flex items-center gap-1">View All <ArrowRight className="w-3 h-3" /></button>
            </div>
            <div className="divide-y divide-outline-variant/20">
              {insights.isLoading ? (
                [1, 2, 3].map((i) => (
                  <div key={i} className="p-5 animate-pulse space-y-2">
                    <div className="h-3 bg-surface-container rounded w-1/2" />
                    <div className="h-2 bg-surface-container rounded w-3/4" />
                  </div>
                ))
              ) : insights.data?.map((insight) => (
                <div key={insight.id} className="p-5 hover:bg-surface-container-low transition-colors cursor-pointer group relative overflow-hidden">
                  <div className={cn("absolute left-0 top-0 bottom-0 w-1 group-hover:w-1.5 transition-all", urgencyColor[insight.urgency])} />
                  <div className="flex gap-4 ml-2">
                    <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center shrink-0">
                      {insightIcon(insight.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-bold text-on-surface">
                          {insight.title}{" "}
                          {insight.subtitle && <span className="font-normal text-on-surface-variant text-sm">{insight.subtitle}</span>}
                        </h3>
                        {insight.score && (
                          <span className="shrink-0 ml-2 px-2 py-0.5 bg-tertiary-fixed text-on-tertiary-fixed text-[10px] font-bold rounded-full uppercase">
                            {insight.score}% Fit
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-on-surface-variant line-clamp-2">{insight.description}</p>
                      {insight.actions && (
                        <div className="flex gap-2 mt-3">
                          {insight.actions.map((action) => (
                            <button key={action} className="px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-container transition-colors">
                              {action}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Active Requisitions Table */}
          <div className="glass-card rounded-2xl border border-outline-variant/50 overflow-hidden">
            <div className="px-5 py-4 border-b border-outline-variant/30 flex justify-between items-center">
              <h2 className="font-bold text-on-surface">Active Requisitions</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-outline-variant/30 text-[11px] text-on-surface-variant uppercase tracking-wider">
                    <th className="px-5 py-3 text-left font-semibold">Role</th>
                    <th className="px-5 py-3 text-left font-semibold">Pipeline</th>
                    <th className="px-5 py-3 text-center font-semibold">Top Match</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20">
                  {[
                    { role: "Senior Frontend Engineer", dept: "Engineering • SF", pipeline: [42, 12, 4], score: 96, color: "bg-primary" },
                    { role: "Product Marketing Manager", dept: "Marketing • Remote", pipeline: [85, 5, 1], score: 88, color: "bg-secondary" },
                    { role: "Lead UI/UX Designer", dept: "Design • New York", pipeline: [18, 8, 4], score: 92, color: "bg-tertiary-container" },
                  ].map((job) => (
                    <tr key={job.role} className="hover:bg-surface-container-low transition-colors cursor-pointer group">
                      <td className="px-5 py-4">
                        <div className="font-bold text-on-surface">{job.role}</div>
                        <div className="text-[11px] text-on-surface-variant">{job.dept}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex gap-0.5 h-1.5 w-28 rounded-full overflow-hidden bg-surface-container-highest">
                          <div className={cn("h-full rounded-full", job.color)} style={{ width: `${(job.pipeline[0] / 100) * 100}%` }} />
                        </div>
                        <div className="text-[10px] text-on-surface-variant mt-1">{job.pipeline[0]} Sourced • {job.pipeline[1]} Screened</div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-primary text-white font-bold text-xs ring-4 ring-primary/20">
                          {job.score}%
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-5">
          {/* Today's Interviews */}
          <div className="glass-card rounded-2xl border border-outline-variant/50 p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-on-surface">Today's Interviews</h2>
              <CalendarCheck className="w-4 h-4 text-on-surface-variant" />
            </div>
            <div className="space-y-3">
              {interviews.data?.map((i) => (
                <div key={i.id} className="flex gap-3 p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/30 relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                  <div className="text-center w-12 flex flex-col justify-center border-r border-outline-variant/30 pr-3 ml-2">
                    <span className="text-xs font-bold text-on-surface-variant">{i.time}</span>
                    <span className="text-[10px] text-on-surface-variant">{i.period}</span>
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-sm text-on-surface">{i.candidateName}</div>
                    <div className="text-[11px] text-on-surface-variant">{i.role}</div>
                    {i.hasAIPrep && (
                      <div className="text-[10px] text-primary font-bold mt-1 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Prep notes ready
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Sourcing Activity */}
          <div className="glass-card rounded-2xl border border-outline-variant/50 p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-on-surface">AI Sourcing Activity</h2>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary" />
              </span>
            </div>
            <div className="relative">
              <div className="absolute left-[11px] top-2 bottom-2 w-[2px] bg-surface-container-highest" />
              <div className="space-y-4">
                {activity.data?.map((a) => (
                  <div key={a.id} className="flex gap-3 relative z-10">
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center border-2 border-surface shrink-0 text-white">
                      <Activity className="w-3 h-3" />
                    </div>
                    <div>
                      <p className="text-sm text-on-surface">{a.message}</p>
                      <p className="text-[10px] text-on-surface-variant mt-0.5">{a.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

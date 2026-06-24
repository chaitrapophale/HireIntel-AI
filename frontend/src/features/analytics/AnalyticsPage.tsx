import { useQuery } from "@tanstack/react-query";
import { BarChart2 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, FunnelChart, Funnel, LabelList, Cell,
} from "recharts";
import { analyticsService } from "@/services";

const FUNNEL_COLORS = ["#15157d", "#2e3192", "#0057c0", "#006ff0", "#4c00b5"];

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="glass-card rounded-2xl p-5 border border-outline-variant/50">
      <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">{label}</p>
      <p className="text-3xl font-bold text-on-surface">{value}</p>
      {sub && <p className="text-xs text-on-surface-variant mt-1">{sub}</p>}
    </div>
  );
}

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics"],
    queryFn: analyticsService.getSummary,
  });

  return (
    <div className="px-6 py-6 pb-12 max-w-7xl mx-auto space-y-5">
      <div>
        <h1 className="text-3xl font-bold text-on-surface tracking-tight flex items-center gap-2">
          <BarChart2 className="w-7 h-7 text-primary" /> AI Recruitment Analytics
        </h1>
        <p className="text-on-surface-variant mt-1">Measure the impact of AI sourcing and ranking on your pipeline.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Sourced" value={data?.totalSourced ?? "—"} sub="AI scanned profiles" />
        <StatCard label="Time to Hire" value={data ? `${data.timeToHire}d` : "—"} sub="45% faster than avg" />
        <StatCard label="Offer Acceptance" value={data ? `${data.offerAcceptanceRate}%` : "—"} sub="Industry avg: 71%" />
        <StatCard label="AI Ranking Accuracy" value={data ? `${data.aiRankingAccuracy}%` : "—"} sub="Correlation to final score" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Bar Chart */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-5 border border-outline-variant/50">
          <h2 className="font-bold text-on-surface mb-4">Pipeline Funnel by Stage</h2>
          {isLoading ? (
            <div className="h-64 animate-pulse bg-surface-container rounded-xl" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data?.funnelData} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#c7c5d420" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#464652" }} />
                <YAxis type="category" dataKey="stage" width={140} tick={{ fontSize: 11, fill: "#464652" }} />
                <Tooltip
                  contentStyle={{ background: "#fff", border: "1px solid #c7c5d4", borderRadius: 8, fontSize: 12 }}
                  cursor={{ fill: "#f0f0ff" }}
                />
                <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                  {data?.funnelData.map((_, i) => (
                    <Cell key={i} fill={FUNNEL_COLORS[i % FUNNEL_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Funnel Chart */}
        <div className="glass-card rounded-2xl p-5 border border-outline-variant/50 flex flex-col">
          <h2 className="font-bold text-on-surface mb-4">Conversion Funnel</h2>
          {isLoading ? (
            <div className="flex-1 animate-pulse bg-surface-container rounded-xl" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <FunnelChart>
                <Tooltip
                  contentStyle={{ background: "#fff", border: "1px solid #c7c5d4", borderRadius: 8, fontSize: 12 }}
                />
                <Funnel dataKey="count" data={data?.funnelData} isAnimationActive>
                  {data?.funnelData.map((_, i) => (
                    <Cell key={i} fill={FUNNEL_COLORS[i % FUNNEL_COLORS.length]} />
                  ))}
                  <LabelList position="right" fill="#464652" stroke="none" dataKey="stage" style={{ fontSize: 10 }} />
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          )}

          <div className="mt-4 pt-4 border-t border-outline-variant/30 text-center">
            <p className="text-sm font-bold text-primary">Time to Hire: {data?.timeToHire}d</p>
            <p className="text-xs text-on-surface-variant mt-0.5">45% faster than industry avg</p>
          </div>
        </div>
      </div>
    </div>
  );
}

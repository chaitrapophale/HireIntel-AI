import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Briefcase, Link2, Code2, CheckCircle2, AlertTriangle, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip,
} from "recharts";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { X, Send } from "lucide-react";
import { candidateService } from "@/services";
import { cn } from "@/lib/utils";

export default function CandidateProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showOutreach, setShowOutreach] = useState(false);
  const [message, setMessage] = useState("");

  // ── Dedicated single-candidate query — no full-list fetch ─────────────
  const { data: candidate, isLoading, isError } = useQuery({
    queryKey: ["candidate", id],
    queryFn: () => candidateService.getCandidate(id!),
    enabled: !!id,
  });

  // ── Page title update ─────────────────────────────────────────────────
  useMemo(() => {
    if (candidate) document.title = `${candidate.name} — HireIntel AI`;
    return () => { document.title = "HireIntel AI"; };
  }, [candidate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (isError || !candidate) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-on-surface-variant">Candidate not found.</p>
        <button onClick={() => navigate(-1)} className="text-primary font-bold hover:underline">Go Back</button>
      </div>
    );
  }

  const radarData = [
    { axis: "Tech Skills", value: candidate.fitBreakdown.techSkills },
    { axis: "Experience", value: candidate.fitBreakdown.experience },
    { axis: "Culture", value: candidate.fitBreakdown.cultureSoftSkills },
    { axis: "Impact", value: candidate.fitBreakdown.impact },
    { axis: "Role Fit", value: candidate.fitBreakdown.roleFit },
  ];

  const skillLevelColor = {
    expert: "bg-primary/10 text-primary border-primary/20",
    advanced: "bg-secondary/10 text-secondary border-secondary/20",
    intermediate: "bg-surface-container text-on-surface border-outline-variant",
  };

  return (
    <div className="px-6 py-6 pb-12 max-w-7xl mx-auto space-y-5">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors text-sm"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Rankings
      </button>

      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-2xl p-6 ai-glow-border flex flex-col md:flex-row justify-between items-start md:items-center gap-5 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />

        <div className="flex items-center gap-5 relative z-10">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-surface-container-high flex items-center justify-center text-3xl font-bold text-primary border-4 border-white shadow-lg">
              {candidate.initials}
            </div>
            <div className="absolute -bottom-2 -right-2 bg-primary text-white px-2 py-0.5 rounded-full text-[10px] font-bold border-2 border-white flex items-center gap-0.5">
              <Sparkles className="w-2.5 h-2.5" /> {candidate.aiScore}%
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-on-surface">{candidate.name}</h1>
            <div className="flex items-center gap-3 text-on-surface-variant text-sm mt-1 flex-wrap">
              <span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" /> {candidate.jobTitle}</span>
              <span className="text-outline-variant">•</span>
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {candidate.location}</span>
              <span className="text-outline-variant">•</span>
              <span className="bg-surface-container-high px-2 py-0.5 rounded-md text-xs font-semibold capitalize text-on-surface">
                {candidate.status.replace("_", " ")}
              </span>
            </div>
            <div className="flex gap-2 mt-2">
              <a href="#" aria-label="LinkedIn" className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-on-surface hover:text-primary hover:bg-primary/10 transition-colors">
                <Link2 className="w-3.5 h-3.5" />
              </a>
              <a href="#" aria-label="GitHub" className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-on-surface hover:text-primary hover:bg-primary/10 transition-colors">
                <Code2 className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 relative z-10 min-w-[180px]">
          <button
            onClick={() => toast.success("Interview scheduling link sent!")}
            className="w-full bg-primary text-white py-2.5 rounded-xl font-bold shadow hover:bg-primary-container transition-all text-sm"
          >
            Schedule Interview
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setMessage(`Hi ${candidate.name.split(" ")[0]},\n\nI was really impressed by your background, particularly your work at ${candidate.experience[0]?.company || "your recent roles"}. Your deep expertise aligns perfectly with our ${candidate.appliedFor} role.\n\nWould you be open to a brief chat this week to discuss?`);
                setShowOutreach(true);
              }}
              className="flex-1 bg-surface border border-outline-variant py-2 rounded-xl font-bold text-on-surface hover:bg-surface-container transition-all text-sm"
            >
              Message
            </button>
          </div>
        </div>
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: AI Summary + Experience */}
        <div className="lg:col-span-2 space-y-5">

          {/* AI Synthesis */}
          <div className="glass-card rounded-2xl p-6 border border-outline-variant/50 relative overflow-hidden">
            <div className="absolute top-4 right-4 opacity-5 pointer-events-none">
              <Sparkles className="w-24 h-24 text-primary" />
            </div>
            <h2 className="font-bold text-on-surface flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-tertiary-container" /> AI Candidate Synthesis
            </h2>
            <p className="text-on-surface leading-relaxed mb-4">{candidate.aiSummary}</p>

            {candidate.whyStandOut.length > 0 && (
              <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/30 mb-3">
                <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider mb-2">Why they stand out</h3>
                <ul className="space-y-2">
                  {candidate.whyStandOut.map((point) => (
                    <li key={point} className="flex items-start gap-2 text-sm text-on-surface-variant">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {candidate.riskAreas.length > 0 && (
              <div className="bg-error-container/50 p-4 rounded-xl border border-error/20">
                <h3 className="text-xs font-bold text-on-error-container uppercase tracking-wider mb-2">Potential Risk Areas</h3>
                {candidate.riskAreas.map((risk) => (
                  <p key={risk} className="flex items-start gap-2 text-sm text-on-surface-variant">
                    <AlertTriangle className="w-4 h-4 text-error shrink-0 mt-0.5" />
                    <span>{risk}</span>
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Experience Timeline */}
          <div className="glass-card rounded-2xl p-6 border border-outline-variant/50">
            <h2 className="font-bold text-on-surface mb-5">Experience Analysis</h2>
            {candidate.experience.length === 0 ? (
              <p className="text-sm text-on-surface-variant">No experience records available.</p>
            ) : (
              <div className="relative border-l-2 border-surface-container-highest ml-3 space-y-8 pb-2">
                {candidate.experience.map((exp) => (
                  <div key={exp.id} className="relative pl-6">
                    <div className={cn(
                      "absolute w-4 h-4 rounded-full -left-[9px] top-1 border-4 border-white",
                      exp.endDate === null ? "bg-primary" : "bg-surface-container-highest"
                    )} />
                    <div className="flex justify-between items-start mb-1">
                      <div>
                        <h3 className="font-bold text-on-surface text-lg">{exp.title}</h3>
                        <p className="text-on-surface-variant font-medium">{exp.company}</p>
                      </div>
                      <span className="text-xs text-on-surface-variant bg-surface-container px-2 py-1 rounded-lg shrink-0">
                        {exp.startDate} – {exp.endDate ?? "Present"}
                      </span>
                    </div>
                    <p className="text-sm text-on-surface-variant mt-2 leading-relaxed">{exp.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Radar + Skills */}
        <div className="space-y-5">
          {/* Radar Chart */}
          <div className="glass-card rounded-2xl p-5 border border-outline-variant/50 flex flex-col items-center">
            <h2 className="font-bold text-on-surface w-full mb-4">Fit Breakdown</h2>
            <div className="w-full h-56">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#c7c5d4" />
                  <PolarAngleAxis dataKey="axis" tick={{ fontSize: 10, fill: "#464652" }} />
                  <Radar name="Fit" dataKey="value" stroke="#15157d" fill="#15157d" fillOpacity={0.2} strokeWidth={2} />
                  <Tooltip
                    contentStyle={{ background: "#fff", border: "1px solid #c7c5d4", borderRadius: 8, fontSize: 12 }}
                    formatter={(v) => [`${v}%`]}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full space-y-2 mt-2">
              {Object.entries(candidate.fitBreakdown).map(([k, v]) => (
                <div key={k}>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="font-medium capitalize">{k.replace(/([A-Z])/g, " $1")}</span>
                    <span className="font-bold text-primary">{v}%</span>
                  </div>
                  <div className="w-full bg-surface-container-highest rounded-full h-1.5">
                    <div className="h-1.5 rounded-full bg-primary" style={{ width: `${v}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Skills */}
          <div className="glass-card rounded-2xl p-5 border border-outline-variant/50">
            <h2 className="font-bold text-on-surface mb-4">Verified Skills</h2>
            {candidate.skills.length === 0 ? (
              <p className="text-sm text-on-surface-variant">No skills recorded.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {candidate.skills.map((skill) => (
                  <span key={skill.name} className={cn("px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1", skillLevelColor[skill.level])}>
                    {skill.name}
                    {skill.verified && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />}
                  </span>
                ))}
              </div>
            )}
            <p className="text-[10px] text-on-surface-variant mt-4 pt-3 border-t border-outline-variant/30">
              Skills extracted via AI resume parsing.
            </p>
          </div>
        </div>
      </div>

      {/* Outreach Modal */}
      {showOutreach && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-surface rounded-2xl w-full max-w-lg shadow-2xl border border-outline-variant overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-lowest">
              <h3 className="font-bold text-lg text-on-surface flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" /> AI Drafted Outreach
              </h3>
              <button onClick={() => setShowOutreach(false)} className="text-on-surface-variant hover:text-on-surface">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-xs font-bold text-on-surface-variant mb-2 uppercase tracking-wide">Message Preview</p>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full h-40 bg-white border border-outline-variant rounded-xl p-4 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary resize-none"
              />
              <p className="text-[10px] text-on-surface-variant mt-2">
                Draft generated based on candidate's match with the {candidate.appliedFor} requirements.
              </p>
            </div>
            <div className="px-6 py-4 border-t border-outline-variant flex justify-end gap-3 bg-surface-container-lowest">
              <button onClick={() => setShowOutreach(false)} className="px-5 py-2 rounded-xl text-sm font-bold text-on-surface hover:bg-surface-container transition-colors">
                Cancel
              </button>
              <button
                onClick={() => {
                  toast.success("Outreach message sent via LinkedIn / Email!");
                  setShowOutreach(false);
                }}
                className="px-5 py-2 bg-primary text-white rounded-xl text-sm font-bold shadow flex items-center gap-2 hover:bg-primary-container transition-colors"
              >
                <Send className="w-4 h-4" /> Send Message
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, MapPin, Briefcase, GripVertical } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { candidateService } from "@/services";
import type { Candidate, CandidateStatus } from "@/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const STAGES: { id: CandidateStatus; label: string; color: string; dotColor: string }[] = [
  { id: "new", label: "New", color: "bg-surface-container border-outline-variant/50", dotColor: "bg-outline" },
  { id: "screening", label: "Screening", color: "bg-secondary/5 border-secondary/20", dotColor: "bg-secondary" },
  { id: "interviewing", label: "Interviewing", color: "bg-primary/5 border-primary/20", dotColor: "bg-primary" },
  { id: "offered", label: "Offered", color: "bg-tertiary/5 border-tertiary-container/40", dotColor: "bg-tertiary-container" },
  { id: "hired", label: "Hired", color: "bg-surface-container-high border-outline-variant/50", dotColor: "bg-secondary-container" },
];

const scoreColor = (score: number) =>
  score >= 95 ? "bg-primary text-white" : score >= 85 ? "bg-secondary text-white" : "bg-surface-container text-on-surface";

function CandidateCard({
  candidate,
  onDragStart,
}: {
  candidate: Candidate;
  onDragStart: (e: React.DragEvent, id: string) => void;
}) {
  const navigate = useNavigate();
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      draggable
      onDragStart={(e) => onDragStart(e as unknown as React.DragEvent, candidate.id)}
      className="glass-card rounded-xl border border-outline-variant/40 p-4 cursor-grab active:cursor-grabbing hover:shadow-md transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-xs shrink-0">
            {candidate.initials}
          </div>
          <div>
            <div className="font-bold text-on-surface text-sm flex items-center gap-1">
              {candidate.name}
              {candidate.isHiddenGem && (
                <span className="text-[9px] bg-tertiary-fixed text-on-tertiary-fixed px-1 py-0.5 rounded font-bold">GEM</span>
              )}
            </div>
            <div className="text-[10px] text-on-surface-variant flex items-center gap-1">
              <Briefcase className="w-2.5 h-2.5" />
              {candidate.jobTitle}
            </div>
          </div>
        </div>
        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold text-[10px] ring-2 ring-white shrink-0", scoreColor(candidate.aiScore))}>
          {candidate.aiScore}
        </div>
      </div>

      <div className="text-[10px] text-on-surface-variant flex items-center gap-1 mb-3">
        <MapPin className="w-2.5 h-2.5" />
        {candidate.location}
      </div>

      {/* Skill chips */}
      <div className="flex gap-1 flex-wrap mb-3">
        {candidate.skills.slice(0, 2).map((s) => (
          <span key={s.name} className="px-1.5 py-0.5 bg-surface border border-outline-variant rounded text-[9px] font-medium">
            {s.name}
          </span>
        ))}
        {candidate.skills.length > 2 && (
          <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-[9px] font-bold border border-primary/20">
            +{candidate.skills.length - 2}
          </span>
        )}
      </div>

      {/* Fit bar */}
      <div className="mb-3">
        <div className="flex justify-between text-[9px] mb-0.5">
          <span className="text-on-surface-variant">Role Fit</span>
          <span className="text-primary font-bold">{candidate.fitBreakdown?.roleFit || candidate.aiScore || 0}%</span>
        </div>
        <div className="w-full bg-surface-container-highest rounded-full h-1">
          <div className="h-1 rounded-full bg-primary" style={{ width: `${candidate.fitBreakdown?.roleFit || candidate.aiScore || 0}%` }} />
        </div>
      </div>

      <button
        onClick={() => navigate(`/app/candidates/${candidate.id}`)}
        className="w-full text-[10px] font-bold text-primary flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity hover:underline"
      >
        View Profile <ArrowRight className="w-2.5 h-2.5" />
      </button>

      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-20 transition-opacity">
        <GripVertical className="w-4 h-4 text-on-surface-variant" />
      </div>
    </motion.div>
  );
}

export default function PipelinePage() {
  const queryClient = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["candidates"],
    queryFn: () => candidateService.getCandidates(),
  });

  // Optimistic local state for instant UI feedback while API saves
  const [stageMap, setStageMap] = useState<Record<string, CandidateStatus>>({});
  const [dragOver, setDragOver] = useState<CandidateStatus | null>(null);
  const dragId = useRef<string | null>(null);

  const getStage = (c: Candidate): CandidateStatus => stageMap[c.id] ?? c.status;

  const handleDragStart = (e: React.DragEvent, id: string) => {
    dragId.current = id;
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = async (e: React.DragEvent, targetStage: CandidateStatus) => {
    e.preventDefault();
    if (!dragId.current) return;
    const id = dragId.current;
    dragId.current = null;
    setDragOver(null);

    // Optimistic update
    setStageMap((prev) => ({ ...prev, [id]: targetStage }));
    const candidate = data.find((c) => c.id === id);
    const stageName = STAGES.find((s) => s.id === targetStage)?.label ?? targetStage;

    try {
      await candidateService.updateStatus(id, targetStage);
      // Invalidate so data is fresh on next focus
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      if (candidate) toast.success(`${candidate.name} moved to ${stageName}`);
    } catch {
      // Rollback optimistic update
      setStageMap((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      toast.error(`Failed to update ${candidate?.name ?? "candidate"}'s stage. Please try again.`);
    }
  };

  const handleDragOver = (e: React.DragEvent, stage: CandidateStatus) => {
    e.preventDefault();
    setDragOver(stage);
  };

  const handleDragLeave = () => {
    setDragOver(null);
  };

  const grouped = STAGES.map((stage) => ({
    ...stage,
    candidates: data.filter((c) => getStage(c) === stage.id),
  }));

  const total = data.length;

  return (
    <div className="px-6 py-6 pb-12 max-w-[1600px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-on-surface tracking-tight flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-primary" /> Candidate Pipeline
          </h1>
          <p className="text-on-surface-variant mt-1">
            Drag and drop candidates between stages to update their status.{" "}
            <span className="font-bold text-primary">{total}</span> total candidates tracked.
          </p>
        </div>
        <div className="flex gap-2">
          {STAGES.map((stage) => (
            <div key={stage.id} className="flex items-center gap-1.5 text-xs text-on-surface-variant">
              <div className={cn("w-2 h-2 rounded-full", stage.dotColor)} />
              <span className="font-medium">{stage.label}</span>
              <span className="font-bold text-on-surface">
                {grouped.find((g) => g.id === stage.id)?.candidates.length ?? 0}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Kanban Board */}
      {isLoading ? (
        <div className="flex gap-4 h-[600px]">
          {STAGES.map((s) => (
            <div key={s.id} className="flex-1 rounded-2xl bg-surface-container animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {grouped.map((stage) => (
            <div
              key={stage.id}
              onDrop={(e) => handleDrop(e, stage.id)}
              onDragOver={(e) => handleDragOver(e, stage.id)}
              onDragLeave={handleDragLeave}
              className={cn(
                "flex-1 min-w-[220px] max-w-[280px] rounded-2xl border p-3 transition-all",
                stage.color,
                dragOver === stage.id && "ring-2 ring-primary/40 scale-[1.01]"
              )}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full", stage.dotColor)} />
                  <span className="font-bold text-sm text-on-surface">{stage.label}</span>
                </div>
                <span className="text-[10px] font-bold bg-white/60 text-on-surface-variant px-2 py-0.5 rounded-full border border-outline-variant/30">
                  {stage.candidates.length}
                </span>
              </div>

              {/* Cards */}
              <div className="space-y-2.5 min-h-[400px]">
                <AnimatePresence>
                  {stage.candidates.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col items-center justify-center h-32 text-center text-[11px] text-on-surface-variant/50 border-2 border-dashed border-outline-variant/30 rounded-xl"
                    >
                      Drop candidates here
                    </motion.div>
                  ) : (
                    stage.candidates.map((c) => (
                      <CandidateCard
                        key={c.id}
                        candidate={c}
                        onDragStart={handleDragStart}
                      />
                    ))
                  )}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

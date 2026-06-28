import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Briefcase, Plus, MapPin, Users } from "lucide-react";
import { jobService } from "@/services";
import { cn } from "@/lib/utils";
import type { Job } from "@/types";

const statusColor: Record<Job["status"], string> = {
  open: "bg-secondary-fixed text-on-secondary-fixed",
  on_hold: "bg-error-container text-on-error-container",
  closed: "bg-surface-container text-on-surface-variant",
  draft: "bg-tertiary-fixed text-on-tertiary-fixed",
};

export default function JobsPage() {
  const navigate = useNavigate();
  const { data = [], isLoading } = useQuery({
    queryKey: ["jobs"],
    queryFn: jobService.getJobs,
  });

  return (
    <div className="px-6 py-6 pb-12 max-w-7xl mx-auto space-y-5">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-on-surface tracking-tight flex items-center gap-2">
            <Briefcase className="w-7 h-7 text-primary" /> Active Requisitions
          </h1>
          <p className="text-on-surface-variant mt-1">{data.length} open roles across all departments.</p>
        </div>
        <button
          onClick={() => navigate("/app/jobs/create")}
          className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold shadow hover:bg-primary-container transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> New Requisition
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card rounded-2xl p-5 h-48 animate-pulse">
              <div className="h-4 bg-surface-container rounded w-1/2 mb-3" />
              <div className="h-2 bg-surface-container rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {data.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center p-12 glass-card rounded-2xl border border-outline-variant/50 text-center">
              <div className="w-16 h-16 bg-primary-container rounded-full flex items-center justify-center mb-4">
                <Briefcase className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-on-surface mb-2">No Active Requisitions</h3>
              <p className="text-on-surface-variant max-w-md mb-6">You haven't created any jobs yet. Create a requisition to start ranking candidates automatically.</p>
              <button
                onClick={() => navigate("/app/jobs/create")}
                className="bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow hover:bg-primary-container transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Create First Job
              </button>
            </div>
          ) : (
            data.map((job) => (
              <div
                key={job.id}
                onClick={() => navigate(`/app/rankings?jobId=${job.id}`)}
                className="glass-card rounded-2xl border border-outline-variant/50 p-5 hover:shadow-xl transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary-fixed flex items-center justify-center">
                    <Briefcase className="w-5 h-5 text-on-primary-fixed" />
                  </div>
                  <span className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide", statusColor[job.status])}>
                    {job.status.replace("_", " ")}
                  </span>
                </div>
                <h3 className="font-bold text-on-surface group-hover:text-primary transition-colors mb-1">{job.title}</h3>
                <div className="text-xs text-on-surface-variant flex items-center gap-3 mb-4">
                  <span>{job.department}</span>
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>
                </div>
                <div className="w-full bg-surface-container-highest rounded-full h-1.5 mb-3 flex gap-0.5 overflow-hidden">
                  <div className="bg-primary h-full rounded-full" style={{ width: `${(job.pipelineStats.sourced / 100) * 60}%` }} />
                  <div className="bg-secondary h-full" style={{ width: `${(job.pipelineStats.screened / 100) * 30}%` }} />
                  <div className="bg-tertiary-container h-full" style={{ width: `${(job.pipelineStats.interviewing / 100) * 10}%` }} />
                </div>
                <div className="flex justify-between text-[10px] text-on-surface-variant">
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {job.candidateCount} candidates</span>
                  <span className="font-bold text-primary">{job.topMatchScore}% top match</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

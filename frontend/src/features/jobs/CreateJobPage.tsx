import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, Sparkles, CheckCircle2, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { jobService } from "@/services";
import { storageService } from "@/services/storageService";
import type { AIExtractedJob } from "@/types";
import { cn } from "@/lib/utils";

const levelColors = {
  expert: "bg-primary/10 text-primary border-primary/20",
  advanced: "bg-secondary/10 text-secondary border-secondary/20",
  intermediate: "bg-surface-container text-on-surface border-outline-variant",
};

export default function CreateJobPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [description, setDescription] = useState("");
  const [extracted, setExtracted] = useState<AIExtractedJob | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const mutation = useMutation({
    mutationFn: jobService.analyzeJobDescription,
    onSuccess: (data) => {
      setExtracted(data);
      toast.success("AI extraction complete!");
    },
    onError: (err: Error) => toast.error(err.message || "Extraction failed. Please try again."),
  });

  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    try {
      storageService.validateFile(file);
    } catch (e: any) {
      toast.error(e.message);
      return;
    }

    setUploadProgress(0);

    try {
      await storageService.uploadFile(file, "jobs", (progress) => {
        setUploadProgress(progress);
      });
      toast.success(`File "${file.name}" uploaded. Click Analyze to extract requirements.`);

      // Read local text for AI extraction
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setDescription(text.slice(0, 2000) || `[Content from ${file.name}]`);
      };
      reader.readAsText(file);
    } catch (err: any) {
      toast.error("Upload failed: " + (err.message || "Unknown error"));
    } finally {
      setTimeout(() => setUploadProgress(null), 1500);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/plain": [".txt"], "application/pdf": [".pdf"], "application/msword": [".doc", ".docx"] },
    maxFiles: 1,
  });

  const handleAnalyze = () => {
    if (!description.trim()) {
      toast.warning("Please paste or upload a job description first.");
      return;
    }
    setExtracted(null);
    mutation.mutate(description);
  };

  const handleSave = async () => {
    if (!extracted) return;
    setIsSaving(true);
    try {
      await jobService.createJob({
        title: extracted.title,
        department: extracted.department || "",
        location: extracted.location || "",
        description,
        core_skills: (extracted.coreSkills || []).map((s) => s?.skill).filter(Boolean),
        soft_skills: extracted.softSkills || [],
      });
      // Invalidate jobs cache so the list refreshes
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      toast.success(`Requisition "${extracted.title}" created!`);
      navigate("/app/jobs");
    } catch (err: any) {
      toast.error(err.message || "Failed to save requisition.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="px-6 py-6 pb-12 max-w-6xl mx-auto space-y-5">
      <div>
        <h1 className="text-3xl font-bold text-on-surface tracking-tight">Create New Requisition</h1>
        <p className="text-on-surface-variant mt-1 max-w-2xl">
          Paste your job description or upload a document. The AI will instantly extract core requirements and generate an ideal candidate profile.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: Input */}
        <div className="glass-card rounded-2xl border border-outline-variant/50 p-5 flex flex-col h-[580px]">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-on-surface">Job Description</h2>
          </div>

          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all mb-4",
              isDragActive ? "border-primary bg-primary/5" : "border-outline-variant hover:border-primary/50 hover:bg-surface-container-low"
            )}
          >
            <input {...getInputProps()} />
            <Upload className="w-5 h-5 text-on-surface-variant mx-auto mb-1" />
            <p className="text-xs text-on-surface-variant">
              {isDragActive ? "Drop it here!" : "Drag & drop PDF/Word, or click to upload"}
            </p>
          </div>

          {uploadProgress !== null && (
            <div className="mb-4">
              <div className="flex justify-between text-[10px] text-on-surface-variant mb-1">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-surface-container-highest rounded-full h-1.5">
                <div className="h-1.5 rounded-full bg-primary transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          )}

          {/* Textarea */}
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={"Or paste the job description here…\n\nWe are looking for a Senior Frontend Engineer to join our core product team…"}
            className="flex-1 w-full bg-surface-container-lowest border border-outline-variant rounded-xl p-4 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary resize-none transition-all"
          />

          {/* Actions */}
          <div className="flex gap-3 mt-4">
            <button
              type="button"
              onClick={() => { setDescription(""); setExtracted(null); }}
              className="px-4 py-2 border border-outline-variant rounded-xl text-sm font-semibold text-on-surface hover:bg-surface-container-low transition-all"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={mutation.isPending}
              className="flex-1 bg-primary text-white px-6 py-2 rounded-xl font-bold shadow hover:bg-primary-container transition-all flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {mutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing…</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Analyze & Extract</>
              )}
            </button>
          </div>
        </div>

        {/* Right: Extraction Result */}
        <div className="glass-card rounded-2xl border border-outline-variant/50 h-[580px] flex items-center justify-center relative overflow-hidden">
          <AnimatePresence mode="wait">
            {/* Empty State */}
            {!mutation.isPending && !extracted && (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center text-center p-8"
              >
                <div className="w-16 h-16 bg-surface-container rounded-2xl flex items-center justify-center mb-4">
                  <FileText className="w-8 h-8 text-outline-variant" />
                </div>
                <h3 className="font-bold text-on-surface mb-2">Awaiting Description</h3>
                <p className="text-sm text-on-surface-variant max-w-xs">Paste a job description on the left. The AI will instantly generate an extraction profile here.</p>
              </motion.div>
            )}

            {/* Loading State */}
            {mutation.isPending && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center text-center p-8"
              >
                <div className="relative w-20 h-20 mb-5">
                  <div className="absolute inset-0 border-4 border-surface-variant rounded-full" />
                  <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin" />
                  <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 text-primary" />
                </div>
                <h3 className="font-bold text-primary mb-3 ai-gradient-text text-lg">Analyzing Requirements…</h3>
                <div className="space-y-2 text-left text-sm text-on-surface-variant">
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Extracting core skills</div>
                  <div className="flex items-center gap-2 opacity-40"><Loader2 className="w-4 h-4 animate-spin" /> Weighting importance</div>
                  <div className="flex items-center gap-2 opacity-40"><Loader2 className="w-4 h-4 animate-spin" /> Generating search terms</div>
                </div>
              </motion.div>
            )}

            {/* Results State */}
            {extracted && !mutation.isPending && (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full p-5 overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-primary">
                    <Sparkles className="w-4 h-4" />
                    <h3 className="font-bold">Extraction Complete</h3>
                  </div>
                  <button onClick={() => setExtracted(null)} className="text-outline-variant hover:text-on-surface">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div className="bg-surface p-3 rounded-xl border border-outline-variant/50">
                    <div className="text-[10px] uppercase font-bold text-on-surface-variant mb-1">Inferred Title</div>
                    <div className="font-bold text-on-surface text-lg">{extracted.title}</div>
                    <div className="text-sm text-on-surface-variant">{extracted.department} • {extracted.location}</div>
                  </div>

                  <div className="bg-surface p-3 rounded-xl border border-outline-variant/50">
                    <div className="text-[10px] uppercase font-bold text-on-surface-variant mb-2">Core Technical Skills</div>
                    <div className="flex flex-wrap gap-2">
                      {(extracted.coreSkills || []).map((s) => (
                        <span key={s.skill} className={cn("px-2.5 py-1 rounded-lg text-xs font-bold border", levelColors[s.level as keyof typeof levelColors] || levelColors.intermediate)}>
                          {s.skill} <span className="opacity-60">({s.level})</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="bg-surface p-3 rounded-xl border border-outline-variant/50">
                    <div className="text-[10px] uppercase font-bold text-on-surface-variant mb-2">Soft Skills & Culture</div>
                    <div className="flex flex-wrap gap-2">
                      {(extracted.softSkills || []).map((s) => (
                        <span key={s} className="px-2.5 py-1 rounded-lg text-xs font-bold bg-secondary/10 text-secondary border border-secondary/20">{s}</span>
                      ))}
                    </div>
                  </div>

                  {/* ── Save button now wired to real API ── */}
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full bg-primary text-white py-3 rounded-xl font-bold shadow hover:bg-primary-container transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {isSaving ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                    ) : (
                      "Save & Open Requisition"
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

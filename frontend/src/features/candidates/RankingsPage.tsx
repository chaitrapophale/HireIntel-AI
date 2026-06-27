import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  useReactTable, getCoreRowModel, getSortedRowModel,
  getFilteredRowModel, flexRender, type ColumnDef, type SortingState,
} from "@tanstack/react-table";
import { useState } from "react";
import { ChevronUp, ChevronDown, ArrowRight, Trophy, Upload, Sparkles, Loader2, X, FileText, CheckCircle2, AlertCircle, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDropzone } from "react-dropzone";
import { candidateService, jobService } from "@/services";
import type { Candidate } from "@/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 95 ? "bg-primary text-white ring-primary/30" : score >= 85 ? "bg-secondary text-white ring-secondary/30" : "bg-surface-container text-on-surface ring-outline-variant/30";
  return (
    <div className={cn("inline-flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm ring-4", color)}>
      {score}
    </div>
  );
}

function FitBar({ value }: { value: number }) {
  return (
    <div className="w-28">
      <div className="flex justify-between text-[10px] text-on-surface-variant mb-0.5">
        <span>{value}%</span>
      </div>
      <div className="w-full bg-surface-container-highest rounded-full h-1.5">
        <div className="h-1.5 rounded-full bg-primary transition-all" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

interface UploadModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function UploadDatasetModal({ onClose, onSuccess }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [summary, setSummary] = useState<any>(null);

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setStatus("idle");
      setErrorMessage("");
    }
  };

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
      "application/json": [".json"]
    },
    maxFiles: 1,
  });

  const handleUpload = async () => {
    if (!file) return;
    setStatus("uploading");
    try {
      const result = await candidateService.uploadDataset(file);
      setSummary(result);
      setStatus("success");
      toast.success("Dataset uploaded successfully!");
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (err: any) {
      setStatus("error");
      const detail = err.response?.data?.detail || "An error occurred during upload. Please verify the backend format.";
      setErrorMessage(detail);
      toast.error(detail);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-surface rounded-2xl w-full max-w-md shadow-2xl border border-outline-variant overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-lowest">
          <h3 className="font-bold text-base text-on-surface flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" /> Upload Candidate Dataset
          </h3>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {status === "idle" && (
            <>
              <div
                {...getRootProps()}
                className={cn(
                  "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3",
                  isDragActive ? "border-primary bg-primary/5" : "border-outline-variant hover:border-primary/50 hover:bg-surface-container-low"
                )}
              >
                <input {...getInputProps()} />
                <Upload className="w-10 h-10 text-on-surface-variant" />
                <div>
                  <p className="text-sm font-semibold text-on-surface">
                    {isDragActive ? "Drop the file here" : "Drag & drop file here, or click to browse"}
                  </p>
                  <p className="text-xs text-on-surface-variant mt-1.5">Supports CSV, XLSX, XLS, JSON</p>
                </div>
              </div>

              {fileRejections.length > 0 && (
                <div className="bg-error-container/20 border border-error/20 text-error text-xs rounded-xl p-3 flex gap-2 items-start">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>Invalid file type. Please upload a CSV, Excel, or JSON dataset.</div>
                </div>
              )}

              {file && (
                <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/30 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="w-8 h-8 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-on-surface truncate">{file.name}</p>
                      <p className="text-xs text-on-surface-variant">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <button onClick={() => setFile(null)} className="text-xs font-bold text-error hover:underline shrink-0">
                    Remove
                  </button>
                </div>
              )}
            </>
          )}

          {status === "uploading" && (
            <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
              <div>
                <p className="font-bold text-on-surface">Uploading & Parsing Dataset...</p>
                <p className="text-xs text-on-surface-variant mt-1.5">Generating vector embeddings using NVIDIA NV-Embed-QA</p>
              </div>
            </div>
          )}

          {status === "success" && (
            <div className="flex flex-col items-center justify-center py-8 gap-4 text-center">
              <CheckCircle2 className="w-12 h-12 text-primary" />
              <div>
                <p className="font-bold text-on-surface text-lg">Upload Successful!</p>
                {summary && (
                  <div className="mt-3 bg-surface-container-low border border-outline-variant/30 rounded-xl p-4 text-left text-xs space-y-1.5 w-64 mx-auto">
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Total Rows:</span>
                      <span className="font-bold text-on-surface">{summary.total}</span>
                    </div>
                    <div className="flex justify-between text-primary">
                      <span>Imported:</span>
                      <span className="font-bold">{summary.imported}</span>
                    </div>
                    <div className="flex justify-between text-on-surface-variant">
                      <span>Duplicates:</span>
                      <span className="font-bold text-on-surface">{summary.duplicates}</span>
                    </div>
                    <div className="flex justify-between text-error">
                      <span>Failed Rows:</span>
                      <span className="font-bold">{summary.failed}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center justify-center py-8 gap-4 text-center">
              <AlertCircle className="w-12 h-12 text-error" />
              <div>
                <p className="font-bold text-on-surface text-lg">Upload Failed</p>
                <p className="text-xs text-error mt-2 max-w-xs">{errorMessage}</p>
                <button
                  onClick={() => setStatus("idle")}
                  className="mt-4 px-4 py-2 bg-surface border border-outline-variant text-xs font-semibold rounded-xl hover:bg-surface-container-low transition-all"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {status === "idle" && (
          <div className="px-6 py-4 border-t border-outline-variant flex justify-end gap-3 bg-surface-container-lowest">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl text-sm font-bold text-on-surface hover:bg-surface-container transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={!file}
              className="px-5 py-2 bg-primary text-white disabled:opacity-50 rounded-xl text-sm font-bold shadow hover:bg-primary-container transition-colors"
            >
              Upload & Process
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default function RankingsPage() {
  const queryClient = useQueryClient();
  const [sorting, setSorting] = useState<SortingState>([{ id: "aiScore", desc: true }]);
  const [globalFilter, setGlobalFilter] = useState("");
  const navigate = useNavigate();

  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [isRanking, setIsRanking] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [localRankedData, setLocalRankedData] = useState<Candidate[] | null>(null);

  const { data: serverCandidates = [], isLoading } = useQuery({
    queryKey: ["candidates"],
    queryFn: candidateService.getCandidates,
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ["jobs"],
    queryFn: jobService.getJobs,
  });

  const data = localRankedData || serverCandidates;

  const handleExportDataset = () => {
    if (data.length === 0) {
      toast.warning("No candidate data to export.");
      return;
    }

    const headers = ["ID", "Full Name", "Job Title", "Location", "AI Score", "Status", "Skills", "Years of Experience"];
    const csvRows = [
      headers.join(","),
      ...data.map((c) => {
        const skillsStr = (c.skills || []).map((s) => s.name).join("; ");
        const years = c.experience ? c.experience.length : 0;
        return [
          `"${c.id}"`,
          `"${c.name}"`,
          `"${c.jobTitle}"`,
          `"${c.location || "Remote"}"`,
          c.aiScore,
          `"${c.status}"`,
          `"${skillsStr}"`,
          years
        ].join(",");
      })
    ];

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `hireintel_candidates_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Dataset exported successfully!");
  };

  const handleRankCandidates = async () => {
    const job = jobs.find((j) => j.id === selectedJobId);
    if (!job) {
      toast.warning("Please select a Job Requisition first.");
      return;
    }

    setIsRanking(true);
    const loadingToastId = toast.loading(`Ranking candidates with AI for "${job.title}"...`);
    try {
      const results = await candidateService.rankCandidates(job.description);
      setLocalRankedData(results);
      toast.success(`Success! NVIDIA NV-Embed + DeepSeek-R1 ranking complete.`, { id: loadingToastId });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    } catch (err: any) {
      toast.error("Ranking pipeline execution failed. Please verify API keys.", { id: loadingToastId });
    } finally {
      setIsRanking(false);
    }
  };

  const columns: ColumnDef<Candidate>[] = [
    {
      id: "rank",
      header: "Rank",
      cell: ({ row }) => (
        <div className="font-bold text-lg text-on-surface-variant w-8">#{row.index + 1}</div>
      ),
    },
    {
      id: "candidate",
      header: "Candidate",
      accessorKey: "name",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-sm">
            {row.original.initials}
          </div>
          <div>
            <div className="font-bold text-on-surface flex items-center gap-1">
              {row.original.name}
              {row.original.isHiddenGem && (
                <span className="text-[10px] bg-tertiary-fixed text-on-tertiary-fixed px-1.5 py-0.5 rounded font-bold">GEM</span>
              )}
            </div>
            <div className="text-[11px] text-on-surface-variant">{row.original.jobTitle}</div>
          </div>
        </div>
      ),
    },
    {
      id: "roleFit",
      header: "Role Fit",
      accessorFn: (row) => row.fitBreakdown.roleFit,
      cell: ({ getValue }) => <FitBar value={getValue() as number} />,
    },
    {
      id: "skills",
      header: "Top Skills",
      cell: ({ row }) => {
        const skillsArray = row.original.skills || [];
        return (
          <div className="flex gap-1 flex-wrap">
            {skillsArray.slice(0, 2).map((s) => (
              <span key={s.name} className="px-2 py-0.5 bg-surface border border-outline-variant rounded text-[10px] font-medium">
                {s.name}
              </span>
            ))}
            {skillsArray.length > 2 && (
              <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-bold border border-primary/20">
                +{skillsArray.length - 2}
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: "aiScore",
      header: "AI Score",
      accessorKey: "aiScore",
      cell: ({ getValue }) => <ScoreBadge score={getValue() as number} />,
    },
    {
      id: "action",
      header: "",
      cell: ({ row }) => (
        <button
          onClick={() => navigate(`/app/candidates/${row.original.id}`)}
          className="text-primary font-bold text-xs hover:underline flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          Profile <ArrowRight className="w-3 h-3" />
        </button>
      ),
    },
  ];

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="px-6 py-6 pb-12 max-w-7xl mx-auto space-y-5">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-on-surface tracking-tight flex items-center gap-2">
            <Trophy className="w-7 h-7 text-primary" /> AI Talent Rankings
          </h1>
          <p className="text-on-surface-variant mt-1">Candidates ranked by multi-dimensional fit for your active roles.</p>
        </div>
        
        <div className="flex flex-wrap gap-2.5 items-center">
          <select
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            className="border border-outline-variant rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white text-on-surface max-w-[200px]"
          >
            <option value="">Select Requisition...</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>{j.title}</option>
            ))}
          </select>

          <button
            onClick={handleRankCandidates}
            disabled={isRanking}
            className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold shadow hover:bg-primary-container disabled:opacity-75 transition-all flex items-center gap-1.5"
          >
            {isRanking ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Rank with AI
          </button>

          <button
            onClick={() => setShowUploadModal(true)}
            className="border border-outline-variant bg-surface hover:bg-surface-container-low px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5"
          >
            <Upload className="w-4 h-4" />
            Upload Dataset
          </button>

          <button
            onClick={handleExportDataset}
            className="border border-outline-variant bg-surface hover:bg-surface-container-low px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            Export Dataset
          </button>

          <input
            type="text"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search candidates…"
            className="border border-outline-variant rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white max-w-[180px]"
          />
        </div>
      </div>

      <div className="glass-card rounded-2xl border border-outline-variant/50 overflow-hidden">
        <div className="overflow-x-auto">
          {data.length === 0 && !isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center mb-4">
                <Trophy className="w-8 h-8 text-on-surface-variant" />
              </div>
              <h3 className="text-xl font-bold text-on-surface mb-2">No Candidates Ranked</h3>
              <p className="text-on-surface-variant max-w-sm mb-6">Upload resumes to see AI rankings and candidate insights.</p>
              <button
                onClick={() => navigate("/app/pipeline")}
                className="bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow hover:bg-primary-container transition-all flex items-center gap-2"
              >
                Go to Pipeline
              </button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id} className="border-b border-outline-variant/30 bg-surface-container-lowest text-[11px] text-on-surface-variant uppercase tracking-wider">
                    {hg.headers.map((header) => (
                      <th
                        key={header.id}
                        className="px-5 py-3 text-left font-semibold cursor-pointer select-none hover:text-primary transition-colors"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <div className="flex items-center gap-1">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getIsSorted() === "asc" && <ChevronUp className="w-3 h-3" />}
                          {header.column.getIsSorted() === "desc" && <ChevronDown className="w-3 h-3" />}
                        </div>
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {isLoading
                  ? [1, 2, 3].map((i) => (
                      <tr key={i} className="animate-pulse">
                        {columns.map((_, j) => (
                          <td key={j} className="px-5 py-4">
                            <div className="h-3 bg-surface-container rounded w-3/4" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : table.getRowModel().rows.map((row, idx) => (
                      <tr
                        key={row.id}
                        className={cn(
                          "hover:bg-surface-container-low transition-colors group cursor-pointer",
                          idx === 0 && "bg-primary/5"
                        )}
                        onClick={() => navigate(`/app/candidates/${row.original.id}`)}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="px-5 py-4">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showUploadModal && (
          <UploadDatasetModal
            onClose={() => setShowUploadModal(false)}
            onSuccess={() => {
              setShowUploadModal(false);
              setLocalRankedData(null);
              queryClient.invalidateQueries({ queryKey: ["candidates"] });
              queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

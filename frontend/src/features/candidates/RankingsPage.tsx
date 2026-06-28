import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  useReactTable, getCoreRowModel, getSortedRowModel,
  getFilteredRowModel, flexRender, type ColumnDef, type SortingState,
} from "@tanstack/react-table";
import { useState, useMemo } from "react";
import { ChevronUp, ChevronDown, ArrowRight, Trophy } from "lucide-react";
import { candidateService } from "@/services";
import type { Candidate } from "@/types";
import { cn } from "@/lib/utils";

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

export default function RankingsPage() {
  const [sorting, setSorting] = useState<SortingState>([{ id: "aiScore", desc: true }]);
  const [globalFilter, setGlobalFilter] = useState("");
  const navigate = useNavigate();

  const { data = [], isLoading } = useQuery({
    queryKey: ["candidates"],
    queryFn: () => candidateService.getCandidates(),
  });

  const columns: ColumnDef<Candidate>[] = useMemo(() => [
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
      cell: ({ row }) => (
        <div className="flex gap-1 flex-wrap">
          {row.original.skills.slice(0, 2).map((s) => (
            <span key={s.name} className="px-2 py-0.5 bg-surface border border-outline-variant rounded text-[10px] font-medium">
              {s.name}
            </span>
          ))}
          {row.original.skills.length > 2 && (
            <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-bold border border-primary/20">
              +{row.original.skills.length - 2}
            </span>
          )}
        </div>
      ),
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
  ], [navigate]);

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
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-on-surface tracking-tight flex items-center gap-2">
            <Trophy className="w-7 h-7 text-primary" /> AI Talent Rankings
          </h1>
          <p className="text-on-surface-variant mt-1">Candidates ranked by multi-dimensional fit for your active roles.</p>
        </div>
        <div className="flex gap-3">
          <input
            type="text"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search candidates…"
            className="border border-outline-variant rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
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
    </div>
  );
}

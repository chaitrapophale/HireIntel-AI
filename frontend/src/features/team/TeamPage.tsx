import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  useReactTable, getCoreRowModel, getFilteredRowModel,
  flexRender, type ColumnDef,
} from "@tanstack/react-table";
import { Users, Search, UserPlus, Shield, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import { teamService } from "@/services";
import type { TeamMember, TeamRole } from "@/types";
import { cn } from "@/lib/utils";

const roleColors: Record<TeamRole, string> = {
  admin: "bg-tertiary-fixed text-on-tertiary-fixed",
  recruiter: "bg-secondary-fixed text-on-secondary-fixed",
  hiring_manager: "bg-surface-container text-on-surface",
  interviewer: "bg-surface-container text-on-surface",
};

const roleLabel: Record<TeamRole, string> = {
  admin: "Admin",
  recruiter: "Recruiter",
  hiring_manager: "Hiring Manager",
  interviewer: "Interviewer",
};

export default function TeamPage() {
  const [globalFilter, setGlobalFilter] = useState("");

  const { data = [], isLoading } = useQuery({
    queryKey: ["team"],
    queryFn: teamService.getMembers,
  });

  const columns: ColumnDef<TeamMember>[] = [
    {
      id: "user",
      header: "User",
      accessorKey: "name",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-xs">
            {row.original.initials}
          </div>
          <div>
            <div className="font-bold text-on-surface flex items-center gap-1.5">
              {row.original.name}
              {row.original.isCurrentUser && (
                <span className="text-[10px] bg-surface-container text-on-surface-variant px-1.5 py-0.5 rounded font-normal">You</span>
              )}
            </div>
            <div className="text-[11px] text-on-surface-variant">{row.original.email}</div>
          </div>
        </div>
      ),
    },
    {
      id: "role",
      header: "Role",
      accessorKey: "role",
      cell: ({ getValue }) => (
        <span className={cn("px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide", roleColors[getValue() as TeamRole])}>
          {roleLabel[getValue() as TeamRole]}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      accessorKey: "status",
      cell: ({ getValue }) => {
        const status = getValue() as TeamMember["status"];
        return (
          <span className="flex items-center gap-1.5 text-xs text-on-surface-variant">
            {status === "active" ? (
              <><CheckCircle2 className="w-3.5 h-3.5 text-secondary-container" /> Active</>
            ) : status === "pending" ? (
              <><Clock className="w-3.5 h-3.5 text-outline" /> Pending</>
            ) : (
              <><Shield className="w-3.5 h-3.5 text-outline-variant" /> Inactive</>
            )}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => !row.original.isCurrentUser ? (
        <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
          <button className="text-xs font-bold text-on-surface-variant hover:text-primary transition-colors">Edit</button>
          <button className="text-xs font-bold text-error hover:text-error/80 transition-colors">Remove</button>
        </div>
      ) : null,
    },
  ];

  const table = useReactTable({
    data,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="px-6 py-6 pb-12 max-w-5xl mx-auto space-y-5">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-on-surface tracking-tight flex items-center gap-2">
            <Users className="w-7 h-7 text-primary" /> Team Management
          </h1>
          <p className="text-on-surface-variant mt-1">Manage your hiring team, permissions, and interview groups.</p>
        </div>
        <button
          onClick={() => toast.info("Invite member flow coming soon!")}
          className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold shadow hover:bg-primary-container transition-all flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" /> Invite Member
        </button>
      </div>

      <div className="glass-card rounded-2xl border border-outline-variant/50 overflow-hidden">
        <div className="px-5 py-3 border-b border-outline-variant/30 flex justify-between items-center">
          <div className="relative w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-on-surface-variant" />
            <input
              type="text"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Search members…"
              className="w-full bg-surface border border-outline-variant rounded-lg pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className="border-b border-outline-variant/30 bg-surface-container-lowest text-[11px] text-on-surface-variant uppercase tracking-wider">
                  {hg.headers.map((header) => (
                    <th key={header.id} className="px-5 py-3 text-left font-semibold">
                      {flexRender(header.column.columnDef.header, header.getContext())}
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
                        <td key={j} className="px-5 py-4"><div className="h-3 bg-surface-container rounded w-3/4" /></td>
                      ))}
                    </tr>
                  ))
                : table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="hover:bg-surface-container-low transition-colors group">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-5 py-4">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

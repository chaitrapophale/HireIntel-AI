import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Bell, Settings, ChevronDown, Plus, Briefcase, Users, X } from "lucide-react";
import { useSearchStore } from "@/store";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { candidateService, jobService } from "@/services";
import { cn } from "@/lib/utils";

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function TopNav() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { query, isOpen, setQuery, setOpen, clear } = useSearchStore();
  const debouncedQuery = useDebounce(query, 200);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: candidates = [] } = useQuery({
    queryKey: ["candidates"],
    queryFn: candidateService.getCandidates,
  });
  const { data: jobs = [] } = useQuery({
    queryKey: ["jobs"],
    queryFn: jobService.getJobs,
  });

  // Filter results
  const q = debouncedQuery.toLowerCase().trim();
  const matchedCandidates = q.length >= 1
    ? candidates.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.jobTitle.toLowerCase().includes(q) ||
          c.skills.some((s) => s.name.toLowerCase().includes(q))
      ).slice(0, 4)
    : [];
  const matchedJobs = q.length >= 1
    ? jobs.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.department.toLowerCase().includes(q) ||
          j.location.toLowerCase().includes(q)
      ).slice(0, 3)
    : [];

  const hasResults = matchedCandidates.length > 0 || matchedJobs.length > 0;

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [setOpen]);

  // Keyboard shortcut ⌘K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        const input = containerRef.current?.querySelector("input");
        input?.focus();
        setOpen(true);
      }
      if (e.key === "Escape") {
        clear();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [clear, setOpen]);

  const handleSelect = (path: string) => {
    navigate(path);
    clear();
  };

  return (
    <header className="sticky top-0 z-40 h-16 bg-surface border-b border-outline-variant flex justify-between items-center px-5">
      {/* Search */}
      <div className="flex items-center gap-4 flex-1 max-w-xl" ref={containerRef}>
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => query.length > 0 && setOpen(true)}
            placeholder="Search candidates, jobs, or insights… (⌘K)"
            className="w-full bg-surface-container-low border border-outline-variant rounded-full pl-9 pr-12 py-2 text-sm focus:ring-2 focus:ring-secondary/50 focus:outline-none transition-all placeholder:text-outline"
          />
          {query ? (
            <button
              onClick={clear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-outline border border-outline/30 px-1.5 py-0.5 rounded">
              ⌘K
            </kbd>
          )}

          {/* Search Dropdown */}
          {isOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-outline-variant rounded-2xl shadow-2xl overflow-hidden z-50">
              {!hasResults && q.length >= 1 && (
                <div className="px-4 py-6 text-center text-sm text-on-surface-variant">
                  No results for "<span className="font-bold text-on-surface">{q}</span>"
                </div>
              )}
              {q.length === 0 && (
                <div className="px-4 py-3 text-xs text-on-surface-variant text-center">
                  Start typing to search candidates and jobs…
                </div>
              )}
              {matchedCandidates.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider border-b border-outline-variant/30 bg-surface-container-lowest flex items-center gap-1.5">
                    <Users className="w-3 h-3" /> Candidates
                  </div>
                  {matchedCandidates.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => handleSelect(`/app/candidates/${c.id}`)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-container-low transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-xs shrink-0">
                        {c.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm text-on-surface truncate">{c.name}</div>
                        <div className="text-[11px] text-on-surface-variant truncate">{c.jobTitle}</div>
                      </div>
                      <div className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0",
                        c.aiScore >= 95 ? "bg-primary text-white" : c.aiScore >= 85 ? "bg-secondary text-white" : "bg-surface-container text-on-surface"
                      )}>
                        {c.aiScore}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {matchedJobs.length > 0 && (
                <div className={cn(matchedCandidates.length > 0 && "border-t border-outline-variant/30")}>
                  <div className="px-4 py-2 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider border-b border-outline-variant/30 bg-surface-container-lowest flex items-center gap-1.5">
                    <Briefcase className="w-3 h-3" /> Jobs
                  </div>
                  {matchedJobs.map((j) => (
                    <button
                      key={j.id}
                      onClick={() => handleSelect(`/app/jobs`)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-container-low transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-xl bg-primary-fixed flex items-center justify-center shrink-0">
                        <Briefcase className="w-4 h-4 text-on-primary-fixed" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm text-on-surface truncate">{j.title}</div>
                        <div className="text-[11px] text-on-surface-variant truncate">{j.department} • {j.location}</div>
                      </div>
                      <span className="text-[10px] font-bold text-secondary shrink-0">{j.status}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        <button className="text-on-surface-variant text-sm font-medium hover:text-primary transition-colors flex items-center gap-1">
          Workspace <ChevronDown className="w-4 h-4" />
        </button>
        <div className="h-5 w-px bg-outline-variant" />
        <button className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-error rounded-full border border-surface" />
        </button>
        <button
          onClick={() => navigate("/app/settings")}
          className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors"
        >
          <Settings className="w-4 h-4" />
        </button>
        <div className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-bold text-xs border-2 border-primary-fixed cursor-pointer">
          {currentUser?.email?.substring(0, 2).toUpperCase() ?? "U"}
        </div>
        <button
          onClick={() => navigate("/app/jobs/create")}
          className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-primary-container transition-all active:scale-95 flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Create Job
        </button>
      </div>
    </header>
  );
}

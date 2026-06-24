import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Bell, Settings, ChevronDown, Plus } from "lucide-react";
import { useAuthStore } from "@/store";

export function TopNav() {
  const [searchVal, setSearchVal] = useState("");
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  return (
    <header className="sticky top-0 z-40 h-16 bg-surface border-b border-outline-variant flex justify-between items-center px-5">
      {/* Search */}
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
          <input
            type="text"
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            placeholder="Search candidates, jobs, or insights… (⌘K)"
            className="w-full bg-surface-container-low border border-outline-variant rounded-full pl-9 pr-12 py-2 text-sm focus:ring-2 focus:ring-secondary/50 focus:outline-none transition-all placeholder:text-outline"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-outline border border-outline/30 px-1.5 py-0.5 rounded">
            ⌘K
          </kbd>
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
          {user?.avatarInitials ?? "SJ"}
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

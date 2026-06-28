import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Briefcase, Users, Trophy, Star,
  BarChart2, Settings, HelpCircle, Sparkles, Plus, Zap,
  Kanban, Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const navItems = [
  { to: "/app/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/app/jobs", icon: Briefcase, label: "Jobs" },
  { to: "/app/candidates", icon: Users, label: "Candidates" },
  { to: "/app/rankings", icon: Trophy, label: "Rankings" },
  { to: "/app/pipeline", icon: Kanban, label: "Pipeline" },
  { to: "/app/hidden-gems", icon: Star, label: "Hidden Gems" },
  { to: "/app/analytics", icon: BarChart2, label: "Analytics" },
  { to: "/app/team", icon: Building2, label: "Team" },
  { to: "/app/settings", icon: Settings, label: "Settings" },
];

export function Sidebar() {
  const navigate = useNavigate();
  const { logout, currentUser } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Signed out successfully");
      navigate("/login");
    } catch {
      toast.error("Failed to sign out");
    }
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-[260px] bg-primary flex flex-col py-6 z-50 shadow-xl">
      {/* Logo */}
      <div className="px-6 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-[20px] font-black text-white leading-tight tracking-tight">HireIntel AI</h1>
            <p className="text-white/50 text-[10px] uppercase tracking-widest font-bold">Beyond Keywords</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-0.5 px-3 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-all duration-150 text-sm font-medium group",
                isActive && "sidebar-active text-white font-semibold"
              )
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Bottom Section */}
      <div className="px-3 mt-4 flex flex-col gap-3">
        <button
          onClick={() => navigate("/app/jobs/create")}
          className="w-full bg-secondary-fixed text-primary px-4 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-white transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          New Requisition
        </button>

        <div className="border-t border-white/10 pt-3 space-y-0.5">
          <button 
            onClick={() => toast.info("Support center coming soon!")}
            className="w-full flex items-center gap-3 px-3 py-2 text-white/50 hover:text-white transition-colors text-xs"
          >
            <HelpCircle className="w-4 h-4" />
            Support
          </button>
          <button 
            onClick={() => toast.info("No new updates this week.")}
            className="w-full flex items-center gap-3 px-3 py-2 text-white/50 hover:text-white transition-colors text-xs"
          >
            <Sparkles className="w-4 h-4" />
            What's New
          </button>
        </div>

        {/* Pro Plan Usage */}
        <div className="bg-white/5 rounded-xl p-3 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-secondary-fixed flex items-center justify-center text-primary font-bold text-xs">AI</div>
            <div className="flex-1">
              <p className="text-[11px] font-bold text-white">Pro Plan</p>
              <p className="text-[9px] text-white/40">85% Usage</p>
            </div>
          </div>
          <div className="w-full bg-white/10 rounded-full h-1">
            <div className="bg-secondary-fixed h-1 rounded-full" style={{ width: "85%" }} />
          </div>
        </div>

        {/* Avatar + Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-all"
        >
          <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-bold text-xs border-2 border-primary-fixed">{currentUser?.email?.substring(0, 2).toUpperCase() ?? "U"}</div>
          <div className="flex-1 text-left">
            <p className="text-xs font-semibold text-white/80 truncate">{currentUser?.email || "User"}</p>
            <p className="text-[10px] text-white/40">Sign out</p>
          </div>
        </button>
      </div>
    </aside>
  );
}

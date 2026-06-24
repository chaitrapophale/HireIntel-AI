import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  token: string | null;
  user: { name: string; email: string; avatarInitials: string } | null;
  isAuthenticated: boolean;
  login: (token: string, user: { name: string; email: string; avatarInitials: string }) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      login: (token, user) => set({ token, user, isAuthenticated: true }),
      logout: () => set({ token: null, user: null, isAuthenticated: false }),
    }),
    { name: "hireintel-auth" }
  )
);

interface AppState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppState>()((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}));

interface SearchState {
  query: string;
  isOpen: boolean;
  setQuery: (q: string) => void;
  setOpen: (v: boolean) => void;
  clear: () => void;
}

export const useSearchStore = create<SearchState>()((set) => ({
  query: "",
  isOpen: false,
  setQuery: (q) => set({ query: q, isOpen: q.length > 0 }),
  setOpen: (v) => set({ isOpen: v }),
  clear: () => set({ query: "", isOpen: false }),
}));


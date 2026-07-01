/**
 * Authenticated Axios client for HireIntel FastAPI backend.
 *
 * Every request automatically attaches the Firebase ID token as
 * `Authorization: Bearer <token>` so the backend can verify the user.
 */
import axios from "axios";
import { auth } from "@/lib/firebase";

// VITE_API_URL is either a full base like "http://localhost:8000"
// OR the pre-built production value "/api/v1" (set in Dockerfile).
// We only append /api/v1 when the URL doesn't already end with it.
const _apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
const BASE_URL = _apiUrl.endsWith("/api/v1") ? _apiUrl : `${_apiUrl}/api/v1`;

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Request interceptor — attach Firebase ID token before every call
apiClient.interceptors.request.use(
  async (config) => {
    const user = auth.currentUser;
    if (user) {
      try {
        const token = await user.getIdToken(/* forceRefresh */ false);
        config.headers.Authorization = `Bearer ${token}`;
      } catch {
        // Token fetch failed — proceed unauthenticated; backend will 401
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — normalize error messages
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.message ||
      "An unexpected error occurred.";
    return Promise.reject(new Error(message));
  }
);

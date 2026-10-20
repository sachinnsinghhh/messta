// ─────────────────────────────────────────────────────────────────────────────
// MESSTA FRONTEND API CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────
// In production (Vercel, Netlify, Render), set VITE_API_URL in your environment.
// In local development, it defaults to your local backend server at port 5000.

export const API_BASE_URL =
  (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "") || "http://localhost:5000";

export default API_BASE_URL;

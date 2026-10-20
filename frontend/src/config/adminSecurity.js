// ─────────────────────────────────────────────────────────────────────────────
// MESSTA SUPERADMIN SECURITY CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────
// Amend this key to change the SuperAdmin Master Security Passkey for the frontend.
export const SUPER_ADMIN_KEY = "SACHIN2SOMIT6MESSTA";

/**
 * Returns the currently active SuperAdmin key:
 * Uses the key entered during login (if stored), or falls back to SUPER_ADMIN_KEY.
 */
export const getStoredAdminKey = () => {
  try {
    return localStorage.getItem("messta_admin_key") || SUPER_ADMIN_KEY;
  } catch {
    return SUPER_ADMIN_KEY;
  }
};

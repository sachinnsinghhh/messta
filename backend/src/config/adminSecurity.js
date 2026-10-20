// ─────────────────────────────────────────────────────────────────────────────
// MESSTA SUPERADMIN SECURITY CONFIGURATION (BACKEND)
// ─────────────────────────────────────────────────────────────────────────────
const fs = require("fs");
const path = require("path");

function getLiveAdminKey() {
  // 1. Check live backend/.env file on disk directly
  try {
    const envPath = path.resolve(__dirname, "../../.env");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      const match = content.match(/^ADMIN_KEY\s*=\s*(.+)$/m);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
  } catch (err) {
    console.error("Error reading .env for ADMIN_KEY:", err);
  }

  // 2. Check process.env.ADMIN_KEY
  if (process.env.ADMIN_KEY) {
    return process.env.ADMIN_KEY.trim();
  }

  // 3. Fallback default
  return "SACHIN2SOMIT6MESSTA";
}

/**
 * Validates if the provided key matches the configured SuperAdmin master key.
 */
const checkAdminKey = (providedKey) => {
  if (!providedKey) return false;
  const target = getLiveAdminKey();
  return providedKey.trim() === target;
};

const verifyAdminKey = (req) => {
  const provided =
    req.headers["x-admin-key"] ||
    (req.body && req.body.adminKey) ||
    (req.query && req.query.adminKey);

  return checkAdminKey(provided);
};

module.exports = {
  get ADMIN_SECURITY_KEY() {
    return getLiveAdminKey();
  },
  getLiveAdminKey,
  checkAdminKey,
  verifyAdminKey,
};

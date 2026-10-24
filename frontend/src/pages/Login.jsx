import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import messtaIcon from "../assets/messta-icon.png";
import { SUPER_ADMIN_KEY } from "../config/adminSecurity";

export default function Login() {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Track selected portal from 3 primary tabs: "user" (Student), "owner" (Mess Owner), or "admin" (SuperAdmin Portal)
  const [selectedPortal, setSelectedPortal] = useState("owner");
  // Sub-selector inside Mess Owner portal: "owner" (Normal Mess Owner) or "admin_in_owner" (SuperAdmin in Mess Owner Portal)
  const [messMode, setMessMode] = useState("owner");

  const role = selectedPortal === "user" ? "user" : selectedPortal === "admin" ? "admin" : messMode === "admin_in_owner" ? "admin" : "owner";
  const requiresPasskey = role === "admin";

  const [adminPasskey, setAdminPasskey] = useState("");
  const [showAdminPasskey, setShowAdminPasskey] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { currentUser, activeRole, login, signup, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  // If already logged in, redirect directly to their respective framework
  useEffect(() => {
    if (currentUser) {
      if (activeRole === "admin") {
        navigate("/owner", { replace: true });
      } else if (activeRole === "owner") {
        navigate("/owner", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    }
  }, [currentUser, activeRole, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // SuperAdmin Security Passkey Validation
    if (requiresPasskey) {
      if (adminPasskey.trim() !== SUPER_ADMIN_KEY) {
        setError("Invalid Platform Master Security Key. Access restricted to authorized Messta personnel.");
        return;
      }
      try {
        localStorage.setItem("messta_admin_key", adminPasskey.trim());
      } catch (e) {
        console.warn("Could not save admin key to localStorage", e);
      }
    }

    setLoading(true);

    try {
      if (isSignup) {
        await signup(email, password, role);
      } else {
        await login(email, password, role);
      }

      // Direct to respective framework immediately
      if (selectedPortal === "admin") {
        navigate("/admin/finance", { replace: true });
      } else if (selectedPortal === "owner") {
        navigate("/owner", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    } catch (err) {
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") {
        setError("Invalid email or password. Please verify your credentials.");
      } else if (err.code === "auth/email-already-in-use") {
        setError("An account with this email already exists. Try signing in instead.");
      } else if (err.code === "auth/weak-password") {
        setError("Password should be at least 6 characters long.");
      } else if (err.code === "auth/unauthorized-domain") {
        setError("Domain not authorized: Please add your Vercel domain in Firebase Console (Authentication > Settings > Authorized domains).");
      } else {
        setError(err.message || "Authentication failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");

    if (requiresPasskey) {
      if (adminPasskey.trim() !== SUPER_ADMIN_KEY) {
        setError("Platform Master Security Key required to sign in with Google as SuperAdmin.");
        return;
      }
      try {
        localStorage.setItem("messta_admin_key", adminPasskey.trim());
      } catch (e) {
        console.warn("Could not save admin key to localStorage", e);
      }
    }

    setLoading(true);

    try {
      await loginWithGoogle(role);
      if (selectedPortal === "admin") {
        navigate("/admin/finance", { replace: true });
      } else if (selectedPortal === "owner") {
        navigate("/owner", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    } catch (err) {
      if (err.code === "auth/unauthorized-domain") {
        setError("Domain not authorized: Please add your Vercel domain in Firebase Console (Authentication > Settings > Authorized domains).");
      } else {
        setError(err.message || "Failed to sign in with Google.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50/50">
      <div className="max-w-md w-full bg-white rounded-3xl border border-gray-200/80 shadow-lg p-8 sm:p-10 space-y-6">
        
        {/* Brand & Gateway Intro */}
        <div className="text-center space-y-2">
          <img
            src={messtaIcon}
            alt="Messta Logo"
            className="w-16 h-16 mx-auto object-contain drop-shadow-md mb-2 hover:scale-105 transition-transform"
          />
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Welcome to Messta
          </h1>
          <p className="text-xs text-gray-500">
            Select your portal to enter your dedicated operating workspace.
          </p>
        </div>

        {/* ── STEP 1: PORTAL SELECTION (Student vs. Mess Owner vs. SuperAdmin) ── */}
        <div className="space-y-3">
          <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 text-center">
            Select Your Account Type
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedPortal("user");
                setMessMode("owner");
              }}
              className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                selectedPortal === "user"
                  ? "border-orange-500 bg-orange-50/70 ring-2 ring-orange-500/20 shadow-xs"
                  : "border-gray-200 bg-gray-50/70 hover:border-gray-300 text-gray-600"
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="text-xl">🎓</span>
                {selectedPortal === "user" && (
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-600"></span>
                )}
              </div>
              <div>
                <span className="font-black text-xs text-gray-900 block">Student</span>
                <span className="text-[9px] text-gray-500 leading-tight block">
                  Passes & Dining
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedPortal("owner")}
              className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                selectedPortal === "owner"
                  ? "border-amber-600 bg-amber-50/80 ring-2 ring-amber-500/20 shadow-xs"
                  : "border-gray-200 bg-gray-50/70 hover:border-gray-300 text-gray-600"
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="text-xl">🏢</span>
                {selectedPortal === "owner" && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                )}
              </div>
              <div>
                <span className="font-black text-xs text-gray-900 block">Mess Owner</span>
                <span className="text-[9px] text-gray-500 leading-tight block">
                  Kitchen & Studio
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedPortal("admin")}
              className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                selectedPortal === "admin"
                  ? "border-purple-600 bg-purple-50/90 ring-2 ring-purple-500/20 shadow-xs"
                  : "border-gray-200 bg-gray-50/70 hover:border-gray-300 text-gray-600"
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="text-xl">🛡️</span>
                {selectedPortal === "admin" && (
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-600"></span>
                )}
              </div>
              <div>
                <span className="font-black text-xs text-gray-900 block">SuperAdmin</span>
                <span className="text-[9px] text-gray-500 leading-tight block">
                  Finance & Safety
                </span>
              </div>
            </button>
          </div>

          {/* ── FOR MESS OWNER PORTAL: TWO LOGIN OPTIONS (Normal Owner vs. SuperAdmin in Mess Studio) ── */}
          {selectedPortal === "owner" && (
            <div className="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-3.5 space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-950 flex items-center gap-1">
                  <span>⚙️</span>
                  <span>Mess Portal Login Option</span>
                </span>
                <span className="text-[10px] font-bold text-amber-800 bg-amber-200/60 px-2 py-0.5 rounded-full">
                  {messMode === "owner" ? "Normal Owner Mode" : "SuperAdmin in Mess Studio"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMessMode("owner")}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    messMode === "owner"
                      ? "bg-white border-amber-600 ring-2 ring-amber-500/20 text-gray-900 shadow-xs font-bold"
                      : "bg-white/60 border-amber-200 text-gray-600 hover:bg-white"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs text-gray-900 font-extrabold">
                    <span>🏢</span>
                    <span>Normal Mess Owner</span>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-0.5 font-normal leading-snug">
                    Standard login to manage your mess.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setMessMode("admin_in_owner")}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    messMode === "admin_in_owner"
                      ? "bg-white border-purple-600 ring-2 ring-purple-500/20 text-purple-950 shadow-xs font-bold"
                      : "bg-white/60 border-purple-200 text-gray-600 hover:bg-white"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs text-purple-950 font-extrabold">
                    <span>🛡️</span>
                    <span>SuperAdmin Login</span>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-0.5 font-normal leading-snug">
                    Login with passkey into Mess Portal.
                  </p>
                </button>
              </div>

              {/* Passkey Input for SuperAdmin in Mess Owner Portal */}
              {messMode === "admin_in_owner" && (
                <div className="bg-purple-50 border border-purple-200/90 rounded-xl p-3 space-y-2 text-xs animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-purple-950 flex items-center gap-1 text-[11px]">
                      <span>🔐</span> Enter SuperAdmin Master Passkey
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type={showAdminPasskey ? "text" : "password"}
                      value={adminPasskey}
                      onChange={(e) => setAdminPasskey(e.target.value)}
                      placeholder="Enter Master Security Passkey..."
                      className="w-full p-2.5 pr-10 text-xs bg-white border border-purple-300 rounded-xl focus:ring-2 focus:ring-purple-500 font-mono text-purple-900"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPasskey(!showAdminPasskey)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-purple-600 hover:text-purple-900 p-1 cursor-pointer transition"
                      title={showAdminPasskey ? "Hide security key" : "Show security key"}
                      aria-label={showAdminPasskey ? "Hide security key" : "Show security key"}
                    >
                      {showAdminPasskey ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <p className="text-[10px] text-purple-700 leading-snug">
                    Unlocks the Mess Owner Studio with universal management and the tool to add messes & grant access to any Google or email ID.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── FOR SUPERADMIN PORTAL: DIRECT PASSKEY GATE TO FINANCE COMMAND CENTER ── */}
          {selectedPortal === "admin" && (
            <div className="bg-purple-50/80 border border-purple-200/90 rounded-2xl p-3.5 space-y-2 text-xs animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <span className="font-black text-purple-950 flex items-center gap-1.5 text-[11px]">
                  <span>🔐</span> Master Security Passkey (Platform Command Center)
                </span>
              </div>
              <div className="relative">
                <input
                  type={showAdminPasskey ? "text" : "password"}
                  value={adminPasskey}
                  onChange={(e) => setAdminPasskey(e.target.value)}
                  placeholder="Enter Platform Master Security Passkey..."
                  className="w-full p-2.5 pr-10 text-xs bg-white border border-purple-300 rounded-xl focus:ring-2 focus:ring-purple-500 font-mono text-purple-900"
                />
                <button
                  type="button"
                  onClick={() => setShowAdminPasskey(!showAdminPasskey)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-purple-600 hover:text-purple-900 p-1 cursor-pointer transition"
                  title={showAdminPasskey ? "Hide security key" : "Show security key"}
                  aria-label={showAdminPasskey ? "Hide security key" : "Show security key"}
                >
                  {showAdminPasskey ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="text-[10px] text-purple-700 leading-snug">
                Unlocks the Universal Financial Command Center & Platform Trust & Safety.
              </p>
            </div>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-2xl border border-red-200">
            {error}
          </div>
        )}

        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-3 px-4 border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold text-xs uppercase tracking-wider rounded-xl shadow-2xs transition flex items-center justify-center gap-3 disabled:opacity-50"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.13 0-5.78-2.11-6.73-4.96H1.18v3.15C3.15 21.32 7.22 24 12 24z"/>
            <path fill="#FBBC05" d="M5.27 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.18C.43 8.13 0 9.87 0 12s.43 3.87 1.18 5.39l4.09-3.15z"/>
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.22 0 3.15 2.68 1.18 6.61l4.09 3.15c.95-2.85 3.6-4.96 6.73-4.96z"/>
          </svg>
          Continue with Google
        </button>

        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-gray-200"></div>
          <span className="flex-shrink mx-4 text-gray-400 text-[10px] uppercase font-bold tracking-wider">
            Or with email
          </span>
          <div className="flex-grow border-t border-gray-200"></div>
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={role === "owner" ? "owner@canteen.com" : "student@college.edu"}
              className="w-full p-3 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full p-3 pr-10 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 p-1 cursor-pointer transition"
                title={showPassword ? "Hide password" : "Show password"}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3.5 font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer ${
              role === "admin"
                ? "bg-purple-700 hover:bg-purple-800 text-white shadow-purple-500/20"
                : role === "owner"
                ? "bg-gray-900 hover:bg-black text-white"
                : "bg-orange-600 hover:bg-orange-700 text-white"
            }`}
          >
            {loading
              ? "Entering Workspace..."
              : isSignup
              ? `Sign Up & Enter ${
                  role === "admin"
                    ? "Trust & Safety Portal"
                    : role === "owner"
                    ? "Partner CRM"
                    : "Student Portal"
                }`
              : `Sign In to ${
                  role === "admin"
                    ? "SuperAdmin Control Panel"
                    : role === "owner"
                    ? "Partner CRM"
                    : "Student Portal"
                }`}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={() => setIsSignup(!isSignup)}
            className="text-xs font-bold text-gray-600 hover:text-orange-600 transition"
          >
            {isSignup
              ? "Already registered? Sign In"
              : "Need a new account? Sign Up"}
          </button>
        </div>

      </div>
    </div>
  );
}
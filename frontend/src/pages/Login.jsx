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
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-stone-50/50">
      <div className="max-w-md w-full bg-white rounded-2xl border border-stone-200 shadow-sm p-8 sm:p-9 space-y-6">
        
        {/* Brand & Gateway Intro */}
        <div className="text-center space-y-1.5">
          <img
            src={messtaIcon}
            alt="Messta Logo"
            className="w-14 h-14 mx-auto object-contain mb-1"
          />
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">
            {isSignup ? "Create your account" : "Welcome back"}
          </h1>
          <p className="text-xs text-stone-500">
            Select your account type to proceed to your portal.
          </p>
        </div>

        {/* ── STEP 1: PORTAL SELECTION (Student vs. Mess Owner vs. SuperAdmin) ── */}
        <div className="space-y-2.5">
          <label className="block text-xs font-medium text-stone-500 text-center">
            Select Account Type
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedPortal("user");
                setMessMode("owner");
              }}
              className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                selectedPortal === "user"
                  ? "border-orange-600 bg-orange-50/50 ring-1 ring-orange-500/30 text-stone-900"
                  : "border-stone-200 bg-stone-50/50 hover:border-stone-300 text-stone-600"
              }`}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${selectedPortal === "user" ? "bg-orange-100 text-orange-700" : "bg-stone-200/60 text-stone-600"}`}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 14l9-5-9-5-9 5 9 5z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                  </svg>
                </div>
                {selectedPortal === "user" && (
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-600"></span>
                )}
              </div>
              <div>
                <span className="font-semibold text-xs block">Student</span>
                <span className="text-[10px] text-stone-500 block">
                  Meal Passes
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedPortal("owner")}
              className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                selectedPortal === "owner"
                  ? "border-orange-600 bg-orange-50/50 ring-1 ring-orange-500/30 text-stone-900"
                  : "border-stone-200 bg-stone-50/50 hover:border-stone-300 text-stone-600"
              }`}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${selectedPortal === "owner" ? "bg-orange-100 text-orange-700" : "bg-stone-200/60 text-stone-600"}`}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                {selectedPortal === "owner" && (
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-600"></span>
                )}
              </div>
              <div>
                <span className="font-semibold text-xs block">Mess Owner</span>
                <span className="text-[10px] text-stone-500 block">
                  Kitchen Portal
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedPortal("admin")}
              className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                selectedPortal === "admin"
                  ? "border-stone-900 bg-stone-100 ring-1 ring-stone-900/30 text-stone-900"
                  : "border-stone-200 bg-stone-50/50 hover:border-stone-300 text-stone-600"
              }`}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${selectedPortal === "admin" ? "bg-stone-900 text-white" : "bg-stone-200/60 text-stone-600"}`}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                {selectedPortal === "admin" && (
                  <span className="w-1.5 h-1.5 rounded-full bg-stone-900"></span>
                )}
              </div>
              <div>
                <span className="font-semibold text-xs block">Admin</span>
                <span className="text-[10px] text-stone-500 block">
                  Console
                </span>
              </div>
            </button>
          </div>

          {/* ── FOR MESS OWNER PORTAL: TWO LOGIN OPTIONS ── */}
          {selectedPortal === "owner" && (
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 space-y-2.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-stone-700">
                  Mess Portal Sign-In Mode
                </span>
                <span className="text-[10px] text-stone-500">
                  {messMode === "owner" ? "Standard Mess Owner" : "SuperAdmin Mode"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMessMode("owner")}
                  className={`p-2.5 rounded-lg border text-left transition ${
                    messMode === "owner"
                      ? "bg-white border-stone-400 text-stone-900 shadow-xs font-medium"
                      : "bg-white/60 border-stone-200 text-stone-500 hover:bg-white"
                  }`}
                >
                  <span className="text-xs font-semibold block text-stone-900">Standard Owner</span>
                  <p className="text-[10px] text-stone-500 mt-0.5 leading-snug">
                    Manage your assigned mess.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setMessMode("admin_in_owner")}
                  className={`p-2.5 rounded-lg border text-left transition ${
                    messMode === "admin_in_owner"
                      ? "bg-white border-stone-900 text-stone-900 shadow-xs font-medium"
                      : "bg-white/60 border-stone-200 text-stone-500 hover:bg-white"
                  }`}
                >
                  <span className="text-xs font-semibold block text-stone-900">SuperAdmin</span>
                  <p className="text-[10px] text-stone-500 mt-0.5 leading-snug">
                    Manage all messes & grant access.
                  </p>
                </button>
              </div>

              {/* Passkey Input for SuperAdmin in Mess Owner Portal */}
              {messMode === "admin_in_owner" && (
                <div className="bg-white border border-stone-300 rounded-lg p-3 space-y-1.5 text-xs animate-in fade-in duration-150">
                  <label className="block text-xs font-medium text-stone-700">
                    SuperAdmin Master Security Key
                  </label>
                  <div className="relative">
                    <input
                      type={showAdminPasskey ? "text" : "password"}
                      value={adminPasskey}
                      onChange={(e) => setAdminPasskey(e.target.value)}
                      placeholder="Enter Master Security Key..."
                      className="w-full px-3 py-2 pr-10 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-500/20 focus:border-stone-700 font-mono text-stone-900 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPasskey(!showAdminPasskey)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1 transition cursor-pointer"
                      title={showAdminPasskey ? "Hide key" : "Show key"}
                      aria-label={showAdminPasskey ? "Hide key" : "Show key"}
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
                  <p className="text-[11px] text-stone-500">
                    Provides universal mess management and permission controls.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── FOR SUPERADMIN PORTAL: DIRECT PASSKEY GATE TO FINANCE COMMAND CENTER ── */}
          {selectedPortal === "admin" && (
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 space-y-1.5 text-xs animate-in fade-in duration-150">
              <label className="block text-xs font-medium text-stone-700">
                Admin Master Security Key
              </label>
              <div className="relative">
                <input
                  type={showAdminPasskey ? "text" : "password"}
                  value={adminPasskey}
                  onChange={(e) => setAdminPasskey(e.target.value)}
                  placeholder="Enter Master Security Key..."
                  className="w-full px-3 py-2 pr-10 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500/20 focus:border-stone-700 font-mono text-stone-900 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowAdminPasskey(!showAdminPasskey)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1 transition cursor-pointer"
                  title={showAdminPasskey ? "Hide key" : "Show key"}
                  aria-label={showAdminPasskey ? "Hide key" : "Show key"}
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
              <p className="text-[11px] text-stone-500">
                Grants access to the platform-wide administrative console.
              </p>
            </div>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-rose-50 text-rose-700 text-xs font-medium rounded-lg border border-rose-200">
            {error}
          </div>
        )}

        {/* Google Sign-In Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-2.5 px-4 border border-stone-300 hover:bg-stone-50 text-stone-700 font-medium text-xs rounded-lg shadow-2xs transition flex items-center justify-center gap-2.5 disabled:opacity-50 cursor-pointer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.13 0-5.78-2.11-6.73-4.96H1.18v3.15C3.15 21.32 7.22 24 12 24z"/>
            <path fill="#FBBC05" d="M5.27 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.18C.43 8.13 0 9.87 0 12s.43 3.87 1.18 5.39l4.09-3.15z"/>
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.22 0 3.15 2.68 1.18 6.61l4.09 3.15c.95-2.85 3.6-4.96 6.73-4.96z"/>
          </svg>
          Continue with Google
        </button>

        <div className="relative flex py-0.5 items-center">
          <div className="flex-grow border-t border-stone-200"></div>
          <span className="flex-shrink mx-3 text-stone-400 text-[11px] font-medium">
            or with email
          </span>
          <div className="flex-grow border-t border-stone-200"></div>
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={role === "owner" ? "owner@canteen.com" : "student@college.edu"}
              className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg text-stone-900 placeholder-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 pr-10 text-xs bg-stone-50 border border-stone-300 rounded-lg text-stone-900 placeholder-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1 transition cursor-pointer"
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
            className="w-full py-2.5 font-medium text-xs rounded-lg shadow-xs transition disabled:opacity-50 cursor-pointer bg-stone-900 hover:bg-black text-white"
          >
            {loading
              ? "Signing in..."
              : isSignup
              ? "Create Account"
              : "Sign In"}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-stone-100">
          <button
            type="button"
            onClick={() => setIsSignup(!isSignup)}
            className="text-xs font-medium text-stone-600 hover:text-orange-600 transition cursor-pointer"
          >
            {isSignup
              ? "Already have an account? Sign in"
              : "Don't have an account? Sign up"}
          </button>
        </div>

      </div>
    </div>
  );
}
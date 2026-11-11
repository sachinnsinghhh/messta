import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
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

  const role =
    selectedPortal === "user"
      ? "user"
      : selectedPortal === "admin"
      ? "admin"
      : messMode === "admin_in_owner"
      ? "admin"
      : "owner";
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
      } catch (err) {
        console.warn("Could not save admin key to localStorage", err);
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
      } catch (err) {
        console.warn("Could not save admin key to localStorage", err);
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
    <div className="min-h-[92vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#FAF7F2]">
      
      {/* ── HUMANIZED FOOD-TECH LOGIN CARD (ZOMATO/SWIGGY STANDARD) ── */}
      <div className="w-full max-w-md bg-white rounded-3xl border border-gray-100 shadow-xl p-7 sm:p-9 space-y-6">
        
        {/* Official Brand Logo & Welcome */}
        <div className="text-center space-y-2">
          <div className="inline-flex justify-center items-center">
            <img
              src={messtaIcon}
              alt="Messta Logo"
              className="w-14 h-14 object-contain hover:scale-105 transition-transform duration-200"
            />
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              {isSignup ? "Create an Account" : "Welcome Back"}
            </h1>
            <p className="text-xs text-gray-500 mt-1 font-medium">
              {selectedPortal === "user"
                ? "Daily student meal passes & canteens in Pune."
                : selectedPortal === "admin"
                ? "Messta administration and finance console."
                : "Manage counter tokens, daily menus & prep headcount."}
            </p>
          </div>
        </div>

        {/* ── STEP 1: ROLE SELECTION (Student vs Mess Owner vs Admin) ── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <label className="font-bold text-gray-700">Select Account Type</label>
            <span className="text-[10px] font-semibold text-orange-600 uppercase tracking-wide">
              {selectedPortal === "user" ? "Student" : selectedPortal === "admin" ? "Admin" : "Mess Partner"}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            
            {/* Student Card */}
            <button
              type="button"
              onClick={() => {
                setSelectedPortal("user");
                setMessMode("owner");
              }}
              className={`p-3 rounded-2xl border text-left transition-all duration-150 flex flex-col justify-between cursor-pointer ${
                selectedPortal === "user"
                  ? "border-orange-500 bg-orange-50/60 ring-2 ring-orange-500/20 text-gray-900 shadow-xs"
                  : "border-gray-200 bg-gray-50/50 hover:bg-gray-100 hover:border-gray-300 text-gray-600"
              }`}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                    selectedPortal === "user"
                      ? "bg-orange-600 text-white shadow-xs"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                  </svg>
                </div>
              </div>
              <div>
                <span className="font-bold text-xs block text-gray-900">Student</span>
                <span className="text-[10px] text-gray-500 block leading-tight">Meal Passes</span>
              </div>
            </button>

            {/* Mess Owner Card */}
            <button
              type="button"
              onClick={() => setSelectedPortal("owner")}
              className={`p-3 rounded-2xl border text-left transition-all duration-150 flex flex-col justify-between cursor-pointer ${
                selectedPortal === "owner"
                  ? "border-orange-500 bg-orange-50/60 ring-2 ring-orange-500/20 text-gray-900 shadow-xs"
                  : "border-gray-200 bg-gray-50/50 hover:bg-gray-100 hover:border-gray-300 text-gray-600"
              }`}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                    selectedPortal === "owner"
                      ? "bg-orange-600 text-white shadow-xs"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
              </div>
              <div>
                <span className="font-bold text-xs block text-gray-900">Mess Owner</span>
                <span className="text-[10px] text-gray-500 block leading-tight">Partner Portal</span>
              </div>
            </button>

            {/* Admin Console Card */}
            <button
              type="button"
              onClick={() => setSelectedPortal("admin")}
              className={`p-3 rounded-2xl border text-left transition-all duration-150 flex flex-col justify-between cursor-pointer ${
                selectedPortal === "admin"
                  ? "border-gray-900 bg-gray-100 ring-2 ring-gray-900/20 text-gray-900 shadow-xs"
                  : "border-gray-200 bg-gray-50/50 hover:bg-gray-100 hover:border-gray-300 text-gray-600"
              }`}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                    selectedPortal === "admin"
                      ? "bg-gray-900 text-white shadow-xs"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
              </div>
              <div>
                <span className="font-bold text-xs block text-gray-900">Admin</span>
                <span className="text-[10px] text-gray-500 block leading-tight">Platform</span>
              </div>
            </button>
          </div>

          {/* ── MESS OWNER SUB-MODE SELECTOR: STANDARD OWNER vs. SUPERADMIN ── */}
          {selectedPortal === "owner" && (
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3 space-y-2.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-gray-700">Mess Portal Role</span>
                <span className="text-[10px] font-semibold text-gray-500">
                  {messMode === "owner" ? "Assigned Canteen" : "SuperAdmin Key Required"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMessMode("owner")}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    messMode === "owner"
                      ? "bg-white border-orange-500 text-gray-900 shadow-xs ring-1 ring-orange-500/20"
                      : "bg-white/70 border-gray-200 text-gray-500 hover:bg-white"
                  }`}
                >
                  <span className="text-xs font-bold block text-gray-900">Standard Owner</span>
                  <p className="text-[10px] text-gray-500 mt-0.5 leading-snug">
                    Manage your branch.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setMessMode("admin_in_owner")}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    messMode === "admin_in_owner"
                      ? "bg-white border-gray-900 text-gray-900 shadow-xs ring-1 ring-gray-900/20"
                      : "bg-white/70 border-gray-200 text-gray-500 hover:bg-white"
                  }`}
                >
                  <span className="text-xs font-bold block text-gray-900">SuperAdmin</span>
                  <p className="text-[10px] text-gray-500 mt-0.5 leading-snug">
                    Manage all outlets.
                  </p>
                </button>
              </div>

              {/* Master Security Key Input inside Mess Owner Portal */}
              {messMode === "admin_in_owner" && (
                <div className="bg-white border border-gray-300 rounded-xl p-3 space-y-1.5 text-xs animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-gray-800">
                      Master Security Key
                    </label>
                    <span className="text-[10px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded font-semibold">
                      SuperAdmin Passkey
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type={showAdminPasskey ? "text" : "password"}
                      value={adminPasskey}
                      onChange={(e) => setAdminPasskey(e.target.value)}
                      placeholder="Enter Master Security Key..."
                      className="w-full px-3 py-2 pr-10 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-mono text-gray-900 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPasskey(!showAdminPasskey)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 p-1 cursor-pointer"
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
                </div>
              )}
            </div>
          )}

          {/* ── FOR SUPERADMIN PORTAL: DIRECT PASSKEY GATE ── */}
          {selectedPortal === "admin" && (
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3 space-y-1.5 text-xs animate-in fade-in duration-150">
              <label className="block text-xs font-bold text-gray-800">
                Admin Master Security Key
              </label>
              <div className="relative">
                <input
                  type={showAdminPasskey ? "text" : "password"}
                  value={adminPasskey}
                  onChange={(e) => setAdminPasskey(e.target.value)}
                  placeholder="Enter Master Security Key..."
                  className="w-full px-3 py-2 pr-10 text-xs bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-500/20 focus:border-gray-700 font-mono text-gray-900 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowAdminPasskey(!showAdminPasskey)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 p-1 cursor-pointer"
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
              <p className="text-[11px] text-gray-500">
                Authorizes access to platform-wide administration.
              </p>
            </div>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-xl border border-red-200 flex items-start gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* ── GOOGLE SIGN-IN BUTTON ── */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-2.5 px-4 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2.5 disabled:opacity-50 cursor-pointer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.13 0-5.78-2.11-6.73-4.96H1.18v3.15C3.15 21.32 7.22 24 12 24z"/>
            <path fill="#FBBC05" d="M5.27 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.18C.43 8.13 0 9.87 0 12s.43 3.87 1.18 5.39l4.09-3.15z"/>
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.22 0 3.15 2.68 1.18 6.61l4.09 3.15c.95-2.85 3.6-4.96 6.73-4.96z"/>
          </svg>
          <span>Continue with Google</span>
        </button>

        <div className="relative flex py-0.5 items-center">
          <div className="flex-grow border-t border-gray-200" />
          <span className="flex-shrink mx-3 text-gray-400 text-[11px] font-semibold uppercase tracking-wider">
            or with email
          </span>
          <div className="flex-grow border-t border-gray-200" />
        </div>

        {/* ── EMAIL & PASSWORD FORM ── */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206" />
                </svg>
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={role === "owner" ? "owner@canteen.com" : "student@college.edu"}
                className="w-full pl-10 pr-4 py-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-medium transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </span>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-medium transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 p-1 cursor-pointer"
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
            className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <span>Signing in...</span>
              </>
            ) : isSignup ? (
              <span>Create Account</span>
            ) : (
              <span>Sign In to Messta</span>
            )}
          </button>
        </form>

        {/* ── FOOTER TOGGLE & CAMPUS LINK ── */}
        <div className="text-center pt-2 border-t border-gray-100 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setIsSignup(!isSignup)}
            className="text-xs font-semibold text-gray-600 hover:text-orange-600 transition cursor-pointer"
          >
            {isSignup
              ? "Already have an account? Sign in"
              : "Don't have an account yet? Create one"}
          </button>

          <Link
            to="/"
            className="text-[11px] text-gray-400 hover:text-gray-600 transition"
          >
            &larr; Back to Campus Dining Directory
          </Link>
        </div>

      </div>
    </div>
  );
}
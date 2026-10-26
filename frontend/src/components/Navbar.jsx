import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import messtaIcon from "../assets/messta-icon.png";

export default function Navbar() {
  const { currentUser, activeRole, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (err) {
      console.error("Failed to log out:", err);
    }
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand Logo & Context Portal Tag */}
          <div className="flex items-center gap-3">
            <Link
              to={activeRole === "admin" ? "/admin/finance" : activeRole === "owner" ? "/owner" : "/"}
              className="flex items-center gap-2.5 group"
            >
              <img
                src={messtaIcon}
                alt="Messta Logo"
                className="w-8 h-8 object-contain group-hover:scale-105 transition-transform drop-shadow-xs"
              />
              <span className="text-xl font-extrabold tracking-tight text-gray-900 group-hover:text-orange-600 transition-colors">
                Messta
              </span>
            </Link>

            {currentUser && (
              <span
                className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${
                  activeRole === "admin"
                    ? "bg-purple-50 text-purple-800 border-purple-200 font-semibold"
                    : activeRole === "owner"
                    ? "bg-amber-50 text-amber-800 border-amber-200"
                    : "bg-orange-50 text-orange-800 border-orange-200"
                }`}
              >
                {activeRole === "admin"
                  ? "Admin Console"
                  : activeRole === "owner"
                  ? "Partner Portal"
                  : "Student Portal"}
              </span>
            )}
          </div>

          {/* Desktop Navigation Links based strictly on authenticated role */}
          {currentUser && (
            <nav className="hidden md:flex items-center gap-1.5">
              {/* If user is inside Mess Owner Portal (whether logged in as regular owner or SuperAdmin) */}
              {(activeRole === "owner" || location.pathname.startsWith("/owner")) ? (
                <>
                  <Link
                    to="/owner"
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      isActive("/owner") ? "bg-orange-600 text-white shadow-xs" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    }`}
                  >
                    Live Counter
                  </Link>
                  <Link
                    to="/owner/meals"
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      isActive("/owner/meals") ? "bg-orange-600 text-white shadow-xs" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    }`}
                  >
                    Daily Menu & Pricing
                  </Link>
                  <Link
                    to="/owner/finance"
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      isActive("/owner/finance") ? "bg-orange-600 text-white shadow-xs" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    }`}
                  >
                    Finances
                  </Link>

                  {/* SuperAdmin quick toggle to jump to Platform Finance Console */}
                  {activeRole === "admin" && (
                    <Link
                      to="/admin/finance"
                      className="ml-2 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200 transition-colors flex items-center gap-1.5"
                      title="Switch to Platform Financial Console"
                    >
                      <svg className="w-3.5 h-3.5 text-purple-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <span>Admin Console</span>
                    </Link>
                  )}
                </>
              ) : activeRole === "admin" ? (
                <>
                  <Link
                    to="/admin/finance"
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      isActive("/admin/finance") || isActive("/admin")
                        ? "bg-purple-700 text-white shadow-xs"
                        : "text-gray-600 hover:text-purple-800 hover:bg-purple-50"
                    }`}
                  >
                    Financial Overview
                  </Link>
                  <Link
                    to="/admin/verifications"
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      isActive("/admin/verifications")
                        ? "bg-purple-700 text-white shadow-xs"
                        : "text-gray-600 hover:text-purple-800 hover:bg-purple-50"
                    }`}
                  >
                    FSSAI Verifications
                  </Link>
                  <Link
                    to="/owner"
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      isActive("/owner") || location.pathname.startsWith("/owner/")
                        ? "bg-orange-600 text-white shadow-xs"
                        : "text-gray-600 hover:text-orange-700 hover:bg-orange-50"
                    }`}
                  >
                    Partner Portal
                  </Link>
                  <Link
                    to="/mess"
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      isActive("/mess")
                        ? "bg-purple-100 text-purple-900 font-semibold"
                        : "text-gray-600 hover:text-purple-700 hover:bg-purple-50"
                    }`}
                  >
                    All Outlets
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/"
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      isActive("/") ? "bg-orange-50 text-orange-700 font-semibold" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    }`}
                  >
                    Home
                  </Link>
                  <Link
                    to="/mess"
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      isActive("/mess") ? "bg-orange-50 text-orange-700 font-semibold" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    }`}
                  >
                    Find Mess
                  </Link>
                  <Link
                    to="/membership"
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      isActive("/membership")
                        ? "bg-orange-600 text-white shadow-xs"
                        : "text-orange-600 hover:bg-orange-50"
                    }`}
                  >
                    Student Pass
                  </Link>
                  <Link
                    to="/profile"
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      isActive("/profile") ? "bg-orange-50 text-orange-700 font-semibold" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    }`}
                  >
                    My Bookings
                  </Link>
                </>
              )}
            </nav>
          )}

          {/* Right Action Tools: User info & Logout */}
          <div className="hidden md:flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-3 pl-2 border-l border-gray-200">
                <div className="w-8 h-8 rounded-full bg-stone-100 border border-stone-200 text-stone-700 font-semibold text-xs flex items-center justify-center shrink-0">
                  {(currentUser.displayName || currentUser.email || "U").charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-semibold text-gray-800 leading-tight">
                    {currentUser.displayName || currentUser.email?.split("@")[0]}
                  </span>
                  <span className="text-[11px] text-gray-400 leading-tight truncate max-w-[130px]">
                    {currentUser.email}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-2.5 py-1 text-xs font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-gray-200"
                >
                  Log out
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-medium rounded-lg shadow-sm transition"
              >
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile Menu Hamburger Button */}
          {currentUser && (
            <div className="flex items-center gap-2 md:hidden">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
                aria-label="Toggle navigation menu"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          )}

        </div>
      </div>

      {/* Mobile Drawer Dropdown */}
      {mobileMenuOpen && currentUser && (
        <div className="md:hidden border-t border-gray-200 bg-white px-4 pt-3 pb-6 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          {(activeRole === "owner" || location.pathname.startsWith("/owner")) ? (
            <div className="flex flex-col gap-1.5">
              <Link
                to="/owner"
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-medium text-gray-700 hover:text-orange-600 py-1.5"
              >
                Live Counter
              </Link>
              <Link
                to="/owner/meals"
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-medium text-gray-700 hover:text-orange-600 py-1.5"
              >
                Daily Menu & Pricing
              </Link>
              <Link
                to="/owner/finance"
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-medium text-gray-700 hover:text-orange-600 py-1.5"
              >
                Finances
              </Link>
              {activeRole === "admin" && (
                <Link
                  to="/admin/finance"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-sm font-medium text-purple-700 py-1.5 border-t border-gray-100 pt-2 flex items-center gap-1.5"
                >
                  Platform Admin Console
                </Link>
              )}
            </div>
          ) : activeRole === "admin" ? (
            <div className="flex flex-col gap-1.5">
              <Link
                to="/admin/finance"
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-medium text-purple-700 py-1.5"
              >
                Financial Overview
              </Link>
              <Link
                to="/admin/verifications"
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-medium text-gray-700 py-1.5"
              >
                FSSAI Verifications
              </Link>
              <Link
                to="/owner"
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-medium text-orange-700 py-1.5"
              >
                Partner Portal
              </Link>
              <Link
                to="/mess"
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-medium text-gray-700 py-1.5"
              >
                All Outlets
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-semibold text-gray-700 py-1.5"
              >
                Home
              </Link>
              <Link
                to="/mess"
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-semibold text-gray-700 py-1.5"
              >
                Find Mess
              </Link>
              <Link
                to="/membership"
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-bold text-orange-600 py-1.5 flex items-center gap-2"
              >
                <span>🎟️</span> Student Membership Pass
              </Link>
              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-semibold text-gray-700 py-1.5"
              >
                My Bookings
              </Link>
            </div>
          )}

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500 truncate max-w-[180px]">{currentUser.email}</span>
            <button
              type="button"
              onClick={() => {
                handleLogout();
                setMobileMenuOpen(false);
              }}
              className="text-xs font-bold text-red-600"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
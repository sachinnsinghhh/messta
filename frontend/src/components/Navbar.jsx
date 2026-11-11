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
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand Logo & Location */}
          <div className="flex items-center gap-4">
            <Link
              to={activeRole === "admin" ? "/admin/finance" : activeRole === "owner" ? "/owner" : "/"}
              className="flex items-center gap-2.5 group"
            >
              <img
                src={messtaIcon}
                alt="Messta Logo"
                className="w-9 h-9 object-contain group-hover:scale-105 transition-transform"
              />
              <span className="text-xl font-bold tracking-tight text-gray-900">
                Messta
              </span>
            </Link>

            <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-500 pl-3 border-l border-gray-200">
              <svg className="w-3.5 h-3.5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="font-medium text-gray-700">Pune Campuses</span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          {currentUser && (
            <nav className="hidden md:flex items-center gap-1">
              {/* If user is inside Mess Owner Portal (whether logged in as regular owner or SuperAdmin) */}
              {(activeRole === "owner" || location.pathname.startsWith("/owner")) ? (
                <>
                  <Link
                    to="/owner"
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      isActive("/owner") ? "bg-orange-50 text-orange-600" : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    Live Counter
                  </Link>
                  <Link
                    to="/owner/meals"
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      isActive("/owner/meals") ? "bg-orange-50 text-orange-600" : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    Daily Menu
                  </Link>
                  <Link
                    to="/owner/memberships"
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      isActive("/owner/memberships") ? "bg-orange-50 text-orange-600" : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    Pass Management
                  </Link>
                  <Link
                    to="/owner/finance"
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      isActive("/owner/finance") ? "bg-orange-50 text-orange-600" : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    Settlements
                  </Link>

                  {/* SuperAdmin quick toggle to jump to Platform Finance Console */}
                  {activeRole === "admin" && (
                    <Link
                      to="/admin/finance"
                      className="ml-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200 transition-colors flex items-center gap-1.5"
                    >
                      <span>Admin Console</span>
                    </Link>
                  )}
                </>
              ) : activeRole === "admin" ? (
                <>
                  <Link
                    to="/admin/finance"
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      isActive("/admin/finance") || isActive("/admin")
                        ? "bg-purple-50 text-purple-700"
                        : "text-gray-600 hover:text-purple-800 hover:bg-purple-50"
                    }`}
                  >
                    Platform Finance
                  </Link>
                  <Link
                    to="/admin/verifications"
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      isActive("/admin/verifications")
                        ? "bg-purple-50 text-purple-700"
                        : "text-gray-600 hover:text-purple-800 hover:bg-purple-50"
                    }`}
                  >
                    Verifications
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/"
                    className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      isActive("/") ? "text-orange-600 font-bold" : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Home
                  </Link>
                  <Link
                    to="/mess"
                    className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      isActive("/mess") ? "text-orange-600 font-bold" : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Explore Messes
                  </Link>
                  <Link
                    to="/membership"
                    className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      isActive("/membership") ? "text-orange-600 font-bold" : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Meal Passes
                  </Link>
                  <Link
                    to="/profile"
                    className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      isActive("/profile") ? "text-orange-600 font-bold" : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    My Tokens
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
                to="/owner/memberships"
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-medium text-gray-700 hover:text-orange-600 py-1.5"
              >
                Membership Plans & CRM
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
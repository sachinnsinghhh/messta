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
                className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                  activeRole === "admin"
                    ? "bg-purple-100 text-purple-900 border-purple-300 font-extrabold"
                    : activeRole === "owner"
                    ? "bg-amber-50 text-amber-800 border-amber-200"
                    : "bg-orange-50 text-orange-700 border-orange-200"
                }`}
              >
                {activeRole === "admin"
                  ? "🛡️ Platform SuperAdmin"
                  : activeRole === "owner"
                  ? "Mess Partner Portal"
                  : "Student Dining Portal"}
              </span>
            )}
          </div>

          {/* Desktop Navigation Links based strictly on authenticated role */}
          {currentUser && (
            <nav className="hidden md:flex items-center gap-1 lg:gap-2">
              {activeRole === "admin" ? (
                <>
                  <Link
                    to="/admin/finance"
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                      isActive("/admin/finance") || isActive("/admin")
                        ? "bg-purple-600 text-white shadow-xs font-bold"
                        : "text-gray-700 hover:text-purple-700 hover:bg-purple-50"
                    }`}
                  >
                    <span>📊</span>
                    <span>Financial Command</span>
                  </Link>
                  <Link
                    to="/admin/verifications"
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                      isActive("/admin/verifications")
                        ? "bg-purple-600 text-white shadow-xs font-bold"
                        : "text-gray-700 hover:text-purple-700 hover:bg-purple-50"
                    }`}
                  >
                    <span>🛡️</span>
                    <span>FSSAI Queue</span>
                  </Link>
                  <Link
                    to="/owner"
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                      isActive("/owner") || location.pathname.startsWith("/owner/")
                        ? "bg-amber-600 text-white shadow-xs font-bold"
                        : "text-gray-700 hover:text-amber-800 hover:bg-amber-50"
                    }`}
                  >
                    <span>🏪</span>
                    <span>Mess Owner Studio</span>
                  </Link>
                  <Link
                    to="/mess"
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      isActive("/mess")
                        ? "bg-purple-100 text-purple-900 font-bold"
                        : "text-gray-700 hover:text-purple-700 hover:bg-purple-50"
                    }`}
                  >
                    All Outlets Catalog
                  </Link>
                </>
              ) : activeRole === "owner" ? (
                <>
                  <Link
                    to="/owner"
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      isActive("/owner") ? "bg-amber-50 text-amber-700 font-bold" : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    Dashboard & Counter
                  </Link>
                  <Link
                    to="/owner/meals"
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      isActive("/owner/meals") ? "bg-amber-50 text-amber-700 font-bold" : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    Thali Matrix & Pricing
                  </Link>
                  <Link
                    to="/owner/memberships"
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      isActive("/owner/memberships") ? "bg-orange-600 text-white shadow-xs" : "text-orange-600 hover:bg-orange-50"
                    }`}
                  >
                    Plans & Subscriber CRM
                  </Link>
                  <Link
                    to="/owner/inventory"
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      isActive("/owner/inventory") ? "bg-amber-50 text-amber-700 font-bold" : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    Inventory & Kitchen
                  </Link>
                  <Link
                    to="/owner/staff"
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      isActive("/owner/staff") ? "bg-amber-50 text-amber-700 font-bold" : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    Staff & Shifts
                  </Link>
                  <Link
                    to="/owner/finance"
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      isActive("/owner/finance") ? "bg-amber-50 text-amber-700 font-bold" : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    Finance & P&L
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/"
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      isActive("/") ? "bg-orange-50 text-orange-600 font-bold" : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    Home
                  </Link>
                  <Link
                    to="/mess"
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      isActive("/mess") ? "bg-orange-50 text-orange-600 font-bold" : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    Find Mess
                  </Link>
                  <Link
                    to="/membership"
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                      isActive("/membership")
                        ? "bg-orange-600 text-white shadow-xs"
                        : "text-orange-600 hover:bg-orange-50"
                    }`}
                  >
                    <span>🎟️</span>
                    <span>Student Pass</span>
                  </Link>
                  <Link
                    to="/profile"
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      isActive("/profile") ? "bg-orange-50 text-orange-600 font-bold" : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
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
              <div className="flex items-center gap-3">
                <div className="flex flex-col text-right">
                  <span className="text-xs font-bold text-gray-800 leading-tight">
                    {currentUser.displayName || currentUser.email?.split("@")[0]}
                  </span>
                  <span className="text-[10px] text-gray-400 leading-tight truncate max-w-[140px]">
                    {currentUser.email}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-red-200"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-xs transition-transform active:scale-95"
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
          {activeRole === "admin" ? (
            <div className="flex flex-col gap-2">
              <Link
                to="/admin/finance"
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-bold text-purple-700 py-1.5 flex items-center gap-2"
              >
                <span>📊</span> Financial Command Center
              </Link>
              <Link
                to="/admin/verifications"
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-semibold text-gray-700 py-1.5 flex items-center gap-2"
              >
                <span>🛡️</span> FSSAI Inspection Queue
              </Link>
              <Link
                to="/owner"
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-semibold text-amber-800 py-1.5 flex items-center gap-2"
              >
                <span>🏪</span> Mess Owner Studio
              </Link>
              <Link
                to="/mess"
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-semibold text-gray-700 py-1.5"
              >
                All Outlets Directory
              </Link>
            </div>
          ) : activeRole === "owner" ? (
            <div className="flex flex-col gap-2">
              <Link
                to="/owner"
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-semibold text-gray-700 py-1.5"
              >
                Dashboard & Counter Scanner
              </Link>
              <Link
                to="/owner/meals"
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-semibold text-gray-700 py-1.5"
              >
                Thali Matrix & Pricing Algorithm
              </Link>
              <Link
                to="/owner/memberships"
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-bold text-orange-600 py-1.5"
              >
                Plans & Subscriber CRM
              </Link>
              <Link
                to="/owner/inventory"
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-semibold text-gray-700 py-1.5"
              >
                Inventory & Kitchen OS
              </Link>
              <Link
                to="/owner/staff"
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-semibold text-gray-700 py-1.5"
              >
                Staff & Shift Roster
              </Link>
              <Link
                to="/owner/finance"
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-semibold text-gray-700 py-1.5"
              >
                Finance & P&L Intelligence
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
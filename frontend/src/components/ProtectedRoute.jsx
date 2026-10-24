import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth";

export default function ProtectedRoute({
  children,
  requireOwner = false,
  requireStudent = false,
  requireAdmin = false,
}) {
  const { currentUser, activeRole, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-gray-500">Verifying session...</p>
      </div>
    );
  }

  // If not logged in, always direct to the Login screen first
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If page requires platform SuperAdmin privileges but user is not admin
  if (requireAdmin && activeRole !== "admin") {
    return <Navigate to={activeRole === "owner" ? "/owner" : "/"} replace />;
  }

  // If page requires owner privileges but user is neither owner nor admin (SuperAdmin has universal owner portal access)
  if (requireOwner && activeRole !== "owner" && activeRole !== "admin") {
    return <Navigate to="/" replace />;
  }

  // If page requires student privileges but user is an owner or admin
  if (requireStudent && activeRole !== "user") {
    return <Navigate to={activeRole === "admin" ? "/admin/verifications" : "/owner"} replace />;
  }

  return children;
}
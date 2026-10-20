import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Login from "./pages/Login";
import FindMess from "./pages/FindMess";
import MessDetail from "./pages/MessDetail";
import UserProfile from "./pages/userprofile";
import StudentMembership from "./pages/StudentMembership";
import OwnerDashboard from "./pages/ownerdashboard";
import OwnerMeals from "./pages/OwnerMeals";
import OwnerMemberships from "./pages/OwnerMemberships";
import OwnerInventory from "./pages/OwnerInventory";
import OwnerStaff from "./pages/OwnerStaff";
import OwnerFinance from "./pages/OwnerFinance";
import AdminVerification from "./pages/AdminVerification";
import SuperAdminFinance from "./pages/SuperAdminFinance";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./context/useAuth";

// Root Gateway: Directs unauthenticated visitors to Login first,
// and authenticated users straight to their respective framework
function RootGateway() {
  const { currentUser, activeRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-gray-500">Opening Messta...</p>
      </div>
    );
  }

  // If not logged in, first screen is Login
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // If Platform SuperAdmin, direct to SuperAdmin Financial Command Center
  if (activeRole === "admin") {
    return <Navigate to="/admin/finance" replace />;
  }

  // If Mess Partner/Owner, direct to Partner Framework
  if (activeRole === "owner") {
    return <Navigate to="/owner" replace />;
  }

  // If Student/Customer, direct to Student Framework
  return <Home />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Layout>
          <Routes>
            {/* First Screen Gateway: redirects to Login if unauthenticated */}
            <Route path="/" element={<RootGateway />} />

            {/* Login & Portal Identity Selection Screen */}
            <Route path="/login" element={<Login />} />

            {/* ── STUDENT FRAMEWORK ROUTES ── */}
            <Route
              path="/mess"
              element={
                <ProtectedRoute requireStudent={true}>
                  <FindMess />
                </ProtectedRoute>
              }
            />
            <Route
              path="/mess/:id"
              element={
                <ProtectedRoute requireStudent={true}>
                  <MessDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/membership"
              element={
                <ProtectedRoute requireStudent={true}>
                  <StudentMembership />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute requireStudent={true}>
                  <UserProfile />
                </ProtectedRoute>
              }
            />

            {/* ── MESS PARTNER / OWNER FRAMEWORK ROUTES ── */}
            <Route
              path="/owner"
              element={
                <ProtectedRoute requireOwner={true}>
                  <OwnerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/owner/meals"
              element={
                <ProtectedRoute requireOwner={true}>
                  <OwnerMeals />
                </ProtectedRoute>
              }
            />
            <Route
              path="/owner/memberships"
              element={
                <ProtectedRoute requireOwner={true}>
                  <OwnerMemberships />
                </ProtectedRoute>
              }
            />
            <Route
              path="/owner/inventory"
              element={
                <ProtectedRoute requireOwner={true}>
                  <OwnerInventory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/owner/staff"
              element={
                <ProtectedRoute requireOwner={true}>
                  <OwnerStaff />
                </ProtectedRoute>
              }
            />
            <Route
              path="/owner/finance"
              element={
                <ProtectedRoute requireOwner={true}>
                  <OwnerFinance />
                </ProtectedRoute>
              }
            />
            {/* ── PLATFORM TRUST & SAFETY / SUPERADMIN ROUTES ── */}
            <Route
              path="/admin/finance"
              element={
                <ProtectedRoute requireAdmin={true}>
                  <SuperAdminFinance />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/verifications"
              element={
                <ProtectedRoute requireAdmin={true}>
                  <AdminVerification />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={<Navigate to="/admin/finance" replace />}
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </AuthProvider>
    </BrowserRouter>
  );
}
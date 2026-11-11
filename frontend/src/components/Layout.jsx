import { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import PwaInstallPrompt from "./PwaInstallPrompt";
import NotificationPermissionBanner from "./NotificationPermissionBanner";
import PhoneVerificationModal from "./PhoneVerificationModal";
import { useAuth } from "../context/useAuth";

export default function Layout({ children }) {
  const { currentUser, activeRole } = useAuth();
  const [showPhonePrompt, setShowPhonePrompt] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (!currentUser) {
      setShowPhonePrompt(false);
      return;
    }

    // Check if phone number is already verified
    const savedPhone =
      localStorage.getItem("messta_user_phone") ||
      (activeRole === "owner" ? localStorage.getItem("messta_owner_phone") : null) ||
      currentUser.phoneNumber;

    const dismissed = sessionStorage.getItem("messta_phone_login_prompt_dismissed");

    // If logged in and has no phone linked yet, trigger prompt after brief 700ms delay
    if (!savedPhone && !dismissed) {
      const timer = setTimeout(() => {
        setShowPhonePrompt(true);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [currentUser, activeRole]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50/50 text-gray-900 selection:bg-orange-500 selection:text-white">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <PwaInstallPrompt />
      <NotificationPermissionBanner />

      {/* Automatic Post-Login Phone Verification Prompt */}
      <PhoneVerificationModal
        isOpen={showPhonePrompt}
        role={activeRole}
        onClose={() => {
          setShowPhonePrompt(false);
          sessionStorage.setItem("messta_phone_login_prompt_dismissed", "true");
        }}
        onVerified={(verifiedPhone) => {
          setShowPhonePrompt(false);
          if (activeRole === "owner") {
            localStorage.setItem("messta_owner_phone", verifiedPhone);
          }
        }}
      />

      {/* Floating Quick Action Pass Pill for Students on Mobile/Desktop */}
      {currentUser &&
        activeRole !== "owner" &&
        activeRole !== "admin" &&
        location.pathname !== "/profile" && (
          <div className="fixed bottom-5 right-5 z-40 animate-in fade-in slide-in-from-bottom-3 duration-200">
            <Link
              to="/profile"
              className="bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 transition"
              title="View your active meal tokens"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
              <span>My Tokens</span>
            </Link>
          </div>
        )}
    </div>
  );
}
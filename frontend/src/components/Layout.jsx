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
          <div className="fixed bottom-5 right-5 z-40 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <Link
              to="/profile"
              className="bg-gradient-to-r from-orange-600 via-amber-500 to-orange-600 hover:from-orange-500 hover:to-amber-400 text-white font-black text-xs px-4 py-2.5 rounded-full shadow-2xl shadow-orange-500/30 flex items-center gap-2 border-2 border-white/20 btn-bouncy"
              title="View your active counter passes & dynamic QR tickets"
            >
              <span className="text-sm">🎟️</span>
              <span className="tracking-tight">My Meal Passes</span>
              <span className="bg-white/20 px-1.5 py-0.2 rounded-full text-[10px]">→</span>
            </Link>
          </div>
        )}
    </div>
  );
}
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
    <div className="min-h-screen flex flex-col bg-[#0B0F17] text-stone-100 selection:bg-amber-500 selection:text-black antialiased">
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

      {/* Floating Quick Action Pass Pill for Students on Mobile/Desktop (Minimalist Linear Style) */}
      {currentUser &&
        activeRole !== "owner" &&
        activeRole !== "admin" &&
        location.pathname !== "/profile" && (
          <div className="fixed bottom-5 right-5 z-40 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <Link
              to="/profile"
              className="bg-stone-900/95 hover:bg-stone-850 text-stone-200 hover:text-white text-xs font-mono px-3.5 py-2.5 rounded-xl border border-stone-700/80 hover:border-amber-500/60 shadow-2xl backdrop-blur-md flex items-center gap-2.5 transition btn-minimal"
              title="View your active counter passes & dynamic QR tickets"
            >
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              <span className="tracking-wide uppercase font-semibold">Pass Vault</span>
              <span className="text-stone-500 font-mono text-[10px]">→</span>
            </Link>
          </div>
        )}
    </div>
  );
}
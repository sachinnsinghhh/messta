import { useState, useEffect } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import PwaInstallPrompt from "./PwaInstallPrompt";
import PhoneVerificationModal from "./PhoneVerificationModal";
import { useAuth } from "../context/useAuth";

export default function Layout({ children }) {
  const { currentUser, activeRole } = useAuth();
  const [showPhonePrompt, setShowPhonePrompt] = useState(false);

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
    </div>
  );
}
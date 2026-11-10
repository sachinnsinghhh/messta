import { useState, useEffect } from "react";
import { useAuth } from "../context/useAuth";
import { isPushNotificationSupported, registerPushSubscription } from "../utils/pushManager";

export default function NotificationPermissionBanner() {
  const { currentUser, activeRole } = useAuth();
  const [visible, setVisible] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (!currentUser || !isPushNotificationSupported()) return;

    if (
      Notification.permission !== "granted" &&
      !sessionStorage.getItem("messta_push_banner_dismissed")
    ) {
      // Delay prompt so user is oriented first
      const timer = setTimeout(() => {
        setVisible(true);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [currentUser]);

  const handleEnable = async () => {
    if (!currentUser) return;
    setSubscribing(true);

    const res = await registerPushSubscription(
      currentUser.uid,
      currentUser.email,
      activeRole
    );

    if (res.success) {
      setSuccessMsg("✓ Lockscreen meal & cutoff alerts activated!");
      setTimeout(() => {
        setVisible(false);
      }, 2000);
    } else {
      setVisible(false);
      sessionStorage.setItem("messta_push_banner_dismissed", "true");
    }
    setSubscribing(false);
  };

  const handleDismiss = () => {
    setVisible(false);
    sessionStorage.setItem("messta_push_banner_dismissed", "true");
  };

  if (!visible) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-50 max-w-md mx-auto bg-stone-900 text-white rounded-2xl p-3.5 shadow-2xl border border-stone-800 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-orange-600/20 text-orange-500 flex items-center justify-center font-bold text-lg shrink-0 border border-orange-500/30">
          🔔
        </div>
        <div>
          <h4 className="text-xs font-black tracking-tight leading-tight">
            Enable Lockscreen Meal Alerts
          </h4>
          <p className="text-[11px] text-stone-300">
            {successMsg || "Get 10 PM cutoff reminders & meal ready alerts."}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {!successMsg && (
          <button
            type="button"
            disabled={subscribing}
            onClick={handleEnable}
            className="px-3.5 py-1.5 bg-orange-600 hover:bg-orange-700 active:scale-95 text-white font-black text-xs rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            {subscribing ? "Enabling..." : "Enable"}
          </button>
        )}
        <button
          type="button"
          onClick={handleDismiss}
          className="text-stone-400 hover:text-white p-1 text-sm font-bold cursor-pointer"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

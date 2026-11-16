import { createContext, useContext, useState, useEffect } from "react";

const PwaContext = createContext(null);

export function PwaProvider({ children }) {
  const [deferredPrompt, setDeferredPrompt] = useState(() => {
    return typeof window !== "undefined" && window.messtaDeferredPrompt
      ? window.messtaDeferredPrompt
      : null;
  });
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [instructionModalOpen, setInstructionModalOpen] = useState(false);
  const [deviceType, setDeviceType] = useState("other"); // "ios" | "android" | "desktop"

  useEffect(() => {
    // 1. Detect operating system / device
    const userAgent = (window.navigator.userAgent || "").toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);
    setDeviceType(isIos ? "ios" : isAndroid ? "android" : "desktop");

    // 2. Strict check for standalone mode (ONLY true when actively running inside installed app window)
    const checkStandalone = () => {
      const isStandaloneMode =
        Boolean(window.matchMedia("(display-mode: standalone)").matches) ||
        window.navigator.standalone === true;
      setIsStandalone(isStandaloneMode);
      if (isStandaloneMode) {
        setIsInstalled(true);
      }
      return isStandaloneMode;
    };

    const isRunningStandalone = checkStandalone();

    // Check localStorage hint if set previously by appinstalled event
    try {
      if (!isRunningStandalone && localStorage.getItem("messta_app_installed_hint") === "true") {
        setIsInstalled(true);
      }
    } catch (_) {}

    // 3. Check getInstalledRelatedApps API (Available on modern Chromium & Android Chrome)
    // If user uninstalled, this returns [] and automatically marks isInstalled = false
    if (!isRunningStandalone && "getInstalledRelatedApps" in navigator) {
      navigator
        .getInstalledRelatedApps()
        .then((apps) => {
          if (apps && apps.length > 0) {
            setIsInstalled(true);
            try {
              localStorage.setItem("messta_app_installed_hint", "true");
            } catch (_) {}
          } else {
            setIsInstalled(false);
            try {
              localStorage.removeItem("messta_app_installed_hint");
            } catch (_) {}
          }
        })
        .catch(() => {});
    }

    // 4. Capture native beforeinstallprompt
    // NOTE: Browsers ONLY fire beforeinstallprompt if the app is NOT installed!
    // If the user previously had the app installed but deleted/uninstalled it,
    // this event fires again in browser, automatically resetting isInstalled to false!
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      window.messtaDeferredPrompt = e;
      setDeferredPrompt(e);
      setIsInstalled(false);
      try {
        localStorage.removeItem("messta_app_installed_hint");
      } catch (_) {}
    };

    window.__onMesstaPromptReady = handleBeforeInstallPrompt;

    if (window.messtaDeferredPrompt) {
      handleBeforeInstallPrompt(window.messtaDeferredPrompt);
    }

    // 5. Capture appinstalled event (Fires as soon as user accepts install)
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      window.messtaDeferredPrompt = null;
      setInstructionModalOpen(false);
      try {
        localStorage.setItem("messta_app_installed_hint", "true");
      } catch (_) {}
    };

    // 6. Listen for display-mode standalone changes
    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const handleMediaChange = (e) => {
      setIsStandalone(e.matches);
      if (e.matches) {
        setIsInstalled(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleMediaChange);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", handleMediaChange);
      }
      delete window.__onMesstaPromptReady;
    };
  }, []);

  // Directly trigger native installation on the user's device
  const installApp = async () => {
    let promptToUse = deferredPrompt || window.messtaDeferredPrompt;

    // If native prompt is not yet ready on Android, wait up to 800ms for Chrome's prompt event
    if (!promptToUse && deviceType === "android") {
      promptToUse = await new Promise((resolve) => {
        const handler = (e) => {
          e.preventDefault();
          window.messtaDeferredPrompt = e;
          setDeferredPrompt(e);
          window.removeEventListener("beforeinstallprompt", handler);
          resolve(e);
        };
        window.addEventListener("beforeinstallprompt", handler, { once: true });
        setTimeout(() => {
          window.removeEventListener("beforeinstallprompt", handler);
          resolve(window.messtaDeferredPrompt || null);
        }, 800);
      });
    }

    // If native prompt is available (Chrome Android, Chrome Desktop, Edge):
    // Directly popup the device's native installation prompt!
    if (promptToUse) {
      try {
        await promptToUse.prompt();
        const choiceResult = await promptToUse.userChoice;
        if (choiceResult && choiceResult.outcome === "accepted") {
          setIsInstalled(true);
          try {
            localStorage.setItem("messta_app_installed_hint", "true");
          } catch (_) {}
        }
        setDeferredPrompt(null);
        window.messtaDeferredPrompt = null;
      } catch (err) {
        console.warn("Direct install prompt error:", err);
      }
      return;
    }

    // Only on iOS Safari (where Apple has no native prompt API, require 3-step share guide)
    if (deviceType === "ios") {
      setInstructionModalOpen(true);
    }
  };

  const closeInstructions = () => {
    setInstructionModalOpen(false);
  };

  return (
    <PwaContext.Provider
      value={{
        isInstalled,
        isStandalone,
        canInstall: !isInstalled,
        installApp,
        deviceType,
      }}
    >
      {children}

      {/* Manual Installation Instructions Modal (Strictly for iOS Safari, where Apple provides no install API) */}
      {instructionModalOpen && deviceType === "ios" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-gray-100 text-center space-y-4">
            <button
              type="button"
              onClick={closeInstructions}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 text-sm font-bold cursor-pointer"
            >
              ✕
            </button>

            <div className="w-14 h-14 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center mx-auto text-2xl shadow-xs">
              📲
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-gray-900">
                Install Messta on iPhone
              </h3>
              <p className="text-xs text-gray-500">
                Fast 1-tap counter passes & offline meal tickets
              </p>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 text-left text-xs space-y-2.5 border border-gray-200/80">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-orange-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0">
                  1
                </span>
                <p className="text-gray-700">
                  Tap the <strong>Share</strong> button (
                  <span className="inline-block px-1 bg-gray-200 rounded font-mono text-[10px]">
                    ⎋
                  </span>
                  ) at the bottom of your Safari screen.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-orange-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0">
                  2
                </span>
                <p className="text-gray-700">
                  Scroll down and tap <strong>&ldquo;Add to Home Screen&rdquo;</strong> (
                  <span className="inline-block px-1 bg-gray-200 rounded font-mono text-[10px]">
                    +
                  </span>
                  ).
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-orange-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0">
                  3
                </span>
                <p className="text-gray-700">
                  Tap <strong>&ldquo;Add&rdquo;</strong> in the top right corner.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={closeInstructions}
              className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </PwaContext.Provider>
  );
}

export function usePwa() {
  const context = useContext(PwaContext);
  if (!context) {
    return {
      isInstalled: false,
      isStandalone: false,
      canInstall: true,
      installApp: () => {},
      deviceType: "other",
    };
  }
  return context;
}

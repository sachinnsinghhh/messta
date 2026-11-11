import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { shareTicketToWhatsApp, downloadOfflineTicketImage } from "../utils/ticketDownloader";

/**
 * DynamicQRModal: Unified Dynamic QR Display for:
 * 1. Membership Plan Pass (Declining token balance & slot redemption)
 * 2. Per-Plate Meal Booking (Single-use date & slot ticket)
 */
export default function DynamicQRModal({
  isOpen,
  onClose,
  type = "membership", // "membership" | "per_plate"
  data = {},
}) {
  const [secondsRemaining, setSecondsRemaining] = useState(300); // 5-minute rolling freshness
  const [copied, setCopied] = useState(false);
  const [rollingNonce, setRollingNonce] = useState(() => Date.now());

  // Rolling countdown timer
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          setRollingNonce(Date.now()); // roll freshness
          return 300;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
      setSecondsRemaining(300);
    };
  }, [isOpen]);

  if (!isOpen || !data) return null;

  const isMembership = type === "membership";
  const displayToken = data.token || data.tokenCode || data.passCode || "";

  // Build the unified, standardized dynamic QR payload
  const qrPayload = JSON.stringify({
    tokenType: isMembership ? "membership" : "per_plate",
    token: displayToken,
    passCode: data.passCode || "",
    subscriptionId: data.subscriptionId || data._id || "",
    orderId: data.orderId || data._id || "",
    messId: data.messId || "",
    messName: data.messName || "",
    userId: data.userId || "",
    userName: data.userName || data.customerName || "Student Diner",
    mealType: data.mealType || (isMembership ? "Daily Slot" : "Single Meal"),
    bookingDate: data.bookingDate || data.date || new Date().toISOString().split("T")[0],
    amount: data.amount || 0,
    remainingTokens: data.remainingTokens ?? null,
    totalTokens: data.totalTokens ?? null,
    timestamp: rollingNonce,
  });

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const timeFormatted = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;

  const handleCopy = () => {
    navigator.clipboard?.writeText(displayToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleManualRefresh = () => {
    setRollingNonce(Date.now());
    setSecondsRemaining(300);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-stone-950 text-stone-100 rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl border border-stone-800 animate-in zoom-in-95 duration-200 flex flex-col">
        
        {/* Modal Header */}
        <div className="p-5 bg-stone-900 border-b border-stone-800 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/30">
                {isMembership ? "MEMBERSHIP PASS" : "COUNTER REDEMPTION PASS"}
              </span>
            </div>
            <h3 className="text-lg font-bold tracking-tight text-white leading-tight">
              {isMembership 
                ? (data.planName || "Student Membership Pass") 
                : (data.messName || "Counter Meal Booking")}
            </h3>
            <p className="text-xs text-stone-400 font-mono mt-0.5">
              {isMembership 
                ? `${data.category || "Veg"} • ${data.frequency || "Daily Slots"}` 
                : `${(data.mealType || "Lunch").toUpperCase()} • ⏰ ${data.timeSlot || "11:30 AM – 02:30 PM"}`}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-300 flex items-center justify-center text-sm font-bold transition btn-bouncy cursor-pointer"
            aria-label="Close Modal"
          >
            ✕
          </button>
        </div>

        {/* QR Core Container */}
        <div className="p-6 flex flex-col items-center space-y-4 bg-stone-950">
          
          {/* Dynamic QR Canvas */}
          <div className="p-4 bg-white rounded-2xl shadow-[0_0_35px_rgba(245,158,11,0.22)] border-2 border-amber-500/40 relative group">
            <QRCodeSVG
              value={qrPayload}
              size={180}
              level="H"
              includeMargin={false}
              className="mx-auto"
            />
            
            {/* Freshness Watermark Tag */}
            <div className="mt-3 pt-2 border-t border-stone-100 flex items-center justify-between text-[10px] font-mono text-stone-600">
              <span className="flex items-center gap-1.5 text-emerald-700 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                ACTIVE KEY
              </span>
              <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded font-mono font-bold">
                ROTATING IN {timeFormatted}
              </span>
            </div>
          </div>

          {/* Large Token Code Display */}
          <div className="w-full text-center space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-widest text-stone-400 block">
              TOKEN IDENTIFIER
            </span>
            <div className="flex items-center justify-center gap-2">
              <span className="font-mono text-2xl sm:text-3xl font-black text-amber-400 tracking-widest bg-stone-900 px-5 py-2 rounded-2xl border border-stone-800 shadow-inner">
                {displayToken}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="p-2.5 rounded-2xl border border-stone-800 bg-stone-900 hover:bg-stone-800 text-xs font-bold text-stone-300 transition btn-bouncy cursor-pointer shadow-sm"
                title="Copy Code"
              >
                {copied ? "✓ Copied" : "📋"}
              </button>
            </div>
          </div>

          {/* Context Details based on Pass Type */}
          <div className="w-full bg-stone-900 rounded-2xl p-3.5 border border-stone-800 text-xs font-mono space-y-2 text-stone-300">
            {isMembership ? (
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-[10px] uppercase font-mono text-stone-500 block">DINER</span>
                  <span className="font-bold text-white">{data.userName || "Student"}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-mono text-stone-500 block">TOKEN BALANCE</span>
                  <span className="font-bold text-amber-400">
                    {data.remainingTokens ?? "Active"} {data.totalTokens ? `/ ${data.totalTokens}` : ""}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-[10px] uppercase font-mono text-stone-500 block">DINER</span>
                  <span className="font-bold text-white">{data.userName || data.customerName || "Student"}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-mono text-stone-500 block">STATUS</span>
                  <span className="font-bold text-emerald-400">₹{data.amount || 0} • PAID</span>
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-stone-800 flex items-center justify-between text-[11px] text-stone-400 font-mono">
              <span>📍 {data.messName || "Messta Partner Mess"}</span>
              <span className="font-mono text-[10px] text-stone-500">
                ID: {String(data.subscriptionId || data.orderId || "").slice(-6).toUpperCase()}
              </span>
            </div>
          </div>

          {/* Quick Offline Actions: WhatsApp & Save to Phone */}
          <div className="w-full flex items-center justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={() =>
                shareTicketToWhatsApp({
                  messName: data.messName,
                  thaliName: data.thaliName,
                  mealType: data.mealType,
                  timeSlot: data.timeSlot,
                  bookingDate: data.bookingDate,
                  token: displayToken,
                  amount: data.amount,
                })
              }
              className="flex-1 py-2.5 px-3 bg-stone-900 hover:bg-stone-850 text-stone-200 border border-stone-800 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition btn-bouncy cursor-pointer shadow-sm"
            >
              <span>💬</span>
              <span>WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={() =>
                downloadOfflineTicketImage({
                  messName: data.messName,
                  thaliName: data.thaliName,
                  mealType: data.mealType,
                  timeSlot: data.timeSlot,
                  bookingDate: data.bookingDate,
                  token: displayToken,
                  amount: data.amount,
                })
              }
              className="flex-1 py-2.5 px-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold font-mono text-xs rounded-xl transition btn-bouncy cursor-pointer shadow-lg shadow-amber-500/20"
            >
              <span>💾</span>
              <span>Save Pass</span>
            </button>
          </div>

        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 bg-stone-900 border-t border-stone-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleManualRefresh}
            className="text-xs text-stone-400 hover:text-amber-400 font-mono font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <span>🔄</span>
            <span>Refresh QR</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-mono font-bold uppercase tracking-wider rounded-xl transition cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}

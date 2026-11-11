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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl border border-gray-200 animate-in zoom-in-95 duration-200 flex flex-col">
        
        {/* Modal Header */}
        <div className="p-5 text-white bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 flex justify-between items-start shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></span>
              <span className="text-[10px] font-black uppercase tracking-wider text-orange-100 bg-black/20 px-2 py-0.5 rounded-full">
                {isMembership ? "Multi-Use Token Pass" : "Single-Use Meal Ticket"}
              </span>
            </div>
            <h3 className="text-xl font-black tracking-tight leading-tight">
              {isMembership 
                ? (data.planName || "Student Membership Pass") 
                : (data.messName || "Counter Meal Booking")}
            </h3>
            <p className="text-xs text-orange-100 font-medium mt-0.5">
              {isMembership 
                ? `${data.category || "Veg"} • ${data.frequency || "Daily Slots"}` 
                : `${(data.mealType || "Lunch").toUpperCase()} Spread • ⏰ ${data.timeSlot || "11:30 AM – 02:30 PM"} • 📅 ${data.bookingDate || "Today"}`}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center text-sm font-bold transition btn-bouncy cursor-pointer"
            aria-label="Close Modal"
          >
            ✕
          </button>
        </div>

        {/* QR Core Container */}
        <div className="p-6 flex flex-col items-center space-y-4 bg-orange-50/30">
          
          {/* Dynamic QR Canvas */}
          <div className="p-4 bg-white rounded-3xl shadow-lg border-2 border-orange-200/90 relative group animate-qr-glow">
            <QRCodeSVG
              value={qrPayload}
              size={180}
              level="H"
              includeMargin={false}
              className="mx-auto"
            />
            
            {/* Freshness Watermark Tag */}
            <div className="mt-3 pt-2 border-t border-orange-100 flex items-center justify-between text-[10px] font-bold">
              <span className="flex items-center gap-1 text-emerald-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                Fresh QR
              </span>
              <span className="text-orange-600 bg-orange-100/80 px-2 py-0.5 rounded-md font-mono">
                Expires in {timeFormatted}
              </span>
            </div>
          </div>

          {/* Large Token Code Display */}
          <div className="w-full text-center space-y-1">
            <span className="text-[10px] uppercase font-black text-stone-400 tracking-wider block">
              Redemption Token Code
            </span>
            <div className="flex items-center justify-center gap-2">
              <span className="font-mono text-2xl sm:text-3xl font-black text-gray-900 tracking-widest bg-white px-5 py-2 rounded-2xl border-2 border-orange-200 shadow-sm">
                {displayToken}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="p-2.5 rounded-2xl border-2 border-orange-200 bg-white hover:bg-orange-50 text-xs font-bold text-gray-700 transition btn-bouncy cursor-pointer shadow-sm"
                title="Copy Code"
              >
                {copied ? "✓ Copied" : "📋"}
              </button>
            </div>
          </div>

          {/* Context Details based on Pass Type */}
          <div className="w-full bg-white rounded-2xl p-3.5 border border-gray-200/80 text-xs space-y-2">
            {isMembership ? (
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Diner</span>
                  <span className="font-bold text-gray-800">{data.userName || "Student"}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Token Balance</span>
                  <span className="font-extrabold text-orange-600">
                    {data.remainingTokens ?? "Active"} {data.totalTokens ? `/ ${data.totalTokens}` : ""}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Diner</span>
                  <span className="font-bold text-gray-800">{data.userName || data.customerName || "Student"}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Payment</span>
                  <span className="font-extrabold text-emerald-700">₹{data.amount || 0} • Paid</span>
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
              <span>📍 {data.messName || "Messta Partner Mess"}</span>
              <span className="font-mono text-[10px] text-gray-400 font-semibold">
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
              className="flex-1 py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition btn-bouncy cursor-pointer shadow-2xs"
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
              className="flex-1 py-2.5 px-3 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition btn-bouncy cursor-pointer shadow-2xs"
            >
              <span>💾</span>
              <span>Save Pass</span>
            </button>
          </div>

        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 bg-white border-t border-gray-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleManualRefresh}
            className="text-xs text-gray-500 hover:text-orange-600 font-bold flex items-center gap-1 transition"
          >
            <span>🔄</span>
            <span>Refresh QR</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-bold uppercase tracking-wider rounded-xl transition shadow-xs"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}

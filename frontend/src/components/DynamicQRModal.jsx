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
      <div className="bg-white text-gray-900 rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl border border-gray-200 animate-in zoom-in-95 duration-200 flex flex-col">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-gray-100 flex justify-between items-start bg-gray-50/50">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-orange-600 block">
              {isMembership ? "Student Pass" : "Counter Meal Token"}
            </span>
            <h3 className="text-lg font-bold text-gray-900 leading-snug mt-0.5">
              {isMembership 
                ? (data.planName || "Student Membership Pass") 
                : (data.messName || "Counter Pickup")}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {isMembership 
                ? `${data.category || "Veg"} • ${data.frequency || "Daily Slots"}` 
                : `${data.mealType || "Lunch"} • ${data.timeSlot || "11:30 AM – 02:30 PM"}`}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-600 flex items-center justify-center text-xs font-bold transition cursor-pointer"
            aria-label="Close Modal"
          >
            ✕
          </button>
        </div>

        {/* QR Core Container */}
        <div className="p-6 flex flex-col items-center space-y-4">
          
          {/* Dynamic QR Canvas */}
          <div className="p-4 bg-white rounded-2xl border-2 border-gray-100 shadow-sm relative group">
            <QRCodeSVG
              value={qrPayload}
              size={180}
              level="H"
              includeMargin={false}
              className="mx-auto"
            />
            
            {/* Freshness Watermark Tag */}
            <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
              <span className="flex items-center gap-1.5 text-green-700 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                Active Token
              </span>
              <span className="text-gray-400 font-mono">
                Refreshes in {timeFormatted}
              </span>
            </div>
          </div>

          {/* Large Token Code Display */}
          <div className="w-full text-center space-y-1">
            <span className="text-[11px] uppercase font-bold text-gray-400 tracking-wider block">
              Pickup Token Code
            </span>
            <div className="flex items-center justify-center gap-2">
              <span className="font-mono text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-wider bg-orange-50/60 px-5 py-2 rounded-xl border border-orange-200">
                {displayToken}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="p-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 transition cursor-pointer"
                title="Copy Code"
              >
                {copied ? "✓ Copied" : "Copy"}
              </button>
            </div>
          </div>

          {/* Context Details based on Pass Type */}
          <div className="w-full bg-gray-50 rounded-xl p-3 border border-gray-100 text-xs space-y-1.5 text-gray-600">
            {isMembership ? (
              <div className="flex justify-between items-center">
                <span>Diner: <strong className="text-gray-900">{data.userName || "Student"}</strong></span>
                <span>Balance: <strong className="text-orange-600 font-bold">{data.remainingTokens ?? "Active"} {data.totalTokens ? `/ ${data.totalTokens}` : ""}</strong></span>
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <span>Diner: <strong className="text-gray-900">{data.userName || data.customerName || "Student"}</strong></span>
                <span>Payment: <strong className="text-green-700 font-bold">₹{data.amount || 0} • Paid</strong></span>
              </div>
            )}

            <div className="pt-1.5 border-t border-gray-200/60 flex items-center justify-between text-[11px] text-gray-500">
              <span>📍 {data.messName || "Messta Partner Mess"}</span>
              <span>ID: {String(data.subscriptionId || data.orderId || "").slice(-6).toUpperCase()}</span>
            </div>
          </div>

          {/* Actions */}
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
              className="flex-1 py-2 px-3 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <span>Share to WhatsApp</span>
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
              className="flex-1 py-2 px-3 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-xs"
            >
              <span>Save Offline Pass</span>
            </button>
          </div>

        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleManualRefresh}
            className="text-xs text-gray-500 hover:text-orange-600 font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <span>🔄</span>
            <span>Refresh QR</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-xl transition cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}

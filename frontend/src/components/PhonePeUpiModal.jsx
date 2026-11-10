import { useState, useEffect } from "react";
import { API_BASE_URL } from "../config/api";

export default function PhonePeUpiModal({
  isOpen,
  onClose,
  bookingDetails,
  onPaymentSuccess,
}) {
  const [loading, setLoading] = useState(true);
  const [initData, setInitData] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [confirmedInfo, setConfirmedInfo] = useState(null);

  useEffect(() => {
    if (!isOpen || !bookingDetails) return;

    let isMounted = true;
    async function startPayment() {
      try {
        setLoading(true);
        setErrorMsg("");

        const res = await fetch(`${API_BASE_URL}/api/payment/phonepe/initiate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bookingDetails),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || "Could not initiate payment session.");
        }

        if (isMounted) {
          setInitData(data);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setErrorMsg(err.message || "Failed to start payment.");
          setLoading(false);
        }
      }
    }

    startPayment();
    return () => {
      isMounted = false;
    };
  }, [isOpen, bookingDetails]);

  // Live polling for webhook confirmation
  useEffect(() => {
    if (!initData?.merchantTransactionId || isSuccess) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/payment/phonepe/status/${initData.merchantTransactionId}`
        );
        const sData = await res.json();
        if (sData.success && sData.isPaid) {
          setIsSuccess(true);
          setConfirmedInfo(sData);
          clearInterval(interval);
          if (onPaymentSuccess) {
            onPaymentSuccess(sData);
          }
        }
      } catch {
        // Polling failure, retry next tick
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [initData, isSuccess, onPaymentSuccess]);

  // Manual Check / Simulate Success in Sandbox mode
  const handleCheckOrSimulate = async () => {
    if (!initData?.merchantTransactionId) return;
    try {
      setVerifying(true);
      // Simulate success for demo / sandbox
      const simRes = await fetch(`${API_BASE_URL}/api/payment/phonepe/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txnId: initData.merchantTransactionId }),
      });

      const resJson = await simRes.json();
      if (resJson.success) {
        setIsSuccess(true);
        const sInfo = {
          success: true,
          isPaid: true,
          token: initData.token,
          amount: initData.amount,
        };
        setConfirmedInfo(sInfo);
        if (onPaymentSuccess) {
          onPaymentSuccess(sInfo);
        }
      } else {
        setErrorMsg(resJson.message || "Payment simulation failed.");
      }
    } catch (err) {
      setErrorMsg(err.message || "Verification request error.");
    } finally {
      setVerifying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-md w-full border border-stone-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-black uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
              PhonePe UPI Gateway
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 text-sm font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">

          {/* SUCCESS STATE */}
          {isSuccess ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto text-3xl font-black">
                ✓
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Payment Captured • Verified via PhonePe UPI
                </span>
                <h3 className="text-2xl font-black text-stone-900 tracking-tight mt-1">
                  Payment Successful!
                </h3>
                <p className="text-xs text-stone-500">
                  Your payment has been received in central escrow and your meal slot is confirmed.
                </p>
              </div>

              {/* Token Display */}
              <div className="p-5 bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-dashed border-orange-300 rounded-2xl space-y-1.5">
                <span className="text-[10px] uppercase font-black text-orange-600 tracking-wider block">
                  Counter Pickup Token
                </span>
                <span className="text-3xl sm:text-4xl font-black tracking-widest text-stone-900 font-mono block">
                  {confirmedInfo?.token || initData?.token}
                </span>
                <p className="text-[11px] text-stone-600 pt-1">
                  Amount Paid: <strong>₹{initData?.amount}</strong>
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 bg-stone-900 hover:bg-black text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs transition cursor-pointer"
              >
                Done / View My Bookings
              </button>
            </div>
          ) : loading ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-10 h-10 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs font-bold text-stone-700">Connecting to PhonePe UPI Gateway...</p>
              <p className="text-[11px] text-stone-400">Locking amount and generating secure intent payload</p>
            </div>
          ) : errorMsg ? (
            <div className="py-6 text-center space-y-3">
              <div className="text-3xl">⚠️</div>
              <div className="text-xs font-bold text-red-600">{errorMsg}</div>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl"
              >
                Close & Try Again
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* Order Info */}
              <div className="text-center space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  Total Payable Amount
                </span>
                <div className="text-4xl font-black text-stone-900 tracking-tight">
                  ₹{initData?.amount}
                </div>
                <p className="text-xs font-semibold text-stone-600">
                  {bookingDetails.title || "Advance Dining Reservation"}
                </p>
              </div>

              {/* 1-Tap UPI Intent Button (Primary on Mobile) */}
              <div className="space-y-2 pt-2">
                <a
                  href={initData?.upiIntentUrl}
                  className="w-full py-3.5 bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 hover:from-purple-800 hover:to-indigo-800 active:scale-98 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-md transition flex items-center justify-center gap-2 text-center"
                >
                  <span>⚡ Pay via UPI (PhonePe / GPay / Paytm)</span>
                </a>
                <p className="text-[10px] text-center text-stone-400 font-medium">
                  Opens your UPI app directly with ₹{initData?.amount} pre-locked. No typing needed!
                </p>
              </div>

              {/* Divider: OR scan QR */}
              <div className="relative flex items-center justify-center my-3">
                <div className="border-t border-stone-200 w-full"></div>
                <span className="bg-white px-3 text-[10px] font-bold text-stone-400 uppercase tracking-wider absolute">
                  OR SCAN QR
                </span>
              </div>

              {/* Dynamic QR Code (for Desktop or 2nd device) */}
              <div className="flex flex-col items-center justify-center p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                    initData?.upiIntentUrl || ""
                  )}`}
                  alt="PhonePe UPI QR"
                  className="w-36 h-36 rounded-xl border border-stone-200 shadow-2xs"
                />
                <div className="text-center text-[10px] text-stone-500 font-mono">
                  UPI ID: <span className="font-bold text-stone-800">{initData?.centralUpiId}</span>
                </div>
              </div>

              {/* Instant Verification Notice / Poller */}
              <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-200/60 text-[11px] text-purple-900 flex items-center gap-2">
                <span className="animate-spin text-purple-600 text-xs">🔄</span>
                <span className="font-medium">
                  Waiting for PhonePe UPI confirmation... Order will activate automatically.
                </span>
              </div>

              {/* Sandbox / Testing Mode Helper */}
              {initData?.env === "UAT" || initData?.env === "MOCK" ? (
                <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                  <span className="text-[10px] text-stone-400 font-mono">UAT Sandbox Active</span>
                  <button
                    type="button"
                    onClick={handleCheckOrSimulate}
                    disabled={verifying}
                    className="text-[11px] font-bold text-purple-700 hover:text-purple-900 underline cursor-pointer"
                  >
                    {verifying ? "Checking..." : "Simulate Instant Success (Test) ⚡"}
                  </button>
                </div>
              ) : null}

            </div>
          )}

        </div>

      </div>
    </div>
  );
}

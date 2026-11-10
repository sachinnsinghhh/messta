import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { API_BASE_URL } from "../config/api";

export default function PaymentStatus() {
  const [searchParams] = useSearchParams();
  const txnId = searchParams.get("txnId");
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [statusData, setStatusData] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [pollCount, setPollCount] = useState(0);

  useEffect(() => {
    if (!txnId) {
      setErrorMsg("No transaction ID provided in URL.");
      setLoading(false);
      return;
    }

    let isMounted = true;
    let timer = null;

    async function checkStatus() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/payment/phonepe/status/${txnId}`);
        const data = await res.json();

        if (!isMounted) return;

        if (res.ok && data.success) {
          setStatusData(data);
          if (data.isPaid) {
            setLoading(false);
            return;
          }
        }

        // Poll up to 6 times (12 seconds) waiting for webhook
        setPollCount((prev) => {
          if (prev < 6) {
            timer = setTimeout(checkStatus, 2000);
            return prev + 1;
          } else {
            setLoading(false);
            return prev;
          }
        });
      } catch (err) {
        if (isMounted) {
          setErrorMsg(err.message || "Failed to verify transaction status.");
          setLoading(false);
        }
      }
    }

    checkStatus();

    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [txnId]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 bg-stone-50/50">
      <div className="bg-white rounded-3xl max-w-md w-full border border-stone-200 shadow-xl overflow-hidden p-6 sm:p-8 text-center space-y-6 animate-in fade-in duration-200">
        
        {loading ? (
          <div className="py-10 space-y-4">
            <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-stone-900 tracking-tight">
                Verifying Payment with Bank...
              </h3>
              <p className="text-xs text-stone-500">
                Contacting PhonePe UPI Gateway for transaction #{txnId?.slice(0, 16)}...
              </p>
            </div>
          </div>
        ) : errorMsg ? (
          <div className="py-8 space-y-4">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto text-3xl font-black">
              ✕
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-black text-stone-900 tracking-tight">
                Verification Issue
              </h3>
              <p className="text-xs text-red-600 font-medium">{errorMsg}</p>
            </div>
            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="w-full py-3 bg-stone-900 hover:bg-black text-white font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
              >
                Retry Status Check
              </button>
              <Link
                to="/mess"
                className="w-full py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition text-center"
              >
                Return to Explore Menus
              </Link>
            </div>
          </div>
        ) : statusData?.isPaid ? (
          <div className="space-y-5">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto text-3xl font-black">
              ✓
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Payment Captured &amp; Verified
              </span>
              <h2 className="text-2xl font-black text-stone-900 tracking-tight mt-1">
                Booking Confirmed!
              </h2>
              <p className="text-xs text-stone-500">
                {statusData.type === "membership_pass"
                  ? `Your ${statusData.planName || "Monthly Pass"} is now active.`
                  : `Your ${statusData.thaliName || "Daily Thali"} slot is confirmed at ${statusData.messName || "the mess"}.`}
              </p>
            </div>

            {/* Token / Pass Display */}
            <div className="p-5 bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-dashed border-orange-300 rounded-2xl space-y-1.5">
              <span className="text-[10px] uppercase font-black text-orange-600 tracking-wider block">
                {statusData.type === "membership_pass" ? "Membership Pass Code" : "Counter Pickup Token"}
              </span>
              <span className="text-3xl sm:text-4xl font-black tracking-widest text-stone-900 font-mono block">
                {statusData.token}
              </span>
              <div className="flex items-center justify-between text-[11px] text-stone-600 pt-2 border-t border-orange-200/60 mt-2">
                <span>Amount Paid: <strong>₹{statusData.amount}</strong></span>
                <span className="text-emerald-700 font-bold uppercase text-[10px]">
                  ✓ Received in Bank
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              {statusData.type === "membership_pass" ? (
                <Link
                  to="/membership"
                  className="w-full py-3 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs transition text-center"
                >
                  Go to My Pass Vault →
                </Link>
              ) : (
                <Link
                  to="/profile"
                  className="w-full py-3 bg-stone-900 hover:bg-black text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs transition text-center"
                >
                  View My Meal Tickets →
                </Link>
              )}

              <Link
                to="/mess"
                className="w-full py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition text-center"
              >
                Back to Outlets
              </Link>
            </div>
          </div>
        ) : (
          <div className="py-6 space-y-4">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto text-3xl font-black">
              ⏳
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-black text-stone-900 tracking-tight">
                Payment Awaiting Confirmation
              </h3>
              <p className="text-xs text-stone-500">
                Your UPI transaction is processing with your bank. Tokens activate automatically once confirmed.
              </p>
            </div>

            <div className="p-3 bg-stone-50 rounded-xl text-left text-xs font-mono text-stone-600 space-y-1 border border-stone-200">
              <div><strong>Txn ID:</strong> {txnId}</div>
              <div><strong>Status:</strong> {statusData?.status || "PENDING"}</div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
              >
                Refresh Payment Status
              </button>
              <Link
                to="/profile"
                className="w-full py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition text-center"
              >
                Check My Profile
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

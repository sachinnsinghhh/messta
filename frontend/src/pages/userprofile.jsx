import { API_BASE_URL } from "../config/api";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import DynamicQRModal from "../components/DynamicQRModal";
import PhoneVerificationModal from "../components/PhoneVerificationModal";
import { shareTicketToWhatsApp, downloadOfflineTicketImage } from "../utils/ticketDownloader";
import {
  isPushNotificationSupported,
  registerPushSubscription,
  sendTestPushNotification,
} from "../utils/pushManager";

export default function UserProfile() {
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [qrModal, setQrModal] = useState({ isOpen: false, data: null });
  const [userPhone, setUserPhone] = useState(() => localStorage.getItem("messta_user_phone") || "");
  const [showPhoneModal, setShowPhoneModal] = useState(false);

  const [pushStatus, setPushStatus] = useState(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      return Notification.permission;
    }
    return "unsupported";
  });
  const [pushTesting, setPushTesting] = useState(false);
  const [pushMsg, setPushMsg] = useState("");

  const handleEnablePush = async () => {
    if (!currentUser?.uid) return;
    setPushTesting(true);
    const res = await registerPushSubscription(currentUser.uid, currentUser.email, "user");
    if (res.success) {
      setPushStatus("granted");
      setPushMsg("✓ Lockscreen alerts enabled!");
      setTimeout(() => setPushMsg(""), 3500);
    } else {
      setPushMsg(res.message || "Could not enable push.");
      setTimeout(() => setPushMsg(""), 3500);
    }
    setPushTesting(false);
  };

  const handleTestPush = async () => {
    if (!currentUser?.uid) return;
    setPushTesting(true);
    const res = await sendTestPushNotification(currentUser.uid);
    if (res.success) {
      setPushMsg("✓ Sent! Check your lockscreen / notifications.");
    } else {
      setPushMsg(res.message || "Failed to trigger test alert.");
    }
    setTimeout(() => setPushMsg(""), 4000);
    setPushTesting(false);
  };

  useEffect(() => {
    const fetchUserOrders = async () => {
      if (!currentUser?.uid) return;
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE_URL}/api/orders/user/${currentUser.uid}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || "Failed to load order history.");
        }
        setOrders(data.data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserOrders();
  }, [currentUser?.uid]);

  const activeTokens = orders.filter(
    (order) => order.tokenStatus === "active" && order.paymentStatus === "paid"
  );

  const pastOrders = orders.filter(
    (order) => order.tokenStatus !== "active" || order.paymentStatus !== "paid"
  );

  return (
    <div className="min-h-screen bg-[#0B0F17] py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-8 text-stone-100 antialiased">
      
      {/* ── PROFILE HEADER CARD (LINEAR / APPLE MINIMALIST) ── */}
      <div className="bg-stone-900/90 rounded-2xl border border-stone-800/90 p-6 sm:p-8 shadow-xl backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-stone-800 border border-stone-700 text-stone-200 font-mono font-bold text-xl flex items-center justify-center uppercase shadow-sm shrink-0">
            {currentUser?.email?.[0] || "S"}
          </div>

          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
              {currentUser?.displayName || "Student Diner"}
            </h1>
            <p className="text-xs text-stone-400 font-mono">{currentUser?.email}</p>
            <div className="flex items-center gap-2 pt-0.5 flex-wrap">
              <span className="text-[10px] font-mono uppercase tracking-wider bg-stone-800 text-emerald-400 px-2.5 py-0.5 rounded border border-stone-700">
                VERIFIED DINER
              </span>

              {userPhone ? (
                <span className="text-[10px] font-mono tracking-wider bg-stone-800 text-stone-300 px-2.5 py-0.5 rounded border border-stone-700 flex items-center gap-1">
                  <span>+91 {userPhone}</span>
                  <span className="text-emerald-400 font-bold">✓</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowPhoneModal(true)}
                  className="text-[10px] font-mono tracking-wider bg-stone-800 hover:bg-stone-700 text-amber-400 px-2.5 py-0.5 rounded border border-stone-700 transition cursor-pointer flex items-center gap-1 btn-minimal"
                >
                  <span>Link Mobile</span>
                </button>
              )}

              {/* Push Notification Alert Badge & Test Action */}
              {isPushNotificationSupported() && (
                <>
                  {pushStatus === "granted" ? (
                    <div className="flex items-center gap-1.5 bg-stone-800 text-stone-300 px-2.5 py-0.5 rounded border border-stone-700 text-[10px] font-mono uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>ALERTS ACTIVE</span>
                      <button
                        type="button"
                        disabled={pushTesting}
                        onClick={handleTestPush}
                        className="text-amber-400 hover:text-amber-300 ml-1 cursor-pointer disabled:opacity-50"
                        title="Click to dispatch a live test notification to this device"
                      >
                        {pushTesting ? "..." : "TEST"}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={pushTesting}
                      onClick={handleEnablePush}
                      className="text-[10px] font-mono tracking-wider bg-stone-800 hover:bg-stone-700 text-stone-300 px-2.5 py-0.5 rounded border border-stone-700 transition cursor-pointer flex items-center gap-1"
                    >
                      <span>{pushTesting ? "ENABLING..." : "ENABLE ALERTS"}</span>
                    </button>
                  )}
                </>
              )}

              {pushMsg && (
                <span className="text-[10px] font-mono text-amber-400 bg-stone-900 border border-stone-800 px-2 py-0.5 rounded">
                  {pushMsg}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/membership"
            className="px-4 py-2 bg-stone-800 hover:bg-stone-750 text-stone-300 hover:text-white font-mono text-xs uppercase tracking-wider rounded-lg border border-stone-700 transition btn-minimal"
          >
            Pass Vault
          </Link>
          <Link
            to="/mess"
            className="px-4 py-2 bg-stone-100 hover:bg-white text-stone-950 font-semibold text-xs uppercase tracking-wider rounded-lg transition btn-minimal"
          >
            Book Slot
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 text-xs font-semibold rounded-2xl border border-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-semibold text-gray-500">Loading your meal tokens...</p>
        </div>
      ) : (
        <div className="space-y-10">
          
          {/* Active Counter Tokens Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 bg-stone-900 px-2 py-0.5 rounded border border-stone-800">
                  COUNTER REDEMPTION
                </span>
                <h2 className="text-lg font-semibold text-white tracking-tight mt-1.5">
                  Active Meal Tokens & Passes
                </h2>
                <p className="text-xs text-stone-400 font-mono">Present pass at outlet counter desk for meal handover.</p>
              </div>

              <span className="text-xs font-mono font-medium bg-stone-900 text-stone-300 px-2.5 py-1 rounded-md border border-stone-800">
                {activeTokens.length} ACTIVE
              </span>
            </div>

            {activeTokens.length === 0 ? (
              <div className="bg-stone-900/50 rounded-2xl border border-dashed border-stone-800 p-10 text-center space-y-3">
                <span className="text-2xl text-stone-500 block">⚡</span>
                <p className="text-sm font-semibold text-stone-300">No active meal passes</p>
                <p className="text-xs text-stone-500 font-mono max-w-sm mx-auto">
                  Reserve a dining slot or generate a token from your membership pass.
                </p>
                <div className="pt-2">
                  <Link
                    to="/mess"
                    className="inline-block px-4 py-2 bg-stone-100 hover:bg-white text-stone-950 font-semibold text-xs rounded-lg transition btn-minimal"
                  >
                    View Campus Outlets →
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeTokens.map((token) => {
                  const effectiveTimeSlot =
                    token.timeSlot ||
                    (token.mealType?.toLowerCase() === "lunch"
                      ? "11:30 AM – 02:30 PM"
                      : "07:00 PM – 10:30 PM");

                  return (
                    <div
                      key={token._id}
                      className="group relative bg-stone-900/90 rounded-2xl border border-stone-800 p-6 shadow-2xl transition-all duration-300 overflow-hidden flex flex-col justify-between space-y-4 card-minimal"
                    >
                      {/* Perforated ticket punch notches on sides (Obsidian style) */}
                      <div className="ticket-notch-left bg-[#0B0F17] border-r border-stone-800"></div>
                      <div className="ticket-notch-right bg-[#0B0F17] border-l border-stone-800"></div>

                      <div className="flex justify-between items-start gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-mono uppercase tracking-widest text-stone-400">
                              PASS #{token.token}
                            </span>
                          </div>

                          <h3 className="font-semibold text-white text-base leading-tight">
                            {token.messName}
                          </h3>
                          <p className="text-xs text-stone-300 font-medium">
                            {token.thaliName || "Standard Daily Thali"}
                          </p>

                          <div className="flex items-center gap-2 flex-wrap pt-0.5 text-xs font-mono text-stone-400">
                            <span className="text-[10px] text-amber-400 uppercase bg-amber-950/40 border border-amber-800/60 px-2 py-0.5 rounded">
                              {token.mealType}
                            </span>
                            <span className="text-[10px] text-stone-400 bg-stone-800 px-2 py-0.5 rounded border border-stone-700/80">
                              {effectiveTimeSlot}
                            </span>
                          </div>

                          <p className="text-[11px] font-mono text-stone-500 pt-0.5">
                            DATE: <span className="text-stone-300">{token.bookingDate}</span>
                          </p>
                        </div>

                        <span className="text-[10px] font-mono tracking-wider uppercase px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-800/60 shrink-0">
                          READY
                        </span>
                      </div>

                      {/* Perforated ticket perforation line */}
                      <div className="relative py-1">
                        <div className="border-t border-dashed border-stone-800 w-full"></div>
                      </div>

                      {/* Counter Token Box with Dynamic QR Trigger */}
                      <div className="p-4 bg-black/50 border border-stone-800/80 rounded-xl text-center space-y-3">
                        <span className="text-[10px] uppercase font-mono tracking-widest text-stone-500 block">
                          COUNTER TOKEN
                        </span>
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-3xl font-mono font-medium tracking-widest text-amber-400 block">
                            {token.token}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard?.writeText(token.token);
                              setPushMsg("COPIED TO CLIPBOARD");
                              setTimeout(() => setPushMsg(""), 2000);
                            }}
                            className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-750 text-stone-300 border border-stone-700 text-xs transition cursor-pointer btn-minimal"
                            title="Copy Token"
                          >
                            📋
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setQrModal({
                              isOpen: true,
                              data: {
                                token: token.token,
                                orderId: token._id,
                                messId: token.messId,
                                messName: token.messName,
                                userId: token.userId,
                                userName: token.userName,
                                mealType: token.mealType,
                                timeSlot: effectiveTimeSlot,
                                thaliName: token.thaliName || "Standard Daily Thali",
                                bookingDate: token.bookingDate,
                                amount: token.amount,
                                tokenStatus: token.tokenStatus,
                                paymentStatus: token.paymentStatus,
                              },
                            })
                          }
                          className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold uppercase tracking-wider rounded-lg transition shadow-sm flex items-center justify-center gap-2 btn-minimal cursor-pointer"
                        >
                          <span>Display QR Code</span>
                        </button>

                        {/* Quick Offline Actions: WhatsApp & Save to Phone */}
                        <div className="flex items-center justify-center gap-2 pt-1 border-t border-stone-800/80">
                          <button
                            type="button"
                            onClick={() =>
                              shareTicketToWhatsApp({
                                messName: token.messName,
                                thaliName: token.thaliName,
                                mealType: token.mealType,
                                timeSlot: effectiveTimeSlot,
                                bookingDate: token.bookingDate,
                                token: token.token,
                                amount: token.amount,
                              })
                            }
                            className="flex-1 py-1.5 px-2 bg-stone-800 hover:bg-stone-750 text-stone-300 border border-stone-700 rounded-lg text-xs font-mono flex items-center justify-center gap-1.5 transition btn-minimal cursor-pointer"
                            title="Share ticket to your WhatsApp chat"
                          >
                            WhatsApp
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              downloadOfflineTicketImage({
                                messName: token.messName,
                                thaliName: token.thaliName,
                                mealType: token.mealType,
                                timeSlot: effectiveTimeSlot,
                                bookingDate: token.bookingDate,
                                token: token.token,
                                amount: token.amount,
                              })
                            }
                            className="flex-1 py-1.5 px-2 bg-stone-800 hover:bg-stone-750 text-stone-300 border border-stone-700 rounded-lg text-xs font-mono flex items-center justify-center gap-1.5 transition btn-minimal cursor-pointer"
                            title="Save offline meal pass to your phone gallery"
                          >
                            Save Pass
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
                        <span>Total Amount: <strong>₹{token.amount}</strong></span>
                        <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px]">
                          ● Verified Slot
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Past Orders & Redemption History */}
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-black text-gray-900">
                Meal History & Past Bookings
              </h2>
              <p className="text-xs text-gray-500">All previously served tokens and booking records.</p>
            </div>

            {pastOrders.length === 0 ? (
              <div className="bg-white rounded-3xl border border-gray-200 p-6 text-center text-xs text-gray-400">
                No past orders found in this account.
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-gray-600">
                    <thead className="bg-gray-50 text-gray-700 uppercase font-black border-b border-gray-200 text-[10px] tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Mess</th>
                        <th className="py-3 px-4">Slot</th>
                        <th className="py-3 px-4">Booking Date</th>
                        <th className="py-3 px-4">Amount</th>
                        <th className="py-3 px-4">Token Code</th>
                        <th className="py-3 px-4 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {pastOrders.map((ord) => (
                        <tr key={ord._id} className="hover:bg-gray-50/50">
                          <td className="py-3.5 px-4 font-bold text-gray-900">
                            {ord.messName}
                            {ord.thaliName && (
                              <span className="block text-[10px] text-gray-400 font-medium">{ord.thaliName}</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-black uppercase text-orange-600 block">{ord.mealType}</span>
                            <span className="text-[10px] text-gray-600 font-semibold block mt-0.5">
                              ⏰ {ord.timeSlot || (ord.mealType?.toLowerCase() === "lunch" ? "11:30 AM – 02:30 PM" : "07:00 PM – 10:30 PM")}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-medium">{ord.bookingDate}</td>
                          <td className="py-3.5 px-4 font-bold text-gray-900">₹{ord.amount}</td>
                          <td className="py-3.5 px-4 font-mono font-bold text-gray-800">{ord.token}</td>
                          <td className="py-3.5 px-4 text-right">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                ord.tokenStatus === "redeemed"
                                  ? "bg-gray-100 text-gray-600"
                                  : "bg-red-50 text-red-600"
                              }`}
                            >
                              {ord.tokenStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

        </div>
      )}

      {/* Dynamic QR Modal for Per-Plate Meal Ticket */}
      <DynamicQRModal
        isOpen={qrModal.isOpen}
        onClose={() => setQrModal({ isOpen: false, data: null })}
        type="per_plate"
        data={qrModal.data}
      />

      {/* 100% Free OTP Mobile Verification Modal */}
      <PhoneVerificationModal
        isOpen={showPhoneModal}
        onClose={() => setShowPhoneModal(false)}
        onVerified={(verifiedNumber) => setUserPhone(verifiedNumber)}
      />

    </div>
  );
}
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
    <div className="min-h-screen bg-gray-50/70 py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-8">
      
      {/* ── PROFILE HEADER CARD ── */}
      <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white font-black text-2xl flex items-center justify-center uppercase shadow-sm">
            {currentUser?.email?.[0] || "S"}
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              {currentUser?.displayName || "Student Diner"}
            </h1>
            <p className="text-xs text-gray-500 font-medium">{currentUser?.email}</p>
            <div className="flex items-center gap-2 pt-0.5 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Verified Student Account
              </span>

              {userPhone ? (
                <span className="text-[10px] font-black uppercase tracking-wider bg-purple-50 text-purple-800 px-2.5 py-0.5 rounded-full border border-purple-200 flex items-center gap-1">
                  <span>📱 +91 {userPhone}</span>
                  <span className="text-emerald-600">✓ Linked</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowPhoneModal(true)}
                  className="text-[10px] font-black uppercase tracking-wider bg-orange-100 hover:bg-orange-200 text-orange-800 px-2.5 py-0.5 rounded-full border border-orange-300 transition cursor-pointer flex items-center gap-1 shadow-2xs"
                >
                  <span>⚠️ Link WhatsApp Number</span>
                </button>
              )}

              {/* Push Notification Alert Badge & Test Action */}
              {isPushNotificationSupported() && (
                <>
                  {pushStatus === "granted" ? (
                    <div className="flex items-center gap-1.5 bg-blue-50 text-blue-800 px-2.5 py-0.5 rounded-full border border-blue-200 text-[10px] font-black uppercase tracking-wider">
                      <span>🔔 Alerts: Active ✓</span>
                      <button
                        type="button"
                        disabled={pushTesting}
                        onClick={handleTestPush}
                        className="underline hover:text-blue-950 font-bold ml-1 cursor-pointer disabled:opacity-50"
                        title="Click to dispatch a live test notification to this device"
                      >
                        {pushTesting ? "Testing..." : "Test Push"}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={pushTesting}
                      onClick={handleEnablePush}
                      className="text-[10px] font-black uppercase tracking-wider bg-amber-50 hover:bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full border border-amber-300 transition cursor-pointer flex items-center gap-1"
                    >
                      <span>🔔 {pushTesting ? "Enabling..." : "Enable Lockscreen Alerts"}</span>
                    </button>
                  )}
                </>
              )}

              {pushMsg && (
                <span className="text-[10px] font-bold text-stone-700 bg-stone-100 px-2 py-0.5 rounded-md animate-pulse">
                  {pushMsg}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/membership"
            className="px-4 py-2.5 bg-orange-50 hover:bg-orange-100 text-orange-700 font-extrabold text-xs uppercase tracking-wider rounded-xl transition"
          >
            Digital Pass Vault 🎟️
          </Link>
          <Link
            to="/mess"
            className="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-xs transition"
          >
            Book Meal Slot
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
                <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">
                  Counter Pickups
                </span>
                <h2 className="text-xl font-black text-gray-900 mt-1">
                  Active Redeemable Meal Tokens
                </h2>
                <p className="text-xs text-gray-500">Show these tokens at the mess counter to collect your food.</p>
              </div>

              <span className="text-xs font-extrabold bg-orange-100 text-orange-700 px-3 py-1 rounded-full">
                {activeTokens.length} Ready
              </span>
            </div>

            {activeTokens.length === 0 ? (
              <div className="bg-white rounded-3xl border border-dashed border-gray-300 p-10 text-center space-y-2">
                <span className="text-3xl">🍽️</span>
                <p className="text-sm font-bold text-gray-800">No active meal tokens right now</p>
                <p className="text-xs text-gray-400 max-w-sm mx-auto">
                  Book today's lunch or dinner, or generate a slot from your Student Membership Pass!
                </p>
                <div className="pt-2">
                  <Link
                    to="/mess"
                    className="inline-block px-4 py-2 bg-orange-600 text-white font-bold text-xs rounded-xl"
                  >
                    Explore Today's Menus →
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
                      className="group relative bg-stone-900 text-stone-100 rounded-3xl border border-stone-800 p-6 shadow-2xl hover:border-amber-500/50 transition-all duration-300 overflow-hidden flex flex-col justify-between space-y-4 card-playful"
                    >
                      {/* Perforated boarding pass punch notches on sides */}
                      <div className="ticket-notch-left bg-gray-50/90 border-r border-stone-700 shadow-inner"></div>
                      <div className="ticket-notch-right bg-gray-50/90 border-l border-stone-700 shadow-inner"></div>

                      <div className="flex justify-between items-start gap-3">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-md border border-amber-500/30">
                              PASS #{token.token}
                            </span>
                            <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400">
                              {token.mealType} SPREAD
                            </span>
                          </div>

                          <h3 className="font-bold text-white text-lg tracking-tight leading-tight group-hover:text-amber-400 transition-colors">
                            {token.thaliName || "Standard Daily Thali"}
                          </h3>

                          <div className="flex items-center gap-2 flex-wrap pt-0.5 text-xs font-mono">
                            <span className="text-stone-300 bg-stone-800/80 px-2.5 py-1 rounded-lg border border-stone-700 flex items-center gap-1.5">
                              <span className="text-amber-400">⏰</span>
                              <span>{effectiveTimeSlot}</span>
                            </span>
                            <span className="text-stone-400 bg-stone-800/50 px-2.5 py-1 rounded-lg border border-stone-800">
                              📍 {token.messName}
                            </span>
                          </div>

                          <p className="text-[11px] text-stone-400 font-mono pt-0.5 flex items-center gap-1">
                            <span>RESERVED FOR:</span>
                            <strong className="text-stone-200 font-bold">{token.bookingDate}</strong>
                          </p>
                        </div>

                        <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-2xs shrink-0 flex items-center gap-1.5 font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          <span>READY</span>
                        </span>
                      </div>

                      {/* Perforated ticket perforation dashed line */}
                      <div className="relative py-1">
                        <div className="border-t border-dashed border-stone-800 w-full"></div>
                      </div>

                      {/* Obsidian Counter Token Box with Dynamic QR Trigger */}
                      <div className="p-4 bg-stone-950/90 border border-stone-800/90 rounded-2xl text-center space-y-3 shadow-inner">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-stone-400 block">
                          COUNTER REDEMPTION CODE
                        </span>
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-3xl sm:text-4xl font-mono font-black tracking-widest text-amber-400 block drop-shadow-sm">
                            {token.token}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard?.writeText(token.token);
                              setPushMsg("✓ Token copied to clipboard!");
                              setTimeout(() => setPushMsg(""), 2500);
                            }}
                            className="p-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 text-xs transition btn-bouncy cursor-pointer"
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
                          className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-stone-950 text-xs font-black uppercase tracking-wider rounded-xl transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 btn-bouncy cursor-pointer"
                        >
                          <span>📱</span>
                          <span>Show Dynamic QR Pass</span>
                        </button>

                        {/* Quick Offline Actions: WhatsApp & Save to Phone */}
                        <div className="flex items-center justify-center gap-2 pt-1 border-t border-stone-800">
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
                            className="flex-1 py-2 px-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition btn-bouncy cursor-pointer"
                            title="Share ticket to your WhatsApp chat"
                          >
                            <span>💬 WhatsApp</span>
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
                            className="flex-1 py-2 px-2.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition btn-bouncy cursor-pointer"
                            title="Save offline meal pass to your phone gallery"
                          >
                            <span>💾 Save Pass</span>
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
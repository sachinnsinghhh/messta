import { API_BASE_URL } from "../config/api";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import DynamicQRModal from "../components/DynamicQRModal";

export default function UserProfile() {
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [qrModal, setQrModal] = useState({ isOpen: false, data: null });

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
            <div className="flex items-center gap-2 pt-0.5">
              <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Verified Student Account
              </span>
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
                {activeTokens.map((token) => (
                  <div
                    key={token._id}
                    className="bg-white rounded-3xl border-2 border-orange-200 p-6 shadow-xs relative overflow-hidden flex flex-col justify-between space-y-4"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-black text-gray-900 text-lg">
                          {token.messName}
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Slot: <strong className="text-orange-600 uppercase font-bold">{token.mealType}</strong> • Date: <strong className="text-gray-700">{token.bookingDate}</strong>
                        </p>
                      </div>

                      <span className="text-[9px] font-black uppercase px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                        Paid & Ready
                      </span>
                    </div>

                    {/* Counter Token Box with Dynamic QR Trigger */}
                    <div className="p-4 bg-orange-50/80 border border-dashed border-orange-300 rounded-2xl text-center space-y-2.5">
                      <span className="text-[10px] uppercase font-black text-orange-600 tracking-wider block">
                        Counter Token Code
                      </span>
                      <span className="text-3xl font-mono font-black tracking-widest text-gray-900 block">
                        {token.token}
                      </span>
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
                              bookingDate: token.bookingDate,
                              amount: token.amount,
                              tokenStatus: token.tokenStatus,
                              paymentStatus: token.paymentStatus,
                            },
                          })
                        }
                        className="px-4 py-2 bg-gray-900 hover:bg-black text-white text-xs font-bold uppercase tracking-wider rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 mx-auto active:scale-95"
                      >
                        <span>📱</span>
                        <span>Show QR Ticket</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
                      <span>Total Amount: <strong>₹{token.amount}</strong></span>
                      <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px]">
                        ● Verified Slot
                      </span>
                    </div>
                  </div>
                ))}
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
                          <td className="py-3.5 px-4 font-bold text-gray-900">{ord.messName}</td>
                          <td className="py-3.5 px-4 uppercase text-orange-600 font-bold">{ord.mealType}</td>
                          <td className="py-3.5 px-4">{ord.bookingDate}</td>
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

    </div>
  );
}
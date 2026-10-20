import { API_BASE_URL } from "../config/api";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { getStoredAdminKey } from "../config/adminSecurity";

export default function AdminVerification() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState("pending_review"); // "pending_review" | "verified" | "rejected" | "all"
  const [messes, setMesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Reject Modal State
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedMess, setSelectedMess] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ text: "", type: "" });

  const fetchVerificationQueue = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/mess/admin/verifications?status=${activeTab}`, {
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": getStoredAdminKey(),
        },
      });
      if (!res.ok) throw new Error("Failed to load verification queue");
      const result = await res.json();
      setMesses(result.data || []);
    } catch (err) {
      console.error("Error loading verification queue:", err);
      setStatusMessage({ text: "Could not fetch verification queue: " + err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVerificationQueue();
  }, [activeTab]);

  const handleApprove = async (messId, messName) => {
    if (!confirm(`Are you sure you want to approve and verify "${messName}"? This will make the mess publicly visible to students.`)) {
      return;
    }

    try {
      setActionLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/mess/${messId}/verification/review`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": getStoredAdminKey(),
        },
        body: JSON.stringify({
          decision: "approve",
          adminEmail: currentUser?.email || "admin@messta.com",
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setStatusMessage({ text: `✅ "${messName}" has been verified and published to the student marketplace!`, type: "success" });
        fetchVerificationQueue();
      } else {
        setStatusMessage({ text: data.message || "Failed to approve verification.", type: "error" });
      }
    } catch (err) {
      console.error("Error approving verification:", err);
      setStatusMessage({ text: err.message, type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenReject = (mess) => {
    setSelectedMess(mess);
    setRejectionReason("");
    setShowRejectModal(true);
  };

  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!selectedMess || !rejectionReason.trim()) return;

    try {
      setActionLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/mess/${selectedMess._id || selectedMess.id}/verification/review`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": getStoredAdminKey(),
        },
        body: JSON.stringify({
          decision: "reject",
          rejectionReason: rejectionReason.trim(),
          adminEmail: currentUser?.email || "admin@messta.com",
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setShowRejectModal(false);
        setStatusMessage({ text: `Verification rejected with note sent to "${selectedMess.name}".`, type: "success" });
        fetchVerificationQueue();
      } else {
        setStatusMessage({ text: data.message || "Failed to reject verification.", type: "error" });
      }
    } catch (err) {
      console.error("Error rejecting verification:", err);
      setStatusMessage({ text: err.message, type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const filteredMesses = messes.filter((m) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      m.name?.toLowerCase().includes(term) ||
      m.locality?.toLowerCase().includes(term) ||
      m.complianceDocs?.fssaiNumber?.toLowerCase().includes(term) ||
      m.phone?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="min-h-screen bg-gray-50/70 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      
      {/* ── TOP HEADER ── */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></span>
            <span className="text-[11px] font-black uppercase tracking-wider text-blue-600">
              Messta Trust & Safety Control Center
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Establishment Verification Queue
          </h1>
          <p className="text-xs text-gray-500 max-w-2xl">
            Inspect legal compliance, 14-digit FSSAI licenses, proprietor government IDs, commercial power bills, and bank payout credentials before publishing messes to students.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/admin/finance"
            className="px-4 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 text-xs font-bold rounded-2xl transition flex items-center gap-1.5"
          >
            <span>📊</span>
            <span>Financial Command Center</span>
          </Link>
          <button
            type="button"
            onClick={fetchVerificationQueue}
            className="px-4 py-2.5 bg-gray-900 hover:bg-black text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-xs transition cursor-pointer"
          >
            🔄 Refresh Queue
          </button>
        </div>
      </div>

      {/* Notification Banner */}
      {statusMessage.text && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between ${
            statusMessage.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          <span>{statusMessage.text}</span>
          <button
            type="button"
            onClick={() => setStatusMessage({ text: "", type: "" })}
            className="text-gray-400 hover:text-gray-600 font-black"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── FILTER TABS & SEARCH ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { key: "pending_review", label: "⏳ Pending Review", color: "text-blue-700" },
            { key: "verified", label: "✅ Verified Establishments", color: "text-emerald-700" },
            { key: "rejected", label: "❌ Rejected / Needs Fix", color: "text-red-700" },
            { key: "unverified", label: "⚠️ Unverified / Draft", color: "text-amber-700" },
            { key: "all", label: "🌐 All Outlets", color: "text-gray-700" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all ${
                activeTab === tab.key
                  ? "bg-orange-600 text-white shadow-2xs"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Search by Mess, FSSAI, Phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl font-bold w-64 focus:bg-white focus:ring-2 focus:ring-orange-500"
        />
      </div>

      {/* ── VERIFICATION QUEUE GRID ── */}
      <div className="space-y-6">
        {loading ? (
          <div className="py-16 text-center space-y-3 bg-white rounded-3xl border border-gray-200 p-8">
            <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs font-bold text-gray-500">Loading verification submissions...</p>
          </div>
        ) : filteredMesses.length === 0 ? (
          <div className="py-16 text-center space-y-3 bg-white rounded-3xl border border-dashed border-gray-200 p-8">
            <span className="text-4xl">🛡️</span>
            <h3 className="text-base font-black text-gray-800">No Establishments in This Queue</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              There are currently no messes matching the "{activeTab}" filter.
            </p>
          </div>
        ) : (
          filteredMesses.map((mess) => {
            const isPending = mess.verificationStatus === "pending_review";
            const isVerified = mess.verificationStatus === "verified" || mess.isVerified;
            const isRejected = mess.verificationStatus === "rejected";

            return (
              <div
                key={mess._id || mess.id}
                className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-200/90 shadow-xs space-y-6 hover:border-gray-300 transition"
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-2xl shadow-2xs">
                      🏢
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-black text-gray-900">{mess.name}</h2>
                        <span
                          className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                            isVerified
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : isPending
                              ? "bg-blue-50 text-blue-800 border-blue-200 animate-pulse"
                              : isRejected
                              ? "bg-red-50 text-red-800 border-red-200"
                              : "bg-amber-50 text-amber-800 border-amber-200"
                          }`}
                        >
                          {mess.verificationStatus || "unverified"}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        📍 {mess.locality}, {mess.city} • 📞 {mess.phone} • ✉️ {mess.ownerEmail}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {isPending && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenReject(mess)}
                          disabled={actionLoading}
                          className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-black uppercase rounded-xl transition border border-red-200"
                        >
                          Reject with Note ❌
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApprove(mess._id || mess.id, mess.name)}
                          disabled={actionLoading}
                          className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-xs transition"
                        >
                          Approve & Verify ✅
                        </button>
                      </>
                    )}

                    {isVerified && (
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1">
                        <span>🛡️</span> Verified Partner
                      </span>
                    )}

                    {isRejected && (
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-md border border-red-200 block">
                          Reason: {mess.rejectionReason}
                        </span>
                      </div>
                    )}

                    {!isPending && !isVerified && !isRejected && (
                      <button
                        type="button"
                        onClick={() => handleApprove(mess._id || mess.id, mess.name)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase rounded-xl transition"
                      >
                        Force Verify
                      </button>
                    )}
                  </div>
                </div>

                {/* Document Verification Cards (The 3 Proof Categories) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  {/* Category 1: Food Safety & Legal (FSSAI) */}
                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-orange-600">
                        1. Food Safety (FSSAI)
                      </span>
                      {mess.complianceDocs?.fssaiNumber ? (
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                          Submitted
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-gray-400">Missing</span>
                      )}
                    </div>
                    <div>
                      <span className="text-xs font-black text-gray-900 block font-mono">
                        {mess.complianceDocs?.fssaiNumber || "Not Provided"}
                      </span>
                      <span className="text-[11px] text-gray-500 block">
                        Expires: {mess.complianceDocs?.fssaiExpiryDate || "Not Specified"}
                      </span>
                    </div>
                    {mess.complianceDocs?.fssaiCertificateUrl && (
                      <a
                        href={mess.complianceDocs.fssaiCertificateUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-black text-orange-600 hover:underline block pt-1"
                      >
                        📄 View Official FSSAI Certificate ↗
                      </a>
                    )}
                  </div>

                  {/* Category 2: Proprietor Identification & Establishment Proof */}
                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-blue-600">
                        2. Identity & Premises Proof
                      </span>
                      {mess.complianceDocs?.ownerIdNumber ? (
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                          Verified ID
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-gray-400">Missing</span>
                      )}
                    </div>
                    <div>
                      <span className="text-xs font-black text-gray-900 block font-mono">
                        {mess.complianceDocs?.ownerIdType || "Aadhaar"}: {mess.complianceDocs?.ownerIdNumber || "—"}
                      </span>
                      <span className="text-[11px] text-gray-500 block font-mono">
                        Electricity Cons. #{mess.complianceDocs?.electricityConsumerNumber || "—"}
                      </span>
                    </div>
                    {mess.complianceDocs?.establishmentProofUrl && (
                      <a
                        href={mess.complianceDocs.establishmentProofUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-black text-blue-600 hover:underline block pt-1"
                      >
                        ⚡ View Commercial Power Bill ↗
                      </a>
                    )}
                  </div>

                  {/* Category 3: Bank Settlement Details */}
                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-purple-600">
                        3. Payout Settlement Banking
                      </span>
                      {mess.bankDetails?.accountNumber ? (
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                          Active Bank
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-gray-400">Missing</span>
                      )}
                    </div>
                    <div>
                      <span className="text-xs font-black text-gray-900 block font-mono">
                        {mess.bankDetails?.bankName || "Bank Account"}: {mess.bankDetails?.accountNumber || "—"}
                      </span>
                      <span className="text-[11px] text-gray-500 block font-mono">
                        IFSC: {mess.bankDetails?.ifscCode || "—"} • Payee: {mess.bankDetails?.accountHolderName || "—"}
                      </span>
                    </div>
                    {mess.bankDetails?.upiId && (
                      <span className="text-[10px] text-gray-500 font-mono block">
                        UPI: {mess.bankDetails.upiId}
                      </span>
                    )}
                  </div>

                </div>

                {/* Geo-Coordinates & Physical Pinning Bar */}
                <div className="p-3 bg-orange-50/40 rounded-2xl border border-orange-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span>📍</span>
                    <span className="font-bold text-gray-700">
                      Physical Location: {mess.address?.street || mess.locality}, Pincode: {mess.address?.pincode || "411038"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[11px] text-gray-500">
                    <span>GPS: {mess.address?.latitude || "18.5204"}, {mess.address?.longitude || "73.8567"}</span>
                    <a
                      href={`https://www.google.com/maps?q=${mess.address?.latitude || "18.5204"},${mess.address?.longitude || "73.8567"}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-orange-600 font-bold underline"
                    >
                      Open Map ↗
                    </a>
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* ── MODAL: REJECT VERIFICATION WITH REASON ── */}
      {showRejectModal && selectedMess && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-4 shadow-2xl border border-gray-100">
            <div className="flex items-start justify-between border-b border-gray-100 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase text-red-600 bg-red-50 px-2 py-0.5 rounded-md">
                  Action Required
                </span>
                <h3 className="text-lg font-black text-gray-900 mt-1">
                  Reject Verification for "{selectedMess.name}"
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 font-bold flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmReject} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-700 mb-1">
                  Quick Rejection Reason Presets:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {[
                    "FSSAI certificate is expired or unverified.",
                    "Uploaded ID proof is blurry / unreadable.",
                    "Commercial electricity bill address does not match mess location.",
                    "Bank account holder name does not match proprietor government ID.",
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setRejectionReason(preset)}
                      className="p-2 rounded-xl bg-gray-50 border border-gray-200 hover:bg-red-50/50 hover:border-red-200 text-left text-[11px] font-bold text-gray-700"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-700 mb-1">
                  Mandatory Rejection Explanation <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain exactly what the owner needs to fix before resubmitting..."
                  className="w-full p-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500 font-bold"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !rejectionReason.trim()}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  {actionLoading ? "Submitting..." : "Send Rejection Note ❌"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

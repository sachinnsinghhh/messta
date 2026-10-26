import { API_BASE_URL } from "../config/api";
import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { useAuth } from "../context/useAuth";
import { useActiveMess } from "../context/useActiveMess";
import { getStoredAdminKey } from "../config/adminSecurity";

export default function OwnerDashboard() {
  const { currentUser, activeRole } = useAuth();
  const isSuperAdmin = activeRole === "admin";

  const {
    allMesses,
    activeMessId,
    activeMess,
    loadingMesses,
    switchMess,
    deleteMess,
    refreshMesses,
  } = useActiveMess(currentUser);

  // Active Staff Operator for Shift Accountability
  const [messStaff, setMessStaff] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState("");

  // Branch Deletion Modal States
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingMess, setDeletingMess] = useState(false);

  // Business Profile Form States
  const [messName, setMessName] = useState("");
  const [locality, setLocality] = useState("");
  const [cuisineType, setCuisineType] = useState("North Indian");
  const [phone, setPhone] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [seatingCapacity, setSeatingCapacity] = useState(40);
  const [isOpen, setIsOpen] = useState(true);

  // Add New Mess Modal/Form toggle (SuperAdmin Exclusive Feature)
  const [showAddMess, setShowAddMess] = useState(false);
  const [newMessName, setNewMessName] = useState("");
  const [newLocality, setNewLocality] = useState("");
  const [newCuisineType, setNewCuisineType] = useState("North Indian");
  const [newPhone, setNewPhone] = useState("");
  const [newCapacity, setNewCapacity] = useState(40);
  const [newPricePerMeal, setNewPricePerMeal] = useState(80);
  const [newOwnerEmail, setNewOwnerEmail] = useState("");
  const [newManagerEmails, setNewManagerEmails] = useState("");

  // SuperAdmin Mess Permission Editor States
  const [permOwnerEmail, setPermOwnerEmail] = useState("");
  const [permManagerEmails, setPermManagerEmails] = useState("");
  const [permSaving, setPermSaving] = useState(false);

  // Counter Token & Dynamic QR Scanner States
  const [tokenInput, setTokenInput] = useState("");
  const [scannedResult, setScannedResult] = useState(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState("");
  const [scanSuccess, setScanSuccess] = useState("");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [autoRedeemRush, setAutoRedeemRush] = useState(false);

  const autoRedeemRushRef = useRef(autoRedeemRush);
  useEffect(() => {
    autoRedeemRushRef.current = autoRedeemRush;
  }, [autoRedeemRush]);

  const html5QrScannerRef = useRef(null);
  const lastProcessedScanRef = useRef({ text: "", time: 0 });

  // Live Orders Queue
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ text: "", type: "" });
  const [ordersReloadKey, setOrdersReloadKey] = useState(0);

  // Mess Verification Modal & Fields
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyStreet, setVerifyStreet] = useState("");
  const [verifyCity, setVerifyCity] = useState("Pune");
  const [verifyPincode, setVerifyPincode] = useState("411038");
  const [verifyLat, setVerifyLat] = useState(18.5204);
  const [verifyLng, setVerifyLng] = useState(73.8567);
  const [verifyFssai, setVerifyFssai] = useState("");
  const [verifyFssaiCertUrl, setVerifyFssaiCertUrl] = useState("");
  const [verifyFssaiExpiry, setVerifyFssaiExpiry] = useState("2028-12-31");
  const [verifyOwnerIdType, setVerifyOwnerIdType] = useState("Aadhaar Card");
  const [verifyOwnerIdNum, setVerifyOwnerIdNum] = useState("");
  const [verifyOwnerIdUrl, setVerifyOwnerIdUrl] = useState("");
  const [verifyElectricityNum, setVerifyElectricityNum] = useState("");
  const [verifyElectricityUrl, setVerifyElectricityUrl] = useState("");
  const [verifyAccHolder, setVerifyAccHolder] = useState("");
  const [verifyAccNum, setVerifyAccNum] = useState("");
  const [verifyIfsc, setVerifyIfsc] = useState("");
  const [verifyBankName, setVerifyBankName] = useState("");
  const [verifyUpi, setVerifyUpi] = useState("");
  const [submittingVerification, setSubmittingVerification] = useState(false);

  // Sync profile form whenever activeMess changes using an async boundary
  useEffect(() => {
    if (!activeMess) return;
    const timer = setTimeout(() => {
      setMessName(activeMess.name || "");
      setLocality(activeMess.locality || "");
      setCuisineType(activeMess.cuisineType || "North Indian");
      setPhone(activeMess.phone || "");
      setImageUrl(activeMess.imageUrl || "");
      setSeatingCapacity(activeMess.seatingCapacity ?? 40);
      setIsOpen(activeMess.isOpen ?? true);

      // Sync verification states
      setVerifyStreet(activeMess.address?.street || activeMess.locality || "");
      setVerifyCity(activeMess.address?.city || activeMess.city || "Pune");
      setVerifyPincode(activeMess.address?.pincode || "411038");
      setVerifyLat(activeMess.address?.latitude || 18.5204);
      setVerifyLng(activeMess.address?.longitude || 73.8567);
      setVerifyFssai(activeMess.complianceDocs?.fssaiNumber || "");
      setVerifyFssaiCertUrl(activeMess.complianceDocs?.fssaiCertificateUrl || "");
      setVerifyFssaiExpiry(activeMess.complianceDocs?.fssaiExpiryDate || "2028-12-31");
      setVerifyOwnerIdType(activeMess.complianceDocs?.ownerIdType || "Aadhaar Card");
      setVerifyOwnerIdNum(activeMess.complianceDocs?.ownerIdNumber || "");
      setVerifyOwnerIdUrl(activeMess.complianceDocs?.ownerIdDocumentUrl || "");
      setVerifyElectricityNum(activeMess.complianceDocs?.electricityConsumerNumber || "");
      setVerifyElectricityUrl(activeMess.complianceDocs?.establishmentProofUrl || "");
      setVerifyAccHolder(activeMess.bankDetails?.accountHolderName || "");
      setVerifyAccNum(activeMess.bankDetails?.accountNumber || "");
      setVerifyIfsc(activeMess.bankDetails?.ifscCode || "");
      setVerifyBankName(activeMess.bankDetails?.bankName || "");
      setVerifyUpi(activeMess.bankDetails?.upiId || "");

      // Sync SuperAdmin permissions editor
      setPermOwnerEmail(activeMess.ownerEmail || "");
      setPermManagerEmails(
        Array.isArray(activeMess.allowedManagerEmails)
          ? activeMess.allowedManagerEmails.join(", ")
          : ""
      );
    }, 0);
    return () => clearTimeout(timer);
  }, [activeMess]);

  // Fetch orders queue for current mess outlet
  useEffect(() => {
    if (!activeMessId) return;
    let ignore = false;

    async function fetchOrders() {
      try {
        setLoadingOrders(true);
        const res = await fetch(`${API_BASE_URL}/api/orders/mess/${activeMessId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!ignore && data.success) {
          setOrders(data.data || []);
        }
      } catch (err) {
        if (!ignore) {
          console.warn("Could not fetch orders queue:", err.message);
        }
      } finally {
        if (!ignore) {
          setLoadingOrders(false);
        }
      }
    }

    fetchOrders();

    return () => {
      ignore = true;
    };
  }, [activeMessId, ordersReloadKey]);

  // Fetch staff personnel for the active mess outlet
  useEffect(() => {
    if (!activeMessId) return;
    let ignore = false;

    async function fetchStaff() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/staff/mess/${activeMessId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!ignore && data.success && data.data) {
          setMessStaff(data.data);
          const counterStaff = data.data.find((s) => s.role === "counter_operator") || data.data[0];
          if (counterStaff) {
            setSelectedStaffId(counterStaff._id || counterStaff.id);
          }
        }
      } catch {
        // Non-blocking
      }
    }

    fetchStaff();

    return () => {
      ignore = true;
    };
  }, [activeMessId]);

  const reloadOrders = () => setOrdersReloadKey((k) => k + 1);

  // Handle Update Business Profile
  const handleUpdateMess = async (e) => {
    e.preventDefault();
    if (!activeMessId) return;
    setActionLoading(true);
    setStatusMessage({ text: "", type: "" });

    try {
      const res = await fetch(`${API_BASE_URL}/api/mess/${activeMessId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: messName,
          locality,
          cuisineType,
          phone,
          imageUrl,
          seatingCapacity: Number(seatingCapacity),
          isOpen,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStatusMessage({ text: "Outlet profile updated successfully! 🎉", type: "success" });
        refreshMesses();
      } else {
        setStatusMessage({ text: data.message || "Failed to update profile", type: "error" });
      }
    } catch {
      setStatusMessage({ text: "Network error saving changes.", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle SuperAdmin updating owner permissions on active mess
  const handleUpdatePermissions = async (e) => {
    e.preventDefault();
    if (!activeMessId || !permOwnerEmail.trim()) {
      setStatusMessage({ text: "Please enter a valid Google or email address.", type: "error" });
      return;
    }
    setPermSaving(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/mess/${activeMessId}/grant-access`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": getStoredAdminKey(),
        },
        body: JSON.stringify({
          ownerEmail: permOwnerEmail.trim(),
          allowedManagerEmails: permManagerEmails,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMessage({
          text: `Access granted to ${permOwnerEmail.trim()}! When this user logs in or signs up with this Google or email account, "${activeMess?.name}" will appear directly in their Mess Owner portal. 🎉`,
          type: "success",
        });
        refreshMesses();
      } else {
        setStatusMessage({
          text: data.message || "Failed to update permissions.",
          type: "error",
        });
      }
    } catch {
      setStatusMessage({ text: "Server error updating permissions.", type: "error" });
    } finally {
      setPermSaving(false);
    }
  };

  // Handle Register New Mess Outlet (SuperAdmin or Normal Owner)
  const handleCreateMess = async (e) => {
    e.preventDefault();
    if (!newMessName.trim() || !newLocality.trim()) return;
    setActionLoading(true);

    try {
      const headers = { "Content-Type": "application/json" };
      if (isSuperAdmin) {
        headers["x-admin-key"] = getStoredAdminKey();
      }

      const targetOwnerEmail = isSuperAdmin
        ? (newOwnerEmail.trim() || currentUser?.email || "admin@messta.com")
        : (currentUser?.email || "owner@messta.com");

      const res = await fetch(`${API_BASE_URL}/api/mess`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: newMessName.trim(),
          locality: newLocality.trim(),
          cuisineType: newCuisineType,
          phone: newPhone || "+91 98765 43210",
          seatingCapacity: Number(newCapacity),
          pricePerMeal: Number(newPricePerMeal || 80),
          ownerEmail: targetOwnerEmail,
          ownerId: isSuperAdmin ? "" : (currentUser?.uid || ""),
          allowedManagerEmails: newManagerEmails ? newManagerEmails.split(",").map((s) => s.trim()).filter(Boolean) : [],
          isOpen: true,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowAddMess(false);
        setNewMessName("");
        setNewLocality("");
        setNewPhone("");
        setNewOwnerEmail("");
        setNewManagerEmails("");
        await refreshMesses();
        if (data.data?._id) {
          switchMess(data.data._id);
        }
        setStatusMessage({
          text: isSuperAdmin
            ? newOwnerEmail.trim()
              ? `New mess "${data.data?.name}" created and access granted to ${newOwnerEmail.trim()}! 🚀`
              : `New mess "${data.data?.name}" created successfully! You can switch to it now, or edit permissions in Outlet Settings below to grant access to any Google or email ID. 🚀`
            : `Mess "${data.data?.name}" registered successfully under your account! 🚀`,
          type: "success",
        });
      } else {
        setStatusMessage({ text: data.message || "Failed to register outlet.", type: "error" });
      }
    } catch {
      setStatusMessage({ text: "Server error registering outlet.", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Delete Mess / Branch Outlet
  const handleDeleteMess = async () => {
    if (!activeMessId || !activeMess) return;
    setDeletingMess(true);

    try {
      const deletedName = activeMess.name;
      await deleteMess(activeMessId);
      setShowDeleteModal(false);
      setStatusMessage({
        text: `Branch "${deletedName}" has been successfully deleted.`,
        type: "success",
      });
    } catch (err) {
      setStatusMessage({
        text: err.message || "Failed to delete branch outlet.",
        type: "error",
      });
    } finally {
      setDeletingMess(false);
    }
  };

  // Web Audio acoustic scanner feedback for counter staff
  const playScannerBeep = (isSuccess) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      if (isSuccess) {
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      } else {
        osc.frequency.setValueAtTime(260, ctx.currentTime);
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.22);
      }
    } catch {
      // AudioContext muted/blocked, proceed silently
    }
  };

  // Unified Scanner Engine: verifies dynamic QR payloads (Membership / Per-Plate) or manual codes
  const processScannedPayload = async (rawPayload) => {
    if (!rawPayload) return;
    setScanLoading(true);
    setScanError("");
    setScanSuccess("");

    try {
      const activeOp = messStaff.find((s) => (s._id || s.id) === selectedStaffId);
      const res = await fetch(`${API_BASE_URL}/api/orders/scan-qr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qrPayload: rawPayload,
          autoRedeem: autoRedeemRushRef.current,
          staffId: activeOp?._id || activeOp?.id || null,
          staffName: activeOp?.name || "Counter Desk",
          shift: activeOp?.shiftTiming || activeOp?.shift || "General Shift",
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        playScannerBeep(true);
        if (data.redeemed) {
          setScanSuccess(data.message || "Meal marked as served! 🍽️");
          setScannedResult(null);
          setTokenInput("");
          reloadOrders();
        } else {
          setScannedResult(data);
          setScanSuccess("");
        }
      } else {
        playScannerBeep(false);
        setScanError(data.message || "Token verification failed. Code not found or already redeemed.");
        setScannedResult(null);
      }
    } catch {
      playScannerBeep(false);
      setScanError("Network error connecting to counter verification system.");
    } finally {
      setScanLoading(false);
    }
  };

  const processScannedPayloadRef = useRef(processScannedPayload);
  useEffect(() => {
    processScannedPayloadRef.current = processScannedPayload;
  });

  // Live Camera Scanner Lifecycle with html5-qrcode
  useEffect(() => {
    let isMounted = true;
    if (!isCameraActive) return;

    const scannerElementId = "messta-qr-reader";
    const qrScanner = new Html5Qrcode(scannerElementId);
    html5QrScannerRef.current = qrScanner;

    const qrConfig = {
      fps: 10,
      qrbox: { width: 220, height: 220 },
      aspectRatio: 1.0,
    };

    qrScanner
      .start(
        { facingMode: "environment" },
        qrConfig,
        (decodedText) => {
          // Debounce multi-scanning of identical QR within 2.5 seconds
          const now = Date.now();
          if (
            lastProcessedScanRef.current.text === decodedText &&
            now - lastProcessedScanRef.current.time < 2500
          ) {
            return;
          }
          lastProcessedScanRef.current = { text: decodedText, time: now };
          processScannedPayloadRef.current?.(decodedText);
        },
        () => {
          // Frame without QR - regular occurrence, ignore
        }
      )
      .catch((err) => {
        if (isMounted) {
          console.warn("Camera scanner initialization failed:", err);
          setCameraError("Camera access denied or unavailable. You can enter token manually.");
          setIsCameraActive(false);
        }
      });

    return () => {
      isMounted = false;
      if (html5QrScannerRef.current) {
        html5QrScannerRef.current
          .stop()
          .then(() => {
            html5QrScannerRef.current?.clear();
            html5QrScannerRef.current = null;
          })
          .catch(() => {
            html5QrScannerRef.current = null;
          });
      }
    };
  }, [isCameraActive]);

  // Handle Counter Token Verification (Dual algorithm: checks orders + student membership slots)
  const handleVerifyToken = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (!tokenInput.trim()) return;
    await processScannedPayload(tokenInput.trim());
  };

  // Handle Counter "Mark as Served" / Redeem Action
  const handleRedeemToken = async (tokenCode) => {
    if (!tokenCode) return;
    setScanLoading(true);
    setScanError("");
    setScanSuccess("");

    try {
      const activeOp = messStaff.find((s) => (s._id || s.id) === selectedStaffId);
      const res = await fetch(`${API_BASE_URL}/api/orders/token/${tokenCode}/redeem`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: activeOp?._id || activeOp?.id || null,
          staffName: activeOp?.name || "Counter Desk",
          shift: activeOp?.shiftTiming || activeOp?.shift || "General Shift",
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        playScannerBeep(true);
        setScanSuccess(`Meal marked as served! ${data.message || ""}`);
        setScannedResult(null);
        setTokenInput("");
        reloadOrders();
      } else {
        playScannerBeep(false);
        setScanError(data.message || "Failed to mark meal as served.");
      }
    } catch {
      playScannerBeep(false);
      setScanError("Server error redeeming token.");
    } finally {
      setScanLoading(false);
    }
  };

  // Handle Mess Verification & Compliance Submission
  const handleSaveVerification = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (!activeMessId) return;

    if (!verifyFssai || verifyFssai.trim().length < 14) {
      alert("Please provide a valid 14-digit FSSAI Food Safety License Number.");
      return;
    }

    try {
      setSubmittingVerification(true);
      const res = await fetch(`${API_BASE_URL}/api/mess/${activeMessId}/verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: {
            street: verifyStreet || locality,
            city: verifyCity,
            pincode: verifyPincode,
            latitude: Number(verifyLat),
            longitude: Number(verifyLng),
          },
          complianceDocs: {
            fssaiNumber: verifyFssai.trim(),
            fssaiCertificateUrl: verifyFssaiCertUrl || "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=800",
            fssaiExpiryDate: verifyFssaiExpiry,
            ownerIdType: verifyOwnerIdType,
            ownerIdNumber: verifyOwnerIdNum || "AADH-9812-4821",
            ownerIdDocumentUrl: verifyOwnerIdUrl || "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=800",
            establishmentProofType: "Commercial Electricity Bill",
            establishmentProofUrl: verifyElectricityUrl || "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=800",
            electricityConsumerNumber: verifyElectricityNum || "MSEB-PUN-091283",
          },
          bankDetails: {
            accountHolderName: verifyAccHolder || messName,
            accountNumber: verifyAccNum || "50200089218291",
            ifscCode: verifyIfsc || "HDFC0001029",
            bankName: verifyBankName || "HDFC Bank",
            upiId: verifyUpi || "annapurna.mess@hdfcbank",
          },
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setShowVerifyModal(false);
        setStatusMessage({
          text: "Verification documents submitted successfully! Status updated to 'Pending Review'.",
          type: "success",
        });
        refreshMesses();
      } else {
        alert(data.message || "Failed to submit verification.");
      }
    } catch (err) {
      console.error("Error submitting verification:", err);
      alert(err.message);
    } finally {
      setSubmittingVerification(false);
    }
  };

  const handleFillDemoVerification = () => {
    setVerifyStreet(locality || "FC Road, Near Ferguson College");
    setVerifyCity("Pune");
    setVerifyPincode("411004");
    setVerifyLat(18.5204);
    setVerifyLng(73.8567);
    setVerifyFssai("21424010000892");
    setVerifyFssaiCertUrl("https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600");
    setVerifyFssaiExpiry("2028-11-20");
    setVerifyOwnerIdType("Aadhaar Card");
    setVerifyOwnerIdNum("XXXX-XXXX-9821");
    setVerifyOwnerIdUrl("https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600");
    setVerifyElectricityNum("MSEB-PUN-091283");
    setVerifyElectricityUrl("https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600");
    setVerifyAccHolder(messName || "Annapurna Dining Proprietor");
    setVerifyAccNum("50200089218291");
    setVerifyIfsc("HDFC0001029");
    setVerifyBankName("HDFC Bank FC Road Branch");
    setVerifyUpi("annapurna.mess@hdfcbank");
  };

  return (
    <div className="min-h-screen bg-gray-50/70 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      
      {/* ── TOP OUTLET HEADER ── */}
      <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="text-xs font-medium text-stone-500">
              Active Branch &bull; <strong className="text-stone-900 font-semibold">{activeMess?.name || "Active Mess"}</strong>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
            Live Counter & Operations
          </h1>
          <p className="text-xs text-stone-500">
            Verify student meal QR tokens, manage daily bookings, and update outlet profile.
          </p>
        </div>

        {/* Outlet Switcher & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {isSuperAdmin && (
            <span className="text-xs font-medium text-purple-800 bg-purple-50 border border-purple-200 px-2.5 py-1.5 rounded-lg">
              All Outlets ({allMesses.length})
            </span>
          )}

          <div className="relative">
            <select
              value={activeMessId}
              onChange={(e) => switchMess(e.target.value)}
              disabled={loadingMesses || allMesses.length === 0}
              aria-label="Active Mess Outlet"
              className="appearance-none bg-stone-50 border border-stone-300 hover:border-stone-400 text-stone-900 text-xs font-medium py-2 pl-3.5 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition cursor-pointer"
            >
              {allMesses.length === 0 ? (
                <option value="">No Outlets Found</option>
              ) : (
                allMesses.map((m) => (
                  <option key={m._id || m.id} value={m._id || m.id}>
                    {m.name} ({m.locality}) {m.isOpen ? "— Open" : "— Paused"}
                  </option>
                ))
              )}
            </select>
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400 text-xs">
              ▾
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowAddMess(!showAddMess)}
            className="px-3.5 py-2 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white text-xs font-medium rounded-lg shadow-sm transition flex items-center gap-1.5"
            title="Register a new mess branch"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Mess</span>
          </button>

          {activeMess && isSuperAdmin && (
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              disabled={loadingMesses || actionLoading || deletingMess}
              className="px-3 py-2 bg-white hover:bg-rose-50 text-stone-600 hover:text-rose-600 border border-stone-200 hover:border-rose-200 text-xs font-medium rounded-lg transition flex items-center gap-1"
              title={`Delete branch ${activeMess.name}`}
            >
              <svg className="w-3.5 h-3.5 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Delete</span>
            </button>
          )}
        </div>
      </div>

      {/* Status Feedback Banner */}
      {statusMessage.text && (
        <div
          className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between ${
            statusMessage.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          <span>{statusMessage.text}</span>
          <button
            type="button"
            onClick={() => setStatusMessage({ text: "", type: "" })}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── ZERO STATE: NO OUTLET REGISTERED / ASSIGNED YET ── */}
      {!loadingMesses && allMesses.length === 0 && (
        <div className="bg-white rounded-2xl p-8 sm:p-10 text-center border border-stone-200 shadow-xs max-w-lg mx-auto space-y-5 animate-in fade-in duration-200">
          <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto border border-orange-100">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-stone-900 tracking-tight">
              Welcome to Partner Portal
            </h2>
            <p className="text-xs text-stone-500">
              Signed in as <strong className="text-stone-700">{currentUser?.email}</strong>
            </p>
          </div>

          <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 text-xs text-stone-700 text-left space-y-2">
            <div className="flex items-center gap-2 font-semibold text-stone-900">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>No Active Mess Outlets Found</span>
            </div>
            <p className="text-stone-600 leading-relaxed">
              You can get started in two ways:
            </p>
            <div className="space-y-1 pl-1 text-[11px] text-stone-600">
              <p>
                <strong>1. Self-Registration:</strong> Click &ldquo;Register Mess Outlet&rdquo; below to set up your canteen and start publishing daily meals.
              </p>
              <p>
                <strong>2. SuperAdmin Linking:</strong> If an administrator has pre-created your mess with your email, it will connect automatically.
              </p>
            </div>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setShowAddMess(true)}
              className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white font-medium text-xs rounded-lg transition shadow-xs flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Register Mess Outlet</span>
            </button>
            <button
              type="button"
              onClick={refreshMesses}
              className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium text-xs rounded-lg transition"
            >
              Refresh Outlets
            </button>
          </div>
        </div>
      )}

      {/* ── DYNAMIC VERIFICATION & COMPLIANCE BANNER ── */}
      {activeMess && (
        <>
          {(activeMess.verificationStatus === "verified" || activeMess.isVerified) ? (
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-emerald-950 text-sm">
                      FSSAI Verified Establishment
                    </span>
                    <span className="bg-emerald-200/80 text-emerald-900 font-medium text-[10px] px-2 py-0.5 rounded-md">
                      Live on Student App
                    </span>
                  </div>
                  <p className="text-emerald-800 text-[11px] mt-0.5">
                    FSSAI License #{activeMess.complianceDocs?.fssaiNumber || "21424010000892"} • Publicly listed and verified for student dining.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setShowVerifyModal(true)}
                  className="px-3.5 py-1.5 bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-50 rounded-lg font-medium text-xs transition"
                >
                  View Credentials
                </button>
              </div>
            </div>
          ) : activeMess.verificationStatus === "pending_review" ? (
            <div className="bg-sky-50/70 border border-sky-200 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sky-950 text-sm">
                      Compliance Under Review
                    </span>
                    <span className="bg-sky-200/70 text-sky-900 font-medium text-[10px] px-2 py-0.5 rounded-md">
                      In Queue
                    </span>
                  </div>
                  <p className="text-sky-800 text-[11px] mt-0.5">
                    Our compliance team is reviewing your FSSAI certificate, establishment proof, and bank credentials.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setShowVerifyModal(true)}
                  className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-medium text-xs transition"
                >
                  Review Submission
                </button>
              </div>
            </div>
          ) : activeMess.verificationStatus === "rejected" ? (
            <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-rose-950 text-sm">
                      Verification Needs Attention
                    </span>
                    <span className="bg-rose-200/80 text-rose-900 font-medium text-[10px] px-2 py-0.5 rounded-md">
                      Action Required
                    </span>
                  </div>
                  <p className="text-rose-800 text-[11px] mt-0.5">
                    Feedback: <span className="font-medium underline">{activeMess.rejectionReason || "Uploaded documents need review."}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setShowVerifyModal(true)}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium text-xs transition"
                >
                  Fix & Resubmit
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-amber-950 text-sm">
                      Mess Not Yet Verified
                    </span>
                    <span className="bg-amber-200/80 text-amber-900 font-medium text-[10px] px-2 py-0.5 rounded-md">
                      Sandbox Mode
                    </span>
                  </div>
                  <p className="text-amber-800 text-[11px] mt-0.5">
                    Submit your 14-digit FSSAI food safety license and bank payout credentials to publish your mess for students.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setShowVerifyModal(true)}
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg font-medium text-xs transition"
                >
                  Verify Outlet
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── COLLAPSIBLE: REGISTER NEW MESS (NORMAL OWNER OR SUPERADMIN) ── */}
      {showAddMess && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-5 animate-in fade-in duration-200">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-stone-500 uppercase tracking-wide">
                {isSuperAdmin ? "Administrator Action" : "New Branch"}
              </span>
              <h2 className="text-lg font-bold text-stone-900 tracking-tight">
                {isSuperAdmin ? "Add Mess Branch" : "Register Mess Branch"}
              </h2>
              <p className="text-xs text-stone-500 max-w-2xl">
                {isSuperAdmin
                  ? "Create a new mess branch (e.g. Annapurna, Mom's Kitchen). You can manage its menu and finances immediately, or link it to any owner's email."
                  : `Launch a new mess branch under your account (${currentUser?.email || "you"}). You can immediately publish menus and time slots.`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddMess(false)}
              className="text-stone-400 hover:text-stone-600 p-1.5 rounded-lg hover:bg-stone-100 transition"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleCreateMess} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 pt-2">
            <div className="lg:col-span-2">
              <label className="block text-xs font-medium text-stone-700 mb-1.5">Mess / Branch Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Annapurna Dining Hall"
                value={newMessName}
                onChange={(e) => setNewMessName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
              />
            </div>

            <div className="lg:col-span-2">
              <label className="block text-xs font-medium text-stone-700 mb-1.5">Locality / Campus Area *</label>
              <input
                type="text"
                required
                placeholder="e.g. FC Road / Kothrud, Pune"
                value={newLocality}
                onChange={(e) => setNewLocality(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1.5">Cuisine Type</label>
              <select
                value={newCuisineType}
                onChange={(e) => setNewCuisineType(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
              >
                <option value="North Indian">North Indian</option>
                <option value="South Indian">South Indian</option>
                <option value="Maharashtrian">Maharashtrian</option>
                <option value="Gujarati">Gujarati</option>
                <option value="Multi-Cuisine">Multi-Cuisine</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1.5">Phone Number</label>
              <input
                type="text"
                placeholder="+91 98765 43210"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1.5">Seating Capacity</label>
              <input
                type="number"
                min="5"
                max="500"
                value={newCapacity}
                onChange={(e) => setNewCapacity(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1.5">Base Price / Meal (₹)</label>
              <input
                type="number"
                min="30"
                max="500"
                value={newPricePerMeal}
                onChange={(e) => setNewPricePerMeal(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
              />
            </div>

            {/* Optional Owner Email assignment */}
            {isSuperAdmin ? (
              <>
                <div className="lg:col-span-3">
                  <label className="block text-xs font-medium text-stone-700 mb-1.5 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                    <span>Assign Owner Google / Email ID (Optional)</span>
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. messowner@gmail.com"
                    value={newOwnerEmail}
                    onChange={(e) => setNewOwnerEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
                  />
                  <p className="text-[11px] text-stone-500 mt-1">
                    Optional. You can also grant or update access at any time in Mess Profile Settings.
                  </p>
                </div>

                <div className="lg:col-span-3">
                  <label className="block text-xs font-medium text-stone-700 mb-1.5">
                    Additional Manager Emails (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="manager1@gmail.com, staff@gmail.com"
                    value={newManagerEmails}
                    onChange={(e) => setNewManagerEmails(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
                  />
                  <p className="text-[11px] text-stone-500 mt-1">
                    Comma-separated secondary emails allowed to manage this outlet.
                  </p>
                </div>
              </>
            ) : (
              <div className="lg:col-span-6 bg-stone-50 border border-stone-200 rounded-lg p-3 flex items-center gap-2 text-xs text-stone-600">
                <svg className="w-4 h-4 text-stone-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>
                  This outlet will be registered under your verified account: <strong className="font-medium text-stone-800">{currentUser?.email}</strong>.
                </span>
              </div>
            )}

            <div className="lg:col-span-6 flex items-center justify-end pt-2">
              <button
                type="submit"
                disabled={actionLoading}
                className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white font-medium text-xs rounded-lg transition shadow-xs disabled:opacity-50 flex items-center gap-1.5"
              >
                <span>
                  {actionLoading
                    ? "Registering..."
                    : isSuperAdmin
                    ? "Add Mess Branch"
                    : "Register Mess Branch"}
                </span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── ADVANCE KITCHEN HEADCOUNT BANNER ── */}
      <div className="bg-stone-900 rounded-2xl p-5 sm:p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 border border-stone-800">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-stone-300">
                Advance Orders &bull; Tomorrow
              </span>
              <span className="text-[11px] font-medium text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/60">
                Orders lock at 10:00 PM
              </span>
            </div>
            <h3 className="text-base font-semibold text-white">
              Tomorrow's Kitchen Headcount & Prep
            </h3>
            <p className="text-xs text-stone-400 max-w-xl">
              Confirmed meal count booked in advance by students. Use this to prepare rations and avoid food wastage.
            </p>
          </div>
        </div>
        <Link
          to="/owner/meals"
          className="px-4 py-2 bg-white hover:bg-stone-100 text-stone-900 font-medium text-xs rounded-lg transition shrink-0 self-start md:self-auto flex items-center gap-1.5 shadow-sm"
        >
          <span>View Prep Sheet</span>
          <span>&rarr;</span>
        </Link>
      </div>

      {/* ── CORE GRID: COUNTER SCANNER & PROFILE COMMAND ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: COUNTER TOKEN & QR SCANNER */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-xs font-medium text-orange-700 bg-orange-50 px-2.5 py-0.5 rounded-md">
                  Counter Terminal
                </span>
                <h2 className="text-lg font-bold text-stone-900 mt-1">
                  Meal Token & QR Scanner
                </h2>
                <p className="text-xs text-stone-500">
                  Scan student QR code or enter meal token manually.
                </p>
              </div>

              {/* Rush Mode Switch */}
              <label className="flex items-center gap-2 cursor-pointer bg-stone-50 hover:bg-stone-100 px-2.5 py-1.5 rounded-lg border border-stone-200 transition select-none shrink-0">
                <input
                  type="checkbox"
                  checked={autoRedeemRush}
                  onChange={(e) => setAutoRedeemRush(e.target.checked)}
                  className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500 cursor-pointer"
                />
                <div className="text-right">
                  <span className="text-xs font-semibold text-stone-900 block leading-tight">
                    Rush Mode
                  </span>
                  <span className="text-[10px] text-stone-500 block">
                    {autoRedeemRush ? "Auto-serve on" : "Manual click"}
                  </span>
                </div>
              </label>
            </div>

            {/* Active Counter Status Bar */}
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-orange-600 text-white font-medium flex items-center justify-center shrink-0 text-xs">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-medium text-stone-400 block">
                    Station:
                  </span>
                  <span className="font-semibold text-stone-900 text-xs">
                    Counter Desk &bull; Scanner Active
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Live Ready
              </span>
            </div>

            {/* Camera Viewport or Open Camera CTA */}
            {isCameraActive ? (
              <div className="space-y-2 animate-in fade-in duration-200">
                <div className="relative rounded-xl overflow-hidden border-2 border-orange-500 bg-black shadow-sm">
                  <div id="messta-qr-reader" className="w-full overflow-hidden" />
                  <button
                    type="button"
                    onClick={() => setIsCameraActive(false)}
                    className="absolute top-2.5 right-2.5 z-20 px-3 py-1 bg-black/75 hover:bg-black text-white text-xs font-medium rounded-lg backdrop-blur-xs transition"
                  >
                    &times; Close Camera
                  </button>
                </div>
                <p className="text-[11px] text-stone-500 text-center font-normal">
                  Point camera at student&rsquo;s QR code. Scans automatically.
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setCameraError("");
                  setIsCameraActive(true);
                }}
                className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white font-medium text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Open Camera Scanner</span>
              </button>
            )}

            {/* Camera Error Message */}
            {cameraError && (
              <div className="p-3 bg-amber-50 text-amber-800 text-xs rounded-xl border border-amber-200">
                {cameraError}
              </div>
            )}

            {/* Verification Form (Barcode Gun / Manual Token Code Fallback) */}
            <form onSubmit={handleVerifyToken} className="space-y-1.5">
              <span className="text-xs font-medium text-stone-500 block">
                Or enter token manually:
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="MESSTA-7A8B"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
                  className="flex-1 px-3 py-2 text-xs font-mono font-medium tracking-wide uppercase bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:bg-white transition"
                />
                <button
                  type="submit"
                  disabled={scanLoading}
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white font-medium text-xs rounded-lg transition disabled:opacity-50"
                >
                  {scanLoading ? "Verifying..." : "Verify"}
                </button>
              </div>
            </form>

            {/* Scanner Feedback Messages */}
            {scanError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-2xl border border-red-200 flex items-center gap-2">
                <span>⚠️</span>
                <span>{scanError}</span>
              </div>
            )}
            {scanSuccess && (
              <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-2xl border border-emerald-200 flex items-center gap-2 animate-in fade-in duration-200">
                <span>✅</span>
                <span>{scanSuccess}</span>
              </div>
            )}

            {/* Scanned Verification Result Card */}
            {scannedResult?.data && (
              <div className="p-5 bg-gradient-to-br from-orange-50/70 to-amber-50/40 border border-orange-200/80 rounded-2xl space-y-4 animate-in fade-in duration-200">
                
                {/* Header Badge: Membership vs Per-Plate */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-bold text-stone-900">
                      {scannedResult.data.token}
                    </span>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-stone-100 border border-stone-200 text-stone-700">
                      {scannedResult.tokenType === "membership" || scannedResult.type === "subscription"
                        ? "Membership Pass"
                        : "Meal Ticket"}
                    </span>
                  </div>

                  <span
                    className={`text-[10px] font-medium px-2.5 py-0.5 rounded-full border ${
                      scannedResult.data.tokenStatus === "active" ||
                      scannedResult.data.tokenStatus === "pending" ||
                      scannedResult.data.tokenStatus === "paid"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-stone-100 text-stone-600 border-stone-200"
                    }`}
                  >
                    {scannedResult.data.tokenStatus}
                  </span>
                </div>

                {/* Customer & Booking Details */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-stone-400 uppercase font-medium block">Customer</span>
                    <span className="font-semibold text-stone-900">{scannedResult.data.customerName}</span>
                    <span className="text-[10px] text-stone-500 block truncate">{scannedResult.data.customerEmail}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 uppercase font-medium block">Meal Slot / Date</span>
                    <span className="font-semibold text-stone-900 uppercase">{scannedResult.data.mealType}</span>
                    <span className="text-[10px] text-stone-500 block">{scannedResult.data.bookingDate}</span>
                  </div>
                </div>

                {/* Specifics for Membership Pass */}
                {(scannedResult.tokenType === "membership" || scannedResult.type === "subscription") && (
                  <div className="p-3 bg-white rounded-lg border border-stone-200 text-xs flex justify-between items-center">
                    <div>
                      <span className="font-medium text-stone-800 block">{scannedResult.data.planName}</span>
                      <span className="text-[10px] text-stone-500 uppercase">
                        {scannedResult.data.category} • {scannedResult.data.frequency}
                      </span>
                    </div>
                    <span className="px-2.5 py-1 bg-stone-100 text-stone-800 font-medium rounded-md text-xs">
                      {scannedResult.data.remainingTokens} Tokens Left
                    </span>
                  </div>
                )}

                {/* Specifics for Per-Plate Meal Booking */}
                {(scannedResult.tokenType === "per_plate" || scannedResult.type === "order") && (
                  <div className="p-3 bg-white rounded-lg border border-stone-200 text-xs flex justify-between items-center">
                    <div>
                      <span className="font-medium text-stone-800 block">Single-Meal Booking</span>
                      <span className="text-[10px] text-emerald-700 font-medium">
                        Payment: {scannedResult.data.paymentStatus || "Paid"}
                      </span>
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-medium rounded-md text-xs border border-emerald-200">
                      ₹{scannedResult.data.amount || 0}
                    </span>
                  </div>
                )}

                {/* Mark as Served Action */}
                <button
                  type="button"
                  disabled={
                    scanLoading ||
                    scannedResult.data.tokenStatus === "served" ||
                    scannedResult.data.tokenStatus === "redeemed"
                  }
                  onClick={() => handleRedeemToken(scannedResult.data.token)}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-200 disabled:text-stone-400 text-white font-medium text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>
                    {scannedResult.data.tokenStatus === "served" || scannedResult.data.tokenStatus === "redeemed"
                      ? "Meal Already Served"
                      : scannedResult.tokenType === "membership" || scannedResult.type === "subscription"
                      ? "Deduct 1 Token & Mark Served"
                      : "Mark Ticket as Redeemed"}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Live Orders & Meal Queue */}
          <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-stone-900 tracking-tight">
                  Live Queue
                </h3>
                <p className="text-xs text-stone-500">Active reservations for {activeMess?.name || "this mess"}.</p>
              </div>
              <span className="text-xs font-medium bg-stone-100 text-stone-700 px-2.5 py-0.5 rounded-full">
                {orders.length} waiting
              </span>
            </div>

            <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
              {loadingOrders ? (
                <p className="text-xs text-stone-400 text-center py-8">Loading queue...</p>
              ) : orders.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <div className="w-10 h-10 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <p className="text-xs text-stone-400">No active bookings in queue today.</p>
                </div>
              ) : (
                orders.map((ord) => (
                  <div
                    key={ord._id}
                    className="p-3 bg-stone-50 hover:bg-stone-100/80 rounded-xl border border-stone-200/70 flex items-center justify-between text-xs transition"
                  >
                    <div>
                      <span className="font-mono font-semibold text-stone-900 block">{ord.token}</span>
                      <span className="text-[11px] text-stone-500">
                        {ord.userName} • <span className="font-medium text-stone-700">{ord.mealType}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${
                          ord.tokenStatus === "redeemed"
                            ? "bg-stone-200 text-stone-700"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}
                      >
                        {ord.tokenStatus}
                      </span>
                      {ord.tokenStatus === "active" && (
                        <button
                          type="button"
                          onClick={() => handleRedeemToken(ord.token)}
                          className="px-3 py-1 bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium rounded-lg transition"
                        >
                          Serve
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: BUSINESS PROFILE & OUTLET CONTROLS */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-stone-200 shadow-xs space-y-6">
            <div className="flex justify-between items-start border-b border-stone-100 pb-4">
              <div>
                <span className="text-[11px] font-medium text-stone-500 uppercase tracking-wide">
                  Outlet Settings
                </span>
                <h2 className="text-xl font-bold text-stone-900 mt-0.5 tracking-tight">
                  Mess Business Profile
                </h2>
                <p className="text-xs text-stone-500">
                  Update listing details, seating capacity, and student visibility.
                </p>
              </div>

              <span
                className={`text-[10px] uppercase font-medium px-2.5 py-1 rounded-full border ${
                  isOpen
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-stone-100 text-stone-600 border-stone-200"
                }`}
              >
                {isOpen ? "Open for Dining" : "Paused / Closed"}
              </span>
            </div>

            <form onSubmit={handleUpdateMess} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1.5">
                    Mess / Canteen Name
                  </label>
                  <input
                    type="text"
                    required
                    value={messName}
                    onChange={(e) => setMessName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1.5">
                    Locality / Campus Area
                  </label>
                  <input
                    type="text"
                    required
                    value={locality}
                    onChange={(e) => setLocality(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1.5">
                    Primary Cuisine Type
                  </label>
                  <select
                    value={cuisineType}
                    onChange={(e) => setCuisineType(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
                  >
                    <option value="North Indian">North Indian</option>
                    <option value="South Indian">South Indian</option>
                    <option value="Maharashtrian">Maharashtrian</option>
                    <option value="Gujarati">Gujarati</option>
                    <option value="Multi-Cuisine">Multi-Cuisine</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1.5">
                    Contact Phone Number
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1.5">
                    Seating Capacity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={seatingCapacity}
                    onChange={(e) => setSeatingCapacity(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1.5">
                    Photo URL (Cover Image)
                  </label>
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
                  />
                </div>
              </div>

              {/* Status Toggle */}
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-2">
                  Operating Status
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                    <input
                      type="radio"
                      name="isOpenStatus"
                      checked={isOpen === true}
                      onChange={() => setIsOpen(true)}
                      className="text-orange-600 focus:ring-orange-500"
                    />
                    <span className="text-stone-800">Open for Bookings</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                    <input
                      type="radio"
                      name="isOpenStatus"
                      checked={isOpen === false}
                      onChange={() => setIsOpen(false)}
                      className="text-orange-600 focus:ring-orange-500"
                    />
                    <span className="text-stone-500">Paused (Temporarily Closed)</span>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-medium text-xs rounded-lg transition shadow-xs disabled:opacity-50"
              >
                {actionLoading ? "Saving Changes..." : "Save Changes"}
              </button>

              {/* ── ACCESS & PERMISSIONS SECTION ── */}
              {activeMess && (
                <div className="pt-5 border-t border-stone-100 space-y-4">
                  {isSuperAdmin ? (
                    <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 sm:p-5 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">
                            SuperAdmin Access Control
                          </span>
                          <h4 className="text-sm font-bold text-stone-900">
                            Assign Outlet to Google or Email Account
                          </h4>
                        </div>
                        <span
                          className={`text-[10px] font-medium px-2.5 py-0.5 rounded-full border self-start sm:self-auto ${
                            activeMess.isClaimed
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {activeMess.isClaimed
                            ? `Linked (${activeMess.ownerId ? "Account Active" : "Claimed"})`
                            : "Pre-Created (Waiting for Owner Signup)"}
                        </span>
                      </div>

                      <p className="text-xs text-stone-600 leading-relaxed">
                        Specify any mess owner&rsquo;s Google account or email. When they sign in or register with that email, <strong>&ldquo;{activeMess.name}&rdquo;</strong> will connect automatically to their portal with full operational access.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="block text-xs font-medium text-stone-700 mb-1">
                            Mess Owner Email / Google ID *
                          </label>
                          <input
                            type="email"
                            required
                            value={permOwnerEmail}
                            onChange={(e) => setPermOwnerEmail(e.target.value)}
                            placeholder="e.g. momskitchen@gmail.com"
                            className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-stone-700 mb-1">
                            Additional Manager Emails (Optional)
                          </label>
                          <input
                            type="text"
                            value={permManagerEmails}
                            onChange={(e) => setPermManagerEmails(e.target.value)}
                            placeholder="manager1@gmail.com, staff@gmail.com"
                            className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={handleUpdatePermissions}
                          disabled={permSaving}
                          className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white font-medium text-xs rounded-lg transition shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                          </svg>
                          <span>{permSaving ? "Updating Access..." : "Grant Access"}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 text-stone-800 font-semibold">
                        <svg className="w-4 h-4 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <span>Assigned Outlet</span>
                      </div>
                      <p className="text-stone-600">
                        This mess is assigned to <strong className="text-stone-800">{activeMess.ownerEmail}</strong>. Multi-outlet provisioning is managed by the administrator.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Danger Zone: Branch Deletion (SuperAdmin Exclusive) */}
              {isSuperAdmin && activeMess && (
                <div className="pt-5 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-semibold text-rose-700 block">
                      Danger Zone • Delete Outlet
                    </span>
                    <span className="text-[11px] text-stone-500 block">
                      Permanently remove &ldquo;{activeMess.name}&rdquo; and all associated configuration.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(true)}
                    disabled={actionLoading || deletingMess}
                    className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-medium text-xs rounded-lg border border-rose-200 transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Delete Outlet</span>
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>

      </div>

      {/* ── CONFIRMATION MODAL: DELETE OUTLET BRANCH ── */}
      {showDeleteModal && activeMess && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-stone-200 shadow-xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0 border border-rose-100">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-medium uppercase tracking-wider text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md">
                  Confirm Deletion
                </span>
                <h3 className="text-base font-bold text-stone-900 tracking-tight">
                  Delete &ldquo;{activeMess.name}&rdquo;?
                </h3>
                <p className="text-xs text-stone-500 leading-relaxed">
                  Are you sure you want to permanently delete this mess branch in <strong className="text-stone-700">{activeMess.locality}</strong>?
                </p>
              </div>
            </div>

            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-stone-700 text-xs space-y-1 leading-relaxed">
              <div className="font-medium text-stone-900 flex items-center gap-1.5">
                <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>Irreversible action</span>
              </div>
              <p className="text-[11px] text-stone-500">
                Deleting this outlet removes its menus, subscription packages, and counter records permanently.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deletingMess}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium text-xs rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteMess}
                disabled={deletingMess}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs rounded-lg shadow-xs transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {deletingMess ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MESS VERIFICATION & COMPLIANCE MODAL ── */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 border border-stone-200 shadow-xl space-y-6 my-8 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-stone-100 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center flex-shrink-0 border border-orange-100">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-orange-700 bg-orange-50 px-2 py-0.5 rounded-md">
                      Compliance & Onboarding
                    </span>
                    <span className="text-[10px] text-stone-400">
                      Messta Trust & Safety
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-stone-900 tracking-tight mt-0.5">
                    Mess Verification & FSSAI Registration
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Submit regulatory credentials to earn the verified badge and publish your mess to students.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowVerifyModal(false)}
                className="w-8 h-8 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 flex items-center justify-center transition flex-shrink-0"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Quick Demo Fill Pill (Available in local dev only) */}
            {import.meta.env.DEV && (
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 flex items-center justify-between gap-3 text-xs">
                <span className="text-stone-600 font-medium">Auto-populate mock legal and FSSAI details for testing.</span>
                <button
                  type="button"
                  onClick={handleFillDemoVerification}
                  className="px-3 py-1 bg-stone-900 hover:bg-stone-800 text-white font-medium text-xs rounded-lg transition"
                >
                  Auto-Fill Demo
                </button>
              </div>
            )}

            <form onSubmit={handleSaveVerification} className="space-y-6">
              {/* Section 1: Physical Establishment & Geo-Coordinates */}
              <div className="space-y-3 bg-gray-50/80 p-4 sm:p-5 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-sm">📍</span>
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-800">
                    1. Establishment Address & Geo-Pinning
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      Street Address / Landmark
                    </label>
                    <input
                      type="text"
                      value={verifyStreet}
                      onChange={(e) => setVerifyStreet(e.target.value)}
                      placeholder="e.g. 102 Ferguson College Road, Near Deccan Gymkhana"
                      required
                      className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 font-medium text-gray-900 text-xs focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">City</label>
                    <input
                      type="text"
                      value={verifyCity}
                      onChange={(e) => setVerifyCity(e.target.value)}
                      placeholder="Pune"
                      required
                      className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 font-medium text-gray-900 text-xs focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Postal Pincode</label>
                    <input
                      type="text"
                      value={verifyPincode}
                      onChange={(e) => setVerifyPincode(e.target.value)}
                      placeholder="411004"
                      required
                      className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 font-medium text-gray-900 text-xs focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      value={verifyLat}
                      onChange={(e) => setVerifyLat(e.target.value)}
                      placeholder="18.5204"
                      className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 font-medium text-gray-900 text-xs focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      value={verifyLng}
                      onChange={(e) => setVerifyLng(e.target.value)}
                      placeholder="73.8567"
                      className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 font-medium text-gray-900 text-xs focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Food Safety & Legal Compliance */}
              <div className="space-y-3 bg-gray-50/80 p-4 sm:p-5 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-sm">🥗</span>
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-800">
                    2. Food Safety (FSSAI) Compliance
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      14-Digit FSSAI License Number *
                    </label>
                    <input
                      type="text"
                      maxLength={14}
                      value={verifyFssai}
                      onChange={(e) => setVerifyFssai(e.target.value)}
                      placeholder="e.g. 21424010000892"
                      required
                      className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 font-mono font-bold text-gray-900 text-xs focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      FSSAI Expiry Date
                    </label>
                    <input
                      type="date"
                      value={verifyFssaiExpiry}
                      onChange={(e) => setVerifyFssaiExpiry(e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 font-medium text-gray-900 text-xs focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      FSSAI Certificate Photo / Document URL
                    </label>
                    <input
                      type="url"
                      value={verifyFssaiCertUrl}
                      onChange={(e) => setVerifyFssaiCertUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 font-mono text-xs text-gray-700 focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Proprietor Identity & Premise Proof */}
              <div className="space-y-3 bg-gray-50/80 p-4 sm:p-5 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-sm">🪪</span>
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-800">
                    3. Proprietor Identity & Premise Proof
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Owner ID Type</label>
                    <select
                      value={verifyOwnerIdType}
                      onChange={(e) => setVerifyOwnerIdType(e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 font-medium text-gray-900 text-xs focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="Aadhaar Card">Aadhaar Card</option>
                      <option value="PAN Card">PAN Card</option>
                      <option value="Voter ID">Voter ID</option>
                      <option value="Passport">Passport</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">ID Card Number</label>
                    <input
                      type="text"
                      value={verifyOwnerIdNum}
                      onChange={(e) => setVerifyOwnerIdNum(e.target.value)}
                      placeholder="e.g. XXXX-XXXX-9821"
                      className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 font-mono text-gray-900 text-xs focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      Electricity Consumer No. / Municipal Trade License No.
                    </label>
                    <input
                      type="text"
                      value={verifyElectricityNum}
                      onChange={(e) => setVerifyElectricityNum(e.target.value)}
                      placeholder="e.g. MSEB-PUN-091283"
                      className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 font-mono text-gray-900 text-xs focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Banking & Payout Settlement */}
              <div className="space-y-3 bg-gray-50/80 p-4 sm:p-5 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-sm">🏦</span>
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-800">
                    4. Settlement Bank Account Details
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Account Holder Name</label>
                    <input
                      type="text"
                      value={verifyAccHolder}
                      onChange={(e) => setVerifyAccHolder(e.target.value)}
                      placeholder="e.g. Annapurna Mess Proprietor"
                      className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 font-medium text-gray-900 text-xs focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={verifyBankName}
                      onChange={(e) => setVerifyBankName(e.target.value)}
                      placeholder="e.g. HDFC Bank"
                      className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 font-medium text-gray-900 text-xs focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Account Number</label>
                    <input
                      type="text"
                      value={verifyAccNum}
                      onChange={(e) => setVerifyAccNum(e.target.value)}
                      placeholder="50200089218291"
                      className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 font-mono text-gray-900 text-xs focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">IFSC Code</label>
                    <input
                      type="text"
                      value={verifyIfsc}
                      onChange={(e) => setVerifyIfsc(e.target.value)}
                      placeholder="HDFC0001029"
                      className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 font-mono uppercase text-gray-900 text-xs focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">UPI ID for Direct Payouts</label>
                    <input
                      type="text"
                      value={verifyUpi}
                      onChange={(e) => setVerifyUpi(e.target.value)}
                      placeholder="annapurna.mess@okhdfcbank"
                      className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 font-mono text-gray-900 text-xs focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowVerifyModal(false)}
                  disabled={submittingVerification}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium text-xs rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingVerification}
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white font-medium text-xs rounded-lg shadow-xs transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submittingVerification ? "Submitting..." : "Submit for Verification"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
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
      
      {/* ── TOP OUTLET COMMAND BAR (Persistent Multi-Outlet Sync) ── */}
      <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[11px] font-black uppercase tracking-wider text-orange-600">
              Live Partner CRM • {activeMess?.name || "Active Mess"}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Outlet Operations & Counter Desk
          </h1>
          <p className="text-xs text-gray-500">
            Switch branches seamlessly. All token sessions and settings persist via <code className="bg-gray-100 px-1 py-0.5 rounded text-[10px] text-gray-700">messta_activeMessId</code>.
          </p>
        </div>

        {/* Outlet Switcher & Exclusive SuperAdmin Provisioning Action */}
        <div className="flex flex-wrap items-center gap-3">
          {isSuperAdmin ? (
            <span className="text-[10px] font-black uppercase tracking-wider text-purple-800 bg-purple-100 border border-purple-300 px-2.5 py-1 rounded-xl flex items-center gap-1">
              <span>🛡️</span>
              <span>SuperAdmin Studio ({allMesses.length} Outlets)</span>
            </span>
          ) : (
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-xl flex items-center gap-1">
              <span>🏪</span>
              <span>My Assigned Outlet</span>
            </span>
          )}

          <div className="relative">
            <select
              value={activeMessId}
              onChange={(e) => switchMess(e.target.value)}
              disabled={loadingMesses || allMesses.length === 0}
              aria-label="Active Mess Outlet"
              className="appearance-none bg-gray-50 border border-gray-300 hover:border-orange-500 text-gray-900 text-xs font-bold py-2.5 pl-4 pr-10 rounded-xl focus:ring-2 focus:ring-orange-500 transition-all cursor-pointer shadow-2xs"
            >
              {allMesses.length === 0 ? (
                <option value="">No Outlets Found</option>
              ) : (
                allMesses.map((m) => (
                  <option key={m._id || m.id} value={m._id || m.id}>
                    📍 {m.name} ({m.locality}) {m.isOpen ? "• Open" : "• Paused"}
                  </option>
                ))
              )}
            </select>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-xs">
              ▼
            </span>
          </div>

          {/* Add Mess / Provisioning Action (Available to both Normal Owner and SuperAdmin) */}
          {isSuperAdmin ? (
            <button
              type="button"
              onClick={() => setShowAddMess(!showAddMess)}
              className="px-4 py-2.5 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-xs transition-transform active:scale-95 flex items-center gap-1.5 border border-purple-500/30"
              title="Add a new mess outlet to the platform"
            >
              <span>+</span>
              <span>Add Mess</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowAddMess(!showAddMess)}
              className="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs transition-transform active:scale-95 flex items-center gap-1.5"
              title="Add a new mess branch under your account"
            >
              <span>+</span>
              <span>Add Branch</span>
            </button>
          )}

          {activeMess && (
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              disabled={loadingMesses || actionLoading || deletingMess}
              className="px-3.5 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 hover:text-red-800 border border-red-200 font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 shadow-2xs active:scale-95"
              title={`Delete branch ${activeMess.name}`}
            >
              <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Delete Branch</span>
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
        <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-amber-200 shadow-sm max-w-xl mx-auto space-y-5 animate-in fade-in duration-200">
          <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-700 flex items-center justify-center text-3xl mx-auto shadow-2xs">
            🏪
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-black text-gray-900 tracking-tight">
              Welcome to Messta Partner Portal
            </h2>
            <p className="text-xs text-gray-600">
              Operating account: <strong className="text-gray-900">{currentUser?.email}</strong>
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-950 text-left space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-900">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              <span>No Active Mess Outlets Found</span>
            </div>
            <p className="leading-relaxed">
              You can get started in two flexible ways:
            </p>
            <div className="space-y-1.5 pl-2 text-[11px] text-amber-900 font-medium">
              <p>
                <strong>1. Self-Registration (Instant):</strong> Click &ldquo;Register My Mess Outlet&rdquo; below to set up your canteen branch and start publishing daily thalis right now.
              </p>
              <p>
                <strong>2. SuperAdmin Pre-Creation:</strong> If the platform SuperAdmin has pre-provisioned your mess, it will link to your account automatically upon creation.
              </p>
            </div>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setShowAddMess(true)}
              className="px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition shadow-xs flex items-center gap-2 active:scale-95"
            >
              <span>+</span>
              <span>Register My Mess Outlet 🚀</span>
            </button>
            <button
              type="button"
              onClick={refreshMesses}
              className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs uppercase tracking-wider rounded-xl transition active:scale-95"
            >
              🔄 Refresh Outlets
            </button>
          </div>
        </div>
      )}

      {/* ── DYNAMIC VERIFICATION & COMPLIANCE BANNER ── */}
      {activeMess && (
        <>
          {(activeMess.verificationStatus === "verified" || activeMess.isVerified) ? (
            <div className="bg-emerald-50 border border-emerald-200/90 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs shadow-2xs">
              <div className="flex items-center gap-3.5">
                <span className="text-2xl p-2.5 bg-emerald-100 rounded-xl border border-emerald-300 shadow-2xs">
                  🛡️
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-emerald-950 text-sm">
                      FSSAI Verified Partner Establishment
                    </span>
                    <span className="bg-emerald-200 text-emerald-900 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      Live on Student App
                    </span>
                  </div>
                  <p className="text-emerald-800 text-[11px] mt-0.5">
                    FSSAI Reg #{activeMess.complianceDocs?.fssaiNumber || "21424010000892"} • Publicly listed and verified for secure student QR pass bookings.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setShowVerifyModal(true)}
                  className="px-3.5 py-2 bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 rounded-xl font-black text-xs uppercase transition shadow-2xs"
                >
                  View Credentials 📋
                </button>
              </div>
            </div>
          ) : activeMess.verificationStatus === "pending_review" ? (
            <div className="bg-blue-50 border border-blue-200/90 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs shadow-2xs">
              <div className="flex items-center gap-3.5">
                <span className="text-2xl p-2.5 bg-blue-100 rounded-xl border border-blue-300 shadow-2xs">
                  ⏳
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-blue-950 text-sm">
                      Compliance Verification Under Review
                    </span>
                    <span className="bg-blue-200 text-blue-900 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                      In Inspection Queue
                    </span>
                  </div>
                  <p className="text-blue-800 text-[11px] mt-0.5">
                    Our compliance safety officers are verifying your FSSAI certificate, establishment proof, and bank credentials. Turnaround: 2–4 hours.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setShowVerifyModal(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs uppercase shadow-xs transition"
                >
                  Review Submission 📄
                </button>
              </div>
            </div>
          ) : activeMess.verificationStatus === "rejected" ? (
            <div className="bg-red-50 border border-red-200/90 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs shadow-2xs">
              <div className="flex items-center gap-3.5">
                <span className="text-2xl p-2.5 bg-red-100 rounded-xl border border-red-300 shadow-2xs">
                  ❌
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-red-950 text-sm">
                      Verification Needs Attention (Listing Hidden)
                    </span>
                    <span className="bg-red-200 text-red-900 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      Action Required
                    </span>
                  </div>
                  <p className="text-red-800 text-[11px] mt-0.5">
                    Admin Feedback: <span className="font-bold underline">{activeMess.rejectionReason || "Uploaded documents were blurry or unverified."}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setShowVerifyModal(true)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-xs uppercase shadow-xs transition"
                >
                  Fix & Resubmit 🚀
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs shadow-2xs">
              <div className="flex items-center gap-3.5">
                <span className="text-2xl p-2.5 bg-amber-100 rounded-xl border border-amber-300 shadow-2xs">
                  ⚠️
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-amber-950 text-sm">
                      Mess Unverified (Hidden from Students)
                    </span>
                    <span className="bg-amber-200 text-amber-900 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      Sandbox Mode
                    </span>
                  </div>
                  <p className="text-amber-800 text-[11px] mt-0.5">
                    To prevent fraudulent food listings, submit your 14-digit FSSAI food safety license, commercial power bill, and bank payout credentials to publish your mess.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setShowVerifyModal(true)}
                  className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-black text-xs uppercase shadow-xs transition flex items-center gap-1.5 active:scale-95"
                >
                  <span>🛡️</span>
                  <span>Get Verified Now</span>
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── COLLAPSIBLE: REGISTER NEW MESS (NORMAL OWNER OR SUPERADMIN) ── */}
      {showAddMess && (
        <div
          className={`rounded-3xl p-6 sm:p-8 border shadow-md space-y-5 animate-in fade-in slide-in-from-top-4 duration-300 ${
            isSuperAdmin
              ? "bg-gradient-to-br from-purple-50 via-indigo-50 to-purple-100/60 border-purple-200"
              : "bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100/60 border-orange-200"
          }`}
        >
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span
                className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                  isSuperAdmin
                    ? "text-purple-700 bg-purple-200/80 border-purple-300"
                    : "text-amber-800 bg-amber-200/80 border-amber-300"
                }`}
              >
                {isSuperAdmin
                  ? "🛡️ Add Mess Outlet (Universal Studio)"
                  : "🏢 Mess Outlet Self-Registration"}
              </span>
              <h2 className="text-lg font-black text-gray-900 tracking-tight">
                {isSuperAdmin
                  ? "Add New Mess Outlet"
                  : "Register Your New Mess Outlet"}
              </h2>
              <p className="text-xs text-gray-600 max-w-2xl">
                {isSuperAdmin
                  ? "Register a new mess branch like normal (e.g. Annapurna, Mom's Kitchen). You can immediately manage its thalis, slots, inventory, staff and finance, or assign access to any Google or email ID below or anytime in Outlet Settings."
                  : `Launch a new mess or campus canteen branch directly under your account (${currentUser?.email || "you"}). You can immediately publish thalis, slot bookings, and manage kitchen prep.`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddMess(false)}
              className="text-gray-400 hover:text-gray-600 text-sm font-bold p-1 bg-white rounded-full shadow-2xs hover:bg-gray-100"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleCreateMess} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 pt-2">
            <div className="lg:col-span-2">
              <label className="block text-[11px] font-bold uppercase text-gray-700 mb-1">Mess / Branch Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Annapurna Dining Hall"
                value={newMessName}
                onChange={(e) => setNewMessName(e.target.value)}
                className={`w-full p-2.5 text-xs bg-white border rounded-xl font-semibold ${
                  isSuperAdmin
                    ? "border-gray-300 focus:ring-2 focus:ring-purple-500"
                    : "border-gray-300 focus:ring-2 focus:ring-orange-500"
                }`}
              />
            </div>

            <div className="lg:col-span-2">
              <label className="block text-[11px] font-bold uppercase text-gray-700 mb-1">Locality / Campus Area *</label>
              <input
                type="text"
                required
                placeholder="e.g. FC Road / Kothrud, Pune"
                value={newLocality}
                onChange={(e) => setNewLocality(e.target.value)}
                className={`w-full p-2.5 text-xs bg-white border rounded-xl font-semibold ${
                  isSuperAdmin
                    ? "border-gray-300 focus:ring-2 focus:ring-purple-500"
                    : "border-gray-300 focus:ring-2 focus:ring-orange-500"
                }`}
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-gray-700 mb-1">Cuisine Type</label>
              <select
                value={newCuisineType}
                onChange={(e) => setNewCuisineType(e.target.value)}
                className={`w-full p-2.5 text-xs bg-white border rounded-xl font-semibold ${
                  isSuperAdmin
                    ? "border-gray-300 focus:ring-2 focus:ring-purple-500"
                    : "border-gray-300 focus:ring-2 focus:ring-orange-500"
                }`}
              >
                <option value="North Indian">North Indian</option>
                <option value="South Indian">South Indian</option>
                <option value="Maharashtrian">Maharashtrian</option>
                <option value="Gujarati">Gujarati</option>
                <option value="Multi-Cuisine">Multi-Cuisine</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-gray-700 mb-1">Phone Number</label>
              <input
                type="text"
                placeholder="+91 98765 43210"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className={`w-full p-2.5 text-xs bg-white border rounded-xl ${
                  isSuperAdmin
                    ? "border-gray-300 focus:ring-2 focus:ring-purple-500"
                    : "border-gray-300 focus:ring-2 focus:ring-orange-500"
                }`}
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-gray-700 mb-1">Seating Capacity</label>
              <input
                type="number"
                min="5"
                max="500"
                value={newCapacity}
                onChange={(e) => setNewCapacity(e.target.value)}
                className={`w-full p-2.5 text-xs bg-white border rounded-xl ${
                  isSuperAdmin
                    ? "border-gray-300 focus:ring-2 focus:ring-purple-500"
                    : "border-gray-300 focus:ring-2 focus:ring-orange-500"
                }`}
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-gray-700 mb-1">Base Price / Meal (₹)</label>
              <input
                type="number"
                min="30"
                max="500"
                value={newPricePerMeal}
                onChange={(e) => setNewPricePerMeal(e.target.value)}
                className={`w-full p-2.5 text-xs bg-white border rounded-xl ${
                  isSuperAdmin
                    ? "border-gray-300 focus:ring-2 focus:ring-purple-500"
                    : "border-gray-300 focus:ring-2 focus:ring-orange-500"
                }`}
              />
            </div>

            {/* Optional Owner Email assignment */}
            {isSuperAdmin ? (
              <>
                <div className="lg:col-span-3">
                  <label className="block text-[11px] font-bold uppercase text-purple-900 mb-1 flex items-center gap-1.5">
                    <span>🔑</span>
                    <span>Assign Owner Google / Email ID (Optional)</span>
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. messowner@gmail.com (Leave blank to assign later)"
                    value={newOwnerEmail}
                    onChange={(e) => setNewOwnerEmail(e.target.value)}
                    className="w-full p-2.5 text-xs bg-white border border-purple-300 rounded-xl focus:ring-2 focus:ring-purple-600 font-semibold text-gray-900 placeholder-gray-400"
                  />
                  <p className="text-[10px] text-purple-700 mt-1">
                    Optional. You can also grant or update access to any Google or email ID at any time in Outlet Settings.
                  </p>
                </div>

                <div className="lg:col-span-3">
                  <label className="block text-[11px] font-bold uppercase text-gray-700 mb-1">
                    Additional Manager Emails (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="manager1@gmail.com, staff@gmail.com"
                    value={newManagerEmails}
                    onChange={(e) => setNewManagerEmails(e.target.value)}
                    className="w-full p-2.5 text-xs bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">
                    Comma-separated secondary emails also permitted to manage this outlet.
                  </p>
                </div>
              </>
            ) : (
              <div className="lg:col-span-6 bg-orange-100/70 border border-orange-200 rounded-xl p-3 flex items-center gap-2 text-xs text-orange-950 font-medium">
                <span>ℹ️</span>
                <span>
                  This outlet will be registered under your verified email: <strong className="font-bold">{currentUser?.email}</strong>.
                </span>
              </div>
            )}

            <div className="lg:col-span-6 flex items-center justify-end pt-2">
              <button
                type="submit"
                disabled={actionLoading}
                className={`px-6 py-2.5 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition shadow-xs disabled:opacity-50 flex items-center gap-2 ${
                  isSuperAdmin
                    ? "bg-purple-700 hover:bg-purple-800"
                    : "bg-orange-600 hover:bg-orange-700"
                }`}
              >
                <span>
                  {actionLoading
                    ? "Registering..."
                    : isSuperAdmin
                    ? "Add Mess Outlet 🚀"
                    : "Register Mess Branch 🚀"}
                </span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── ADVANCE KITCHEN HEADCOUNT & RATION SHEET BANNER ── */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-950 rounded-3xl p-5 sm:p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 border border-purple-800/50">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-2xl shrink-0">
            📋
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-300 bg-purple-800/80 px-2.5 py-0.5 rounded-full border border-purple-600/50">
                Tomorrow-Only Advance Engine
              </span>
              <span className="text-[10px] font-extrabold text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-700/50">
                Lunch Closes Tonight 10:00 PM
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-white">
              Tomorrow's Kitchen Headcount & Ration Prep Sheet
            </h3>
            <p className="text-xs text-purple-200/80 max-w-xl">
              Inspect confirmed headcount locked in advance by passholders and prepaid walk-ins. Automated grocery quantities calculated to eliminate food waste and stock shortage.
            </p>
          </div>
        </div>
        <Link
          to="/owner/meals"
          className="px-5 py-2.5 bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500 text-gray-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition active:scale-95 shrink-0 flex items-center gap-2 self-start md:self-auto cursor-pointer"
        >
          <span>Open Ration Sheet</span>
          <span>→</span>
        </Link>
      </div>

      {/* ── CORE GRID: COUNTER SCANNER & PROFILE COMMAND ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: COUNTER TOKEN & DYNAMIC QR SCANNER (High Priority for Counter Staff) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-md">
                  Counter Terminal
                </span>
                <h2 className="text-lg font-black text-gray-900 mt-1">
                  Unified QR & Pass Scanner
                </h2>
                <p className="text-xs text-gray-500">
                  Scan student dynamic QR passes (memberships & daily meals) or enter token manually.
                </p>
              </div>

              {/* Peak Rush Auto-Serve Mode Toggle */}
              <label className="flex items-center gap-2 cursor-pointer bg-amber-50 hover:bg-amber-100/80 px-2.5 py-1.5 rounded-xl border border-amber-200 transition-colors select-none flex-shrink-0">
                <input
                  type="checkbox"
                  checked={autoRedeemRush}
                  onChange={(e) => setAutoRedeemRush(e.target.checked)}
                  className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500 cursor-pointer"
                />
                <div className="text-right">
                  <span className="text-[10px] font-black text-amber-950 uppercase tracking-wider block leading-tight">
                    ⚡ Rush Mode
                  </span>
                  <span className="text-[8px] text-amber-700 font-bold block">
                    {autoRedeemRush ? "Auto-Serve On" : "Manual Click"}
                  </span>
                </div>
              </label>
            </div>

            {/* Active Counter Operator Bar for Shift Accountability */}
            <div className="p-3 bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 rounded-2xl border border-orange-200/90 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-8 h-8 rounded-xl bg-orange-600 text-white font-bold flex items-center justify-center shrink-0 text-sm shadow-2xs">
                  👤
                </span>
                <div className="min-w-0">
                  <span className="text-[9px] uppercase font-bold text-gray-500 block">
                    Operating Cashier / Staff:
                  </span>
                  <select
                    value={selectedStaffId}
                    onChange={(e) => setSelectedStaffId(e.target.value)}
                    className="bg-transparent font-black text-gray-900 border-none p-0 text-xs focus:ring-0 cursor-pointer"
                  >
                    <option value="">Counter Desk (General)</option>
                    {messStaff.map((s) => (
                      <option key={s._id || s.id} value={s._id || s.id}>
                        {s.name} ({s.roleTitle || s.role}) • {s.shift}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <Link
                to="/owner/staff"
                className="px-2.5 py-1 bg-white hover:bg-orange-100 text-orange-700 font-extrabold text-[10px] uppercase rounded-lg border border-orange-200 transition shrink-0 shadow-2xs"
              >
                Staff Roster →
              </Link>
            </div>

            {/* Camera Viewport or Open Camera CTA */}
            {isCameraActive ? (
              <div className="space-y-2 animate-in fade-in duration-200">
                <div className="relative rounded-2xl overflow-hidden border-2 border-orange-500 bg-black shadow-md">
                  <div id="messta-qr-reader" className="w-full overflow-hidden" />
                  <button
                    type="button"
                    onClick={() => setIsCameraActive(false)}
                    className="absolute top-2.5 right-2.5 z-20 px-3 py-1 bg-black/75 hover:bg-black text-white text-[10px] font-black uppercase tracking-wider rounded-lg backdrop-blur-xs transition"
                  >
                    ✕ Close Camera
                  </button>
                </div>
                <p className="text-[10px] text-gray-500 text-center font-medium">
                  Point device camera at student's dynamic QR code. It will scan and beep automatically.
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setCameraError("");
                  setIsCameraActive(true);
                }}
                className="w-full py-3 bg-gradient-to-r from-orange-600 via-orange-700 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-xs transition-all flex items-center justify-center gap-2 active:scale-98"
              >
                <span>📷</span>
                <span>Open Counter Camera Scanner</span>
              </button>
            )}

            {/* Camera Error Message */}
            {cameraError && (
              <div className="p-3 bg-amber-50 text-amber-800 text-xs rounded-xl border border-amber-200">
                {cameraError}
              </div>
            )}

            {/* Verification Form (Barcode Scanner Gun / Manual Input Fallback) */}
            <form onSubmit={handleVerifyToken} className="space-y-1.5">
              <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block">
                Or Enter / Scan Token Code
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="MESSTA-7A8B or PASS-XXXX"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
                  className="flex-1 p-3 text-sm font-mono font-bold tracking-wider uppercase bg-gray-50 border border-gray-300 rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-500 transition-all placeholder:normal-case placeholder:font-normal placeholder:tracking-normal"
                />
                <button
                  type="submit"
                  disabled={scanLoading}
                  className="px-5 py-3 bg-gray-900 hover:bg-black text-white font-bold text-xs uppercase tracking-wider rounded-2xl transition shadow-xs disabled:opacity-50"
                >
                  {scanLoading ? "..." : "Verify"}
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
                    <span className="font-mono text-lg font-black text-orange-600">
                      {scannedResult.data.token}
                    </span>
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-white border border-orange-200 text-orange-700">
                      {scannedResult.tokenType === "membership" || scannedResult.type === "subscription"
                        ? "💳 Membership Pass"
                        : "🎫 Meal Ticket"}
                    </span>
                  </div>

                  <span
                    className={`text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full border ${
                      scannedResult.data.tokenStatus === "active" ||
                      scannedResult.data.tokenStatus === "pending" ||
                      scannedResult.data.tokenStatus === "paid"
                        ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                        : "bg-gray-100 text-gray-700 border-gray-300"
                    }`}
                  >
                    {scannedResult.data.tokenStatus}
                  </span>
                </div>

                {/* Customer & Booking Details */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-gray-500 uppercase font-bold block">Customer</span>
                    <span className="font-extrabold text-gray-900">{scannedResult.data.customerName}</span>
                    <span className="text-[10px] text-gray-500 block truncate">{scannedResult.data.customerEmail}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 uppercase font-bold block">Meal Slot / Date</span>
                    <span className="font-bold text-orange-600 uppercase">{scannedResult.data.mealType}</span>
                    <span className="text-[10px] text-gray-600 block">{scannedResult.data.bookingDate}</span>
                  </div>
                </div>

                {/* Specifics for Membership Pass */}
                {(scannedResult.tokenType === "membership" || scannedResult.type === "subscription") && (
                  <div className="p-3 bg-white rounded-xl border border-orange-100 text-xs flex justify-between items-center">
                    <div>
                      <span className="font-bold text-gray-800 block">{scannedResult.data.planName}</span>
                      <span className="text-[10px] text-gray-500 uppercase font-bold">
                        {scannedResult.data.category} • {scannedResult.data.frequency}
                      </span>
                    </div>
                    <span className="px-2.5 py-1 bg-orange-100 text-orange-700 font-black rounded-lg text-xs">
                      {scannedResult.data.remainingTokens} Tokens Left
                    </span>
                  </div>
                )}

                {/* Specifics for Per-Plate Meal Booking */}
                {(scannedResult.tokenType === "per_plate" || scannedResult.type === "order") && (
                  <div className="p-3 bg-white rounded-xl border border-orange-100 text-xs flex justify-between items-center">
                    <div>
                      <span className="font-bold text-gray-800 block">Single-Meal Counter Booking</span>
                      <span className="text-[10px] text-emerald-600 font-bold uppercase">
                        Payment: {scannedResult.data.paymentStatus || "Paid"}
                      </span>
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 font-black rounded-lg text-xs border border-emerald-200">
                      ₹{scannedResult.data.amount || 0} Paid
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
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-xs transition-colors"
                >
                  {scannedResult.data.tokenStatus === "served" || scannedResult.data.tokenStatus === "redeemed"
                    ? "Meal Already Served ✕"
                    : scannedResult.tokenType === "membership" || scannedResult.type === "subscription"
                    ? "Deduct 1 Token & Mark Served 🍽️"
                    : "Mark Ticket as Redeemed 🍽️"}
                </button>
              </div>
            )}
          </div>

          {/* Live Orders & Meal Queue */}
          <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-wide">
                  Live Counter Queue
                </h3>
                <p className="text-xs text-gray-500">Recent reservations for {activeMess?.name || "this outlet"}.</p>
              </div>
              <span className="text-[11px] font-bold bg-orange-50 text-orange-600 px-2.5 py-0.5 rounded-full">
                {orders.length} in queue
              </span>
            </div>

            <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
              {loadingOrders ? (
                <p className="text-xs text-gray-400 text-center py-8">Loading queue...</p>
              ) : orders.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <p className="text-2xl">🥣</p>
                  <p className="text-xs text-gray-400">No active counter bookings yet today.</p>
                </div>
              ) : (
                orders.map((ord) => (
                  <div
                    key={ord._id}
                    className="p-3 bg-gray-50 hover:bg-gray-100/80 rounded-2xl border border-gray-100 flex items-center justify-between text-xs transition-colors"
                  >
                    <div>
                      <span className="font-mono font-bold text-gray-900 block">{ord.token}</span>
                      <span className="text-[11px] text-gray-500 font-medium">
                        {ord.userName} • <span className="uppercase font-bold text-orange-600">{ord.mealType}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          ord.tokenStatus === "redeemed"
                            ? "bg-gray-200 text-gray-700"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {ord.tokenStatus}
                      </span>
                      {ord.tokenStatus === "active" && (
                        <button
                          type="button"
                          onClick={() => handleRedeemToken(ord.token)}
                          className="px-2 py-1 bg-gray-900 hover:bg-black text-white text-[10px] font-bold rounded-lg transition"
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
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-xs space-y-6">
            <div className="flex justify-between items-start border-b border-gray-100 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">
                  Outlet Settings
                </span>
                <h2 className="text-xl font-black text-gray-900 mt-1">
                  Mess Business Profile
                </h2>
                <p className="text-xs text-gray-500">
                  Manage listing information, student seating, and operational visibility.
                </p>
              </div>

              <span
                className={`text-[10px] uppercase font-black px-3 py-1 rounded-full border ${
                  isOpen
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-red-50 text-red-700 border-red-200"
                }`}
              >
                {isOpen ? "Accepting Students" : "Paused / Closed"}
              </span>
            </div>

            <form onSubmit={handleUpdateMess} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                    Mess / Canteen Name
                  </label>
                  <input
                    type="text"
                    required
                    value={messName}
                    onChange={(e) => setMessName(e.target.value)}
                    className="w-full p-3 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                    Locality / Campus Area
                  </label>
                  <input
                    type="text"
                    required
                    value={locality}
                    onChange={(e) => setLocality(e.target.value)}
                    className="w-full p-3 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                    Primary Cuisine Type
                  </label>
                  <select
                    value={cuisineType}
                    onChange={(e) => setCuisineType(e.target.value)}
                    className="w-full p-3 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="North Indian">North Indian</option>
                    <option value="South Indian">South Indian</option>
                    <option value="Maharashtrian">Maharashtrian</option>
                    <option value="Gujarati">Gujarati</option>
                    <option value="Multi-Cuisine">Multi-Cuisine</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                    Contact Phone Number
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-3 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                    Seating Capacity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={seatingCapacity}
                    onChange={(e) => setSeatingCapacity(e.target.value)}
                    className="w-full p-3 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                    Photo URL (Cover Image)
                  </label>
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full p-3 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* Status Radio Toggle */}
              <div>
                <label className="block text-xs font-bold uppercase text-gray-700 mb-2">
                  Operating Status
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                    <input
                      type="radio"
                      name="isOpenStatus"
                      checked={isOpen === true}
                      onChange={() => setIsOpen(true)}
                      className="text-orange-600 focus:ring-orange-500"
                    />
                    <span className="text-emerald-700">Open for Bookings</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                    <input
                      type="radio"
                      name="isOpenStatus"
                      checked={isOpen === false}
                      onChange={() => setIsOpen(false)}
                      className="text-orange-600 focus:ring-orange-500"
                    />
                    <span className="text-red-700">Paused (Temporarily Closed)</span>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-xs transition-colors disabled:opacity-50"
              >
                {actionLoading ? "Saving Changes..." : "Save Outlet Changes 💾"}
              </button>

              {/* ── ACCESS & PERMISSIONS SECTION ── */}
              {activeMess && (
                <div className="pt-5 border-t border-gray-100 space-y-4">
                  {isSuperAdmin ? (
                    <div className="bg-purple-50/70 border border-purple-200/80 rounded-2xl p-4 sm:p-5 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 bg-purple-200/80 px-2 py-0.5 rounded-md">
                            🛡️ SuperAdmin Access Control
                          </span>
                          <h4 className="text-sm font-black text-gray-900">
                            Give Access to Google or Email Account
                          </h4>
                        </div>
                        <span
                          className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border self-start sm:self-auto ${
                            activeMess.isClaimed
                              ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                              : "bg-amber-100 text-amber-800 border-amber-300"
                          }`}
                        >
                          {activeMess.isClaimed
                            ? `✅ Linked (${activeMess.ownerId ? "UID Linked" : "Claimed"})`
                            : "⏳ Pre-Created (Waiting for Owner Signup)"}
                        </span>
                      </div>

                      <p className="text-xs text-purple-900 leading-relaxed">
                        Enter any mess owner&rsquo;s Google account or email address. When that mess owner logs in or signs up with that Google or email ID, <strong>&ldquo;{activeMess.name}&rdquo;</strong> will automatically be linked to their portal with full operational access!
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="block text-[11px] font-bold uppercase text-purple-900 mb-1">
                            Mess Owner Google / Email Address *
                          </label>
                          <input
                            type="email"
                            required
                            value={permOwnerEmail}
                            onChange={(e) => setPermOwnerEmail(e.target.value)}
                            placeholder="e.g. momskitchen@gmail.com"
                            className="w-full p-2.5 text-xs bg-white border-2 border-purple-300 rounded-xl focus:ring-2 focus:ring-purple-500 font-bold text-gray-900 placeholder-gray-400"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold uppercase text-gray-700 mb-1">
                            Additional Manager Emails (Optional)
                          </label>
                          <input
                            type="text"
                            value={permManagerEmails}
                            onChange={(e) => setPermManagerEmails(e.target.value)}
                            placeholder="manager1@gmail.com, staff@gmail.com"
                            className="w-full p-2.5 text-xs bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={handleUpdatePermissions}
                          disabled={permSaving}
                          className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                        >
                          <span>{permSaving ? "Granting Access..." : "Give Access 🔑"}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 text-amber-900 font-black">
                        <span>🔐</span>
                        <span>Assigned Mess Outlet</span>
                      </div>
                      <p className="text-gray-600">
                        This mess is assigned to <strong className="text-gray-900">{activeMess.ownerEmail}</strong>. Multi-outlet provisioning and ownership assignment are managed by the platform SuperAdmin.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Danger Zone: Branch Deletion (SuperAdmin Exclusive) */}
              {isSuperAdmin && activeMess && (
                <div className="pt-5 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-red-700 block">
                      Danger Zone • Outlet Deletion
                    </span>
                    <span className="text-[11px] text-gray-500 block">
                      Permanently remove &ldquo;{activeMess.name}&rdquo; and all associated configuration.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(true)}
                    disabled={actionLoading || deletingMess}
                    className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 hover:text-red-800 font-bold text-xs rounded-xl border border-red-200 transition-colors shadow-2xs self-start sm:self-auto flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                  >
                    <span>🗑️</span>
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
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 border border-gray-200 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center text-2xl flex-shrink-0">
                🗑️
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                  Confirm Deletion
                </span>
                <h3 className="text-lg font-black text-gray-900 tracking-tight">
                  Delete &ldquo;{activeMess.name}&rdquo;?
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Are you sure you want to permanently delete this mess branch in <strong className="text-gray-700">{activeMess.locality}</strong>?
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs space-y-1 leading-relaxed">
              <div className="font-bold flex items-center gap-1.5">
                <span>⚠️</span>
                <span>Irreversible Branch Removal</span>
              </div>
              <p className="text-[11px] text-amber-800">
                Deleting this outlet will permanently remove its business profile, daily thali menus, subscription packages, and counter records. This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deletingMess}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs uppercase tracking-wider rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteMess}
                disabled={deletingMess}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-xs transition disabled:opacity-50 flex items-center gap-2 active:scale-95"
              >
                {deletingMess ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                    <span>Deleting Branch...</span>
                  </>
                ) : (
                  <>
                    <span>Delete Outlet Permanently</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MESS VERIFICATION & COMPLIANCE MODAL ── */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 border border-gray-200 shadow-2xl space-y-6 my-8 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center text-2xl flex-shrink-0 shadow-2xs">
                  🛡️
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200">
                      Compliance & Onboarding
                    </span>
                    <span className="text-[10px] font-bold text-gray-500">
                      Messta Trust & Safety
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-gray-900 tracking-tight mt-1">
                    Mess Verification & FSSAI Registration
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Submit authentic regulatory credentials to earn the verified badge and publish your mess to students.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowVerifyModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center text-sm font-bold transition flex-shrink-0"
              >
                ✕
              </button>
            </div>

            {/* Quick Demo Fill Pill (Available in local dev only) */}
            {import.meta.env.DEV && (
              <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-amber-900">
                  <span className="text-base">⚡</span>
                  <span className="font-semibold">Need to test quickly? Auto-populate mock legal and FSSAI details.</span>
                </div>
                <button
                  type="button"
                  onClick={handleFillDemoVerification}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-black text-[11px] uppercase tracking-wider rounded-xl transition shadow-2xs whitespace-nowrap active:scale-95 cursor-pointer"
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
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingVerification}
                  className="px-6 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition disabled:opacity-50 flex items-center gap-2 active:scale-95 cursor-pointer"
                >
                  {submittingVerification ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                      <span>Submitting For Review...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit for Verification 🛡️</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
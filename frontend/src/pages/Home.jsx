import { API_BASE_URL } from "../config/api";
import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import MessCard from "../components/MessCard";
import messtaLogo from "../assets/messta-logo.png";

// Known reference geo-coordinates for major Pune student & college areas
const PUNE_LOCALITY_COORDS = {
  "fc road": { lat: 18.5284, lng: 73.8427, label: "FC Road (Fergusson College)" },
  "fergusson college road": { lat: 18.5284, lng: 73.8427, label: "FC Road" },
  "kothrud": { lat: 18.5074, lng: 73.8077, label: "Kothrud (MIT Campus)" },
  "karve nagar": { lat: 18.4870, lng: 73.8160, label: "Karve Nagar (Cummins College)" },
  "deccan": { lat: 18.5167, lng: 73.8417, label: "Deccan Gymkhana" },
  "shivajinagar": { lat: 18.5314, lng: 73.8446, label: "Shivajinagar (COEP Tech)" },
  "viman nagar": { lat: 18.5679, lng: 73.9143, label: "Viman Nagar (Symbiosis)" },
  "hinjewadi": { lat: 18.5913, lng: 73.7389, label: "Hinjewadi Phase 1 (IT Hub)" },
  "hinjewadi phase 1": { lat: 18.5913, lng: 73.7389, label: "Hinjewadi Phase 1" },
  "baner": { lat: 18.5590, lng: 73.7868, label: "Baner" },
  "wakad": { lat: 18.5987, lng: 73.7661, label: "Wakad" },
  "katraj": { lat: 18.4485, lng: 73.8588, label: "Katraj (PICT / BVDU)" },
  "swargate": { lat: 18.5018, lng: 73.8636, label: "Swargate" },
  "camp": { lat: 18.5133, lng: 73.8770, label: "Pune Camp" },
};

// Haversine formula to compute great-circle distance between two GPS coordinates in kilometers
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// Extract or resolve geo-coordinates for a mess listing
function getMessCoordinates(mess) {
  if (
    mess.address?.latitude &&
    mess.address?.longitude &&
    (mess.address.latitude !== 18.5204 || mess.address.longitude !== 73.8567)
  ) {
    return { lat: Number(mess.address.latitude), lng: Number(mess.address.longitude) };
  }
  const key = mess.locality?.toLowerCase().trim();
  if (key && PUNE_LOCALITY_COORDS[key]) {
    return PUNE_LOCALITY_COORDS[key];
  }
  return { lat: 18.5204, lng: 73.8567 };
}

export default function Home() {
  const [allMesses, setAllMesses] = useState([]);
  const [searchArea, setSearchArea] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Location & Proximity Filter States (initialized lazily from session if present)
  const [userLocation, setUserLocation] = useState(() => {
    try {
      const stored = sessionStorage.getItem("messta_user_coords");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.latitude && parsed.longitude) return parsed;
      }
    } catch {
      // ignore
    }
    return null;
  });

  const [locationStatus, setLocationStatus] = useState(() => {
    try {
      const stored = sessionStorage.getItem("messta_user_coords");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.latitude && parsed.longitude) return "granted";
      }
    } catch {
      // ignore
    }
    return "idle";
  });

  const [radiusKm, setRadiusKm] = useState(5);
  const [locationFeedback, setLocationFeedback] = useState("");

  // Fetch complete listings to allow full 5km radius calculations
  useEffect(() => {
    let isCancelled = false;
    const fetchMessData = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE_URL}/api/mess?showAll=true`);
        if (!res.ok) throw new Error("Server response was not ok");
        const result = await res.json();

        if (!isCancelled) {
          if (result.data && result.data.length > 0) {
            setAllMesses(result.data);
          } else {
            setAllMesses([]);
          }
        }
      } catch {
        if (!isCancelled) {
          setAllMesses([]);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    fetchMessData();
    return () => {
      isCancelled = true;
    };
  }, []);

  // Check if browser already has pre-granted geolocation permission
  useEffect(() => {

    // Auto-detect if browser already granted location permission
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: "geolocation" }).then((perm) => {
        if (perm.state === "granted" && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const loc = {
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                label: "Live Device GPS",
              };
              setUserLocation(loc);
              setLocationStatus("granted");
            },
            () => {},
            { timeout: 8000 }
          );
        }
      }).catch(() => {});
    }
  }, []);

  // Request browser Geolocation permission
  const handleRequestLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus("denied");
      setLocationFeedback("Geolocation is not supported by your browser.");
      return;
    }

    setLocationStatus("requesting");
    setLocationFeedback("Requesting your browser location permission...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const loc = {
          latitude,
          longitude,
          label: "Live Device GPS",
        };
        setUserLocation(loc);
        setLocationStatus("granted");
        setLocationFeedback("Location permission granted! Showing messes within 5 km of you.");
        try {
          sessionStorage.setItem("messta_user_coords", JSON.stringify(loc));
        } catch {
          // ignore storage error
        }
      },
      (error) => {
        console.warn("Geolocation permission error:", error.message);
        setLocationStatus("denied");
        setLocationFeedback(
          error.code === 1
            ? "Location permission was denied. You can select your college area below to filter within 5 km."
            : "Could not retrieve GPS coordinates. Please select an area below."
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  // Quick Campus Area selector (MIT Kothrud, FC Road, Symbiosis Viman Nagar, Hinjewadi, etc.)
  const handleSelectAreaLocation = (areaKey) => {
    const coords = PUNE_LOCALITY_COORDS[areaKey.toLowerCase().trim()];
    if (!coords) return;
    const loc = {
      latitude: coords.lat,
      longitude: coords.lng,
      label: coords.label || areaKey,
    };
    setUserLocation(loc);
    setLocationStatus("granted");
    setLocationFeedback(`Location set to ${loc.label}. Showing messes within 5 km.`);
    try {
      sessionStorage.setItem("messta_user_coords", JSON.stringify(loc));
    } catch {
      // ignore
    }
  };

  const handleClearLocation = () => {
    setUserLocation(null);
    setLocationStatus("idle");
    setLocationFeedback("");
    try {
      sessionStorage.removeItem("messta_user_coords");
    } catch {
      // ignore
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchArea.trim()) {
      navigate(`/mess?search=${encodeURIComponent(searchArea.trim())}`);
    } else {
      navigate("/mess");
    }
  };

  // Compute distance for all messes and filter by 5 km radius
  const { displayedMesses, countWithin5km, isFallbackClosest } = useMemo(() => {
    if (!userLocation) {
      // When location is not yet set, display top 6 popular messes
      return {
        displayedMesses: allMesses.slice(0, 6),
        countWithin5km: 0,
        isFallbackClosest: false,
      };
    }

    // Attach exact distance to each mess
    const withDistance = allMesses.map((m) => {
      const coords = getMessCoordinates(m);
      const dist = calculateDistanceKm(
        userLocation.latitude,
        userLocation.longitude,
        coords.lat,
        coords.lng
      );
      return { ...m, distanceKm: dist };
    });

    // Sort by proximity: closest first
    withDistance.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));

    const strictlyWithin = withDistance.filter((m) => (m.distanceKm || 0) <= radiusKm);

    if (radiusKm === 5) {
      if (strictlyWithin.length > 0) {
        return {
          displayedMesses: strictlyWithin,
          countWithin5km: strictlyWithin.length,
          isFallbackClosest: false,
        };
      } else {
        // If no mess is strictly within 5 km, show closest 4 with a distance notice
        return {
          displayedMesses: withDistance.slice(0, 4),
          countWithin5km: 0,
          isFallbackClosest: true,
        };
      }
    }

    return {
      displayedMesses: withDistance,
      countWithin5km: strictlyWithin.length,
      isFallbackClosest: false,
    };
  }, [allMesses, userLocation, radiusKm]);

  return (
    <div className="min-h-screen bg-gray-50/70 pb-20 space-y-12">
      
      {/* ── HERO BANNER SECTION ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-orange-600 via-orange-700 to-amber-700 text-white py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center space-y-6 relative z-10">
          
          <div className="flex justify-center items-center py-2">
            <div className="relative group inline-flex justify-center items-center">
              <div className="absolute -inset-6 bg-white/20 rounded-full blur-2xl pointer-events-none group-hover:bg-white/30 transition-all"></div>
              <img
                src={messtaLogo}
                alt="Messta Logo"
                className="relative h-28 sm:h-36 object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.3)] group-hover:scale-105 transition-transform duration-300"
              />
            </div>
          </div>

          {/* Search Bar */}
          <form
            onSubmit={handleSearchSubmit}
            className="mt-6 max-w-lg mx-auto flex items-center bg-white rounded-2xl p-1.5 shadow-xl border border-white/20"
          >
            <input
              type="text"
              placeholder="Enter student area (Kothrud, FC Road, Hinjewadi)..."
              value={searchArea}
              onChange={(e) => setSearchArea(e.target.value)}
              className="w-full px-4 py-2.5 text-xs sm:text-sm text-gray-800 rounded-xl focus:outline-none"
            />
            <button
              type="submit"
              className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-black uppercase tracking-wider px-5 py-3 rounded-xl transition shadow-xs whitespace-nowrap cursor-pointer"
            >
              Explore Messes
            </button>
          </form>

          {/* Quick Pune Locality Chips */}
          <div className="pt-2 flex flex-wrap justify-center items-center gap-2 text-xs">
            <span className="text-orange-200 font-bold text-[11px]">Popular in Pune:</span>
            {["FC Road", "Kothrud", "Karve Nagar", "Viman Nagar", "Hinjewadi"].map((area) => (
              <button
                key={area}
                type="button"
                onClick={() => navigate(`/mess?search=${encodeURIComponent(area)}`)}
                className="bg-white/10 hover:bg-white/20 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full transition backdrop-blur-xs cursor-pointer"
              >
                {area}
              </button>
            ))}
          </div>

        </div>

        {/* Ambient Glow */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-amber-500/30 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-orange-500/30 rounded-full blur-3xl pointer-events-none"></div>
      </section>

      {/* ── 5KM RADIUS LOCATION DISCOVERY & CONTROL CENTER ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {!userLocation ? (
          // PROMPT STATE: Ask Permission for Location
          <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 rounded-3xl p-6 sm:p-7 border border-orange-200/80 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-600 to-amber-600 text-white flex items-center justify-center text-2xl shadow-sm shrink-0">
                  📍
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black uppercase tracking-wider text-orange-800 bg-orange-200/70 px-2.5 py-0.5 rounded-full border border-orange-300">
                      Live Proximity Radar
                    </span>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                      5 km Radius Matching
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-gray-900 tracking-tight">
                    Find Collaborated Messes Within 5 km of You
                  </h3>
                  <p className="text-xs text-gray-600 max-w-xl">
                    Allow location permission so Messta can automatically detect your PG, hostel, or campus and show verified mess kitchens within walking or short commuting distance.
                  </p>
                </div>
              </div>

              {/* Action Button: Trigger Browser Permission Modal */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleRequestLocation}
                  disabled={locationStatus === "requesting"}
                  className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-md transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {locationStatus === "requesting" ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                      <span>Detecting Your GPS...</span>
                    </>
                  ) : (
                    <>
                      <span>📍</span>
                      <span>Allow Location Access (5 km)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Location Feedback or Denied State */}
            {locationFeedback && (
              <div className="text-xs font-bold text-orange-800 bg-white/70 p-3 rounded-xl border border-orange-200">
                ℹ️ {locationFeedback}
              </div>
            )}

            {/* Quick Campus Area Selectors (MIT, FC Road, Cummins, Symbiosis, Hinjewadi) */}
            <div className="pt-2 border-t border-orange-200/60 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-gray-500 font-bold text-[11px]">Or select your Pune college hub:</span>
              {["FC Road", "Kothrud", "Karve Nagar", "Viman Nagar", "Hinjewadi"].map((hub) => (
                <button
                  key={hub}
                  type="button"
                  onClick={() => handleSelectAreaLocation(hub)}
                  className="px-3 py-1 bg-white hover:bg-orange-100 hover:text-orange-900 text-gray-700 font-bold text-[11px] rounded-xl border border-orange-200 shadow-2xs transition cursor-pointer"
                >
                  📍 {hub}
                </button>
              ))}
            </div>
          </div>
        ) : (
          // ACTIVE STATE: Location Granted & 5km Radius Applied
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center text-xl shadow-xs shrink-0">
                🧭
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Location Active</span>
                  </span>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-orange-800 bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200">
                    Radius: {radiusKm} km
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-black text-gray-900 mt-0.5">
                  {userLocation.label || "Detected Location"} • {countWithin5km} Messes Within 5 km
                </h3>
              </div>
            </div>

            {/* Filter Radius Toggle & Reset Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex p-1 bg-gray-100 rounded-2xl border border-gray-200">
                <button
                  type="button"
                  onClick={() => setRadiusKm(5)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                    radiusKm === 5
                      ? "bg-white text-orange-600 shadow-xs"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  🎯 Within 5 km ({countWithin5km})
                </button>
                <button
                  type="button"
                  onClick={() => setRadiusKm(50)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                    radiusKm > 5
                      ? "bg-white text-orange-600 shadow-xs"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  🌐 Show All ({allMesses.length})
                </button>
              </div>

              <button
                type="button"
                onClick={handleRequestLocation}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition cursor-pointer"
                title="Refresh Live GPS Position"
              >
                🔄 Refresh GPS
              </button>

              <button
                type="button"
                onClick={handleClearLocation}
                className="px-2.5 py-1.5 text-gray-400 hover:text-gray-600 text-xs font-bold rounded-xl transition cursor-pointer"
                title="Reset Location"
              >
                ✕ Reset
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── MESSES GRID DISPLAY ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-md">
              {userLocation ? "Proximity Results" : "Top Rated"}
            </span>
            <h2 className="text-2xl font-black text-gray-900 mt-1">
              {userLocation
                ? radiusKm === 5
                  ? `Messes Within 5 km of ${userLocation.label || "You"}`
                  : `All Messes around ${userLocation.label || "You"}`
                : "Popular Messes in Pune"}
            </h2>
            <p className="text-xs text-gray-500">
              {userLocation
                ? "Sorted by nearest distance from your live location."
                : "Verified canteens offering fresh daily thalis and flexible passes."}
            </p>
          </div>

          <Link
            to="/mess"
            className="text-xs font-black text-orange-600 hover:text-orange-700 uppercase tracking-wider flex items-center gap-1"
          >
            <span>Search All Listed Messes in Find Mess Directory</span>
            <span>→</span>
          </Link>
        </div>

        {/* Fallback Notice if no messes strictly <= 5 km */}
        {isFallbackClosest && (
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 font-semibold flex items-center justify-between gap-3">
            <span>
              📍 No collaborated messes found strictly within 5 km of this point. Showing the closest messes in Pune below:
            </span>
            <Link
              to="/mess"
              className="text-orange-700 underline font-black shrink-0 hover:text-orange-900"
            >
              Browse All Messes
            </Link>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white rounded-3xl h-72 animate-pulse border border-gray-200"></div>
            ))}
          </div>
        ) : displayedMesses.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-gray-200 space-y-3">
            <span className="text-4xl block">🔍</span>
            <h3 className="text-lg font-black text-gray-900">No Messes Found</h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              There are currently no listed messes in this radius. You can explore all verified messes across Pune in the Find Mess directory.
            </p>
            <div className="pt-2">
              <Link
                to="/mess"
                className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition inline-block"
              >
                Go to Find Mess
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedMesses.map((m) => (
              <MessCard key={m._id || m.id} mess={m} />
            ))}
          </div>
        )}
      </section>

    </div>
  );
}
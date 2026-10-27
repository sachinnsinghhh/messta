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

// Haversine formula to compute distance in km
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
  const [selectedCategory, setSelectedCategory] = useState("all");
  const navigate = useNavigate();

  // Location & Proximity Filter States
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

  // Live culinary greeting based on current time of day
  const culinaryGreeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) {
      return {
        badge: "Breakfast & Morning Prep",
        headline: "Hot Poha, Upma & Fresh Lunch Prep Underway",
        sub: "Kitchens across Pune campuses are simmering today's fresh menu.",
      };
    } else if (hour >= 11 && hour < 16) {
      return {
        badge: "Lunch Counters Active",
        headline: "Steaming Rotis, Dal Tadka & Thalis Ready Now",
        sub: "Skip long canteen lines — book your slot or check remaining thalis.",
      };
    } else if (hour >= 16 && hour < 19) {
      return {
        badge: "Evening Prep & Snack Hour",
        headline: "Lock Tonight's Dinner Before 8:00 PM Rush",
        sub: "Guaranteed fresh dinner meals reserved directly with kitchen masters.",
      };
    } else if (hour >= 19 && hour < 23) {
      return {
        badge: "Dinner Service Live",
        headline: "Warm Homely Thalis Served Piping Hot",
        sub: "Show your dynamic token at the counter and enjoy healthy meals.",
      };
    } else {
      return {
        badge: "Kitchens Recharging",
        headline: "Plan Tomorrow's Healthy Meals & Passes",
        sub: "Reserve your monthly tiffin pass or browse verified student messes.",
      };
    }
  }, []);

  // Fetch complete listings to allow full radius calculations
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

  // Auto-detect if browser already granted location permission
  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: "geolocation" })
        .then((perm) => {
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
        })
        .catch(() => {});
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
    setLocationFeedback("Detecting your live device position...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const loc = {
          latitude,
          longitude,
          label: "Live GPS (Current Location)",
        };
        setUserLocation(loc);
        setLocationStatus("granted");
        setLocationFeedback("GPS lock active! Showing collaborated messes within walking & commute range.");
        try {
          sessionStorage.setItem("messta_user_coords", JSON.stringify(loc));
        } catch {
          // ignore storage error
        }
      },
      (error) => {
        setLocationStatus("denied");
        setLocationFeedback(
          error.code === 1
            ? "Location permission denied. You can select your college hub below."
            : "Could not retrieve GPS coordinates. Please select your college area below."
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  // Quick Campus Area selector
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
    setLocationFeedback(`Location set to ${loc.label}. Showing verified messes nearby.`);
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

  // Compute distance for all messes and filter by radius & category
  const { displayedMesses, countWithin5km, isFallbackClosest } = useMemo(() => {
    let list = [...allMesses];

    // Filter by category tag if selected
    if (selectedCategory === "veg") {
      list = list.filter((m) =>
        m.cuisineType?.toLowerCase().includes("veg") ||
        m.name?.toLowerCase().includes("veg")
      );
    } else if (selectedCategory === "budget") {
      list = list.filter((m) => (m.pricePerMeal || 80) <= 75);
    } else if (selectedCategory === "north") {
      list = list.filter((m) =>
        m.cuisineType?.toLowerCase().includes("north")
      );
    } else if (selectedCategory === "maharashtrian") {
      list = list.filter((m) =>
        m.cuisineType?.toLowerCase().includes("maharashtrian")
      );
    }

    if (!userLocation) {
      return {
        displayedMesses: list.slice(0, 6),
        countWithin5km: 0,
        isFallbackClosest: false,
      };
    }

    // Attach exact distance
    const withDistance = list.map((m) => {
      const coords = getMessCoordinates(m);
      const dist = calculateDistanceKm(
        userLocation.latitude,
        userLocation.longitude,
        coords.lat,
        coords.lng
      );
      return { ...m, distanceKm: dist };
    });

    // Sort by proximity
    withDistance.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));

    const strictlyWithin = withDistance.filter((m) => (m.distanceKm || 0) <= radiusKm);

    if (strictlyWithin.length > 0) {
      return {
        displayedMesses: strictlyWithin,
        countWithin5km: strictlyWithin.length,
        isFallbackClosest: false,
      };
    } else {
      return {
        displayedMesses: withDistance.slice(0, 4),
        countWithin5km: 0,
        isFallbackClosest: true,
      };
    }
  }, [allMesses, userLocation, radiusKm, selectedCategory]);

  return (
    <div className="min-h-screen bg-stone-50/50 pb-24 space-y-12">
      
      {/* ── HIGH-ENERGY CULINARY HERO SECTION ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-stone-950 via-stone-900 to-amber-950 text-white py-16 sm:py-24 px-4 sm:px-6 lg:px-8 border-b border-amber-900/30">
        
        {/* Dynamic Atmospheric Food Warmth Blobs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-600/20 rounded-full blur-3xl pointer-events-none animate-float" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-600/20 rounded-full blur-3xl pointer-events-none animate-float-delayed" />
        
        <div className="max-w-5xl mx-auto text-center space-y-8 relative z-10">
          
          {/* Dynamic Real-Time Status Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md shadow-inner text-xs font-semibold text-amber-200">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>{culinaryGreeting.badge}</span>
            <span className="text-stone-400">&bull;</span>
            <span className="text-white/90">Pune Campus Network</span>
          </div>

          {/* Logo Showcase with Ambient Glow */}
          <div className="flex justify-center items-center">
            <div className="relative group inline-flex justify-center items-center">
              <div className="absolute -inset-8 bg-gradient-to-r from-orange-500/30 to-amber-500/30 rounded-full blur-3xl pointer-events-none group-hover:from-orange-500/50 group-hover:to-amber-500/50 transition-all duration-700" />
              <img
                src={messtaLogo}
                alt="Messta Logo"
                className="relative h-28 sm:h-36 object-contain drop-shadow-[0_16px_32px_rgba(0,0,0,0.5)] group-hover:scale-105 transition-transform duration-500"
              />
            </div>
          </div>

          {/* Dynamic Catchphrase & Subtitle */}
          <div className="space-y-3 max-w-3xl mx-auto">
            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              {culinaryGreeting.headline}
            </h1>
            <p className="text-sm sm:text-base text-stone-300 max-w-2xl mx-auto leading-relaxed font-normal">
              Fresh, hygienic student thalis & flexible passes from trusted mess partners near MIT Kothrud, FC Road, Cummins & across Pune.
            </p>
          </div>

          {/* Search Bar with Tactile Button */}
          <form
            onSubmit={handleSearchSubmit}
            className="mt-6 max-w-xl mx-auto flex items-center bg-white rounded-2xl p-1.5 shadow-2xl border border-stone-200/40 focus-within:ring-4 focus-within:ring-orange-500/30 transition-all duration-300"
          >
            <div className="pl-3.5 pr-2 text-stone-400">
              <svg className="w-5 h-5 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search area (Kothrud, FC Road, Hinjewadi) or mess..."
              value={searchArea}
              onChange={(e) => setSearchArea(e.target.value)}
              className="w-full px-2 py-3 text-xs sm:text-sm text-stone-900 rounded-xl focus:outline-none placeholder:text-stone-400 font-medium"
            />
            {searchArea && (
              <button
                type="button"
                onClick={() => setSearchArea("")}
                className="p-1.5 text-stone-400 hover:text-stone-700 text-xs font-bold mr-1"
              >
                &times;
              </button>
            )}
            <button
              type="submit"
              className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 active:scale-95 text-white text-xs font-bold tracking-wide px-5 py-3 rounded-xl transition shadow-md shadow-orange-900/30 whitespace-nowrap cursor-pointer"
            >
              Find Mess
            </button>
          </form>

          {/* Quick Pune Campus Locality Chips */}
          <div className="pt-2 flex flex-wrap justify-center items-center gap-2 text-xs">
            <span className="text-amber-200/90 font-medium text-xs flex items-center gap-1">
              <span>📍</span>
              <span>Popular Hubs:</span>
            </span>
            {["FC Road", "Kothrud (MIT)", "Karve Nagar", "Viman Nagar", "Hinjewadi", "Katraj"].map((area) => (
              <button
                key={area}
                type="button"
                onClick={() => {
                  const clean = area.split(" ")[0];
                  navigate(`/mess?search=${encodeURIComponent(clean)}`);
                }}
                className="bg-white/10 hover:bg-white/20 active:scale-95 text-stone-200 hover:text-white text-[11px] font-semibold px-3 py-1 rounded-full transition backdrop-blur-md border border-white/10 cursor-pointer"
              >
                {area}
              </button>
            ))}
          </div>

          {/* 3 High-Impact Live Guarantee Pills */}
          <div className="pt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl mx-auto text-left">
            <div className="glass-dark border border-white/10 rounded-2xl p-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-600/30 border border-orange-500/40 flex items-center justify-center shrink-0 text-orange-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <span className="text-xs font-bold text-white block">Zero Wait QR Entry</span>
                <span className="text-[11px] text-stone-400 block">Instant token check at counter</span>
              </div>
            </div>

            <div className="glass-dark border border-white/10 rounded-2xl p-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-600/30 border border-amber-500/40 flex items-center justify-center shrink-0 text-amber-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <span className="text-xs font-bold text-white block">Pause Passes Anytime</span>
                <span className="text-[11px] text-stone-400 block">Pause during exams or trips home</span>
              </div>
            </div>

            <div className="glass-dark border border-white/10 rounded-2xl p-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center shrink-0 text-emerald-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <span className="text-xs font-bold text-white block">FSSAI Certified Food</span>
                <span className="text-[11px] text-stone-400 block">Verified hygiene & kitchen checks</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── 5KM PROXIMITY RADAR INTERACTIVE CONTROL ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {!userLocation ? (
          // UNGRANTED STATE: High-energy radar invitation
          <div className="relative overflow-hidden bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 rounded-3xl p-6 sm:p-8 border border-orange-200 shadow-sm space-y-4">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              <div className="flex items-start sm:items-center gap-4">
                
                {/* Visual Animated Radar Dish */}
                <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-600 to-amber-600 text-white flex items-center justify-center shadow-md shrink-0">
                  <div className="absolute inset-0 rounded-2xl bg-orange-500/30 animate-radar pointer-events-none" />
                  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold text-orange-800 bg-orange-200/80 px-2.5 py-0.5 rounded-full border border-orange-300">
                      Live Proximity Radar
                    </span>
                    <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                      5 km Walking & Commute Match
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-stone-900 tracking-tight">
                    Find Collaborated Messes Within 5 km of You
                  </h3>
                  <p className="text-xs text-stone-600 max-w-xl">
                    Allow location permission so Messta can instantly detect your hostel, PG, or college and show verified canteens within short walking distance.
                  </p>
                </div>
              </div>

              {/* Action Button: GPS Access */}
              <div className="shrink-0">
                <button
                  type="button"
                  onClick={handleRequestLocation}
                  disabled={locationStatus === "requesting"}
                  className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {locationStatus === "requesting" ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Detecting Live GPS...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 004 11m0 0a8 8 0 008 8" />
                      </svg>
                      <span>Enable 5 km GPS Match</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Optional Location Feedback Message */}
            {locationFeedback && (
              <div className="text-xs font-semibold text-orange-950 bg-white/80 p-3 rounded-xl border border-orange-200">
                {locationFeedback}
              </div>
            )}

            {/* One-click College Campus Presets */}
            <div className="pt-3 border-t border-orange-200/60 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-stone-500 font-semibold text-xs">Or jump to campus:</span>
              {["FC Road", "Kothrud", "Karve Nagar", "Viman Nagar", "Hinjewadi", "Katraj"].map((hub) => (
                <button
                  key={hub}
                  type="button"
                  onClick={() => handleSelectAreaLocation(hub)}
                  className="px-3 py-1.5 bg-white hover:bg-orange-100 hover:text-orange-900 active:scale-95 text-stone-700 font-semibold text-xs rounded-xl border border-orange-200 shadow-2xs transition cursor-pointer"
                >
                  📍 {hub}
                </button>
              ))}
            </div>
          </div>
        ) : (
          // ACTIVE STATE: GPS Granted & Interactive Radius Bar
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center text-xl shadow-xs shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>GPS Active</span>
                  </span>
                  <span className="text-[11px] font-bold text-orange-800 bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200">
                    Radius: {radiusKm} km
                  </span>
                </div>
                <h3 className="text-base font-bold text-stone-900 mt-1">
                  {userLocation.label || "Live Position"} &bull;{" "}
                  <span className="text-orange-600">{countWithin5km} messes found</span>
                </h3>
              </div>
            </div>

            {/* Radius Switcher & Action Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex p-1 bg-stone-100 rounded-xl border border-stone-200">
                <button
                  type="button"
                  onClick={() => setRadiusKm(3)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                    radiusKm === 3
                      ? "bg-white text-orange-600 shadow-xs"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  3 km
                </button>
                <button
                  type="button"
                  onClick={() => setRadiusKm(5)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                    radiusKm === 5
                      ? "bg-white text-orange-600 shadow-xs"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  5 km (Standard)
                </button>
                <button
                  type="button"
                  onClick={() => setRadiusKm(10)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                    radiusKm === 10
                      ? "bg-white text-orange-600 shadow-xs"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  10 km
                </button>
                <button
                  type="button"
                  onClick={() => setRadiusKm(50)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                    radiusKm > 10
                      ? "bg-white text-orange-600 shadow-xs"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  All Pune
                </button>
              </div>

              <button
                type="button"
                onClick={handleRequestLocation}
                className="px-3 py-2 bg-stone-100 hover:bg-stone-200 active:scale-95 text-stone-700 text-xs font-semibold rounded-xl transition cursor-pointer"
                title="Refresh GPS Coordinates"
              >
                Refresh
              </button>

              <button
                type="button"
                onClick={handleClearLocation}
                className="px-3 py-2 text-stone-400 hover:text-stone-700 text-xs font-semibold rounded-xl transition cursor-pointer"
                title="Reset Location"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── CUISINE & CATEGORY PILLS BAR ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {[
            { id: "all", label: "All Pune Messes" },
            { id: "veg", label: "Pure Veg Homely" },
            { id: "north", label: "North Indian Thali" },
            { id: "maharashtrian", label: "Maharashtrian Poli Bhaji" },
            { id: "budget", label: "Under ₹75 Budget" },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat.id
                  ? "bg-stone-900 text-white shadow-sm"
                  : "bg-white hover:bg-stone-100 text-stone-700 border border-stone-200"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </section>

      {/* ── MESSES GRID DISPLAY ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold text-orange-700 bg-orange-50 px-2.5 py-0.5 rounded-md">
              {userLocation ? "Proximity Results" : "Verified Listings"}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-stone-900 mt-1 tracking-tight">
              {userLocation
                ? radiusKm <= 10
                  ? `Messes Within ${radiusKm} km of ${userLocation.label || "You"}`
                  : `All Messes around ${userLocation.label || "You"}`
                : "Top Student Messes in Pune"}
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              {userLocation
                ? "Sorted by nearest walking and commute distance from your location."
                : "Verified kitchens offering wholesome daily thalis, meal passes, and guaranteed slots."}
            </p>
          </div>

          <Link
            to="/mess"
            className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 group self-start sm:self-auto"
          >
            <span>Explore Complete Directory</span>
            <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
          </Link>
        </div>

        {/* Fallback Notice if no messes strictly <= 5 km */}
        {isFallbackClosest && (
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 font-medium flex items-center justify-between gap-3">
            <span>
              📍 No collaborated messes found strictly within {radiusKm} km of this point. Showing the closest available messes across Pune below:
            </span>
            <Link
              to="/mess"
              className="text-orange-700 underline font-bold shrink-0 hover:text-orange-900"
            >
              Browse All
            </Link>
          </div>
        )}

        {/* Loading Skeletons */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="bg-white rounded-3xl h-80 animate-pulse border border-stone-200"
              />
            ))}
          </div>
        ) : displayedMesses.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-stone-200 shadow-xs space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto text-2xl">
              🔍
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-stone-900">No Messes Found in This Filter</h3>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                No outlets currently match the selected radius or category. You can browse all verified partner kitchens across Pune.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory("all");
                  setRadiusKm(50);
                }}
                className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl transition"
              >
                Reset Filters & Show All
              </button>
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

      {/* ── MESS OWNER PARTNER CALLOUT BANNER ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 rounded-3xl p-8 sm:p-10 text-white border border-stone-800 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
              Mess Partners &bull; Canteen Owners
            </span>
            <h3 className="text-2xl font-black text-white tracking-tight">
              Run a Mess or Tiffin Service Near a Pune College?
            </h3>
            <p className="text-xs sm:text-sm text-stone-300 leading-relaxed font-normal">
              Eliminate daily food wastage, stop maintaining paper coupon books, and get guaranteed student headcount prep numbers every night on Messta.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/login"
              className="px-6 py-3.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition"
            >
              Partner Portal Login
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
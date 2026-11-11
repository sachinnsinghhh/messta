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

// Relatable student truths & humorous hooks (no corporate feature jargon)
const STUDENT_PUNCHLINES = [
  {
    title: "Kyunki Roz Maggi Se Pet Nahi Bharta.",
    sub: "Hostel ki paani wali dal ko bolo alvida. Find hot, hearty food near your campus — so you never have to lie to Mom when she asks 'Khana khaya beta?'",
  },
  {
    title: "Ghar Jaisa Khana. Minus Mummy Ke Taane.",
    sub: "Unlimited rotis, piping hot sabzi, and zero drama. Wholesome daily meals within walking distance of your hostel.",
  },
  {
    title: "Mummy Se Jhooth Mat Bolo Ki Khana Achha Hai.",
    sub: "Degree pass ho sakti hai, paani wali dal se pet nahi. Treat yourself to actual tasty food today.",
  },
  {
    title: "Pocket Money Bachao. Pet Bhar Ke Khao.",
    sub: "Because daily food delivery orders will make you broke by the 10th of the month. Eat good, spend less.",
  },
];

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

  // Rotating relatable student punchlines (cycles every 4.5 seconds)
  const [punchlineIndex, setPunchlineIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setPunchlineIndex((prev) => (prev + 1) % STUDENT_PUNCHLINES.length);
    }, 4500);
    return () => clearInterval(timer);
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

    // Filter by category tag if selected (All Messes vs Veg Only Mess)
    if (selectedCategory === "veg") {
      list = list.filter((m) => {
        if (m.isPureVeg || m.isVegOnly) return true;
        const nameLower = (m.name || "").toLowerCase();
        const cuisineLower = (m.cuisineType || "").toLowerCase();
        if (nameLower.includes("pure veg") || nameLower.includes("shuddh shakahari")) return true;
        if (cuisineLower.includes("pure veg") || cuisineLower.includes("gujarati")) return true;

        if (Array.isArray(m.activeThalis) && m.activeThalis.length > 0) {
          const hasNonVeg = m.activeThalis.some((t) => {
            const cat = (t.category || "").toLowerCase();
            const tName = (t.name || "").toLowerCase();
            return cat.includes("non") || tName.includes("chicken") || tName.includes("mutton") || tName.includes("fish") || tName.includes("egg");
          });
          if (!hasNonVeg) return true;
          return false;
        }

        return (cuisineLower.includes("veg") || nameLower.includes("veg")) && !nameLower.includes("non");
      });
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
    <div className="min-h-screen pb-24 space-y-12 text-stone-100">
      
      {/* ── HIGH-ENERGY CULINARY HERO SECTION ── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-stone-950 via-[#0B0F17] to-[#0B0F17] text-white py-16 sm:py-24 px-4 sm:px-6 lg:px-8 border-b border-stone-800/80">
        
        {/* Subtle Ambient Embers */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="max-w-5xl mx-auto text-center space-y-8 relative z-10">

          {/* Logo Showcase with Ambient Glow */}
          <div className="flex justify-center items-center">
            <div className="relative group inline-flex justify-center items-center">
              <div className="absolute -inset-8 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-full blur-2xl pointer-events-none" />
              <img
                src={messtaLogo}
                alt="Messta Logo"
                className="relative h-24 sm:h-32 object-contain drop-shadow-[0_16px_32px_rgba(0,0,0,0.7)] group-hover:scale-105 transition-transform duration-500"
              />
            </div>
          </div>

          {/* Relatable Student Meme Catchphrase & Subtitle */}
          <div className="space-y-3 max-w-3xl mx-auto">
            <h1 className="text-3xl sm:text-5xl font-bold text-white tracking-tight leading-tight min-h-[3.5rem] sm:min-h-[4rem] flex items-center justify-center transition-all duration-300">
              {STUDENT_PUNCHLINES[punchlineIndex].title}
            </h1>
            <p className="text-xs sm:text-sm text-stone-400 max-w-2xl mx-auto leading-relaxed font-mono min-h-[2.5rem] flex items-center justify-center transition-all duration-300">
              {STUDENT_PUNCHLINES[punchlineIndex].sub}
            </p>

            {/* Quick-tap relatable mood indicators */}
            <div className="pt-2 flex justify-center items-center gap-1.5">
              {STUDENT_PUNCHLINES.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPunchlineIndex(idx)}
                  className={`h-1 rounded-full transition-all duration-300 cursor-pointer ${
                    punchlineIndex === idx
                      ? "w-6 bg-amber-400"
                      : "w-2 bg-stone-700 hover:bg-stone-500"
                  }`}
                  aria-label={`Student truth ${idx + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Search Bar with Tactile Button */}
          <form
            onSubmit={handleSearchSubmit}
            className="mt-6 max-w-xl mx-auto flex items-center bg-stone-900/90 rounded-xl p-1.5 border border-stone-800 focus-within:border-stone-700 transition-all duration-300 shadow-xl"
          >
            <div className="pl-3.5 pr-2 text-stone-500">
              <svg className="w-4 h-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search area (Kothrud, FC Road, Hinjewadi) or mess..."
              value={searchArea}
              onChange={(e) => setSearchArea(e.target.value)}
              className="w-full px-2 py-2.5 text-xs sm:text-sm bg-transparent text-white rounded-lg focus:outline-none placeholder:text-stone-600 font-mono"
            />
            {searchArea && (
              <button
                type="button"
                onClick={() => setSearchArea("")}
                className="p-1.5 text-stone-400 hover:text-white text-xs font-bold mr-1"
              >
                &times;
              </button>
            )}
            <button
              type="submit"
              className="bg-stone-100 hover:bg-white text-stone-950 text-xs font-semibold px-4 py-2.5 rounded-lg transition btn-minimal whitespace-nowrap cursor-pointer font-mono"
            >
              SEARCH
            </button>
          </form>

          {/* Quick Pune Campus Locality Chips */}
          <div className="pt-2 flex flex-wrap justify-center items-center gap-2 text-xs font-mono">
            <span className="text-stone-400 text-xs">POPULAR:</span>
            {["FC Road", "Kothrud (MIT)", "Karve Nagar", "Viman Nagar", "Hinjewadi", "Katraj"].map((area) => (
              <button
                key={area}
                type="button"
                onClick={() => {
                  const clean = area.split(" ")[0];
                  navigate(`/mess?search=${encodeURIComponent(clean)}`);
                }}
                className="bg-stone-900/70 hover:bg-stone-800 text-stone-400 hover:text-stone-200 text-xs uppercase px-2.5 py-1 rounded-md transition border border-stone-800 cursor-pointer btn-minimal"
              >
                {area}
              </button>
            ))}
          </div>

        </div>
      </section>

      {/* ── 5KM PROXIMITY RADAR INTERACTIVE CONTROL ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {!userLocation ? (
          // UNGRANTED STATE: High-energy radar invitation
          <div className="relative overflow-hidden bg-stone-900/90 rounded-2xl p-6 sm:p-8 border border-stone-800 shadow-xl space-y-4 card-minimal">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              <div className="flex items-start sm:items-center gap-4">
                
                {/* Visual Animated Radar Dish */}
                <div className="relative w-12 h-12 rounded-xl bg-stone-950 border border-stone-800 text-amber-400 flex items-center justify-center shrink-0">
                  <div className="absolute inset-0 rounded-xl bg-amber-500/10 animate-radar pointer-events-none" />
                  <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 bg-stone-950 px-2 py-0.5 rounded-md border border-stone-800">
                      LIVE RADAR
                    </span>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 bg-stone-950 px-2 py-0.5 rounded-md border border-stone-800">
                      5 KM WALKING MATCH
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                    Find Collaborated Messes Within 5 km of You
                  </h3>
                  <p className="text-xs text-stone-400 max-w-xl font-mono">
                    Allow location permission so Messta can instantly detect your hostel or college and surface verified canteens within short walking distance.
                  </p>
                </div>
              </div>

              {/* Action Button: GPS Access */}
              <div className="shrink-0">
                <button
                  type="button"
                  onClick={handleRequestLocation}
                  disabled={locationStatus === "requesting"}
                  className="w-full sm:w-auto px-5 py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold font-mono text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50 btn-minimal cursor-pointer"
                >
                  {locationStatus === "requesting" ? (
                    <>
                      <span className="w-4 h-4 border-2 border-stone-950/30 border-t-stone-950 rounded-full animate-spin" />
                      <span>Detecting GPS...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 text-stone-950" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
              <div className="text-xs font-mono text-stone-300 bg-stone-950 p-3 rounded-xl border border-stone-800">
                {locationFeedback}
              </div>
            )}

            {/* One-click College Campus Presets */}
            <div className="pt-3 border-t border-stone-800 flex flex-wrap items-center gap-2 text-xs font-mono">
              <span className="text-stone-500 text-xs">CAMPUS PRESETS:</span>
              {["FC Road", "Kothrud", "Karve Nagar", "Viman Nagar", "Hinjewadi", "Katraj"].map((hub) => (
                <button
                  key={hub}
                  type="button"
                  onClick={() => handleSelectAreaLocation(hub)}
                  className="px-2.5 py-1 bg-stone-950 hover:bg-stone-800 text-stone-400 hover:text-white text-xs font-mono rounded-md border border-stone-800 transition cursor-pointer btn-minimal"
                >
                  {hub}
                </button>
              ))}
            </div>
          </div>
        ) : (
          // ACTIVE STATE: GPS Granted & Interactive Radius Bar
          <div className="bg-stone-900/90 rounded-2xl p-5 sm:p-6 border border-stone-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 card-minimal">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-stone-950 border border-stone-800 text-emerald-400 flex items-center justify-center text-lg shrink-0">
                <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 bg-stone-950 px-2 py-0.5 rounded-md border border-stone-800 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>GPS ACTIVE</span>
                  </span>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 bg-stone-950 px-2 py-0.5 rounded-md border border-stone-800">
                    RADIUS: {radiusKm} KM
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-semibold text-white mt-1">
                  {userLocation.label || "Live Position"} &bull;{" "}
                  <span className="text-amber-400 font-mono">{countWithin5km} messes found</span>
                </h3>
              </div>
            </div>

            {/* Radius Switcher & Action Controls */}
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
              <div className="inline-flex p-1 bg-stone-950 rounded-xl border border-stone-800">
                <button
                  type="button"
                  onClick={() => setRadiusKm(3)}
                  className={`px-3 py-1 text-xs rounded-lg transition cursor-pointer btn-minimal ${
                    radiusKm === 3
                      ? "bg-stone-800 text-white font-semibold"
                      : "text-stone-400 hover:text-white"
                  }`}
                >
                  3 KM
                </button>
                <button
                  type="button"
                  onClick={() => setRadiusKm(5)}
                  className={`px-3 py-1 text-xs rounded-lg transition cursor-pointer btn-minimal ${
                    radiusKm === 5
                      ? "bg-amber-500 text-stone-950 font-semibold"
                      : "text-stone-400 hover:text-white"
                  }`}
                >
                  5 KM
                </button>
                <button
                  type="button"
                  onClick={() => setRadiusKm(10)}
                  className={`px-3 py-1 text-xs rounded-lg transition cursor-pointer btn-minimal ${
                    radiusKm === 10
                      ? "bg-stone-800 text-white font-semibold"
                      : "text-stone-400 hover:text-white"
                  }`}
                >
                  10 KM
                </button>
                <button
                  type="button"
                  onClick={() => setRadiusKm(50)}
                  className={`px-3 py-1 text-xs rounded-lg transition cursor-pointer btn-minimal ${
                    radiusKm > 10
                      ? "bg-stone-800 text-white font-semibold"
                      : "text-stone-400 hover:text-white"
                  }`}
                >
                  ALL PUNE
                </button>
              </div>

              <button
                type="button"
                onClick={handleRequestLocation}
                className="px-3 py-1.5 bg-stone-950 hover:bg-stone-800 border border-stone-800 text-stone-300 text-xs rounded-lg transition cursor-pointer btn-minimal font-mono"
                title="Refresh GPS Coordinates"
              >
                REFRESH
              </button>

              <button
                type="button"
                onClick={handleClearLocation}
                className="px-3 py-1.5 text-stone-500 hover:text-rose-400 text-xs rounded-lg transition cursor-pointer font-mono"
                title="Reset Location"
              >
                CLEAR
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── CUISINE & CATEGORY PILLS BAR ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none font-mono text-xs">
          {[
            { id: "all", label: "ALL MESSES" },
            { id: "veg", label: "PURE VEG ONLY" },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer btn-minimal ${
                selectedCategory === cat.id
                  ? "bg-amber-500 text-stone-950 font-semibold shadow-xs"
                  : "bg-stone-900 text-stone-400 hover:text-white border border-stone-800"
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
            <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 bg-stone-950 px-2 py-0.5 rounded-md border border-stone-800">
              {userLocation ? "PROXIMITY RADAR" : "VERIFIED LISTINGS"}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1.5 tracking-tight">
              {userLocation
                ? radiusKm <= 10
                  ? `Messes Within ${radiusKm} km of ${userLocation.label || "You"}`
                  : `All Messes around ${userLocation.label || "You"}`
                : "Top Student Messes in Pune"}
            </h2>
            <p className="text-xs text-stone-400 mt-0.5 font-mono">
              {userLocation
                ? "Sorted by nearest walking and commute distance."
                : "Verified kitchens offering wholesome daily thalis and guaranteed meal slots."}
            </p>
          </div>

          <Link
            to="/mess"
            className="text-xs font-mono uppercase tracking-wider text-amber-400 hover:text-amber-300 flex items-center gap-1 group self-start sm:self-auto"
          >
            <span>EXPLORE DIRECTORY</span>
            <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
          </Link>
        </div>

        {/* Fallback Notice if no messes strictly <= 5 km */}
        {isFallbackClosest && (
          <div className="p-4 bg-stone-900/80 rounded-xl border border-stone-800 text-xs text-stone-300 font-mono flex items-center justify-between gap-3">
            <span>
              No messes found strictly within {radiusKm} km. Showing the closest available messes below:
            </span>
            <Link
              to="/mess"
              className="text-amber-400 underline font-semibold shrink-0 hover:text-amber-300"
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
                className="bg-stone-900/60 rounded-2xl h-80 animate-pulse border border-stone-800"
              />
            ))}
          </div>
        ) : displayedMesses.length === 0 ? (
          <div className="p-12 text-center bg-stone-900/60 rounded-2xl border border-stone-800 shadow-xs space-y-4">
            <div className="w-12 h-12 rounded-xl bg-stone-950 border border-stone-800 text-stone-400 flex items-center justify-center mx-auto text-xl">
              ∅
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-white">No Messes Found in This Filter</h3>
              <p className="text-xs text-stone-400 max-w-md mx-auto font-mono">
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
                className="px-4 py-2 bg-stone-100 hover:bg-white text-stone-950 font-semibold text-xs rounded-lg transition btn-minimal font-mono"
              >
                RESET FILTERS & SHOW ALL
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

    </div>
  );
}
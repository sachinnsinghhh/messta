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
    <div className="min-h-screen bg-white pb-24 space-y-12">
      
      {/* ── HUMANIZED CLEAN FOOD HERO SECTION (ZOMATO STYLE) ── */}
      <section className="bg-gradient-to-b from-orange-50/70 via-orange-50/30 to-white text-gray-900 py-12 sm:py-16 px-4 sm:px-6 lg:px-8 border-b border-gray-100">
        <div className="max-w-4xl mx-auto text-center space-y-6">

          {/* Logo Showcase */}
          <div className="flex justify-center items-center">
            <img
              src={messtaLogo}
              alt="Messta Logo"
              className="h-20 sm:h-24 object-contain"
            />
          </div>

          {/* Natural, Grounded Headline */}
          <div className="space-y-2 max-w-2xl mx-auto">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight leading-tight">
              {STUDENT_PUNCHLINES[punchlineIndex].title}
            </h1>
            <p className="text-sm sm:text-base text-gray-600 leading-relaxed font-normal">
              {STUDENT_PUNCHLINES[punchlineIndex].sub}
            </p>

            {/* Subtle truth switcher dots */}
            <div className="pt-2 flex justify-center items-center gap-1.5">
              {STUDENT_PUNCHLINES.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPunchlineIndex(idx)}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    punchlineIndex === idx
                      ? "w-6 bg-orange-600"
                      : "w-2 bg-gray-300 hover:bg-gray-400"
                  }`}
                  aria-label={`Student truth ${idx + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Real Zomato-style Search Bar */}
          <form
            onSubmit={handleSearchSubmit}
            className="mt-6 max-w-2xl mx-auto flex flex-col sm:flex-row items-center bg-white rounded-2xl p-2 shadow-lg shadow-gray-200/50 border border-gray-200 gap-2"
          >
            <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-700 border-b sm:border-b-0 sm:border-r border-gray-200 w-full sm:w-auto shrink-0">
              <svg className="w-4 h-4 text-orange-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Pune, MH</span>
            </div>

            <div className="flex items-center flex-1 w-full px-2">
              <svg className="w-4 h-4 text-gray-400 mr-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by area (Kothrud, FC Road, Hinjewadi) or mess name..."
                value={searchArea}
                onChange={(e) => setSearchArea(e.target.value)}
                className="w-full py-2 text-xs sm:text-sm text-gray-900 focus:outline-none placeholder:text-gray-400"
              />
              {searchArea && (
                <button
                  type="button"
                  onClick={() => setSearchArea("")}
                  className="p-1 text-gray-400 hover:text-gray-600 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              type="submit"
              className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold px-6 py-3 rounded-xl transition shadow-sm whitespace-nowrap cursor-pointer"
            >
              Search
            </button>
          </form>

          {/* Campus Hub Links */}
          <div className="pt-2 flex flex-wrap justify-center items-center gap-2 text-xs">
            <span className="text-gray-500 font-medium text-xs">Popular Areas:</span>
            {["FC Road", "Kothrud (MIT)", "Karve Nagar", "Viman Nagar", "Hinjewadi", "Katraj"].map((area) => (
              <button
                key={area}
                type="button"
                onClick={() => {
                  const clean = area.split(" ")[0];
                  navigate(`/mess?search=${encodeURIComponent(clean)}`);
                }}
                className="bg-white hover:bg-orange-50 hover:text-orange-600 text-gray-600 text-xs font-medium px-3 py-1 rounded-full transition border border-gray-200 cursor-pointer"
              >
                {area}
              </button>
            ))}
          </div>

        </div>
      </section>

      {/* ── CLEAN PROXIMITY SECTION ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {!userLocation ? (
          <div className="bg-orange-50/60 rounded-2xl p-6 border border-orange-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded">
                Nearby Canteens
              </span>
              <h3 className="text-base sm:text-lg font-bold text-gray-900">
                Find messes within walking distance of your hostel
              </h3>
              <p className="text-xs text-gray-600">
                Share your location to see Pune student messes sorted by distance from you.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={handleRequestLocation}
                disabled={locationStatus === "requesting"}
                className="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {locationStatus === "requesting" ? "Detecting location..." : "Use current location"}
              </button>
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
            { id: "all", label: "All Messes" },
            { id: "veg", label: "Veg Only Mess" },
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
                : "Verified kitchens offering wholesome daily thalis and guaranteed meal slots."}
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

    </div>
  );
}
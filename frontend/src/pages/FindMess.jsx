import { API_BASE_URL } from "../config/api";
import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import MessCard from "../components/MessCard";

const CUISINE_OPTIONS = [
  "All",
  "Veg Only",
  "Both Veg & Non-Veg",
];

const POPULAR_HUBS = ["FC Road", "Kothrud", "Karve Nagar", "Viman Nagar", "Hinjewadi", "Katraj"];

export default function FindMess() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") || "";

  const [messes, setMesses] = useState([]);
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [selectedCuisine, setSelectedCuisine] = useState("All");
  const [sortBy, setSortBy] = useState("recommended");
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Sync initial query param if present
  useEffect(() => {
    if (initialSearch && !searchTerm) {
      setSearchTerm(initialSearch);
    }
  }, [initialSearch, searchTerm]);

  useEffect(() => {
    let ignore = false;
    const fetchMesses = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE_URL}/api/mess?showAll=true`);
        if (!res.ok) throw new Error("Failed to load listings");
        const result = await res.json();

        if (!ignore) {
          if (result.data && result.data.length > 0) {
            setMesses(result.data);
          } else {
            setMesses([]);
          }
        }
      } catch (err) {
        console.warn("Backend load error:", err.message);
        if (!ignore) setMesses([]);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchMesses();
    return () => {
      ignore = true;
    };
  }, []);

  // Multi-facet search and sorting algorithm
  const filteredMesses = useMemo(() => {
    let list = [...messes];

    // Search filter across name, locality, cuisine
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      list = list.filter(
        (m) =>
          m.name?.toLowerCase().includes(term) ||
          m.locality?.toLowerCase().includes(term) ||
          m.cuisineType?.toLowerCase().includes(term) ||
          m.city?.toLowerCase().includes(term)
      );
    }

    // Food Category Filter
    if (selectedCuisine !== "All") {
      if (selectedCuisine === "Veg Only") {
        list = list.filter((m) => {
          const c = (m.cuisineType || "").toLowerCase();
          const n = (m.name || "").toLowerCase();
          return (c.includes("veg") || n.includes("veg")) && !c.includes("non") && !n.includes("non");
        });
      } else if (selectedCuisine === "Both Veg & Non-Veg") {
        list = list.filter((m) => {
          const c = (m.cuisineType || "").toLowerCase();
          return c.includes("non") || c.includes("both");
        });
      } else {
        list = list.filter((m) => m.cuisineType === selectedCuisine);
      }
    }

    // Only Open Filter
    if (onlyOpen) {
      list = list.filter((m) => m.isOpen !== false);
    }

    // Sorting
    if (sortBy === "price_asc") {
      list.sort((a, b) => (a.pricePerMeal || 0) - (b.pricePerMeal || 0));
    } else if (sortBy === "price_desc") {
      list.sort((a, b) => (b.pricePerMeal || 0) - (a.pricePerMeal || 0));
    } else if (sortBy === "capacity") {
      list.sort((a, b) => (b.seatingCapacity || 0) - (a.seatingCapacity || 0));
    }

    return list;
  }, [messes, searchTerm, selectedCuisine, onlyOpen, sortBy]);

  const handleHubClick = (hub) => {
    setSearchTerm(hub);
    setSearchParams({ search: hub });
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setSelectedCuisine("All");
    setOnlyOpen(false);
    setSortBy("recommended");
    setSearchParams({});
  };

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8 text-stone-100">
      
      {/* ── SEARCH & FILTER HEADER ── */}
      <div className="bg-stone-900/90 rounded-2xl p-6 sm:p-8 border border-stone-800 shadow-xl space-y-6 card-minimal">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 bg-stone-950 px-2.5 py-1 rounded-md border border-stone-800">
              OUTLETS // PUNE DIRECTORY
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-2.5">
              Explore Partner Canteens
            </h1>
            <p className="text-xs sm:text-sm text-stone-400 mt-1 font-mono">
              Hygienic daily thalis, verified menus, and real-time counter availability.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto font-mono text-xs">
            <label className="text-stone-400 text-xs">SORT:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-stone-950 border border-stone-800 text-stone-200 text-xs font-mono py-2 px-3 rounded-lg focus:border-stone-700 focus:outline-none cursor-pointer"
            >
              <option value="recommended">RECOMMENDED</option>
              <option value="price_asc">PRICE: LOW TO HIGH</option>
              <option value="price_desc">PRICE: HIGH TO LOW</option>
              <option value="capacity">LARGEST SEATING</option>
            </select>
          </div>
        </div>

        {/* Search Bar & Instant Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500">
              <svg className="w-4 h-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search by area (Kothrud, FC Road, Hinjewadi), mess name, or cuisine..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                if (e.target.value) {
                  setSearchParams({ search: e.target.value });
                } else {
                  setSearchParams({});
                }
              }}
              className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm bg-stone-950 border border-stone-800 rounded-xl focus:border-stone-600 focus:outline-none transition-all placeholder:text-stone-600 font-mono text-white"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setSearchParams({});
                }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white text-sm font-bold"
              >
                &times;
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setOnlyOpen(!onlyOpen)}
            className={`px-4 py-2.5 rounded-xl text-xs font-mono tracking-wider transition-all border flex items-center justify-center gap-2 cursor-pointer btn-minimal ${
              onlyOpen
                ? "bg-emerald-950/60 text-emerald-300 border-emerald-800"
                : "bg-stone-950 text-stone-400 border-stone-800 hover:text-white"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${onlyOpen ? "bg-emerald-400 animate-pulse" : "bg-stone-600"}`} />
            <span>{onlyOpen ? "OPEN ONLY" : "ALL STATUS"}</span>
          </button>
        </div>

        {/* Quick Hub Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-mono">
          <span className="text-stone-400 text-xs">CAMPUS HUBS:</span>
          {POPULAR_HUBS.map((hub) => (
            <button
              key={hub}
              type="button"
              onClick={() => handleHubClick(hub)}
              className={`px-3 py-1 rounded-md text-xs font-mono uppercase tracking-wider transition-all cursor-pointer btn-minimal ${
                searchTerm.toLowerCase() === hub.toLowerCase()
                  ? "bg-stone-100 text-stone-950 font-semibold"
                  : "bg-stone-950/70 hover:bg-stone-800 text-stone-400 hover:text-stone-200 border border-stone-800"
              }`}
            >
              {hub}
            </button>
          ))}
        </div>

        {/* Cuisine Chips */}
        <div className="flex flex-wrap gap-2 pt-3 border-t border-stone-800/80 font-mono">
          {CUISINE_OPTIONS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setSelectedCuisine(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all cursor-pointer btn-minimal ${
                selectedCuisine === c
                  ? "bg-amber-500 text-stone-950 font-semibold shadow-xs"
                  : "bg-stone-950 text-stone-400 hover:text-white hover:bg-stone-800 border border-stone-800"
              }`}
            >
              {c === "All" ? "ALL MENUS" : c === "Veg Only" ? "PURE VEG" : "VEG & NON-VEG"}
            </button>
          ))}
        </div>
      </div>

      {/* ── RESULTS GRID ── */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-1 font-mono text-xs text-stone-400">
          <span>
            FOUND <strong className="text-white font-semibold">{filteredMesses.length}</strong> OUTLETS
          </span>

          {(searchTerm || selectedCuisine !== "All" || onlyOpen) && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-amber-400 hover:text-amber-300 font-mono text-xs underline cursor-pointer"
            >
              RESET FILTERS
            </button>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-stone-900/60 rounded-2xl h-80 animate-pulse border border-stone-800" />
            ))}
          </div>
        ) : filteredMesses.length === 0 ? (
          <div className="bg-stone-900/60 rounded-2xl p-12 text-center border border-stone-800 shadow-xs space-y-3">
            <div className="w-12 h-12 rounded-xl bg-stone-950 border border-stone-800 text-stone-400 flex items-center justify-center mx-auto text-xl">
              ∅
            </div>
            <h3 className="text-base font-semibold text-white">No Matching Outlets Found</h3>
            <p className="text-xs text-stone-400 max-w-sm mx-auto font-mono">
              Try adjusting your search query or radius filter to view listings across Pune.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-4 py-2 bg-stone-100 hover:bg-white text-stone-950 font-semibold text-xs rounded-lg transition btn-minimal cursor-pointer font-mono"
              >
                RESET ALL FILTERS
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMesses.map((m) => (
              <MessCard key={m._id || m.id} mess={m} />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
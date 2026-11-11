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
    <div className="min-h-screen bg-gray-50/50 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      
      {/* ── SEARCH & FILTER HEADER (ZOMATO/SWIGGY STANDARD) ── */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 border border-gray-200 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Messes in Pune
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Find verified mess canteens and daily thalis near student campuses.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <label className="text-xs font-medium text-gray-500">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-white border border-gray-300 text-gray-800 text-xs font-medium py-2 px-3 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none cursor-pointer"
            >
              <option value="recommended">Recommended</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="capacity">Seating Capacity</option>
            </select>
          </div>
        </div>

        {/* Search Bar & Instant Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search by area (Kothrud, FC Road, Hinjewadi) or mess name..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                if (e.target.value) {
                  setSearchParams({ search: e.target.value });
                } else {
                  setSearchParams({});
                }
              }}
              className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all placeholder:text-gray-400 text-gray-900"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setSearchParams({});
                }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 text-sm font-bold"
              >
                &times;
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setOnlyOpen(!onlyOpen)}
            className={`px-4 py-2.5 rounded-xl text-xs font-medium transition-colors border flex items-center justify-center gap-2 cursor-pointer ${
              onlyOpen
                ? "bg-green-700 text-white border-green-700"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${onlyOpen ? "bg-white" : "bg-green-600"}`} />
            <span>Open Now</span>
          </button>
        </div>

        {/* Quick Hub Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="text-gray-500 font-medium text-xs">Campus Hubs:</span>
          {POPULAR_HUBS.map((hub) => (
            <button
              key={hub}
              type="button"
              onClick={() => handleHubClick(hub)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                searchTerm.toLowerCase() === hub.toLowerCase()
                  ? "bg-orange-600 text-white"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-700"
              }`}
            >
              {hub}
            </button>
          ))}
        </div>

        {/* Cuisine Chips */}
        <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
          {CUISINE_OPTIONS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setSelectedCuisine(c)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                selectedCuisine === c
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {c === "All" ? "All" : c === "Veg Only" ? "Pure Veg" : "Veg & Non-Veg"}
            </button>
          ))}
        </div>
      </div>

      {/* ── RESULTS GRID ── */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <span className="text-xs font-semibold text-stone-500">
            Showing <strong className="text-stone-900 font-bold">{filteredMesses.length}</strong> outlets in Pune
          </span>

          {(searchTerm || selectedCuisine !== "All" || onlyOpen) && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs text-orange-600 hover:text-orange-700 font-bold underline cursor-pointer"
            >
              Clear All Filters
            </button>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white rounded-3xl h-80 animate-pulse border border-stone-200" />
            ))}
          </div>
        ) : filteredMesses.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-200 space-y-3">
            <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-gray-900">No mess outlets found</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Try searching for a different area like &ldquo;Kothrud&rdquo;, &ldquo;FC Road&rdquo;, or &ldquo;Hinjewadi&rdquo;.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium text-xs rounded-lg transition cursor-pointer"
              >
                Reset Filters
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
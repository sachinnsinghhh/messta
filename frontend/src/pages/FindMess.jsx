import { API_BASE_URL } from "../config/api";
import { useState, useEffect, useMemo } from "react";
import MessCard from "../components/MessCard";

const CUISINE_OPTIONS = [
  "All",
  "North Indian",
  "South Indian",
  "Maharashtrian",
  "Gujarati",
  "Multi-Cuisine",
];

export default function FindMess() {
  const [messes, setMesses] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCuisine, setSelectedCuisine] = useState("All");
  const [sortBy, setSortBy] = useState("recommended");
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMesses = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE_URL}/api/mess?showAll=true`);
        if (!res.ok) throw new Error("Failed to load listings");
        const result = await res.json();

        if (result.data && result.data.length > 0) {
          setMesses(result.data);
        } else {
          setMesses([]);
        }
      } catch (err) {
        console.warn("Backend load error:", err.message);
        setMesses([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMesses();
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

    // Cuisine Filter
    if (selectedCuisine !== "All") {
      list = list.filter((m) => m.cuisineType === selectedCuisine);
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

  return (
    <div className="min-h-screen bg-gray-50/70 py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      
      {/* ── SEARCH & FILTER HEADER ── */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full">
              Student Mess Directory • Pune
            </span>
            <h1 className="text-2xl sm:text-4xl font-black text-gray-900 tracking-tight mt-1">
              Explore Canteens & Tiffin Centers
            </h1>
            <p className="text-xs sm:text-sm text-gray-500">
              Find hygienic, student-budget friendly mess options with live available seats.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-gray-500">Sort By:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-gray-50 border border-gray-300 text-gray-900 text-xs font-bold py-2 px-3 rounded-xl focus:ring-2 focus:ring-orange-500"
            >
              <option value="recommended">Recommended</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="capacity">Largest Seating Capacity</option>
            </select>
          </div>
        </div>

        {/* Search Bar & Instant Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
              🔍
            </span>
            <input
              type="text"
              placeholder="Search by area (Kothrud, FC Road, Hinjewadi), mess name, or cuisine..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 text-xs sm:text-sm bg-gray-50 border border-gray-300 rounded-2xl focus:bg-white focus:ring-2 focus:ring-orange-500 transition-all placeholder:text-gray-400"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setOnlyOpen(!onlyOpen)}
            className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold uppercase tracking-wider transition-all border ${
              onlyOpen
                ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                : "bg-gray-50 text-gray-700 border-gray-300 hover:border-gray-400"
            }`}
          >
            {onlyOpen ? "✓ Open Now Only" : "Show All Status"}
          </button>
        </div>

        {/* Cuisine Chips */}
        <div className="flex flex-wrap gap-2 pt-1 border-t border-gray-100">
          {CUISINE_OPTIONS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setSelectedCuisine(c)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                selectedCuisine === c
                  ? "bg-orange-600 text-white shadow-xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* ── RESULTS GRID ── */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <span className="text-xs font-bold text-gray-500">
            Showing <strong className="text-gray-900">{filteredMesses.length}</strong> outlets in Pune
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white rounded-3xl h-80 animate-pulse border border-gray-200"></div>
            ))}
          </div>
        ) : filteredMesses.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-gray-200 shadow-xs space-y-3">
            <span className="text-4xl">🔍</span>
            <h3 className="text-base font-extrabold text-gray-900">No Matching Mess Outlets Found</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              We couldn't find any mess matching your search query. Try searching for a different locality like "FC Road" or "Kothrud".
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setSelectedCuisine("All");
                setOnlyOpen(false);
              }}
              className="mt-2 px-4 py-2 bg-orange-600 text-white font-bold text-xs rounded-xl"
            >
              Reset Filters
            </button>
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
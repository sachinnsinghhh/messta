import { Link } from "react-router-dom";

export default function MessCard({ mess }) {
  const messId = mess._id || mess.id;
  const isLunchFull = mess.availableSlots?.lunch === 0;
  const isOpen = mess.isOpen !== false;

  // Compute walking time from distance if available (average walking speed 4.5 km/h)
  const walkingMinutes =
    mess.distanceKm !== undefined
      ? Math.max(2, Math.round((mess.distanceKm / 4.5) * 60))
      : null;

  const lunchSlots = mess.availableSlots?.lunch ?? 20;
  const dinnerSlots = mess.availableSlots?.dinner ?? 20;

  // Determine current meal window for lively context
  const currentHour = new Date().getHours();
  const isLunchHour = currentHour >= 11 && currentHour < 16;
  const isDinnerHour = currentHour >= 18 && currentHour < 23;
  const activeMealLabel = isLunchHour
    ? "Lunch Service Active"
    : isDinnerHour
    ? "Dinner Service Active"
    : "Kitchen Prepping";

  // Determine actual starting plate price from active thalis or mess pricing
  const effectivePrice = (() => {
    if (mess.activeThalis && Array.isArray(mess.activeThalis) && mess.activeThalis.length > 0) {
      const activePrices = mess.activeThalis
        .filter((t) => t.isActive !== false && Number(t.sellingPrice) > 0)
        .map((t) => Number(t.sellingPrice));
      if (activePrices.length > 0) {
        return Math.min(...activePrices);
      }
    }
    if (mess.pricePerMeal && mess.pricePerMeal !== 80) {
      return mess.pricePerMeal;
    }
    return 65;
  })();

  return (
    <article className="group bg-white rounded-3xl border-2 border-orange-100 overflow-hidden shadow-md hover:shadow-xl hover:shadow-orange-950/10 hover:border-orange-400/90 transition-all duration-300 flex flex-col justify-between card-playful">
      
      {/* ── PHOTO CONTAINER WITH DYNAMIC BADGES ── */}
      <div className="relative h-52 w-full bg-orange-50 overflow-hidden">
        <img
          src={mess.imageUrl || "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600"}
          alt={mess.name}
          className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700 ease-out"
          loading="lazy"
        />

        {/* Ambient top & bottom gradient overlays for badge contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/85 via-transparent to-stone-950/40 pointer-events-none" />

        {/* Top Badges: Locality & Walking Proximity */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-10">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="glass-dark text-white text-[11px] font-bold px-2.5 py-1 rounded-full border border-white/20 shadow-sm flex items-center gap-1">
              <svg className="w-3 h-3 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>{mess.locality}</span>
            </span>

            {mess.distanceKm !== undefined && (
              <span className="bg-emerald-600/95 backdrop-blur-md text-white text-[11px] font-black px-2.5 py-1 rounded-full border border-emerald-400/40 shadow-sm flex items-center gap-1">
                <span>{mess.distanceKm < 1 ? `${Math.round(mess.distanceKm * 1000)}m` : `${mess.distanceKm.toFixed(1)} km`}</span>
                <span className="text-emerald-200 text-[10px]">&bull; ~{walkingMinutes}m walk</span>
              </span>
            )}
          </div>

          {/* Open / Closed Live Pulse */}
          <span
            className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full backdrop-blur-md shadow-sm border flex items-center gap-1.5 shrink-0 ${
              isOpen
                ? "bg-emerald-600/90 text-white border-emerald-400/40"
                : "bg-stone-800/90 text-stone-300 border-stone-700"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isOpen ? "bg-emerald-300 animate-pulse" : "bg-stone-500"
              }`}
            />
            <span>{isOpen ? "Open" : "Closed"}</span>
          </span>
        </div>

        {/* Bottom Overlays: Cuisine Tag & Rating */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 z-10">
          <span className="bg-gradient-to-r from-orange-600 to-amber-600 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg shadow-sm border border-orange-400/40 flex items-center gap-1">
            <span>🍛</span>
            <span>{mess.cuisineType || "Homely Thali"}</span>
          </span>

          <span className="bg-amber-400 text-stone-900 text-[11px] font-black px-2.5 py-0.5 rounded-lg shadow-sm border border-amber-300 flex items-center gap-1">
            <span>⭐</span>
            <span>4.8</span>
          </span>
        </div>
      </div>

      {/* ── CARD CONTENT BODY ── */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          {/* Outlet Title & Seating */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-lg text-stone-900 group-hover:text-orange-600 transition-colors leading-snug line-clamp-1">
              {mess.name}
            </h3>

            {mess.seatingCapacity && (
              <span className="text-[11px] font-semibold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md shrink-0 flex items-center gap-1 border border-stone-200/60">
                <span>🪑</span>
                <span>{mess.seatingCapacity} seats</span>
              </span>
            )}
          </div>

          {/* Current Service Indicator */}
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-stone-500">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
            <span>{activeMealLabel}</span>
          </div>

          {/* Today's Special Lunch Note */}
          <div className="mt-3.5 bg-gradient-to-r from-orange-50/80 to-amber-50/50 p-3 rounded-2xl border border-orange-200/60 transition group-hover:border-orange-300">
            <div className="flex items-center justify-between text-[10px] font-bold text-orange-800 uppercase tracking-wide">
              <span>Today&rsquo;s Thali Menu</span>
              <span className="text-orange-600 font-semibold">Fresh Daily</span>
            </div>
            <p className="text-xs text-stone-800 mt-1 line-clamp-2 leading-relaxed font-medium">
              {mess.todayMenu?.lunch || "Fresh Phulkas, Dal Tadka, Seasonal Sabzi, Steamed Rice & Salad"}
            </p>
          </div>

          {/* Real-time Slot Availability Meters */}
          <div className="mt-3.5 pt-3 border-t border-stone-100 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-500 font-medium">Lunch:</span>
              {isLunchFull ? (
                <span className="text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded text-[11px]">
                  Sold Out
                </span>
              ) : (
                <div className="flex items-center gap-1.5">
                  <div className="w-16 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        lunchSlots < 8 ? "bg-amber-500" : "bg-emerald-500"
                      }`}
                      style={{ width: `${Math.min(100, (lunchSlots / 30) * 100)}%` }}
                    />
                  </div>
                  <span className="font-bold text-stone-900 text-[11px]">
                    {lunchSlots} left
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-500 font-medium">Dinner:</span>
              <div className="flex items-center gap-1.5">
                <div className="w-16 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${Math.min(100, (dinnerSlots / 30) * 100)}%` }}
                  />
                </div>
                <span className="font-bold text-stone-900 text-[11px]">
                  {dinnerSlots} left
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── CARD FOOTER: PRICING & ACTIONS ── */}
        <div className="pt-3.5 border-t border-stone-100 flex items-center justify-between gap-2">
          <div>
            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">
              Per Meal
            </span>
            <div className="flex items-baseline gap-0.5">
              <span className="text-lg font-black text-stone-900">₹{effectivePrice}</span>
              <span className="text-[10px] text-stone-500 font-normal">/thali</span>
            </div>
          </div>

          <Link
            to={`/mess/${messId}`}
            className="px-5 py-2.5 bg-gradient-to-r from-orange-600 via-amber-500 to-orange-600 hover:from-orange-500 hover:to-amber-400 text-white text-xs font-black rounded-2xl shadow-md shadow-orange-500/20 transition-all flex items-center gap-1.5 btn-bouncy cursor-pointer"
          >
            <span>Reserve Plate →</span>
          </Link>
        </div>

      </div>
    </article>
  );
}
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
    <article className="group bg-stone-900/90 rounded-2xl border border-stone-800 hover:border-stone-700 overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 flex flex-col justify-between card-minimal text-stone-100">
      
      {/* ── PHOTO CONTAINER WITH MINIMALIST BADGES ── */}
      <div className="relative h-48 w-full bg-stone-950 overflow-hidden">
        <img
          src={mess.imageUrl || "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600"}
          alt={mess.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out opacity-90 group-hover:opacity-100"
          loading="lazy"
        />

        {/* Ambient top & bottom gradient overlays for badge contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/30 to-stone-950/60 pointer-events-none" />

        {/* Top Badges: Locality & Walking Proximity */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-10">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="bg-stone-950/80 backdrop-blur-md text-stone-200 text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-md border border-stone-800 shadow-sm flex items-center gap-1">
              <svg className="w-3 h-3 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>{mess.locality}</span>
            </span>

            {mess.distanceKm !== undefined && (
              <span className="bg-stone-950/80 backdrop-blur-md text-stone-300 text-[10px] font-mono px-2 py-0.5 rounded-md border border-stone-800 shadow-sm flex items-center gap-1">
                <span>{mess.distanceKm < 1 ? `${Math.round(mess.distanceKm * 1000)}m` : `${mess.distanceKm.toFixed(1)} km`}</span>
                <span className="text-stone-500">&bull; ~{walkingMinutes}m walk</span>
              </span>
            )}
          </div>

          {/* Open / Closed Live Pulse */}
          <span
            className={`text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-md backdrop-blur-md border flex items-center gap-1.5 shrink-0 ${
              isOpen
                ? "bg-emerald-950/70 text-emerald-300 border-emerald-800/80"
                : "bg-stone-950/80 text-stone-400 border-stone-800"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isOpen ? "bg-emerald-400 animate-pulse" : "bg-stone-500"
              }`}
            />
            <span>{isOpen ? "LIVE" : "CLOSED"}</span>
          </span>
        </div>

        {/* Bottom Overlays: Cuisine Tag & Rating */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 z-10">
          <span className="bg-stone-950/85 backdrop-blur-md text-stone-300 text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-md border border-stone-800 flex items-center gap-1">
            <span>{mess.cuisineType || "Homely Thali"}</span>
          </span>

          <span className="bg-stone-950/85 backdrop-blur-md text-amber-400 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border border-stone-800 flex items-center gap-1">
            <span>★</span>
            <span>4.8</span>
          </span>
        </div>
      </div>

      {/* ── CARD CONTENT BODY ── */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          {/* Outlet Title & Seating */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-base text-white group-hover:text-amber-400 transition-colors leading-snug line-clamp-1">
              {mess.name}
            </h3>

            {mess.seatingCapacity && (
              <span className="text-[10px] font-mono text-stone-400 bg-stone-950 px-2 py-0.5 rounded-md shrink-0 flex items-center gap-1 border border-stone-800">
                <span>{mess.seatingCapacity} seats</span>
              </span>
            )}
          </div>

          {/* Current Service Indicator */}
          <div className="mt-1 flex items-center gap-1.5 text-[10px] font-mono text-stone-400 uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            <span>{activeMealLabel}</span>
          </div>

          {/* Today's Special Lunch Note */}
          <div className="mt-3 bg-stone-950/60 p-3 rounded-xl border border-stone-800/80 transition group-hover:border-stone-700">
            <div className="flex items-center justify-between text-[9px] font-mono uppercase tracking-wider text-stone-400">
              <span>TODAY&rsquo;S MENU</span>
              <span className="text-amber-400 font-semibold">FRESH DAILY</span>
            </div>
            <p className="text-xs text-stone-300 mt-1 line-clamp-2 leading-relaxed">
              {mess.todayMenu?.lunch || "Fresh Phulkas, Dal Tadka, Seasonal Sabzi, Steamed Rice & Salad"}
            </p>
          </div>

          {/* Real-time Slot Availability Meters */}
          <div className="mt-3 pt-3 border-t border-stone-800/80 space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="text-stone-400 text-[11px] uppercase tracking-wider">Lunch:</span>
              {isLunchFull ? (
                <span className="text-rose-400 text-[10px] font-mono uppercase bg-rose-950/40 border border-rose-900/50 px-1.5 py-0.5 rounded">
                  Sold Out
                </span>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1 bg-stone-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        lunchSlots < 8 ? "bg-amber-400" : "bg-emerald-400"
                      }`}
                      style={{ width: `${Math.min(100, (lunchSlots / 30) * 100)}%` }}
                    />
                  </div>
                  <span className="text-stone-200 text-[11px]">
                    {lunchSlots} left
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-stone-400 text-[11px] uppercase tracking-wider">Dinner:</span>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1 bg-stone-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-400"
                    style={{ width: `${Math.min(100, (dinnerSlots / 30) * 100)}%` }}
                  />
                </div>
                <span className="text-stone-200 text-[11px]">
                  {dinnerSlots} left
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── CARD FOOTER: PRICING & ACTIONS ── */}
        <div className="pt-3 border-t border-stone-800/80 flex items-center justify-between gap-2">
          <div>
            <span className="text-[9px] text-stone-500 font-mono uppercase tracking-wider block">
              RATE / MEAL
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-base font-mono font-medium text-amber-400">₹{effectivePrice}.00</span>
              <span className="text-[10px] text-stone-400 font-mono">/thali</span>
            </div>
          </div>

          <Link
            to={`/mess/${messId}`}
            className="px-3.5 py-2 bg-stone-100 hover:bg-white text-stone-950 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 btn-minimal cursor-pointer"
          >
            <span>Select Slot →</span>
          </Link>
        </div>

      </div>
    </article>
  );
}
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
    <article className="group bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-xs hover:shadow-lg hover:border-gray-200 transition-all duration-200 flex flex-col justify-between">
      
      {/* ── PHOTO CONTAINER ── */}
      <div className="relative h-48 w-full bg-gray-100 overflow-hidden">
        <img
          src={mess.imageUrl || "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600"}
          alt={mess.name}
          className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500 ease-out"
          loading="lazy"
        />

        {/* Ambient bottom gradient for text contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 pointer-events-none" />

        {/* Top Badges: Locality & Open status */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-10">
          <span className="bg-black/60 backdrop-blur-md text-white text-[11px] font-semibold px-2.5 py-1 rounded-full border border-white/20">
            {mess.locality}
          </span>

          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-md ${
              isOpen
                ? "bg-green-600/90 text-white"
                : "bg-gray-800/90 text-gray-300"
            }`}
          >
            {isOpen ? "Open Now" : "Closed"}
          </span>
        </div>

        {/* Bottom Bar: Cuisine & Rating */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 z-10">
          <span className="text-white text-xs font-semibold drop-shadow-sm">
            {mess.cuisineType || "Homestyle Thali"}
          </span>

          <span className="bg-green-700 text-white text-xs font-bold px-2 py-0.5 rounded flex items-center gap-1 shadow-xs">
            <span>4.3</span>
            <span className="text-[10px]">★</span>
          </span>
        </div>
      </div>

      {/* ── CARD CONTENT BODY ── */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          {/* Outlet Title & Proximity */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-base text-gray-900 group-hover:text-orange-600 transition-colors leading-snug line-clamp-1">
              {mess.name}
            </h3>

            {mess.distanceKm !== undefined && (
              <span className="text-xs text-gray-500 font-medium shrink-0">
                {mess.distanceKm < 1 ? `${Math.round(mess.distanceKm * 1000)}m` : `${mess.distanceKm.toFixed(1)} km`}
                {walkingMinutes ? ` • ${walkingMinutes}m walk` : ""}
              </span>
            )}
          </div>

          {/* Today's Menu Snippet */}
          <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
            {mess.todayMenu?.lunch || "Fresh Phulkas, Dal Tadka, Seasonal Sabzi, Steamed Rice & Salad"}
          </p>

          {/* Real-time Available Slots */}
          <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>Lunch Slots: <strong className="text-gray-800 font-semibold">{isLunchFull ? "Sold Out" : `${lunchSlots} left`}</strong></span>
            <span>Dinner Slots: <strong className="text-gray-800 font-semibold">{dinnerSlots} left</strong></span>
          </div>
        </div>

        {/* ── CARD FOOTER: PRICING & ACTIONS ── */}
        <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
          <div>
            <span className="text-xs text-gray-400 block">Starting from</span>
            <div className="flex items-baseline gap-1">
              <span className="text-base font-extrabold text-gray-900">₹{effectivePrice}</span>
              <span className="text-xs text-gray-500">/ meal</span>
            </div>
          </div>

          <Link
            to={`/mess/${messId}`}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 active:scale-95 text-white text-xs font-bold rounded-xl transition shadow-xs"
          >
            Book Meal
          </Link>
        </div>

      </div>
    </article>
  );
}
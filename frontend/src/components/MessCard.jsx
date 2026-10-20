import { Link } from "react-router-dom";

export default function MessCard({ mess }) {
  const messId = mess._id || mess.id;
  const isLunchFull = mess.availableSlots?.lunch === 0;
  const isOpen = mess.isOpen !== false;

  return (
    <div className="bg-white rounded-3xl border border-gray-200/90 overflow-hidden shadow-2xs hover:shadow-md hover:border-orange-300 transition-all flex flex-col justify-between group">
      
      {/* Photo with Overlay Badges */}
      <div className="relative h-48 w-full bg-gray-100 overflow-hidden">
        <img
          src={mess.imageUrl || "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600"}
          alt={mess.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Locality & Distance Tag */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap z-10">
          <span className="bg-black/75 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full backdrop-blur-md">
            📍 {mess.locality}
          </span>
          {mess.distanceKm !== undefined && (
            <span className="bg-emerald-600 text-white text-[10px] font-black tracking-wide px-2.5 py-1 rounded-full backdrop-blur-md shadow-xs flex items-center gap-1 border border-emerald-400/40">
              <span>🧭</span>
              <span>{mess.distanceKm < 1 ? `${Math.round(mess.distanceKm * 1000)}m away` : `${mess.distanceKm.toFixed(1)} km away`}</span>
            </span>
          )}
        </div>

        {/* FSSAI Verified Badge */}
        {(mess.isVerified || mess.verificationStatus === "verified") && (
          <span className="absolute bottom-3 left-3 bg-emerald-700/90 text-white text-[10px] font-black tracking-wide px-2.5 py-1 rounded-full backdrop-blur-md shadow-xs flex items-center gap-1 border border-emerald-400/40">
            <span>🛡️</span>
            <span>FSSAI Verified</span>
          </span>
        )}

        {/* Cuisine & Status Tags */}
        <div className="absolute top-3 right-3 flex flex-col gap-1 items-end">
          <span className="bg-orange-600 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-xs">
            {mess.cuisineType}
          </span>
          <span
            className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow-xs ${
              isOpen
                ? "bg-emerald-500 text-white"
                : "bg-red-500 text-white"
            }`}
          >
            {isOpen ? "Open" : "Closed"}
          </span>
        </div>
      </div>

      {/* Body Section */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-black text-lg text-gray-900 group-hover:text-orange-600 transition-colors leading-snug">
                {mess.name}
              </h3>
              {(mess.isVerified || mess.verificationStatus === "verified") && (
                <span title="FSSAI Certified & Identity Verified Partner" className="text-emerald-600 inline-flex items-center">
                  <svg className="w-4 h-4 fill-emerald-500 text-white" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </span>
              )}
            </div>
            {mess.seatingCapacity && (
              <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md whitespace-nowrap">
                🪑 {mess.seatingCapacity} seats
              </span>
            )}
          </div>

          {/* Today's Special Lunch Note */}
          <div className="mt-3 bg-orange-50/60 p-3 rounded-2xl border border-orange-100/80">
            <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 block">
              Today's Lunch Menu
            </span>
            <p className="text-xs text-gray-700 mt-0.5 line-clamp-2 leading-relaxed">
              {mess.todayMenu?.lunch || "Fresh Roti, Dal Tadka, Rice, Sabzi, Salad"}
            </p>
          </div>

          {/* Live Slot Status */}
          <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-gray-600">
            <span>
              Lunch:{" "}
              {isLunchFull ? (
                <span className="text-red-500 font-black">Sold Out</span>
              ) : (
                <span className="text-emerald-700 font-black">
                  {mess.availableSlots?.lunch ?? 20} slots
                </span>
              )}
            </span>
            <span>
              Dinner:{" "}
              <span className="text-gray-900 font-black">
                {mess.availableSlots?.dinner ?? 20} slots
              </span>
            </span>
          </div>
        </div>

        {/* Pricing & Actions */}
        <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
          <div>
            <span className="text-[10px] text-gray-400 uppercase font-black block">Single Meal</span>
            <span className="text-base font-black text-gray-900">₹{mess.pricePerMeal || 80}</span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to={`/membership?messId=${messId}`}
              className="px-3 py-2 bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-black rounded-xl transition"
            >
              Pass 🎟️
            </Link>
            <Link
              to={`/mess/${messId}`}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-extrabold uppercase tracking-wider rounded-xl shadow-xs transition-colors"
            >
              Book Slot
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
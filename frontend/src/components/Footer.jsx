import { Link } from "react-router-dom";
import messtaIcon from "../assets/messta-icon.png";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Brand info */}
          <div className="space-y-3 md:col-span-2">
            <div className="flex items-center gap-2.5">
              <img
                src={messtaIcon}
                alt="Messta Logo"
                className="w-8 h-8 object-contain drop-shadow-xs"
              />
              <span className="text-xl font-extrabold tracking-tight text-gray-900">
                Messta
              </span>
            </div>
            <p className="text-xs text-gray-500 max-w-sm leading-relaxed">
              Messta connects college students in Pune with verified daily mess canteens. Discover menus, book meal passes, and enjoy homestyle food without long lines.
            </p>
            <p className="text-[11px] text-gray-400">
              © {new Date().getFullYear()} Messta. Made for college communities.
            </p>
          </div>

          {/* Student links */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900">
              Students
            </h4>
            <div className="flex flex-col space-y-1.5 text-xs text-gray-500">
              <Link to="/mess" className="hover:text-orange-600 transition">
                Find Messes & Menus
              </Link>
              <Link to="/membership" className="hover:text-orange-600 transition">
                Meal Passes & Tokens
              </Link>
              <Link to="/profile" className="hover:text-orange-600 transition">
                My Active Tokens
              </Link>
            </div>
          </div>

          {/* Partner links */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900">
              Mess Partners
            </h4>
            <div className="flex flex-col space-y-1.5 text-xs text-gray-500">
              <Link to="/owner" className="hover:text-orange-600 transition">
                Partner Dashboard
              </Link>
              <Link to="/owner/meals" className="hover:text-orange-600 transition">
                Daily Menus & Pricing
              </Link>
              <Link to="/owner/memberships" className="hover:text-orange-600 transition">
                Monthly Pass Subscriptions
              </Link>
              <Link to="/owner/finance" className="hover:text-orange-600 transition">
                Earnings & Payouts
              </Link>
            </div>
          </div>

        </div>
      </div>
    </footer>
  );
}
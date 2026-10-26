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
              The synchronized digital operating system bridging mess canteen owners and college students in Pune and university towns.
            </p>
            <p className="text-[11px] text-gray-400">
              © {new Date().getFullYear()} Messta Inc. All rights reserved. Made for college communities.
            </p>
          </div>

          {/* Student links */}
          <div className="space-y-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-gray-900">
              Student Diners
            </h4>
            <div className="flex flex-col space-y-1.5 text-xs text-gray-500">
              <Link to="/mess" className="hover:text-orange-600 transition">
                Find Mess & Menus
              </Link>
              <Link to="/membership" className="hover:text-orange-600 transition">
                Digital Pass & Tokens
              </Link>
              <Link to="/profile" className="hover:text-orange-600 transition">
                Pickup Token Codes
              </Link>
            </div>
          </div>

          {/* Partner links */}
          <div className="space-y-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-gray-900">
              Mess Partners
            </h4>
            <div className="flex flex-col space-y-1.5 text-xs text-gray-500">
              <Link to="/owner" className="hover:text-orange-600 transition">
                Counter Scanner Terminal
              </Link>
              <Link to="/owner/meals" className="hover:text-orange-600 transition">
                Thali Matrix & Pricing
              </Link>
              <Link to="/owner/finance" className="hover:text-orange-600 transition">
                Finance & P&L Intelligence
              </Link>
            </div>
          </div>

        </div>
      </div>
    </footer>
  );
}
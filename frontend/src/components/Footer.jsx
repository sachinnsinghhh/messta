import { Link } from "react-router-dom";
import messtaIcon from "../assets/messta-icon.png";

export default function Footer() {
  return (
    <footer className="bg-stone-950 border-t border-stone-800/80 mt-20 text-stone-400">
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
              <span className="text-xl font-semibold tracking-tight text-white">
                Messta
              </span>
            </div>
            <p className="text-xs text-stone-400 max-w-sm leading-relaxed">
              The synchronized digital operating system bridging mess canteen owners and college students in Pune and university towns.
            </p>
            <p className="text-[11px] text-stone-500 font-mono">
              © {new Date().getFullYear()} Messta Inc. All rights reserved.
            </p>
          </div>

          {/* Student links */}
          <div className="space-y-2">
            <h4 className="text-xs font-mono uppercase tracking-wider text-stone-200">
              DINERS
            </h4>
            <div className="flex flex-col space-y-1.5 text-xs text-stone-400">
              <Link to="/mess" className="hover:text-amber-400 transition">
                Find Mess & Menus
              </Link>
              <Link to="/membership" className="hover:text-amber-400 transition">
                Digital Pass & Tokens
              </Link>
              <Link to="/profile" className="hover:text-amber-400 transition">
                Pickup Token Codes
              </Link>
            </div>
          </div>

          {/* Partner links */}
          <div className="space-y-2">
            <h4 className="text-xs font-mono uppercase tracking-wider text-stone-200">
              OUTLETS
            </h4>
            <div className="flex flex-col space-y-1.5 text-xs text-stone-400">
              <Link to="/owner" className="hover:text-amber-400 transition">
                Counter Scanner Terminal
              </Link>
              <Link to="/owner/meals" className="hover:text-amber-400 transition">
                Thali Matrix & Pricing
              </Link>
              <Link to="/owner/memberships" className="hover:text-amber-400 transition">
                Membership Plans & CRM
              </Link>
              <Link to="/owner/finance" className="hover:text-amber-400 transition">
                Finance & P&L Intelligence
              </Link>
            </div>
          </div>

        </div>
      </div>
    </footer>
  );
}
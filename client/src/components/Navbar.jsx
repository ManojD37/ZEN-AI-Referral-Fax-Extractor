import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Upload, History, FileText, Activity, FilePlus } from "lucide-react";

const Navbar = () => {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;

  // Navbar ALWAYS white now
  const navbarClasses = "bg-white shadow-lg";

  const navLinks = [
    { path: "/", label: "Home", icon: Home },
    { path: "/upload", label: "Upload", icon: Upload },
    { path: "/history", label: "History", icon: History },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${navbarClasses}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">

          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group transition-all duration-300 hover:scale-105">
            <div className="relative">
              <div className="absolute inset-0 rounded-xl blur opacity-20 bg-blue-500 group-hover:opacity-40 transition" />
              <div className="relative p-2.5 rounded-xl shadow-lg bg-blue-100 border border-blue-300">
                <FileText className="h-7 w-7 text-blue-700" />
              </div>
            </div>

            <div className="flex flex-col">
              <span className="text-xl font-bold text-gray-900">Medical Referral</span>
              <span className="text-xs font-medium tracking-wider text-gray-600">AI-Powered Extraction</span>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center space-x-3">
            {navLinks.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={`
                  relative flex items-center space-x-2 px-5 py-2.5 rounded-lg
                  text-sm font-semibold tracking-wide transition-all duration-300
                  group overflow-hidden
                  ${
                    isActive(path)
                      ? "text-white bg-blue-600 shadow-md"
                      : "text-gray-700 hover:bg-gray-100"
                  }
                `}
              >
                <Icon className="h-4 w-4 relative z-10" />
                <span className="relative z-10">{label}</span>
              </Link>
            ))}

            {/* 🔥 Extract Button (Always White) */}
            <Link
              to="/output"
              className="
                relative flex items-center space-x-2 px-6 py-2.5 rounded-lg
                text-sm font-semibold tracking-wide shadow-md
                bg-white text-blue-600 border border-blue-300
                hover:bg-blue-50 transition-all duration-300
              "
            >
              <FilePlus className="h-4 w-4" />
              <span>Extract</span>
            </Link>

            {/* Status Indicator */}
            <div className="ml-4 pl-4 border-l border-gray-300">
              <div className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-100 border border-gray-200">
                <Activity className="h-4 w-4 text-green-500 animate-pulse" />
                <span className="text-xs font-medium text-gray-700">Online</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom border */}
      <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
    </nav>
  );
};

export default Navbar;


// ----------------------------------------------------------------------------------------------------------------

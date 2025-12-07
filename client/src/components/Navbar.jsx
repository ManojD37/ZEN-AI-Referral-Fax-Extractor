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

// src/components/Navbar.jsx
// import React, { useState, useEffect } from 'react';
// import { Link, useLocation } from 'react-router-dom';
// import { Home, Upload, History, FileText, Activity } from 'lucide-react';

// const Navbar = () => {
//   const location = useLocation();
//   const [scrolled, setScrolled] = useState(false);

//   const isActive = (path) => location.pathname === path;
//   const isHomePage = location.pathname === '/';

//   useEffect(() => {
//     const handleScroll = () => {
//       setScrolled(window.scrollY > 20);
//     };

//     window.addEventListener('scroll', handleScroll);
//     return () => window.removeEventListener('scroll', handleScroll);
//   }, []);

//   const navLinks = [
//     { path: '/', label: 'Home', icon: Home },
//     { path: '/upload', label: 'Upload', icon: Upload },
//     {path: '/output', label:  'Extract', icon: Extract},
//     { path: '/history', label: 'History', icon: History },
//   ];

//   // Dynamic navbar styling based on page and scroll
//   const navbarClasses = isHomePage
//     ? scrolled
//       ? 'bg-blue-700/95 backdrop-blur-lg shadow-xl'
//       : 'bg-transparent'
//     : 'bg-white shadow-lg';

//   const textColorClasses = isHomePage ? 'text-white' : 'text-gray-800';
//   const subtitleColorClasses = isHomePage ? 'text-blue-100' : 'text-gray-500';
//   const iconBgClasses = isHomePage 
//     ? 'bg-white/10 backdrop-blur-sm border border-white/20' 
//     : 'bg-blue-100 border border-blue-200';
//   const iconColorClasses = isHomePage ? 'text-white' : 'text-blue-600';

//   return (
//     <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${navbarClasses}`}>
//       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//         <div className="flex justify-between items-center h-20">
//           {/* Logo */}
//           <Link 
//             to="/" 
//             className="flex items-center space-x-3 group transition-all duration-300 hover:scale-105"
//           >
//             <div className="relative">
//               <div className={`absolute inset-0 rounded-xl blur opacity-30 group-hover:opacity-50 transition-opacity ${
//                 isHomePage ? 'bg-white' : 'bg-blue-500'
//               }`}></div>
//               <div className={`relative p-2.5 rounded-xl shadow-lg ${iconBgClasses}`}>
//                 <FileText className={`h-7 w-7 ${iconColorClasses}`} />
//               </div>
//             </div>
//             <div className="flex flex-col">
//               <span className={`text-xl font-bold ${textColorClasses}`}>
//                 Medical Referral
//               </span>
//               <span className={`text-xs font-medium tracking-wider ${subtitleColorClasses}`}>
//                 AI-Powered Extraction
//               </span>
//             </div>
//           </Link>

//           {/* Navigation Links */}
//           <div className="flex items-center space-x-2">
//             {navLinks.map(({ path, label, icon: Icon }) => (
//               <Link
//                 key={path}
//                 to={path}
//                 className={`
//                   relative flex items-center space-x-2 px-6 py-3 rounded-lg
//                   text-sm font-semibold tracking-wide
//                   transition-all duration-300 ease-in-out
//                   group overflow-hidden
//                   ${
//                     isActive(path)
//                       ? isHomePage
//                         ? 'text-blue-600'
//                         : 'text-white'
//                       : isHomePage
//                       ? 'text-white hover:text-blue-100'
//                       : 'text-gray-600 hover:text-gray-800'
//                   }
//                 `}
//               >
//                 {/* Background for active state */}
//                 <div
//                   className={`
//                     absolute inset-0 rounded-lg transition-all duration-300
//                     ${
//                       isActive(path)
//                         ? isHomePage
//                           ? 'bg-white shadow-lg'
//                           : 'bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg'
//                         : isHomePage
//                         ? 'bg-white/0 group-hover:bg-white/10'
//                         : 'bg-gray-100/0 group-hover:bg-gray-100'
//                     }
//                   `}
//                 ></div>

//                 {/* Active indicator line */}
//                 {isActive(path) && (
//                   <div className={`absolute bottom-0 left-0 right-0 h-1 rounded-full ${
//                     isHomePage 
//                       ? 'bg-gradient-to-r from-blue-500 to-blue-600' 
//                       : 'bg-gradient-to-r from-blue-400 to-cyan-400'
//                   }`}></div>
//                 )}

//                 {/* Icon with animation */}
//                 <Icon 
//                   className={`
//                     h-4 w-4 relative z-10 transition-transform duration-300
//                     ${isActive(path) ? 'scale-110' : 'group-hover:scale-110'}
//                   `}
//                 />
                
//                 {/* Label */}
//                 <span className="relative z-10">{label}</span>

//                 {/* Hover glow effect */}
//                 {!isActive(path) && (
//                   <div className={`absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
//                     isHomePage 
//                       ? 'bg-gradient-to-r from-white/0 via-white/5 to-white/0'
//                       : 'bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-blue-500/0'
//                   }`}></div>
//                 )}
//               </Link>
//             ))}

//             {/* Status indicator */}
//             <div className={`ml-4 pl-4 ${
//               isHomePage ? 'border-l border-white/20' : 'border-l border-gray-300'
//             }`}>
//               <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
//                 isHomePage 
//                   ? 'bg-white/10 backdrop-blur-sm border border-white/20' 
//                   : 'bg-gray-100 border border-gray-200'
//               }`}>
//                 <Activity className="h-4 w-4 text-green-500 animate-pulse" />
//                 <span className={`text-xs font-medium ${
//                   isHomePage ? 'text-white' : 'text-gray-700'
//                 }`}>Online</span>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Subtle bottom border */}
//       <div className={`h-px ${
//         isHomePage 
//           ? 'bg-gradient-to-r from-transparent via-white/20 to-transparent'
//           : 'bg-gradient-to-r from-transparent via-gray-200 to-transparent'
//       }`}></div>
//     </nav>
//   );
// };

// export default Navbar;
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  FileSpreadsheet,
  Settings,
  Menu,
  X,
  Plus,
  LogOut,
  ChevronRight,
  ChevronLeft
} from "lucide-react";

export function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
    { icon: FileSpreadsheet, label: "My Models", href: "/models" },
    // { icon: Settings, label: "Settings", href: "/settings" }, // Placeholder for now
  ];

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-slate-800 text-emerald-400 rounded-lg border border-slate-700"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 bg-black/60 z-40"
            onClick={() => setIsMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Hover trigger area - extends slightly beyond sidebar when collapsed */}
      <div
        className="fixed top-0 left-0 h-screen z-40 hidden md:block"
        style={{ width: isExpanded ? '256px' : '90px' }}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        <motion.aside
          className="h-full bg-slate-900 border-r border-slate-800 flex flex-col overflow-hidden"
          initial={false}
          animate={{
            width: isExpanded ? 256 : 80,
          }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          style={{ willChange: 'width' }}
        >
        {/* Logo Area */}
        <div className="h-20 flex items-center justify-center border-b border-slate-800">
          <div className="flex items-center gap-2 overflow-hidden px-4 w-full">
            <div className="min-w-[32px] w-8 h-8 bg-gradient-to-br from-emerald-400 to-cyan-400 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg">
              G
            </div>
            <motion.span
              initial={false}
              animate={{
                opacity: isExpanded ? 1 : 0,
                width: isExpanded ? "auto" : 0,
                marginLeft: isExpanded ? 8 : 0,
              }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="font-bold text-xl text-white whitespace-nowrap overflow-hidden"
            >
              GoVenture
            </motion.span>
          </div>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 py-6 px-3 space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className="flex items-center gap-4 px-3 py-3 text-slate-400 hover:text-emerald-400 hover:bg-slate-800/50 rounded-xl transition-all group relative"
            >
              <item.icon size={24} className="min-w-[24px]" />
              <motion.span
                initial={false}
                animate={{
                  opacity: isExpanded ? 1 : 0,
                  width: isExpanded ? "auto" : 0,
                }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="whitespace-nowrap overflow-hidden font-medium"
              >
                {item.label}
              </motion.span>
              {!isExpanded && (
                <div className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border border-slate-700">
                  {item.label}
                </div>
              )}
            </Link>
          ))}
        </nav>

        {/* User / Bottom Section */}
        <div className="p-4 border-t border-slate-800">
          <button className="flex items-center gap-4 w-full px-3 py-3 text-slate-400 hover:text-red-400 hover:bg-slate-800/50 rounded-xl transition-all">
            <LogOut size={24} className="min-w-[24px]" />
            <motion.span
              initial={false}
              animate={{
                opacity: isExpanded ? 1 : 0,
                width: isExpanded ? "auto" : 0,
              }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="whitespace-nowrap overflow-hidden font-medium"
            >
              Sign Out
            </motion.span>
          </button>
        </div>
        </motion.aside>
      </div>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", bounce: 0, duration: 0.3 }}
            className="fixed top-0 left-0 h-screen w-64 bg-slate-900 border-r border-slate-800 z-50 md:hidden flex flex-col"
          >
             <div className="h-20 flex items-center px-6 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-cyan-400 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg">
                  G
                </div>
                <span className="font-bold text-xl text-white">GoVenture</span>
              </div>
            </div>

            <nav className="flex-1 py-6 px-4 space-y-2">
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  className="flex items-center gap-4 px-4 py-3 text-slate-400 hover:text-emerald-400 hover:bg-slate-800/50 rounded-xl transition-all"
                >
                  <item.icon size={24} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              ))}
            </nav>

            <div className="p-4 border-t border-slate-800">
              <button className="flex items-center gap-4 w-full px-4 py-3 text-slate-400 hover:text-red-400 hover:bg-slate-800/50 rounded-xl transition-all">
                <LogOut size={24} />
                <span className="font-medium">Sign Out</span>
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}

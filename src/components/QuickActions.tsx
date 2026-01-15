import { Link } from "@tanstack/react-router";
import { Plus, Upload, PlayCircle } from "lucide-react";

export function QuickActions() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
      <Link
        to="/models/new"
        className="group flex items-center justify-center gap-3 p-4 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-xl shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-1"
      >
        <div className="p-2 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
          <Plus size={20} />
        </div>
        <div className="text-left">
          <span className="block font-bold text-sm">New Model</span>
          <span className="block text-xs opacity-90">Start from scratch</span>
        </div>
      </Link>

      <button className="group flex items-center justify-center gap-3 p-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-white rounded-xl transition-all hover:-translate-y-1">
        <div className="p-2 bg-slate-700 rounded-lg group-hover:bg-slate-600 transition-colors">
          <Upload size={20} className="text-blue-400" />
        </div>
        <div className="text-left">
          <span className="block font-bold text-sm">Import Data</span>
          <span className="block text-xs text-slate-400">CSV or Excel</span>
        </div>
      </button>

      <button className="group flex items-center justify-center gap-3 p-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-white rounded-xl transition-all hover:-translate-y-1">
        <div className="p-2 bg-slate-700 rounded-lg group-hover:bg-slate-600 transition-colors">
          <PlayCircle size={20} className="text-purple-400" />
        </div>
        <div className="text-left">
          <span className="block font-bold text-sm">Watch Tutorial</span>
          <span className="block text-xs text-slate-400">Learn the basics</span>
        </div>
      </button>
    </div>
  );
}

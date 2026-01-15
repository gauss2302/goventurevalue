import { Link } from "@tanstack/react-router";
import { Clock, ArrowRight } from "lucide-react";

export function RecentActivity() {
  const activities = [
    {
      id: 1,
      action: "Edited model",
      target: "SaaS Growth Plan 2026",
      time: "2 hours ago",
    },
    {
      id: 2,
      action: "Created new scenario",
      target: "Conservative Case",
      time: "5 hours ago",
    },
    {
      id: 3,
      action: "Exported PDF",
      target: "Q1 Investor Deck",
      time: "1 day ago",
    },
    {
      id: 4,
      action: "Shared model",
      target: "Series A Projections",
      time: "2 days ago",
    },
  ];

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-6 h-full">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-white">Recent Activity</h3>
        <Link to="/models" className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
          View all <ArrowRight size={14} />
        </Link>
      </div>
      <div className="space-y-6">
        {activities.map((activity, index) => (
          <div key={activity.id} className="relative pl-6 pb-6 last:pb-0 border-l border-slate-700 last:border-0">
            <div className="absolute left-[-5px] top-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-slate-800" />
            <div className="flex flex-col gap-1">
              <p className="text-sm text-slate-300">
                <span className="font-medium text-white">{activity.action}</span>
                {" - "}
                <span className="text-emerald-400">{activity.target}</span>
              </p>
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <Clock size={12} />
                <span>{activity.time}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import { TrendingUp, FileSpreadsheet, DollarSign, Activity } from "lucide-react";

export function DashboardStats() {
  const stats = [
    {
      label: "Total Models",
      value: "12",
      change: "+2 this month",
      icon: FileSpreadsheet,
      color: "text-blue-400",
      bg: "bg-blue-400/10",
    },
    {
      label: "Total Valuation",
      value: "$4.2M",
      change: "+15% vs last month",
      icon: DollarSign,
      color: "text-emerald-400",
      bg: "bg-emerald-400/10",
    },
    {
      label: "Active Scenarios",
      value: "8",
      change: "Across 3 models",
      icon: Activity,
      color: "text-purple-400",
      bg: "bg-purple-400/10",
    },
    {
      label: "Growth Rate",
      value: "125%",
      change: "Avg. across models",
      icon: TrendingUp,
      color: "text-amber-400",
      bg: "bg-amber-400/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <div
          key={index}
          className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-6 hover:border-emerald-500/30 transition-all"
        >
          <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <span className="text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full">
              {stat.change}
            </span>
          </div>
          <h3 className="text-3xl font-bold text-white mb-1">{stat.value}</h3>
          <p className="text-slate-400 text-sm">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}

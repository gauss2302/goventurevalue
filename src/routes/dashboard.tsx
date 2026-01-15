import { createFileRoute } from "@tanstack/react-router";
import { Sidebar } from "../components/Sidebar";
import { DashboardStats } from "../components/DashboardStats";
import { RecentActivity } from "../components/RecentActivity";
import { QuickActions } from "../components/QuickActions";
import ModelList from "../components/ModelList";

// Mock data for initial display
const MOCK_MODELS = [
  {
    id: 1,
    name: "SaaS Growth Plan 2026",
    companyName: "Acme Corp",
    description: "5-year financial projection for Series A fundraising round.",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 2,
    name: "Q1 Budget Analysis",
    companyName: "Acme Corp",
    description: "Detailed budget breakdown for Q1 2026.",
    createdAt: new Date(),
    updatedAt: new Date(Date.now() - 86400000), // 1 day ago
  },
];

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Sidebar Component */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 md:ml-20 lg:ml-20 transition-all duration-300">
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 pt-20 md:pt-8">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
              <p className="text-slate-400">
                Welcome back! Here's what's happening with your startups.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="px-4 py-2 bg-slate-800 rounded-lg text-slate-300 text-sm border border-slate-700">
                Last login: Today, 9:41 AM
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <QuickActions />

          {/* Stats Overview */}
          <DashboardStats />

          {/* Main Grid: Recent Activity & Models */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column (2/3 width) - Models */}
            <div className="lg:col-span-2">
              <div className="bg-slate-900/50 rounded-3xl p-6 border border-slate-800/50">
                <ModelList models={MOCK_MODELS} />
              </div>
            </div>

            {/* Right Column (1/3 width) - Activity */}
            <div className="lg:col-span-1">
              <RecentActivity />
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}

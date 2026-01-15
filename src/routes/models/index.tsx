import { createFileRoute } from "@tanstack/react-router";
import ModelList from "../../components/ModelList";
import { Sidebar } from "../../components/Sidebar";

// Mock data (same as dashboard for now)
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

export const Route = createFileRoute("/models/")({
  component: ModelsIndex,
});

function ModelsIndex() {
  return (
    <div className="min-h-screen bg-slate-950 flex">
      <Sidebar />
      <main className="flex-1 md:ml-64 transition-all duration-300 p-8 pt-20 md:pt-8">
        <h1 className="text-3xl font-bold text-white mb-8">My Models</h1>
        <ModelList models={MOCK_MODELS} />
      </main>
    </div>
  );
}

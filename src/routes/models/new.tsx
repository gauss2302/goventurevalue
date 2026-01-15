import { createFileRoute, useRouter } from "@tanstack/react-router";
import { createServerFn, useServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { useState } from "react";
import { db } from "@/db/index";
import { financialModels, modelScenarios, marketSizing, modelSettings } from "@/db/schema";
import { getServerSession } from "@/lib/auth";
import { DEFAULT_SETTINGS } from "@/lib/calculations";
import type { CreateModelDto } from "@/lib/dto";

const createModel = createServerFn({
  method: "POST",
})
  .inputValidator((data: CreateModelDto) => {
    // Validate and return the data
    if (!data.name || data.name.trim() === "") {
      throw new Error("Model name is required");
    }
    return data;
  })
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const session = await getServerSession(headers);
    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    // Prevent creation of new financial models
    throw new Error("Creating new financial models is currently disabled");

    // Create model
    const [model] = await db
      .insert(financialModels)
      .values({
        userId: session.user.id,
        name: data.name,
        companyName: data.companyName || null,
        description: data.description || null,
        currency: data.currency || "USD",
      })
      .returning();

    // Create default scenarios
    const scenarios = [
      {
        type: "conservative" as const,
        params: {
          userGrowth: 0.15,
          arpu: 2.5,
          churnRate: 0.08,
          farmerGrowth: 0.1,
          cac: 12,
        },
      },
      {
        type: "base" as const,
        params: {
          userGrowth: 0.25,
          arpu: 4.0,
          churnRate: 0.05,
          farmerGrowth: 0.2,
          cac: 18,
        },
      },
      {
        type: "optimistic" as const,
        params: {
          userGrowth: 0.4,
          arpu: 6.0,
          churnRate: 0.03,
          farmerGrowth: 0.35,
          cac: 24,
        },
      },
    ];

    for (const scenario of scenarios) {
      await db.insert(modelScenarios).values({
        modelId: model.id,
        scenarioType: scenario.type,
        userGrowth: scenario.params.userGrowth.toString(),
        arpu: scenario.params.arpu.toString(),
        churnRate: scenario.params.churnRate.toString(),
        farmerGrowth: scenario.params.farmerGrowth.toString(),
        cac: scenario.params.cac.toString(),
      });
    }

    // Create default market sizing
    await db.insert(marketSizing).values({
      modelId: model.id,
      tam: 850000000,
      sam: 42000000,
      som: [210000, 840000, 2520000, 6300000, 12600000],
    });

    // Create default model settings
    await db.insert(modelSettings).values({
      modelId: model.id,
      startUsers: DEFAULT_SETTINGS.startUsers,
      startFarmers: DEFAULT_SETTINGS.startFarmers,
      taxRate: DEFAULT_SETTINGS.taxRate.toString(),
      discountRate: DEFAULT_SETTINGS.discountRate.toString(),
      terminalGrowth: DEFAULT_SETTINGS.terminalGrowth.toString(),
      safetyBuffer: DEFAULT_SETTINGS.safetyBuffer,
      personnelByYear: DEFAULT_SETTINGS.personnelByYear,
      employeesByYear: DEFAULT_SETTINGS.employeesByYear,
      capexByYear: DEFAULT_SETTINGS.capexByYear,
      depreciationByYear: DEFAULT_SETTINGS.depreciationByYear,
      projectionYears: DEFAULT_SETTINGS.projectionYears,
    });

    return model;
  });

export const Route = createFileRoute("/models/new")({
  component: NewModel,
});

function NewModel() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createModelFn = useServerFn(createModel);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError("Model name is required");
      return;
    }
    
    setIsSubmitting(true);
    setError(null);

    try {
      console.log("Submitting form with data:", { name, companyName, description });
      
      // Call server function using useServerFn hook
      const result = await createModelFn({
        data: {
          name: name.trim(),
          companyName: companyName?.trim() || undefined,
          description: description?.trim() || undefined,
        },
      });
      
      console.log("Model created successfully:", result);
      
      if (result && result.id) {
        // Invalidate router cache to refresh the models list
        router.invalidate();
        
        router.navigate({
          to: "/models/$modelId",
          params: { modelId: result.id.toString() },
        });
      } else {
        console.error("Invalid response:", result);
        throw new Error("Invalid response from server");
      }
    } catch (error: any) {
      console.error("Failed to create model - full error:", error);
      const errorMessage = error?.message || error?.toString() || "Failed to create model. Please try again.";
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Create New Financial Model
        </h1>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-lg shadow p-6 space-y-6"
        >
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Model Name *
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="e.g., Q1 2025 Financial Model"
            />
          </div>

          <div>
            <label
              htmlFor="companyName"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Company Name
            </label>
            <input
              type="text"
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="e.g., AgroGame Inc."
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Optional description of your financial model..."
            />
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Creating..." : "Create Model"}
            </button>
            <button
              type="button"
              onClick={() => router.navigate({ to: "/" })}
              className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

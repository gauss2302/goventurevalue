import { createFileRoute, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import { db } from '@/db/index'
import { financialModels, modelScenarios, marketSizing } from '@/db/schema'
import { auth } from '@/lib/auth'
import { calculateProjections } from '@/lib/calculations'
import type { CreateModelDto } from '@/lib/dto'

const createModel = createServerFn({
  method: 'POST',
})
  .inputValidator((data: CreateModelDto) => data)
  .handler(async ({ data, request }) => {
    const headers = request?.headers || new Headers();
    const session = await auth.api.getSession({ headers: headers as Headers })
    if (!session?.user) {
      throw new Error('Unauthorized')
    }

    // Create model
    const [model] = await db.insert(financialModels).values({
      userId: session.user.id,
      name: data.name,
      companyName: data.companyName || null,
      description: data.description || null,
      currency: data.currency || 'USD',
    }).returning()

    // Create default scenarios
    const scenarios = [
      { type: 'conservative' as const, params: { userGrowth: 0.15, arpu: 2.5, churnRate: 0.08, farmerGrowth: 0.10, cac: 12 } },
      { type: 'base' as const, params: { userGrowth: 0.25, arpu: 4.0, churnRate: 0.05, farmerGrowth: 0.20, cac: 18 } },
      { type: 'optimistic' as const, params: { userGrowth: 0.40, arpu: 6.0, churnRate: 0.03, farmerGrowth: 0.35, cac: 24 } },
    ]

    for (const scenario of scenarios) {
      await db.insert(modelScenarios).values({
        modelId: model.id,
        scenarioType: scenario.type,
        userGrowth: scenario.params.userGrowth.toString(),
        arpu: scenario.params.arpu.toString(),
        churnRate: scenario.params.churnRate.toString(),
        farmerGrowth: scenario.params.farmerGrowth.toString(),
        cac: scenario.params.cac.toString(),
      })
    }

    // Create default market sizing
    await db.insert(marketSizing).values({
      modelId: model.id,
      tam: 850000000,
      sam: 42000000,
      som: [210000, 840000, 2520000, 6300000, 12600000],
    })

    return model
  })

export const Route = createFileRoute('/models/new')({
  component: NewModel,
})

function NewModel() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const model = await createModel({
        name,
        companyName: companyName || undefined,
        description: description || undefined,
      })
      router.navigate({ to: '/models/$modelId', params: { modelId: model.id.toString() } })
    } catch (error) {
      console.error('Failed to create model:', error)
      alert('Failed to create model. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Create New Financial Model</h1>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
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
            <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-2">
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
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
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
              {isSubmitting ? 'Creating...' : 'Create Model'}
            </button>
            <button
              type="button"
              onClick={() => router.navigate({ to: '/' })}
              className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

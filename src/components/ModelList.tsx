import { Link } from '@tanstack/react-router'
import { Plus, FileText, Calendar } from 'lucide-react'

export type Model = {
  id: number
  name: string
  companyName: string | null
  description: string | null
  createdAt: Date
  updatedAt: Date
}

type ModelListProps = {
  models: Model[]
}

export default function ModelList({ models }: ModelListProps) {
  if (models.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-700 mb-2">
          No financial models yet
        </h3>
        <p className="text-gray-500 mb-6">
          Create your first financial model to get started
        </p>
        <Link
          to="/models/new"
          className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
        >
          <Plus size={20} />
          Create New Model
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Your Financial Models</h2>
        <Link
          to="/models/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
        >
          <Plus size={18} />
          New Model
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {models.map((model) => (
          <Link
            key={model.id}
            to="/models/$modelId"
            params={{ modelId: model.id.toString() }}
            className="block p-6 bg-white border border-gray-200 rounded-lg hover:border-emerald-500 hover:shadow-lg transition-all"
          >
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              {model.name}
            </h3>
            {model.companyName && (
              <p className="text-sm text-gray-600 mb-2">{model.companyName}</p>
            )}
            {model.description && (
              <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                {model.description}
              </p>
            )}
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Calendar size={14} />
              <span>
                Updated {new Date(model.updatedAt).toLocaleDateString()}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

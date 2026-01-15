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
      <div className="text-center py-12 bg-slate-800/50 rounded-2xl border border-slate-700 backdrop-blur-sm">
        <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">
          No financial models yet
        </h3>
        <p className="text-slate-400 mb-6">
          Create your first financial model to get started
        </p>
        <Link
          to="/models/new"
          className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-colors shadow-lg shadow-emerald-500/20"
        >
          <Plus size={20} />
          Create New Model
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Your Financial Models</h2>
        <Link
          to="/models/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors shadow-lg shadow-emerald-500/20"
        >
          <Plus size={18} />
          New Model
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {models.map((model) => (
          <Link
            key={model.id}
            to="/models/$modelId"
            params={{ modelId: model.id.toString() }}
            className="block p-6 bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl hover:border-emerald-500/50 hover:bg-slate-800 hover:shadow-lg hover:shadow-emerald-500/10 transition-all group"
          >
            <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-emerald-400 transition-colors">
              {model.name}
            </h3>
            {model.companyName && (
              <p className="text-sm text-slate-400 mb-2">{model.companyName}</p>
            )}
            {model.description && (
              <p className="text-sm text-slate-500 mb-4 line-clamp-2">
                {model.description}
              </p>
            )}
            <div className="flex items-center gap-2 text-xs text-slate-600 mt-auto">
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

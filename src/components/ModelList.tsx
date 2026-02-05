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
      <div className="text-center py-12 bg-white rounded-2xl border border-[var(--border-soft)] shadow-[0_4px_16px_rgba(17,24,39,0.06)]">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[rgba(79,70,186,0.12)]">
          <FileText className="w-8 h-8 text-[var(--brand-primary)]" />
        </div>
        <h3 className="text-xl font-[var(--font-display)] text-[var(--brand-ink)] mb-2">
          No financial models yet
        </h3>
        <p className="text-[var(--brand-muted)] mb-6">
          Create your first financial model to get started
        </p>
        <Link
          to="/models/new"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--brand-primary)] hover:bg-[#3F38A4] text-white rounded-xl transition-colors shadow-[0_12px_24px_rgba(79,70,186,0.25)]"
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
        <div>
          <h2 className="text-2xl font-[var(--font-display)] text-[var(--brand-ink)]">
            Your Financial Models
          </h2>
          <p className="text-sm text-[var(--brand-muted)]">
            Track updates, scenarios, and latest revisions
          </p>
        </div>
        <Link
          to="/models/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--brand-primary)] hover:bg-[#3F38A4] text-white rounded-lg transition-colors shadow-[0_10px_20px_rgba(79,70,186,0.2)]"
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
            className="group block p-6 bg-white border border-[var(--border-soft)] rounded-2xl hover:border-[rgba(79,70,186,0.35)] hover:shadow-[0_10px_24px_rgba(79,70,186,0.12)] transition-all"
          >
            <h3 className="text-lg font-semibold text-[var(--brand-ink)] mb-2 group-hover:text-[var(--brand-primary)] transition-colors">
              {model.name}
            </h3>
            {model.companyName && (
              <p className="text-sm text-[var(--brand-muted)] mb-2">
                {model.companyName}
              </p>
            )}
            {model.description && (
              <p className="text-sm text-[rgba(112,122,137,0.8)] mb-4 line-clamp-2">
                {model.description}
              </p>
            )}
            <div className="flex items-center justify-between text-xs text-[var(--brand-muted)] mt-auto">
              <span className="inline-flex items-center gap-2">
                <Calendar size={14} />
                Updated {new Date(model.updatedAt).toLocaleDateString()}
              </span>
              <span className="text-[var(--brand-primary)] font-medium">
                Open
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

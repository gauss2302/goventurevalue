import { Link } from '@tanstack/react-router'
import { Plus, FileText, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'

export type Model = {
  id: number
  name: string
  companyName: string | null
  description: string | null
  stage: 'idea' | 'early_growth' | 'scale' | null
  latestArr: number | null
  createdAt: Date
  updatedAt: Date
}

type ModelListProps = {
  models: Model[]
}

export default function ModelList({ models }: ModelListProps) {
  if (models.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--border-soft)] bg-white py-8 text-center shadow-[var(--shadow-sm)]">
        <div className="mx-auto mb-2.5 flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--brand-primary)]/10">
          <FileText className="h-5 w-5 text-[var(--brand-primary)]" />
        </div>
        <h3
          className="text-[14px] text-[var(--brand-ink)]"
          style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
        >
          No financial models yet
        </h3>
        <p className="mt-0.5 text-[12px] text-[var(--brand-muted)]">
          Create your first model to get started
        </p>
        <Button
          size="sm"
          className="mt-3 rounded-full bg-[var(--brand-primary)] px-4 text-xs font-semibold text-white shadow-[0_4px_14px_rgba(27,118,252,0.25)] hover:bg-[#1565D8]"
          asChild
        >
          <Link to="/models/new">
            <Plus size={14} />
            Create Model
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <section className="rounded-lg border border-[var(--border-soft)] bg-white shadow-[var(--shadow-sm)]">
      <div className="flex items-center justify-between px-4 py-3">
        <h2
          className="text-[14px] text-[var(--brand-ink)]"
          style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
        >
          Financial Models
        </h2>
        <Button
          size="sm"
          className="h-6 rounded-full bg-[var(--brand-primary)] px-2.5 text-[11px] font-semibold text-white hover:bg-[#1565D8]"
          asChild
        >
          <Link to="/models/new">
            <Plus size={12} />
            New
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-px border-t border-[var(--border-soft)] bg-[var(--border-soft)] sm:grid-cols-2">
        {models.map((model) => (
          <Link
            key={model.id}
            to="/models/$modelId"
            params={{ modelId: model.id.toString() }}
            className="group bg-white p-3 transition-colors hover:bg-[var(--surface)]"
          >
            <div className="flex items-start justify-between gap-2">
              <h3
                className="truncate text-[12px] font-semibold text-[var(--brand-ink)] group-hover:text-[var(--brand-primary)] flex-1 min-w-0"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {model.name}
              </h3>
              {model.stage != null && (
                <span
                  className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"
                  title={model.stage === "idea" ? "Idea / Pre-seed" : model.stage === "early_growth" ? "Early growth / Seed" : "Scale / Series A"}
                >
                  {model.stage === "idea" ? "Idea" : model.stage === "early_growth" ? "Seed" : "Scale"}
                </span>
              )}
            </div>
            {model.companyName && (
              <p className="mt-0.5 truncate text-[12px] text-[var(--brand-muted)]">
                {model.companyName}
              </p>
            )}
            {model.description && (
              <p className="mt-1 line-clamp-1 text-[12px] text-[var(--brand-muted)]/70">
                {model.description}
              </p>
            )}
            {(model.latestArr != null || model.stage != null) && (
              <p className="mt-1 text-[11px] text-[var(--brand-muted)]">
                {model.latestArr != null && (
                  <span className="font-semibold text-[var(--brand-ink)]">
                    ARR {new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(model.latestArr)}
                  </span>
                )}
              </p>
            )}
            <div className="mt-1.5 flex items-center justify-between text-[10px] text-[var(--brand-muted)]">
              <span className="inline-flex items-center gap-0.5">
                <Calendar size={9} />
                {new Date(model.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </span>
              <span className="font-semibold text-[var(--brand-primary)] opacity-0 transition-opacity group-hover:opacity-100">
                Open
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

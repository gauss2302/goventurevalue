import { Link } from '@tanstack/react-router'
import { Plus, Activity, Calendar, Upload } from 'lucide-react'
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
      <section className="rounded-xl border border-[#eeedf3] bg-[#f9fbff] px-6 py-10 text-center shadow-sm">
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[#eef2ff]">
          <Activity className="h-6 w-6 text-[#4338ca]" strokeWidth={1.75} />
        </div>
        <h3
          className="text-sm font-bold text-[#0b1c30]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          No financial models yet
        </h3>
        <p className="mx-auto mt-1.5 max-w-md text-xs text-[#6b6a76]">
          Build a model to run scenarios, see valuation ranges, and spin up investor-ready decks.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <Button
            size="sm"
            className="h-8 rounded-lg bg-[#4338ca] px-4 text-xs font-bold text-white shadow-md hover:bg-[#3730a3]"
            asChild
          >
            <Link to="/models/new">
              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
              Create model
            </Link>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 rounded-lg border-[#d4d2e8] bg-white px-4 text-xs font-bold text-[#2a14b4] hover:bg-[#f8f7ff]"
            asChild
          >
            <Link to="/academy">
              <Upload className="h-3.5 w-3.5" strokeWidth={2} />
              Import data
            </Link>
          </Button>
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-xl border border-[#eeedf3] bg-white shadow-sm">
      <div className="flex items-center justify-between px-4 py-3">
        <h2
          className="text-sm font-bold text-[#0b1c30]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Financial Models
        </h2>
        <Button
          size="sm"
          className="h-7 rounded-md bg-[var(--brand-primary)] px-2.5 text-[11px] font-semibold text-white hover:bg-[#1565D8]"
          asChild
        >
          <Link to="/models/new">
            <Plus size={12} />
            New model
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 border-t border-[#eeedf3] p-4 sm:grid-cols-2 lg:grid-cols-3">
        {models.map((model) => (
          <Link
            key={model.id}
            to="/models/$modelId"
            params={{ modelId: model.id.toString() }}
            className="group flex flex-col rounded-lg border border-[#eeedf3] bg-[#fafbff] p-4 transition-shadow hover:shadow-md"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              {model.stage != null ? (
                <span
                  className="rounded-full bg-[var(--brand-primary)]/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--brand-primary)]"
                  title={model.stage === "idea" ? "Idea / Pre-seed" : model.stage === "early_growth" ? "Early growth / Seed" : "Scale / Series A"}
                >
                  {model.stage === "idea" ? "Idea" : model.stage === "early_growth" ? "Seed" : "Scale"}
                </span>
              ) : (
                <span />
              )}
              <span className="ml-auto flex items-center gap-1 text-[10px] text-[var(--brand-muted)]">
                <Calendar size={9} />
                {new Date(model.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </span>
            </div>

            <h3
              className="line-clamp-2 flex-1 text-xs font-bold text-[#0b1c30] group-hover:text-[var(--brand-primary)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {model.name}
            </h3>

            {model.companyName && (
              <p className="mt-0.5 truncate text-[11px] text-[var(--brand-muted)]">
                {model.companyName}
              </p>
            )}

            {model.description && (
              <p className="mt-1 line-clamp-2 text-[11px] text-[var(--brand-muted)]/70">
                {model.description}
              </p>
            )}

            <div className="mt-2.5 flex items-center justify-between">
              {model.latestArr != null ? (
                <span className="text-[11px] font-semibold text-[#0b1c30]">
                  ARR {new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(model.latestArr)}
                </span>
              ) : (
                <span />
              )}
              <span className="text-[11px] font-semibold text-[var(--brand-primary)] opacity-0 transition-opacity group-hover:opacity-100">
                Open →
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

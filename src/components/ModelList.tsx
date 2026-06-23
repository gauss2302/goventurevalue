import { Link } from '@tanstack/react-router'
import { Plus, BarChart3, Calendar, Upload, ArrowRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SubTitle } from '@/components/ui/typography'
import { EmptyState } from '@/components/layout'

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

const stageLabel: Record<NonNullable<Model['stage']>, { short: string; full: string }> = {
  idea: { short: 'Idea', full: 'Idea / Pre-seed' },
  early_growth: { short: 'Seed', full: 'Early growth / Seed' },
  scale: { short: 'Scale', full: 'Scale / Series A' },
}

export default function ModelList({ models }: ModelListProps) {
  if (models.length === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No financial models yet"
        description="Build a model to run scenarios, see valuation ranges, and spin up investor-ready decks."
        action={
          <div className="flex flex-wrap items-center justify-center gap-[var(--space-3)]">
            <Button variant="brand" size="sm" asChild>
              <Link to="/models/new">
                <Plus className="size-4" strokeWidth={2.5} />
                Create model
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/academy">
                <Upload className="size-4" strokeWidth={2} />
                Import data
              </Link>
            </Button>
          </div>
        }
      />
    )
  }

  return (
    <section className="rounded-[var(--card-radius)] border border-[var(--border-soft)] bg-[var(--surface)] shadow-[var(--card-shadow)]">
      <div className="flex items-center justify-between gap-3 px-[var(--space-5)] py-[var(--space-4)]">
        <SubTitle>Financial Models</SubTitle>
        <Button variant="brand" size="sm" asChild>
          <Link to="/models/new">
            <Plus className="size-4" strokeWidth={2.5} />
            New model
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-[var(--space-3)] border-t border-[var(--border-soft)] p-[var(--space-4)] sm:grid-cols-2 lg:grid-cols-3">
        {models.map((model) => (
          <Link
            key={model.id}
            to="/models/$modelId"
            params={{ modelId: model.id.toString() }}
            className="group flex flex-col rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--page)] p-[var(--space-4)] transition-all duration-300 [transition-timing-function:var(--ease-out-quint)] hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--brand-primary)_35%,var(--border-soft))] hover:shadow-[var(--card-shadow-hover)]"
          >
            <div className="mb-[var(--space-2)] flex items-center justify-between gap-2">
              {model.stage != null ? (
                <Badge variant="brand" title={stageLabel[model.stage].full}>
                  {stageLabel[model.stage].short}
                </Badge>
              ) : (
                <span />
              )}
              <span className="ml-auto flex items-center gap-1 text-[var(--text-caption2)] text-[var(--brand-muted)]">
                <Calendar size={11} aria-hidden />
                {new Date(model.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
            </div>

            <h3 className="font-display line-clamp-2 flex-1 text-[var(--text-subheadline)] font-bold leading-snug text-[var(--brand-ink)] transition-colors group-hover:text-[var(--brand-primary-hover)]">
              {model.name}
            </h3>

            {model.companyName && (
              <p className="mt-1 truncate text-[var(--text-caption1)] text-[var(--brand-muted)]">
                {model.companyName}
              </p>
            )}

            {model.description && (
              <p className="mt-1 line-clamp-2 text-[var(--text-caption1)] text-[var(--brand-muted)]">
                {model.description}
              </p>
            )}

            <div className="mt-[var(--space-3)] flex items-center justify-between">
              {model.latestArr != null ? (
                <span className="text-[var(--text-caption1)] font-semibold text-[var(--brand-ink)]">
                  ARR {new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(model.latestArr)}
                </span>
              ) : (
                <span />
              )}
              <span className="flex items-center gap-1 text-[var(--text-caption1)] font-semibold text-[var(--brand-primary-hover)] opacity-0 transition-opacity group-hover:opacity-100">
                Open <ArrowRight size={12} aria-hidden />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

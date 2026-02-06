import { Link } from "@tanstack/react-router";
import { Plus, Upload, Sparkles, Presentation } from "lucide-react";

export function QuickActions() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
      <Link
        to="/models/new"
        className="group relative overflow-hidden rounded-[var(--card-radius)] border border-[var(--border-soft)] bg-white px-5 py-4 shadow-[var(--card-shadow)] transition-all duration-200 hover:shadow-[var(--card-shadow-hover)] hover:-translate-y-0.5"
      >
        <div className="absolute -right-6 -top-10 h-20 w-20 rounded-full bg-[rgba(79,70,186,0.1)] blur-2xl" />
        <div className="relative flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-[var(--brand-primary)] text-white flex items-center justify-center shadow-[0_4px_14px_rgba(79,70,186,0.25)]">
            <Plus size={20} />
          </div>
          <div>
            <span className="block text-sm font-semibold text-[var(--brand-ink)]">
              New Model
            </span>
            <span className="block text-xs text-[var(--brand-muted)]">
              Start from a clean slate
            </span>
          </div>
        </div>
      </Link>

      <button className="group relative overflow-hidden rounded-[var(--card-radius)] border border-[var(--border-soft)] bg-white px-5 py-4 shadow-[var(--card-shadow)] transition-all duration-200 hover:shadow-[var(--card-shadow-hover)] hover:-translate-y-0.5">
        <div className="absolute -right-6 -top-10 h-20 w-20 rounded-full bg-[rgba(36,88,255,0.1)] blur-2xl" />
        <div className="relative flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-[rgba(36,88,255,0.12)] text-[#2458FF] flex items-center justify-center">
            <Upload size={20} />
          </div>
          <div>
            <span className="block text-sm font-semibold text-[var(--brand-ink)]">
              Import Data
            </span>
            <span className="block text-xs text-[var(--brand-muted)]">
              CSV or spreadsheet upload
            </span>
          </div>
        </div>
      </button>

      <Link
        to="/academy"
        className="group relative overflow-hidden rounded-[var(--card-radius)] border border-[var(--border-soft)] bg-white px-5 py-4 shadow-[var(--card-shadow)] transition-all duration-200 hover:shadow-[var(--card-shadow-hover)] hover:-translate-y-0.5"
      >
        <div className="absolute -right-6 -top-10 h-20 w-20 rounded-full bg-[rgba(249,137,107,0.12)] blur-2xl" />
        <div className="relative flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-[rgba(249,137,107,0.18)] text-[var(--brand-secondary)] flex items-center justify-center">
            <Sparkles size={20} />
          </div>
          <div>
            <span className="block text-sm font-semibold text-[var(--brand-ink)]">
              Guided Walkthrough
            </span>
            <span className="block text-xs text-[var(--brand-muted)]">
              See a valuation in minutes
            </span>
          </div>
        </div>
      </Link>

      <Link
        to={"/pitch-decks/new" as any}
        className="group relative overflow-hidden rounded-[var(--card-radius)] border border-[var(--border-soft)] bg-white px-5 py-4 shadow-[var(--card-shadow)] transition-all duration-200 hover:shadow-[var(--card-shadow-hover)] hover:-translate-y-0.5"
      >
        <div className="absolute -right-6 -top-10 h-20 w-20 rounded-full bg-[rgba(79,70,186,0.12)] blur-2xl" />
        <div className="relative flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-[rgba(79,70,186,0.14)] text-[var(--brand-primary)] flex items-center justify-center">
            <Presentation size={20} />
          </div>
          <div>
            <span className="block text-sm font-semibold text-[var(--brand-ink)]">
              New Pitch Deck
            </span>
            <span className="block text-xs text-[var(--brand-muted)]">
              AI-generated investor slides
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}

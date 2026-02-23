import { memo, useState } from "react";
import type { PitchDeckStyleQuestionnaireInput } from "@/lib/dto";

const DIMENSIONS: {
  key: keyof Omit<PitchDeckStyleQuestionnaireInput, "optionalNote">;
  label: string;
  options: string[];
}[] = [
  { key: "colorDirection", label: "Color direction", options: ["cool", "warm", "monochrome", "vibrant"] },
  {
    key: "imageryStyle",
    label: "Imagery style",
    options: ["product-centric", "abstract", "people", "data-heavy"],
  },
  { key: "visualDensity", label: "Visual density", options: ["minimal", "balanced", "dense"] },
  {
    key: "typographyPersonality",
    label: "Typography personality",
    options: ["modern", "classic", "technical", "editorial"],
  },
  { key: "brandAlignment", label: "Brand alignment", options: ["strict brand-like", "exploratory"] },
  {
    key: "investorRiskProfile",
    label: "Investor emphasis",
    options: ["credibility-first", "growth-first", "disruption-first"],
  },
];

export type StyleQuestionnaireModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (questionnaire: PitchDeckStyleQuestionnaireInput) => void;
  isPending?: boolean;
  title?: string;
  submitLabel?: string;
};

function StyleQuestionnaireModalComponent({
  open,
  onOpenChange,
  onSubmit,
  isPending = false,
  title = "Full AI slides — style",
  submitLabel = "Generate with Full AI",
}: StyleQuestionnaireModalProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [optionalNote, setOptionalNote] = useState("");

  const handleSubmit = () => {
    const questionnaire: PitchDeckStyleQuestionnaireInput = {};
    DIMENSIONS.forEach((d) => {
      const v = values[d.key]?.trim();
      if (v) questionnaire[d.key] = v;
    });
    if (optionalNote.trim()) questionnaire.optionalNote = optionalNote.trim();
    onSubmit(questionnaire);
    onOpenChange(false);
    setValues({});
    setOptionalNote("");
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="style-questionnaire-title"
    >
      <div
        className="fixed inset-0 bg-black/50"
        aria-hidden="true"
        onClick={() => !isPending && onOpenChange(false)}
      />
      <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--border-soft)] bg-white p-6 shadow-[var(--card-shadow)]">
        <h2
          id="style-questionnaire-title"
          className="text-lg font-[var(--font-display)] text-[var(--brand-ink)]"
        >
          {title}
        </h2>
        <p className="mt-1 text-sm text-[var(--brand-muted)]">
          Answer a few style questions so the AI can design the deck look.
        </p>

        <div className="mt-6 space-y-5">
          {DIMENSIONS.map((dim) => (
            <div key={dim.key}>
              <label className="block text-sm font-medium text-[var(--brand-ink)]">
                {dim.label}
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                {dim.options.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() =>
                      setValues((prev) => ({
                        ...prev,
                        [dim.key]: prev[dim.key] === opt ? "" : opt,
                      }))
                    }
                    className={`rounded-xl border px-3 py-2 text-sm transition-colors ${
                      values[dim.key] === opt
                        ? "border-[var(--brand-primary)] bg-[rgba(79,70,186,0.08)] text-[var(--brand-primary)]"
                        : "border-[var(--border-soft)] bg-white text-[var(--brand-ink)] hover:border-[var(--brand-primary)]/40"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div>
            <label className="block text-sm font-medium text-[var(--brand-ink)]">
              Optional note
            </label>
            <textarea
              value={optionalNote}
              onChange={(e) => setOptionalNote(e.target.value)}
              placeholder="Any extra style or tone preferences…"
              rows={2}
              className="mt-2 w-full rounded-xl border border-[var(--border-soft)] px-3 py-2 text-sm text-[var(--brand-ink)] placeholder:text-[var(--brand-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/30 focus:border-[var(--brand-primary)]"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="rounded-xl border border-[var(--border-soft)] px-4 py-2 text-sm disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {isPending ? "Generating…" : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export const StyleQuestionnaireModal = memo(StyleQuestionnaireModalComponent);

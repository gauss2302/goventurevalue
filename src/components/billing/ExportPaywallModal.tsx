import { X } from "lucide-react";

type ExportPaywallModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  checkoutUrl: string | null;
  title?: string;
  description?: string;
};

export function ExportPaywallModal({
  open,
  onOpenChange,
  checkoutUrl,
  title = "Export requires Pro",
  description = "Upgrade to Pro ($10/month) to export PDFs and Excel files.",
}: ExportPaywallModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close paywall modal"
        onClick={() => onOpenChange(false)}
        className="absolute inset-0 bg-black/40"
      />
      <div className="relative w-full max-w-md rounded-2xl border border-[var(--border-soft)] bg-white p-6 shadow-2xl">
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute right-3 top-3 rounded-full p-1 text-[var(--brand-muted)] hover:bg-[var(--surface-muted)]"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        <p className="text-xs uppercase tracking-[0.2em] text-[var(--brand-muted)]">
          Billing
        </p>
        <h3 className="mt-2 text-xl font-[var(--font-display)] text-[var(--brand-ink)]">
          {title}
        </h3>
        <p className="mt-3 text-sm text-[var(--brand-muted)]">{description}</p>

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex-1 rounded-xl border border-[var(--border-soft)] px-4 py-2 text-sm font-semibold text-[var(--brand-ink)] hover:bg-[var(--surface-muted)]"
          >
            Not now
          </button>
          <button
            type="button"
            disabled={!checkoutUrl}
            onClick={() => {
              if (!checkoutUrl) return;
              window.location.assign(checkoutUrl);
            }}
            className="flex-1 rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            Upgrade
          </button>
        </div>
      </div>
    </div>
  );
}

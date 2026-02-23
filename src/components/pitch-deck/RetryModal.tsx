import { memo } from "react";

type RetryModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
};

function RetryModalComponent({
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: RetryModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="retry-modal-title"
      aria-describedby="retry-modal-description"
    >
      <div
        className="fixed inset-0 bg-black/50"
        aria-hidden="true"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-[var(--border-soft)] bg-white p-6 shadow-[var(--card-shadow)]">
        <h2
          id="retry-modal-title"
          className="text-lg font-[var(--font-display)] text-[var(--brand-ink)]"
        >
          Regenerate pitch deck?
        </h2>
        <p
          id="retry-modal-description"
          className="mt-2 text-sm text-[var(--brand-muted)]"
        >
          This will replace the current content. Continue?
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="px-4 py-2 rounded-xl border border-[var(--border-soft)] text-sm disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
            disabled={isPending}
            className="px-4 py-2 rounded-xl bg-[var(--brand-primary)] text-white text-sm disabled:opacity-50"
          >
            {isPending ? "Regenerating…" : "Regenerate"}
          </button>
        </div>
      </div>
    </div>
  );
}

export const RetryModal = memo(RetryModalComponent);

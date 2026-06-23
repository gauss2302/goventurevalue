import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/typography";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <div className="mb-1 flex size-12 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--brand-accent)_16%,transparent)] text-[var(--brand-accent)]">
          <Sparkles className="size-6" strokeWidth={1.85} aria-hidden />
        </div>
        <DialogHeader>
          <Eyebrow>Billing</Eyebrow>
          <DialogTitle className="font-display text-[var(--text-title2)] font-bold tracking-[-0.01em] text-[var(--brand-ink)]">
            {title}
          </DialogTitle>
          <DialogDescription className="text-[var(--text-subheadline)] text-[var(--brand-muted)]">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-2 gap-2 sm:gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Not now
          </Button>
          <Button
            variant="accent"
            className="flex-1"
            disabled={!checkoutUrl}
            onClick={() => {
              if (!checkoutUrl) return;
              window.location.assign(checkoutUrl);
            }}
          >
            Upgrade
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

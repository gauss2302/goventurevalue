import { memo, useState, useEffect } from "react";

const SAVED_DISPLAY_MS = 2000;

type AutosaveIndicatorProps = {
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
};

function AutosaveIndicatorComponent({ isPending, isSuccess, isError }: AutosaveIndicatorProps) {
  const [savedUntil, setSavedUntil] = useState<number>(0);

  useEffect(() => {
    if (isSuccess && !isPending) {
      setSavedUntil(Date.now() + SAVED_DISPLAY_MS);
    }
  }, [isSuccess, isPending]);

  useEffect(() => {
    if (savedUntil <= 0) return;
    const id = setTimeout(() => setSavedUntil(0), savedUntil - Date.now());
    return () => clearTimeout(id);
  }, [savedUntil]);

  const showSaved = savedUntil > Date.now();

  if (isPending) {
    return (
      <span className="text-xs text-[var(--brand-muted)]" aria-live="polite">
        Saving…
      </span>
    );
  }
  if (isError) {
    return (
      <span className="text-xs text-red-600" aria-live="polite">
        Save failed
      </span>
    );
  }
  if (showSaved) {
    return (
      <span className="text-xs text-green-600" aria-live="polite">
        Saved
      </span>
    );
  }
  return null;
}

export const AutosaveIndicator = memo(AutosaveIndicatorComponent);

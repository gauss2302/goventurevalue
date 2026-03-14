import { memo, useState, useRef, useCallback } from "react";
import type { PitchDeckStyleQuestionnaireInput, PitchDeckThemePhoto } from "@/lib/dto";

const DIMENSIONS: {
  key: keyof Omit<PitchDeckStyleQuestionnaireInput, "optionalNote" | "themePhotos">;
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

const MAX_THEME_PHOTOS = 5;

export type StyleQuestionnaireModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (questionnaire: PitchDeckStyleQuestionnaireInput) => void;
  isPending?: boolean;
  title?: string;
  submitLabel?: string;
  /** Server-side Unsplash search. Returns array of photo results. */
  onSearchUnsplash?: (query: string) => Promise<PitchDeckThemePhoto[]>;
  /** AI-suggested Unsplash search queries based on current style answers */
  suggestedQueries?: string[];
};

function PhotoThumbnail({
  photo,
  onRemove,
}: {
  photo: PitchDeckThemePhoto;
  onRemove: () => void;
}) {
  return (
    <div className="relative group rounded-xl overflow-hidden border border-[var(--border-soft)] w-20 h-14 shrink-0">
      <img
        src={photo.url}
        alt={photo.alt ?? "Theme photo"}
        className="w-full h-full object-cover"
        loading="lazy"
      />
      {photo.photographerName && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5 hidden group-hover:flex items-center justify-center">
          <span className="text-[9px] text-white truncate">{photo.photographerName}</span>
        </div>
      )}
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
        aria-label="Remove photo"
      >
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
          <path d="M1 1l6 6M7 1L1 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

function UnsplashPhotoOption({
  photo,
  selected,
  onToggle,
}: {
  photo: PitchDeckThemePhoto;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative rounded-xl overflow-hidden border-2 transition-all ${
        selected
          ? "border-[var(--brand-primary)] ring-2 ring-[var(--brand-primary)]/30"
          : "border-transparent hover:border-[var(--brand-primary)]/40"
      }`}
      style={{ aspectRatio: "16/9" }}
      title={photo.photographerName ? `Photo by ${photo.photographerName}` : undefined}
    >
      <img
        src={photo.url}
        alt={photo.alt ?? ""}
        className="w-full h-full object-cover"
        loading="lazy"
      />
      {selected && (
        <div className="absolute inset-0 bg-[var(--brand-primary)]/20 flex items-center justify-center">
          <div className="w-6 h-6 rounded-full bg-[var(--brand-primary)] flex items-center justify-center shadow">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      )}
    </button>
  );
}

function StyleQuestionnaireModalComponent({
  open,
  onOpenChange,
  onSubmit,
  isPending = false,
  title = "Full AI slides — style",
  submitLabel = "Generate with Full AI",
  onSearchUnsplash,
  suggestedQueries = [],
}: StyleQuestionnaireModalProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [optionalNote, setOptionalNote] = useState("");
  const [themePhotos, setThemePhotos] = useState<PitchDeckThemePhoto[]>([]);

  const [unsplashQuery, setUnsplashQuery] = useState("");
  const [unsplashResults, setUnsplashResults] = useState<PitchDeckThemePhoto[]>([]);
  const [unsplashSearching, setUnsplashSearching] = useState(false);
  const [unsplashError, setUnsplashError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleAddPhoto = useCallback((photo: PitchDeckThemePhoto) => {
    setThemePhotos((prev) => {
      if (prev.find((p) => p.url === photo.url)) return prev;
      if (prev.length >= MAX_THEME_PHOTOS) return prev;
      return [...prev, photo];
    });
  }, []);

  const handleRemovePhoto = useCallback((url: string) => {
    setThemePhotos((prev) => prev.filter((p) => p.url !== url));
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      const remaining = MAX_THEME_PHOTOS - themePhotos.length;
      files.slice(0, remaining).forEach((file) => {
        if (!file.type.startsWith("image/")) return;
        const reader = new FileReader();
        reader.onloadend = () => {
          handleAddPhoto({
            url: reader.result as string,
            alt: file.name,
          });
        };
        reader.readAsDataURL(file);
      });
      e.target.value = "";
    },
    [themePhotos.length, handleAddPhoto],
  );

  const handleUnsplashSearch = useCallback(
    async (query: string) => {
      if (!query.trim() || !onSearchUnsplash) return;
      setUnsplashSearching(true);
      setUnsplashError(null);
      setUnsplashResults([]);
      try {
        const results = await onSearchUnsplash(query.trim());
        setUnsplashResults(results);
      } catch (err) {
        setUnsplashError(err instanceof Error ? err.message : "Search failed");
      } finally {
        setUnsplashSearching(false);
      }
    },
    [onSearchUnsplash],
  );

  const handleSubmit = () => {
    const questionnaire: PitchDeckStyleQuestionnaireInput = {};
    DIMENSIONS.forEach((d) => {
      const v = values[d.key]?.trim();
      if (v) questionnaire[d.key] = v as string;
    });
    if (optionalNote.trim()) questionnaire.optionalNote = optionalNote.trim();
    if (themePhotos.length > 0) questionnaire.themePhotos = themePhotos;
    onSubmit(questionnaire);
    onOpenChange(false);
    setValues({});
    setOptionalNote("");
    setThemePhotos([]);
    setUnsplashResults([]);
    setUnsplashQuery("");
  };

  const toggleUnsplashPhoto = useCallback(
    (photo: PitchDeckThemePhoto) => {
      const isSelected = themePhotos.some((p) => p.url === photo.url);
      if (isSelected) {
        handleRemovePhoto(photo.url);
      } else {
        handleAddPhoto(photo);
      }
    },
    [themePhotos, handleAddPhoto, handleRemovePhoto],
  );

  if (!open) return null;

  const unsplashAvailable = Boolean(onSearchUnsplash);
  const canAddMore = themePhotos.length < MAX_THEME_PHOTOS;

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
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--border-soft)] bg-white p-6 shadow-[var(--card-shadow)]">
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

          {/* Theme Photos */}
          <div className="border-t border-[var(--border-soft)] pt-5">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-[var(--brand-ink)]">
                Theme photos
                <span className="ml-1.5 text-xs font-normal text-[var(--brand-muted)]">
                  (optional, max {MAX_THEME_PHOTOS})
                </span>
              </label>
              <span className="text-xs text-[var(--brand-muted)]">
                {themePhotos.length}/{MAX_THEME_PHOTOS} selected
              </span>
            </div>
            <p className="text-xs text-[var(--brand-muted)] mb-3">
              Add photos to guide the visual mood and color palette of your presentation.
            </p>

            {/* Selected photos strip */}
            {themePhotos.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {themePhotos.map((photo) => (
                  <PhotoThumbnail
                    key={photo.url}
                    photo={photo}
                    onRemove={() => handleRemovePhoto(photo.url)}
                  />
                ))}
              </div>
            )}

            {/* Upload button */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={!canAddMore}
                className="flex items-center gap-1.5 rounded-xl border border-[var(--border-soft)] px-3 py-2 text-sm text-[var(--brand-primary)] hover:bg-[rgba(79,70,186,0.06)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1v8M4 4l3-3 3 3M2 11h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Upload image
              </button>
              <span className="text-xs text-[var(--brand-muted)]">JPEG, PNG, WebP</span>
            </div>

            {/* Unsplash search */}
            {unsplashAvailable && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={unsplashQuery}
                    onChange={(e) => setUnsplashQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleUnsplashSearch(unsplashQuery);
                      }
                    }}
                    placeholder="Search Unsplash photos…"
                    className="flex-1 min-w-0 rounded-xl border border-[var(--border-soft)] px-3 py-2 text-sm text-[var(--brand-ink)] placeholder:text-[var(--brand-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/30 focus:border-[var(--brand-primary)]"
                  />
                  <button
                    type="button"
                    onClick={() => handleUnsplashSearch(unsplashQuery)}
                    disabled={unsplashSearching || !unsplashQuery.trim()}
                    className="shrink-0 rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-sm text-white disabled:opacity-50 hover:bg-[var(--brand-primary)]/90 transition-colors"
                  >
                    {unsplashSearching ? (
                      <span className="inline-block w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    ) : (
                      "Search"
                    )}
                  </button>
                </div>

                {/* AI-suggested queries */}
                {suggestedQueries.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-xs text-[var(--brand-muted)] self-center">Suggested:</span>
                    {suggestedQueries.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => {
                          setUnsplashQuery(q);
                          handleUnsplashSearch(q);
                        }}
                        className="rounded-lg border border-[var(--border-soft)] px-2.5 py-1 text-xs text-[var(--brand-ink)] hover:border-[var(--brand-primary)]/50 hover:bg-[rgba(79,70,186,0.04)] transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}

                {unsplashError && (
                  <p className="text-xs text-red-600">{unsplashError}</p>
                )}

                {/* Unsplash results grid */}
                {unsplashResults.length > 0 && (
                  <div>
                    <p className="text-xs text-[var(--brand-muted)] mb-2">
                      Select photos to use as theme reference (click to toggle):
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {unsplashResults.map((photo) => (
                        <UnsplashPhotoOption
                          key={photo.unsplashId ?? photo.url}
                          photo={photo}
                          selected={themePhotos.some((p) => p.url === photo.url)}
                          onToggle={() => toggleUnsplashPhoto(photo)}
                        />
                      ))}
                    </div>
                    <p className="mt-2 text-[10px] text-[var(--brand-muted)]">
                      Photos by{" "}
                      <a
                        href="https://unsplash.com/?utm_source=goventurevalue&utm_medium=referral"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        Unsplash
                      </a>
                    </p>
                  </div>
                )}
              </div>
            )}
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

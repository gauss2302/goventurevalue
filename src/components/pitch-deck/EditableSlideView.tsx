import { memo, useState, useCallback, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import type { PitchDeckSlideDto, SlideLayoutId } from "@/lib/dto";
import type { PitchDeckTemplate } from "@/lib/pitchDeck/templates";
import type { ImproveTextFieldType } from "@/lib/pitchDeck/improveText";

type EditableField = "heading" | "subheading" | "speakerNotes" | `bullet-${number}`;

type EditableSlideViewProps = {
  slide: PitchDeckSlideDto;
  startupName: string;
  slideIndex: number;
  totalSlides: number;
  template: PitchDeckTemplate;
  onUpdate: (patch: Partial<PitchDeckSlideDto>) => void;
  onUpdateBullet: (bulletIndex: number, value: string) => void;
  onAddBullet: () => void;
  onRemoveBullet: (bulletIndex: number) => void;
  onImproveWithAi?: (params: {
    fieldType: ImproveTextFieldType;
    currentValue: string;
    bulletIndex?: number;
  }) => Promise<string>;
  isImproving?: boolean;
};

function EditableSlideViewComponent({
  slide,
  startupName,
  slideIndex,
  totalSlides,
  template,
  onUpdate,
  onUpdateBullet,
  onAddBullet,
  onRemoveBullet,
  onImproveWithAi,
  isImproving = false,
}: EditableSlideViewProps) {
  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [editValue, setEditValue] = useState("");
  const [improvingField, setImprovingField] = useState<EditableField | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageContainerRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [panning, setPanning] = useState(false);
  const resizeStartRef = useRef<{ scale: number; clientY: number } | null>(null);
  const panStartRef = useRef<{ clientX: number; clientY: number; panX: number; panY: number } | null>(null);

  const handlePasteImage = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (!file) return;
          const reader = new FileReader();
          reader.onloadend = () => onUpdate({ imageUrl: reader.result as string });
          reader.readAsDataURL(file);
          return;
        }
      }
    },
    [onUpdate]
  );

  const imageScale = Math.min(3, Math.max(0.25, slide.imageScale ?? 1));
  const imagePanX = Math.min(1, Math.max(0, slide.imagePanX ?? 0.5));
  const imagePanY = Math.min(1, Math.max(0, slide.imagePanY ?? 0.5));

  const handleResizePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      resizeStartRef.current = { scale: imageScale, clientY: e.clientY };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [imageScale]
  );

  const handleResizePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!resizeStartRef.current) return;
      const dy = e.clientY - resizeStartRef.current.clientY;
      const newScale = Math.min(3, Math.max(0.25, resizeStartRef.current.scale - dy * 0.008));
      onUpdate({ imageScale: newScale });
    },
    [onUpdate]
  );

  const handleResizePointerUp = useCallback(
    (e: React.PointerEvent) => {
      resizeStartRef.current = null;
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    },
    []
  );

  const handlePanPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (imageScale <= 1) return;
      e.preventDefault();
      panStartRef.current = { clientX: e.clientX, clientY: e.clientY, panX: imagePanX, panY: imagePanY };
      setPanning(true);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [imageScale, imagePanX, imagePanY]
  );

  const handlePanPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const start = panStartRef.current;
      if (!start) return;
      const container = imageContainerRef.current;
      const img = imageRef.current;
      if (!container || !img?.naturalWidth) return;
      const rect = container.getBoundingClientRect();
      const cw = rect.width;
      const ch = rect.height;
      const nw = img.naturalWidth;
      const nh = img.naturalHeight;
      const fitW = Math.min(cw, ch * (nw / nh));
      const fitH = fitW * (nh / nw);
      const scaledW = fitW * imageScale;
      const scaledH = fitH * imageScale;
      const overflowX = Math.max(0, (scaledW - cw) / 2);
      const overflowY = Math.max(0, (scaledH - ch) / 2);
      if (overflowX <= 0 && overflowY <= 0) return;
      const dx = e.clientX - start.clientX;
      const dy = e.clientY - start.clientY;
      let newPanX = start.panX;
      let newPanY = start.panY;
      if (overflowX > 0) newPanX = Math.min(1, Math.max(0, start.panX - dx / (overflowX * 2)));
      if (overflowY > 0) newPanY = Math.min(1, Math.max(0, start.panY - dy / (overflowY * 2)));
      onUpdate({ imagePanX: newPanX, imagePanY: newPanY });
    },
    [imageScale, onUpdate]
  );

  const handlePanPointerUp = useCallback(
    (e: React.PointerEvent) => {
      panStartRef.current = null;
      setPanning(false);
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    },
    []
  );

  const isCover = slide.type === "cover";
  const { colors, typography, layout } = template;
  const coverCentered = layout.cover.centered;
  const accentBar = layout.cover.accentBar ?? false;
  const bulletStyle = layout.content.bulletStyle;

  const startEditing = useCallback((field: EditableField, value: string) => {
    setEditingField(field);
    setEditValue(value);
  }, []);

  const commitEdit = useCallback(() => {
    if (editingField === null) return;
    const trimmed = editValue.trim();
    if (editingField === "heading") {
      onUpdate({ heading: trimmed || slide.heading });
    } else if (editingField === "subheading") {
      onUpdate({ subheading: trimmed });
    } else if (editingField === "speakerNotes") {
      onUpdate({ speakerNotes: trimmed });
    } else if (editingField.startsWith("bullet-")) {
      const i = parseInt(editingField.replace("bullet-", ""), 10);
      if (!Number.isNaN(i)) onUpdateBullet(i, trimmed || (slide.bullets[i] ?? ""));
    }
    setEditingField(null);
  }, [editingField, editValue, onUpdate, onUpdateBullet, slide.heading, slide.bullets]);

  useEffect(() => {
    if (editingField === null) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editingField]);

  const handleBlur = useCallback(() => {
    commitEdit();
  }, [commitEdit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        setEditingField(null);
        return;
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        commitEdit();
      }
    },
    [commitEdit],
  );

  const handleImproveWithAi = useCallback(
    async (fieldType: ImproveTextFieldType, currentValue: string, bulletIndex?: number) => {
      if (!onImproveWithAi) return;
      let field: EditableField;
      if (fieldType === "bullet") {
        if (bulletIndex === undefined) return;
        field = `bullet-${bulletIndex}`;
      } else {
        field = fieldType;
      }
      setImprovingField(field);
      try {
        const improved = await onImproveWithAi({ fieldType, currentValue, bulletIndex });
        if (fieldType === "heading") onUpdate({ heading: improved });
        else if (fieldType === "subheading") onUpdate({ subheading: improved });
        else if (fieldType === "speakerNotes") onUpdate({ speakerNotes: improved });
        else if (fieldType === "bullet" && bulletIndex !== undefined)
          onUpdateBullet(bulletIndex, improved);
      } finally {
        setImprovingField(null);
      }
    },
    [onImproveWithAi, onUpdate, onUpdateBullet],
  );

  const improveButton = (field: EditableField) =>
    onImproveWithAi ? (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (field === "heading")
            handleImproveWithAi("heading", slide.heading);
          else if (field === "subheading")
            handleImproveWithAi("subheading", slide.subheading);
          else if (field === "speakerNotes")
            handleImproveWithAi("speakerNotes", slide.speakerNotes);
          else if (field.startsWith("bullet-")) {
            const i = parseInt(field.replace("bullet-", ""), 10);
            handleImproveWithAi("bullet", slide.bullets[i] ?? "", i);
          }
        }}
        disabled={isImproving || improvingField !== null}
        className="text-[10px] px-1.5 py-0.5 rounded text-[var(--brand-primary)] hover:bg-[rgba(79,70,186,0.1)] disabled:opacity-50"
      >
        {improvingField === field ? "…" : "Improve with AI"}
      </button>
    ) : null;

  const wrapperStyle = {
    aspectRatio: "297/210" as const,
    backgroundColor: colors.background,
    borderColor: colors.border,
    fontFamily: typography.headingFont,
  };

  const displayHeading = slide.heading || `${slide.type} slide`;
  const contentAlign = isCover && coverCentered ? "items-center justify-center text-center" : "";
  const hasImage = Boolean(slide.imageUrl?.trim());
  const slideLayout = slide.layout ?? "default";
  const layoutWithImage = hasImage && slideLayout !== "default";

  const LAYOUT_OPTIONS: { value: SlideLayoutId; label: string }[] = [
    { value: "default", label: "Default" },
    { value: "image-left", label: "Image left" },
    { value: "image-right", label: "Image right" },
    { value: "image-top", label: "Image top" },
    { value: "image-full", label: "Image full" },
  ];

  const imageBlock = hasImage ? (
    <div
      ref={imageContainerRef}
      className="shrink-0 min-w-0 overflow-hidden flex items-center justify-center relative"
      style={{
        contain: "paint",
        backgroundColor: colors.background,
        ...(slideLayout === "image-left" || slideLayout === "image-right"
          ? { width: "40%", minWidth: 120 }
          : {}),
        ...(slideLayout === "image-top" ? { height: "35%", minHeight: 80 } : {}),
        ...(slideLayout === "image-full" ? { height: "40%", minHeight: 100 } : {}),
      }}
    >
      <div
        className="absolute inset-0 flex items-center justify-center origin-center overflow-hidden"
        style={{
          transform: `scale(${imageScale}) translate(${(0.5 - imagePanX) * Math.max(0, (imageScale - 1) * 2) * 100}%, ${(0.5 - imagePanY) * Math.max(0, (imageScale - 1) * 2) * 100}%)`,
          touchAction: panning ? "none" : "auto",
          cursor: imageScale > 1 ? (panning ? "grabbing" : "grab") : "default",
        }}
        onPointerDown={handlePanPointerDown}
        onPointerMove={handlePanPointerMove}
        onPointerUp={handlePanPointerUp}
        onPointerLeave={handlePanPointerUp}
      >
        <img
          ref={imageRef}
          src={slide.imageUrl}
          alt=""
          className="max-w-full max-h-full object-contain select-none pointer-events-none"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      </div>
      <div
        className="absolute bottom-1 right-1 w-5 h-5 rounded border-2 border-white bg-black/40 cursor-se-resize flex items-center justify-center"
        style={{ touchAction: "none" }}
        onPointerDown={handleResizePointerDown}
        onPointerMove={handleResizePointerMove}
        onPointerUp={handleResizePointerUp}
        onPointerLeave={handleResizePointerUp}
        aria-label="Resize image"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" className="text-white">
          <path d="M10 10H6V6H10" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      </div>
    </div>
  ) : null;

  const contentBlock = (
    <div className={`flex-1 p-4 md:p-6 flex flex-col min-h-0 min-w-0 overflow-auto ${contentAlign}`}>
      {/* Heading */}
        {editingField === "heading" ? (
          <textarea
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="w-full font-bold leading-tight mb-2 bg-white/80 rounded-lg px-2 py-1 border border-[var(--brand-primary)]/40 resize-none"
            style={{
              color: colors.heading,
              fontSize: isCover ? "clamp(1.25rem, 3vw, 1.75rem)" : "clamp(1rem, 2vw, 1.5rem)",
              minHeight: "2.5rem",
            }}
            rows={2}
          />
        ) : (
          <div className="mb-2 flex items-start gap-2">
            <h2
              role="button"
              tabIndex={0}
              onClick={() => startEditing("heading", slide.heading)}
              onKeyDown={(e) => e.key === "Enter" && startEditing("heading", slide.heading)}
              className="flex-1 font-bold leading-tight cursor-text rounded px-1 -mx-1 hover:bg-black/5"
              style={{
                color: colors.heading,
                fontSize: isCover ? "clamp(1.25rem, 3vw, 1.75rem)" : "clamp(1rem, 2vw, 1.5rem)",
              }}
            >
              <ReactMarkdown
                components={{
                  p: ({ children }) => <>{children}</>,
                  strong: ({ children }) => <strong>{children}</strong>,
                  em: ({ children }) => <em>{children}</em>,
                }}
              >
                {displayHeading}
              </ReactMarkdown>
            </h2>
            {improveButton("heading")}
          </div>
        )}

        {/* Subheading */}
        {editingField === "subheading" ? (
          <textarea
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="w-full text-sm mb-4 bg-white/80 rounded-lg px-2 py-1 border border-[var(--brand-primary)]/40 resize-none"
            style={{ color: colors.subheading, minHeight: "2rem" }}
            rows={2}
            placeholder="Add subheading…"
          />
        ) : (
          <div className="mb-4 flex items-start gap-2">
            <p
              role="button"
              tabIndex={0}
              onClick={() => startEditing("subheading", slide.subheading)}
              onKeyDown={(e) => e.key === "Enter" && startEditing("subheading", slide.subheading)}
              className="flex-1 text-sm cursor-text rounded px-1 -mx-1 hover:bg-black/5 min-h-[1.5rem]"
              style={{ color: colors.subheading }}
            >
              {slide.subheading ? (
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <>{children}</>,
                    strong: ({ children }) => <strong>{children}</strong>,
                    em: ({ children }) => <em>{children}</em>,
                  }}
                >
                  {slide.subheading}
                </ReactMarkdown>
              ) : (
                <span className="opacity-60">Click to add subheading</span>
              )}
            </p>
            {improveButton("subheading")}
          </div>
        )}

        {slide.keyMetrics && slide.keyMetrics.length > 0 ? (
          <div className="flex flex-wrap gap-2 mb-3">
            {slide.keyMetrics.map((metric, i) => (
              <span
                key={`${slide.id}-metric-${i}`}
                className="text-xs font-semibold px-2.5 py-1 rounded-md"
                style={{
                  backgroundColor: `${colors.accent}20`,
                  color: colors.accent,
                }}
              >
                {metric}
              </span>
            ))}
          </div>
        ) : null}

        {/* Bullets */}
        <ul className="space-y-2 flex-1 min-h-0 list-none pl-0">
          {slide.bullets.slice(0, 6).map((bullet, i) => {
            const isEmphasis = slide.emphasisBulletIndex === i;
            return (
            <li
              key={`${slide.id}-bullet-${i}`}
              className={`flex gap-2 text-sm group ${isEmphasis ? "font-semibold" : ""}`}
              style={{
                color: colors.bullets,
                ...(isEmphasis
                  ? {
                      backgroundColor: `${colors.accent}12`,
                      marginLeft: -4,
                      marginRight: -4,
                      paddingLeft: 4,
                      paddingRight: 4,
                      borderRadius: 4,
                    }
                  : {}),
              }}
            >
              {bulletStyle === "numbered" ? (
                <span className="shrink-0 font-semibold mt-0.5 min-w-5" style={{ color: colors.accent }}>
                  {i + 1}.
                </span>
              ) : bulletStyle === "dash" ? (
                <span
                  className="shrink-0 w-3 h-px mt-2"
                  style={{ backgroundColor: colors.accent, minWidth: 8 }}
                />
              ) : (
                <span
                  className="shrink-0 w-1.5 h-1.5 rounded-full mt-1.5"
                  style={{ backgroundColor: colors.accent }}
                />
              )}
              {editingField === `bullet-${i}` ? (
                <div className="flex-1 flex gap-2 min-w-0">
                  <textarea
                    ref={inputRef}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    className="flex-1 min-w-0 text-sm bg-white/80 rounded-lg px-2 py-1 border border-[var(--brand-primary)]/40 resize-none"
                    style={{ color: colors.bullets, minHeight: "2rem" }}
                    rows={2}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      onRemoveBullet(i);
                      setEditingField(null);
                    }}
                    className="shrink-0 px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex-1 min-w-0 flex items-start gap-1">
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={() => startEditing(`bullet-${i}` as EditableField, bullet)}
                    onKeyDown={(e) => e.key === "Enter" && startEditing(`bullet-${i}` as EditableField, bullet)}
                    className="flex-1 cursor-text rounded px-1 -mx-1 hover:bg-black/5"
                  >
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <>{children}</>,
                        strong: ({ children }) => <strong>{children}</strong>,
                        em: ({ children }) => <em>{children}</em>,
                      }}
                    >
                      {bullet || "Click to edit"}
                    </ReactMarkdown>
                  </span>
                  {improveButton(`bullet-${i}` as EditableField)}
                </div>
              )}
            </li>
          );
          })}
        </ul>
        {slide.bullets.length < 6 && (
          <button
            type="button"
            onClick={onAddBullet}
            className="mt-2 text-sm text-[var(--brand-primary)] hover:underline text-left"
          >
            + Add bullet
          </button>
        )}

        {/* Speaker notes */}
        <div
          className="mt-4 p-3 rounded-lg"
          style={{
            backgroundColor: colors.speakerNotesBg,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: colors.speakerNotesBorder,
          }}
        >
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className="text-xs font-semibold" style={{ color: colors.accent }}>
              Speaker Notes
            </p>
            {improveButton("speakerNotes")}
          </div>
          {editingField === "speakerNotes" ? (
            <textarea
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className="w-full text-xs bg-white/80 rounded-lg px-2 py-1 border border-[var(--brand-primary)]/40 resize-none"
              style={{ color: colors.bullets, minHeight: "4rem" }}
              rows={4}
              placeholder="Add speaker notes…"
            />
          ) : (
            <p
              role="button"
              tabIndex={0}
              onClick={() => startEditing("speakerNotes", slide.speakerNotes)}
              onKeyDown={(e) => e.key === "Enter" && startEditing("speakerNotes", slide.speakerNotes)}
              className="text-xs cursor-text rounded px-1 -mx-1 hover:bg-black/5 min-h-[3rem]"
              style={{ color: colors.bullets }}
            >
              {slide.speakerNotes ? (
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <>{children}</>,
                    strong: ({ children }) => <strong>{children}</strong>,
                    em: ({ children }) => <em>{children}</em>,
                  }}
                >
                  {slide.speakerNotes}
                </ReactMarkdown>
              ) : (
                <span className="opacity-60">Click to add speaker notes</span>
              )}
            </p>
          )}
        </div>
      </div>
  );

  return (
    <div
      className="flex flex-col rounded-2xl border-2 border-[var(--border-soft)] shadow-[var(--card-shadow)] overflow-hidden"
      style={wrapperStyle}
      aria-label={`Slide ${slideIndex + 1} of ${totalSlides} (editable)`}
      onPaste={handlePasteImage}
    >
      {isCover && accentBar ? (
        <div className="h-1.5 shrink-0" style={{ backgroundColor: colors.accent }} />
      ) : null}
      <div className="flex-1 p-2 flex flex-col min-h-0 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-2 px-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file?.type.startsWith("image/")) return;
              const reader = new FileReader();
              reader.onloadend = () => onUpdate({ imageUrl: reader.result as string });
              reader.readAsDataURL(file);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-[10px] text-[var(--brand-primary)] hover:underline"
          >
            Choose image…
          </button>
          <span className="text-[10px] text-[var(--brand-muted)]">or paste (Ctrl+V)</span>
          <select
            value={slideLayout}
            onChange={(e) => onUpdate({ layout: e.target.value as SlideLayoutId })}
            className="text-xs px-2 py-1 rounded border border-[var(--border-soft)] bg-white"
          >
            {LAYOUT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {hasImage ? (
            <button
              type="button"
              onClick={() => onUpdate({ imageUrl: undefined, layout: "default" })}
              className="text-[10px] text-red-600 hover:underline"
            >
              Clear image
            </button>
          ) : null}
        </div>
        {layoutWithImage ? (
          <div
            className={`flex-1 flex min-h-0 overflow-hidden ${
              slideLayout === "image-left" || slideLayout === "image-right"
                ? "flex-row"
                : "flex-col"
            }`}
          >
            {(slideLayout === "image-left" ||
              slideLayout === "image-top" ||
              slideLayout === "image-full") &&
              imageBlock}
            {contentBlock}
            {slideLayout === "image-right" && imageBlock}
          </div>
        ) : (
          contentBlock
        )}
      </div>
      <div
        className="px-4 py-2 text-[10px] border-t shrink-0"
        style={{ color: colors.footer, borderColor: colors.border }}
      >
        {startupName} • Slide {slideIndex + 1} / {totalSlides}
      </div>
    </div>
  );
}

export const EditableSlideView = memo(EditableSlideViewComponent);

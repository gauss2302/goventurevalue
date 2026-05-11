import { memo, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import type { PitchDeckSlideDto } from "@/lib/dto";
import type { PitchDeckTemplate } from "@/lib/pitchDeck/templates";

type SlidePreviewProps = {
  slide: PitchDeckSlideDto;
  startupName: string;
  slideIndex: number;
  totalSlides: number;
  template: PitchDeckTemplate;
};

function SlidePreviewComponent({
  slide,
  startupName,
  slideIndex,
  totalSlides,
  template,
}: SlidePreviewProps) {
  const heading = useMemo(
    () => slide.heading || `${slide.type} slide`,
    [slide.heading, slide.type]
  );

  const isCover = slide.type === "cover";
  const { colors, typography, layout } = template;
  const coverCentered = layout.cover.centered;
  const accentBar = layout.cover.accentBar ?? false;
  const bulletStyle = layout.content.bulletStyle;

  const wrapperStyle = useMemo(
    () => ({
      aspectRatio: "297/210" as const,
      backgroundColor: colors.background,
      borderColor: colors.border,
      fontFamily: typography.headingFont,
    }),
    [colors.background, colors.border, typography.headingFont]
  );

  const hasImage = Boolean(slide.imageUrl?.trim());
  const slideLayout = slide.layout ?? "default";
  const isFullBleed = slideLayout === "image-full";
  const layoutWithImage = hasImage && slideLayout !== "default" && !isFullBleed;
  const imageScale = Math.min(3, Math.max(0.25, slide.imageScale ?? 1));
  const imagePanX = Math.min(1, Math.max(0, slide.imagePanX ?? 0.5));
  const imagePanY = Math.min(1, Math.max(0, slide.imagePanY ?? 0.5));
  const [imageError, setImageError] = useState(false);

  // Cover-fit semantics: image fills the panel (no letterboxing), object-position
  // controls pan within the cover crop, transform: scale zooms further in.
  const imageStyle = useMemo(
    () => ({
      width: "100%",
      height: "100%",
      objectFit: "cover" as const,
      objectPosition: `${imagePanX * 100}% ${imagePanY * 100}%`,
      transform: `scale(${imageScale})`,
      transformOrigin: `${imagePanX * 100}% ${imagePanY * 100}%`,
      transition: "transform 120ms ease-out",
    }),
    [imagePanX, imagePanY, imageScale]
  );

  const renderImage = (rounded: boolean) =>
    imageError ? (
      <div
        className={`w-full h-full flex items-center justify-center ${rounded ? "rounded-lg" : ""}`}
        style={{ backgroundColor: colors.speakerNotesBg, color: colors.subheading }}
      >
        <span className="text-[10px] opacity-70">Image unavailable</span>
      </div>
    ) : (
      <img
        src={slide.imageUrl}
        alt=""
        className={`select-none ${rounded ? "rounded-lg" : ""}`}
        style={imageStyle}
        onError={() => setImageError(true)}
        draggable={false}
      />
    );

  const imageBlock = hasImage ? (
    <div
      className="shrink-0 min-w-0 overflow-hidden relative"
      style={{
        contain: "paint",
        backgroundColor: colors.speakerNotesBg,
        ...(slideLayout === "image-left" || slideLayout === "image-right"
          ? { width: "42%", minWidth: 60 }
          : {}),
        ...(slideLayout === "image-top" ? { height: "45%", minHeight: 50 } : {}),
      }}
    >
      {renderImage(false)}
    </div>
  ) : null;

  const contentBlock = (
    <div
      className={`flex-1 p-4 md:p-6 flex flex-col min-h-0 min-w-0 overflow-auto ${isCover && coverCentered ? "items-center justify-center text-center" : ""}`}
    >
      <h2
          className="font-bold leading-tight mb-2"
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
            {heading}
          </ReactMarkdown>
        </h2>
        {slide.subheading ? (
          <p
            className="text-sm mb-4"
            style={{ color: colors.subheading }}
          >
            <ReactMarkdown
              components={{
                p: ({ children }) => <>{children}</>,
                strong: ({ children }) => <strong>{children}</strong>,
                em: ({ children }) => <em>{children}</em>,
              }}
            >
              {slide.subheading}
            </ReactMarkdown>
          </p>
        ) : null}
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
        <ul className="space-y-2 flex-1 min-h-0 list-none pl-0">
          {slide.bullets.slice(0, 6).map((bullet, i) => {
            const isEmphasis = slide.emphasisBulletIndex === i;
            return (
            <li
              key={`${slide.id}-bullet-${i}`}
              className={`flex gap-2 text-sm ${isEmphasis ? "font-semibold" : ""}`}
              style={{
                color: colors.bullets,
                ...(isEmphasis ? { backgroundColor: `${colors.accent}12`, marginLeft: -4, marginRight: -4, paddingLeft: 4, paddingRight: 4, borderRadius: 4 } : {}),
              }}
            >
              {bulletStyle === "numbered" ? (
                <span
                  className="shrink-0 font-semibold mt-0.5 min-w-5"
                  style={{ color: colors.accent }}
                >
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
              <span className="flex-1 min-w-0">
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <>{children}</>,
                    strong: ({ children }) => <strong>{children}</strong>,
                    em: ({ children }) => <em>{children}</em>,
                  }}
                >
                  {bullet}
                </ReactMarkdown>
              </span>
            </li>
          );
          })}
        </ul>
        {slide.speakerNotes ? (
          <div
            className="mt-4 p-3 rounded-lg"
            style={{
              backgroundColor: colors.speakerNotesBg,
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: colors.speakerNotesBorder,
            }}
          >
            <p
              className="text-xs font-semibold mb-1"
              style={{ color: colors.accent }}
            >
              Speaker Notes
            </p>
            <p className="text-xs line-clamp-3" style={{ color: colors.bullets }}>
              <ReactMarkdown
                components={{
                  p: ({ children }) => <>{children}</>,
                  strong: ({ children }) => <strong>{children}</strong>,
                  em: ({ children }) => <em>{children}</em>,
                }}
              >
                {slide.speakerNotes}
              </ReactMarkdown>
            </p>
          </div>
        ) : null}
    </div>
  );

  return (
    <div
      className="flex flex-col rounded-2xl border shadow-[var(--card-shadow)] overflow-hidden relative"
      style={wrapperStyle}
      aria-label={`Slide ${slideIndex + 1} of ${totalSlides}`}
    >
      {/* Full-bleed background image with darkening overlay for text readability */}
      {hasImage && isFullBleed ? (
        <div className="absolute inset-0 overflow-hidden" style={{ contain: "paint" }}>
          {renderImage(false)}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(180deg, ${colors.background}cc 0%, ${colors.background}80 35%, ${colors.background}f2 100%)`,
            }}
          />
        </div>
      ) : null}
      {isCover && accentBar ? (
        <div
          className="h-1.5 shrink-0 relative"
          style={{ backgroundColor: colors.accent }}
        />
      ) : null}
      <div className="relative flex-1 flex flex-col min-h-0">
        {layoutWithImage ? (
          <div
            className={`flex-1 flex min-h-0 overflow-hidden ${
              slideLayout === "image-left" || slideLayout === "image-right"
                ? "flex-row"
                : "flex-col"
            }`}
          >
            {(slideLayout === "image-left" || slideLayout === "image-top") && imageBlock}
            {contentBlock}
            {slideLayout === "image-right" && imageBlock}
          </div>
        ) : (
          contentBlock
        )}
      </div>
      <div
        className="px-4 py-2 text-[10px] border-t shrink-0 relative"
        style={{ color: colors.footer, borderColor: colors.border, backgroundColor: isFullBleed ? `${colors.background}f2` : undefined }}
      >
        {startupName} • Slide {slideIndex + 1} / {totalSlides}
      </div>
    </div>
  );
}

export const SlidePreview = memo(SlidePreviewComponent);

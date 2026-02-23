import { memo, useMemo } from "react";
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
  const layoutWithImage = hasImage && slideLayout !== "default";
  const imageScale = Math.min(3, Math.max(0.25, slide.imageScale ?? 1));
  const imagePanX = Math.min(1, Math.max(0, slide.imagePanX ?? 0.5));
  const imagePanY = Math.min(1, Math.max(0, slide.imagePanY ?? 0.5));

  const imageBlock = hasImage ? (
    <div
      className="shrink-0 min-w-0 overflow-hidden flex items-center justify-center relative"
      style={{
        contain: "paint",
        backgroundColor: colors.background,
        ...(slideLayout === "image-left" || slideLayout === "image-right"
          ? { width: "40%", minWidth: 60 }
          : {}),
        ...(slideLayout === "image-top" ? { height: "35%", minHeight: 40 } : {}),
        ...(slideLayout === "image-full" ? { height: "40%", minHeight: 50 } : {}),
      }}
    >
      <div
        className="absolute inset-0 flex items-center justify-center origin-center overflow-hidden"
        style={{
          transform: `scale(${imageScale}) translate(${(0.5 - imagePanX) * Math.max(0, (imageScale - 1) * 2) * 100}%, ${(0.5 - imagePanY) * Math.max(0, (imageScale - 1) * 2) * 100}%)`,
        }}
      >
        <img
          src={slide.imageUrl}
          alt=""
          className="max-w-full max-h-full object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      </div>
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
      className="flex flex-col rounded-2xl border shadow-[var(--card-shadow)] overflow-hidden"
      style={wrapperStyle}
      aria-label={`Slide ${slideIndex + 1} of ${totalSlides}`}
    >
      {isCover && accentBar ? (
        <div
          className="h-1.5 shrink-0"
          style={{ backgroundColor: colors.accent }}
        />
      ) : null}
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
      <div
        className="px-4 py-2 text-[10px] border-t shrink-0"
        style={{ color: colors.footer, borderColor: colors.border }}
      >
        {startupName} • Slide {slideIndex + 1} / {totalSlides}
      </div>
    </div>
  );
}

export const SlidePreview = memo(SlidePreviewComponent);

import { memo, useRef, useEffect } from "react";
import type { PitchDeckSlideDto } from "@/lib/dto";
import type { PitchDeckTemplate } from "@/lib/pitchDeck/templates";

type SlideCarouselProps = {
  slides: PitchDeckSlideDto[];
  selectedIndex: number;
  onSelectSlide: (index: number) => void;
  template: PitchDeckTemplate;
};

function SlideCarouselComponent({
  slides,
  selectedIndex,
  onSelectSlide,
  template,
}: SlideCarouselProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const { colors } = template;

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const selectedEl = list.querySelector(`[data-slide-index="${selectedIndex}"]`);
    if (selectedEl) {
      selectedEl.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [selectedIndex]);

  return (
    <div className="w-full overflow-x-auto overflow-y-hidden pb-2">
      <div
        ref={listRef}
        className="flex gap-3 px-1 justify-start min-w-0"
        role="tablist"
        aria-label="Slide thumbnails"
      >
        {slides.map((slide, index) => {
          const isSelected = index === selectedIndex;
          return (
            <button
              key={slide.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              aria-label={`Slide ${index + 1}: ${slide.type}`}
              data-slide-index={index}
              onClick={() => onSelectSlide(index)}
              className={`shrink-0 w-28 rounded-xl border-2 transition-all focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:ring-offset-2 ${
                isSelected
                  ? "border-[var(--brand-primary)] ring-2 ring-[rgba(79,70,186,0.2)]"
                  : "border-[var(--border-soft)] hover:border-[var(--brand-primary)]/50"
              }`}
              style={{
                aspectRatio: "297/210",
                backgroundColor: colors.background,
              }}
            >
              <div className="h-full p-2 flex flex-col text-left overflow-hidden">
                <span
                  className="text-[10px] uppercase font-semibold truncate"
                  style={{ color: colors.accent }}
                >
                  {slide.type.replace(/-/g, " ")}
                </span>
                <span
                  className="text-xs mt-1 line-clamp-3 leading-tight truncate"
                  style={{ color: colors.heading }}
                >
                  {slide.heading || `Slide ${index + 1}`}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export const SlideCarousel = memo(SlideCarouselComponent);

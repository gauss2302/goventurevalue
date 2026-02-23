import { memo, useRef, useEffect } from "react";
import type { PitchDeckSlideDto } from "@/lib/dto";

type SlideEditorProps = {
  slide: PitchDeckSlideDto;
  slideIndex: number;
  totalSlides: number; // used for heading label "Slide N: type"
  onUpdate: (patch: Partial<PitchDeckSlideDto>) => void;
  onUpdateBullet: (bulletIndex: number, value: string) => void;
  onAddBullet: () => void;
  onRemoveBullet: (bulletIndex: number) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
};

function useAutoResizeTextarea(value: string) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 400)}px`;
  }, [value]);

  return ref;
}

function insertAtCursor(
  textarea: HTMLTextAreaElement | null,
  before: string,
  after: string
) {
  if (!textarea || textarea.tagName !== "TEXTAREA") return;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;
  const newValue =
    value.slice(0, start) + before + value.slice(start, end) + after + value.slice(end);
  const setter = Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype,
    "value"
  )?.set;
  if (setter) {
    setter.call(textarea, newValue);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  }
  textarea.setSelectionRange(
    start + before.length + (end - start),
    start + before.length + (end - start)
  );
  textarea.focus();
}

function MarkdownToolbar() {
  const handleInsert = (before: string, after: string) => {
    const el = document.activeElement;
    insertAtCursor(
      el instanceof HTMLTextAreaElement ? el : null,
      before,
      after
    );
  };
  return (
    <div className="flex gap-1 flex-wrap">
      <button
        type="button"
        onClick={() => handleInsert("**", "**")}
        className="px-2 py-1 rounded border border-[var(--border-soft)] text-xs font-bold hover:bg-[var(--surface-muted)]"
        title="Bold"
      >
        B
      </button>
      <button
        type="button"
        onClick={() => handleInsert("*", "*")}
        className="px-2 py-1 rounded border border-[var(--border-soft)] text-xs italic hover:bg-[var(--surface-muted)]"
        title="Italic"
      >
        I
      </button>
      <button
        type="button"
        onClick={() => handleInsert("\n- ", "")}
        className="px-2 py-1 rounded border border-[var(--border-soft)] text-xs hover:bg-[var(--surface-muted)]"
        title="Bullet"
      >
        •
      </button>
    </div>
  );
}

function SlideEditorComponent({
  slide,
  slideIndex,
  totalSlides: _totalSlides,
  onUpdate,
  onUpdateBullet,
  onAddBullet,
  onRemoveBullet,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: SlideEditorProps) {
  const headingRef = useAutoResizeTextarea(slide.heading);
  const subheadingRef = useAutoResizeTextarea(slide.subheading);
  const speakerNotesRef = useAutoResizeTextarea(slide.speakerNotes);

  return (
    <section className="bg-white rounded-2xl border border-[var(--border-soft)] p-6 shadow-[var(--card-shadow)] space-y-4 flex flex-col min-h-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-[var(--font-display)]">
          Slide {slideIndex + 1}: {slide.type}
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={!canMoveUp}
            className="px-3 py-1.5 rounded-lg border border-[var(--border-soft)] text-xs disabled:opacity-50"
          >
            Move Up
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={!canMoveDown}
            className="px-3 py-1.5 rounded-lg border border-[var(--border-soft)] text-xs disabled:opacity-50"
          >
            Move Down
          </button>
        </div>
      </div>

      <label className="block text-sm text-[var(--brand-muted)]">
        Heading
        <div className="mt-1 flex flex-col gap-1">
          <MarkdownToolbar />
          <textarea
            ref={headingRef}
            value={slide.heading}
            onChange={(e) => onUpdate({ heading: e.target.value })}
            className="w-full min-h-[2.5rem] px-3 py-2 rounded-xl border border-[var(--border-soft)] resize-y"
            rows={1}
            style={{ fieldSizing: "content" } as React.CSSProperties}
          />
        </div>
      </label>

      <label className="block text-sm text-[var(--brand-muted)]">
        Subheading
        <textarea
          ref={subheadingRef}
          value={slide.subheading}
          onChange={(e) => onUpdate({ subheading: e.target.value })}
          className="mt-1 w-full min-h-[2.5rem] px-3 py-2 rounded-xl border border-[var(--border-soft)] resize-y"
          rows={1}
          style={{ fieldSizing: "content" } as React.CSSProperties}
        />
      </label>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm text-[var(--brand-muted)]">Bullets</p>
          <button
            type="button"
            onClick={onAddBullet}
            className="text-xs px-2 py-1 rounded border border-[var(--border-soft)] hover:bg-[var(--surface-muted)]"
          >
            Add Bullet
          </button>
        </div>
        {slide.bullets.map((bullet, bulletIndex) => (
          <div
            key={`${slide.id}-bullet-${bulletIndex}`}
            className="flex gap-2 items-start"
          >
            <textarea
              value={bullet}
              onChange={(e) => onUpdateBullet(bulletIndex, e.target.value)}
              className="flex-1 min-h-[2.5rem] px-3 py-2 rounded-xl border border-[var(--border-soft)] resize-y"
              rows={2}
              style={{ fieldSizing: "content" } as React.CSSProperties}
            />
            <button
              type="button"
              onClick={() => onRemoveBullet(bulletIndex)}
              className="px-3 py-2 rounded-xl border border-[var(--border-soft)] text-xs hover:bg-[var(--surface-muted)] flex-shrink-0"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <label className="block text-sm text-[var(--brand-muted)]">
        Speaker Notes
        <textarea
          ref={speakerNotesRef}
          value={slide.speakerNotes}
          onChange={(e) => onUpdate({ speakerNotes: e.target.value })}
          className="mt-1 w-full min-h-[4rem] px-3 py-2 rounded-xl border border-[var(--border-soft)] resize-y"
          rows={4}
          style={{ fieldSizing: "content" } as React.CSSProperties}
        />
      </label>
    </section>
  );
}

export const SlideEditor = memo(SlideEditorComponent);

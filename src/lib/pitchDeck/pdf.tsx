import jsPDF from "jspdf";
import type { PitchDeckSlideDto, SlideLayoutId } from "@/lib/dto";
import type { PitchDeckTemplate } from "@/lib/pitchDeck/templates";
import { hexToRgb } from "@/lib/pitchDeck/templates";

type PitchDeckPdfParams = {
  title: string;
  startupName: string;
  slides: PitchDeckSlideDto[];
  template: PitchDeckTemplate;
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "pitch-deck";

const pdfFont = (font: string): "helvetica" | "times" | "courier" => {
  const f = font.toLowerCase();
  if (f === "times") return "times";
  if (f === "courier") return "courier";
  return "helvetica";
};

async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function getImageFormat(dataUrl: string): "JPEG" | "PNG" {
  return dataUrl.startsWith("data:image/png") ? "PNG" : "JPEG";
}

/** Parse image dimensions from data URL (PNG/JPEG headers) when Image() fails. */
function getImageDimensionsFromDataUrl(dataUrl: string): { w: number; h: number } | null {
  const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : "";
  if (!base64) return null;
  let binary: string;
  try {
    binary = atob(base64);
  } catch {
    return null;
  }
  const len = binary.length;
  if (len < 24) return null;

  if (dataUrl.startsWith("data:image/png")) {
    if (binary.slice(1, 4) !== "PNG") return null;
    const w = (binary.charCodeAt(16) << 24) | (binary.charCodeAt(17) << 16) | (binary.charCodeAt(18) << 8) | binary.charCodeAt(19);
    const h = (binary.charCodeAt(20) << 24) | (binary.charCodeAt(21) << 16) | (binary.charCodeAt(22) << 8) | binary.charCodeAt(23);
    return w > 0 && h > 0 ? { w, h } : null;
  }

  if (dataUrl.startsWith("data:image/jpeg") || dataUrl.startsWith("data:image/jpg")) {
    let i = 2;
    while (i < len - 1) {
      if (binary.charCodeAt(i) !== 0xff) {
        i++;
        continue;
      }
      const marker = binary.charCodeAt(i + 1);
      if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
        if (i + 9 > len) return null;
        const h = (binary.charCodeAt(i + 5) << 8) | binary.charCodeAt(i + 6);
        const w = (binary.charCodeAt(i + 7) << 8) | binary.charCodeAt(i + 8);
        return w > 0 && h > 0 ? { w, h } : null;
      }
      if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd9)) {
        i += 2;
        continue;
      }
      if (i + 4 > len) return null;
      const segLen = (binary.charCodeAt(i + 2) << 8) | binary.charCodeAt(i + 3);
      i += 2 + segLen;
    }
  }
  return null;
}

function getImageDimensions(dataUrl: string): Promise<{ w: number; h: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => {
      const parsed = getImageDimensionsFromDataUrl(dataUrl);
      resolve(parsed);
    };
    img.src = dataUrl;
  });
}

export async function exportPitchDeckToPdf({
  title,
  startupName,
  slides,
  template,
}: PitchDeckPdfParams): Promise<void> {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: "a4",
  });

  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();

  const c = template.colors;
  const t = template.typography;
  const [bgR, bgG, bgB] = hexToRgb(c.background);
  const [borderR, borderG, borderB] = hexToRgb(c.border);
  const [headingR, headingG, headingB] = hexToRgb(c.heading);
  const [subR, subG, subB] = hexToRgb(c.subheading);
  const [bulletR, bulletG, bulletB] = hexToRgb(c.bullets);
  const [accentR, accentG, accentB] = hexToRgb(c.accent);
  const [footerR, footerG, footerB] = hexToRgb(c.footer);
  const [notesBgR, notesBgG, notesBgB] = hexToRgb(c.speakerNotesBg);
  const [notesBorderR, notesBorderG, notesBorderB] = hexToRgb(c.speakerNotesBorder);

  const fontFamily = pdfFont(t.headingFont);
  const isCover = (slide: PitchDeckSlideDto) => slide.type === "cover";
  const bulletStyle = template.layout.content.bulletStyle;
  const accentBar = template.layout.cover.accentBar ?? false;

  const imageDataUrls: (string | null)[] = await Promise.all(
    slides.map(async (s) => {
      const u = s.imageUrl?.trim();
      if (!u) return null;
      if (u.startsWith("data:")) return u;
      return fetchImageAsDataUrl(u);
    })
  );

  let imageDimensions: ({ w: number; h: number } | null)[] = await Promise.all(
    imageDataUrls.map((dataUrl) => (dataUrl ? getImageDimensions(dataUrl) : Promise.resolve(null)))
  );
  imageDimensions = imageDimensions.map((dims, i) => {
    if (dims != null) return dims;
    const dataUrl = imageDataUrls[i];
    return dataUrl ? getImageDimensionsFromDataUrl(dataUrl) : null;
  });

  slides.forEach((slide, index) => {
    if (index > 0) {
      doc.addPage();
    }

    doc.setFillColor(bgR, bgG, bgB);
    doc.rect(0, 0, width, height, "F");

    const margin = 28;
    const innerW = width - 2 * margin;
    const innerH = height - 48;
    const innerTop = 24;

    if (isCover(slide) && accentBar) {
      doc.setFillColor(accentR, accentG, accentB);
      doc.rect(margin, innerTop, innerW, 6, "F");
    }

    doc.setDrawColor(borderR, borderG, borderB);
    doc.rect(margin, innerTop, innerW, innerH);

    const hasImage = Boolean(slide.imageUrl?.trim());
    const slideLayout: SlideLayoutId = slide.layout ?? "default";
    const layoutWithImage =
      hasImage &&
      slideLayout !== "default" &&
      imageDataUrls[index] != null;

    let contentLeft = 48;
    let contentWidth = width - 96;
    let contentTop = innerTop + 12;
    let contentAreaHeight = innerH - 24;

    if (layoutWithImage && imageDataUrls[index]) {
      const dataUrl = imageDataUrls[index]!;
      const imgFormat = getImageFormat(dataUrl);
      const boxW = slideLayout === "image-left" || slideLayout === "image-right" ? innerW * 0.4 : innerW;
      const boxH =
        slideLayout === "image-top" || slideLayout === "image-full"
          ? innerH * 0.35
          : innerH * 0.88;
      const boxX =
        slideLayout === "image-right"
          ? margin + innerW * 0.6
          : margin;
      const boxY =
        slideLayout === "image-left" || slideLayout === "image-right"
          ? innerTop + (innerH - boxH) / 2
          : innerTop;

      const dims = imageDimensions[index];
      let drawX = boxX;
      let drawY = boxY;
      let drawW = boxW;
      let drawH = boxH;
      let shouldDraw = false;

      if (dims && dims.w > 0 && dims.h > 0) {
        const fitScale = Math.min(boxW / dims.w, boxH / dims.h);
        drawW = dims.w * fitScale;
        drawH = dims.h * fitScale;
        drawX = boxX + (boxW - drawW) / 2;
        drawY = boxY + (boxH - drawH) / 2;

        const userScale = Math.min(3, Math.max(0.25, slide.imageScale ?? 1));
        drawW *= userScale;
        drawH *= userScale;

        const panX = Math.min(1, Math.max(0, slide.imagePanX ?? 0.5));
        const panY = Math.min(1, Math.max(0, slide.imagePanY ?? 0.5));
        drawX = boxX + panX * (boxW - drawW);
        drawY = boxY + panY * (boxH - drawH);
        shouldDraw = true;
      }

      if (shouldDraw) {
        try {
          doc.saveGraphicsState();
          doc.rect(boxX, boxY, boxW, boxH, null);
          doc.clip();
          doc.addImage(dataUrl, imgFormat, drawX, drawY, drawW, drawH);
          doc.restoreGraphicsState();
        } catch {
          // skip image if addImage fails
        }
      }

      if (slideLayout === "image-left") {
        contentLeft = margin + innerW * 0.4 + 12;
        contentWidth = innerW * 0.6 - 24;
      } else if (slideLayout === "image-right") {
        contentLeft = margin + 12;
        contentWidth = innerW * 0.6 - 24;
      } else {
        contentTop = innerTop + boxH + 8;
        contentAreaHeight = innerH - boxH - 16;
      }
    }

    const left = contentLeft;
    const textWidth = contentWidth;

    if (isCover(slide) && template.layout.cover.centered) {
      const centerX = width / 2;
      doc.setFont(fontFamily, "bold");
      doc.setTextColor(headingR, headingG, headingB);
      doc.setFontSize(t.headingSize + 4);
      const headingLines = doc.splitTextToSize(
        slide.heading || `${slide.type} slide`,
        textWidth
      );
      let y = height / 2 - (headingLines.length * 22) / 2 - 20;
      headingLines.forEach((line: string) => {
        doc.text(line, centerX, y, { align: "center" });
        y += 22;
      });
      if (slide.subheading) {
        doc.setFont(fontFamily, "normal");
        doc.setTextColor(subR, subG, subB);
        doc.setFontSize(14);
        const subLines = doc.splitTextToSize(slide.subheading, textWidth);
        subLines.forEach((line: string) => {
          doc.text(line, centerX, y + 10, { align: "center" });
          y += 18;
        });
      }
    } else {
      const headingY = layoutWithImage ? contentTop + 14 : 72;
      doc.setFont(fontFamily, "bold");
      doc.setTextColor(headingR, headingG, headingB);
      doc.setFontSize(t.headingSize);
      doc.text(slide.heading || `${slide.type} slide`, left, headingY, {
        maxWidth: textWidth,
      });

      let contentY = headingY + 28;
      if (slide.subheading) {
        doc.setFont(fontFamily, "normal");
        doc.setTextColor(subR, subG, subB);
        doc.setFontSize(14);
        const subLines = doc.splitTextToSize(slide.subheading, textWidth);
        doc.text(subLines, left, contentY);
        contentY += subLines.length * 18 + 16;
      }

      if (slide.keyMetrics && slide.keyMetrics.length > 0) {
        doc.setFont(fontFamily, "bold");
        doc.setFontSize(10);
        const lightAccentR = Math.round(accentR * 0.2 + 255 * 0.8);
        const lightAccentG = Math.round(accentG * 0.2 + 255 * 0.8);
        const lightAccentB = Math.round(accentB * 0.2 + 255 * 0.8);
        let metricX = left;
        slide.keyMetrics.forEach((metric) => {
          const mW = doc.getTextWidth(metric) + 12;
          if (metricX + mW > width - left) {
            metricX = left;
            contentY += 18;
          }
          doc.setFillColor(lightAccentR, lightAccentG, lightAccentB);
          doc.roundedRect(metricX, contentY - 2, mW, 14, 2, 2, "FD");
          doc.setTextColor(accentR, accentG, accentB);
          doc.text(metric, metricX + 6, contentY + 10);
          metricX += mW + 6;
        });
        contentY += 22;
      }

      const bulletAreaLeft = left;
      const bulletTextWidth = textWidth - 24;
      let cursorY = Math.max(contentY, contentTop + 50);
      doc.setFont(fontFamily, "normal");
      doc.setTextColor(bulletR, bulletG, bulletB);
      doc.setFontSize(t.bodySize);

      slide.bullets.slice(0, 6).forEach((bullet, i) => {
        const wrapped = doc.splitTextToSize(bullet, bulletTextWidth);
        const bulletX = bulletAreaLeft + 10;
        const isEmphasis = slide.emphasisBulletIndex === i;
        if (isEmphasis) {
          doc.setFillColor(accentR, accentG, accentB);
          doc.rect(bulletAreaLeft, cursorY - 14, textWidth + 8, Math.max(wrapped.length * 18 + 12, 22), "F");
          doc.setFillColor(bgR, bgG, bgB);
          doc.rect(bulletAreaLeft + 2, cursorY - 12, textWidth + 4, Math.max(wrapped.length * 18 + 8, 18), "F");
        }
        if (bulletStyle === "numbered") {
          doc.setFont(fontFamily, "bold");
          doc.setTextColor(accentR, accentG, accentB);
          doc.text(`${i + 1}.`, bulletX - 4, cursorY);
          doc.setFont(fontFamily, isEmphasis ? "bold" : "normal");
          doc.setTextColor(bulletR, bulletG, bulletB);
          doc.text(wrapped, bulletX + 12, cursorY);
          if (isEmphasis) doc.setFont(fontFamily, "normal");
        } else if (bulletStyle === "dash") {
          doc.setDrawColor(accentR, accentG, accentB);
          doc.setLineWidth(1.5);
          doc.line(bulletX - 6, cursorY - 6, bulletX, cursorY - 6);
          if (isEmphasis) doc.setFont(fontFamily, "bold");
          doc.setTextColor(bulletR, bulletG, bulletB);
          doc.text(wrapped, bulletX + 12, cursorY);
          if (isEmphasis) doc.setFont(fontFamily, "normal");
        } else {
          doc.setFillColor(accentR, accentG, accentB);
          doc.circle(bulletX, cursorY - 4, 2, "F");
          if (isEmphasis) doc.setFont(fontFamily, "bold");
          doc.setTextColor(bulletR, bulletG, bulletB);
          doc.text(wrapped, bulletX + 12, cursorY);
          if (isEmphasis) doc.setFont(fontFamily, "normal");
        }
        cursorY += wrapped.length * 18 + 8;
      });

      if (slide.speakerNotes) {
        doc.setDrawColor(notesBorderR, notesBorderG, notesBorderB);
        doc.setFillColor(notesBgR, notesBgG, notesBgB);
        const notesTop = Math.max(cursorY + 10, height - 170);
        const notesHeight = height - notesTop - 36;
        doc.roundedRect(left, notesTop, textWidth + 16, notesHeight, 8, 8, "FD");

        doc.setFont(fontFamily, "bold");
        doc.setTextColor(accentR, accentG, accentB);
        doc.setFontSize(11);
        doc.text("Speaker Notes", left + 12, notesTop + 20);

        doc.setFont(fontFamily, "normal");
        doc.setTextColor(bulletR, bulletG, bulletB);
        doc.setFontSize(10);
        const noteLines = doc.splitTextToSize(slide.speakerNotes, textWidth);
        doc.text(noteLines.slice(0, 10), left + 12, notesTop + 40);
      }
    }

    doc.setFont(fontFamily, "normal");
    doc.setFontSize(10);
    doc.setTextColor(footerR, footerG, footerB);
    doc.text(
      `${startupName} • Slide ${index + 1} / ${slides.length}`,
      48,
      height - 24
    );
  });

  const filename = `${slugify(startupName || title)}-pitch-deck.pdf`;
  doc.save(filename);
};

import jsPDF from "jspdf";
import type { PitchDeckSlideDto } from "@/lib/dto";

type PitchDeckPdfParams = {
  title: string;
  startupName: string;
  slides: PitchDeckSlideDto[];
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "pitch-deck";

export const exportPitchDeckToPdf = ({ title, startupName, slides }: PitchDeckPdfParams) => {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: "a4",
  });

  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();

  slides.forEach((slide, index) => {
    if (index > 0) {
      doc.addPage();
    }

    doc.setFillColor(252, 252, 253);
    doc.rect(0, 0, width, height, "F");

    doc.setDrawColor(226, 226, 226);
    doc.rect(28, 24, width - 56, height - 48);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(28, 30, 47);
    doc.setFontSize(28);
    doc.text(slide.heading || `${slide.type} slide`, 48, 72, { maxWidth: width - 96 });

    if (slide.subheading) {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 86, 98);
      doc.setFontSize(14);
      doc.text(doc.splitTextToSize(slide.subheading, width - 96), 48, 102);
    }

    let cursorY = 160;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(35, 39, 52);
    doc.setFontSize(13);

    slide.bullets.slice(0, 6).forEach((bullet) => {
      const wrapped = doc.splitTextToSize(bullet, width - 132);
      doc.circle(54, cursorY - 4, 2, "F");
      doc.text(wrapped, 66, cursorY);
      cursorY += wrapped.length * 18 + 8;
    });

    if (slide.speakerNotes) {
      doc.setDrawColor(232, 236, 245);
      doc.setFillColor(247, 249, 253);
      const notesTop = Math.max(cursorY + 10, height - 170);
      const notesHeight = height - notesTop - 36;
      doc.roundedRect(44, notesTop, width - 88, notesHeight, 8, 8, "FD");

      doc.setFont("helvetica", "bold");
      doc.setTextColor(79, 70, 186);
      doc.setFontSize(11);
      doc.text("Speaker Notes", 56, notesTop + 20);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 66, 80);
      doc.setFontSize(10);
      const noteLines = doc.splitTextToSize(slide.speakerNotes, width - 112);
      doc.text(noteLines.slice(0, 10), 56, notesTop + 40);
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(140, 146, 160);
    doc.text(`${startupName} • Slide ${index + 1} / ${slides.length}`, 48, height - 24);
  });

  const filename = `${slugify(startupName || title)}-pitch-deck.pdf`;
  doc.save(filename);
};

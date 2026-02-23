import type { PitchDeckTemplateId } from "@/lib/dto";

export type { PitchDeckTemplateId };
export type SlideLayoutVariant = "cover" | "content";

export type PitchDeckTemplate = {
  id: PitchDeckTemplateId;
  name: string;
  colors: {
    background: string;
    heading: string;
    subheading: string;
    bullets: string;
    accent: string;
    footer: string;
    border: string;
    speakerNotesBg: string;
    speakerNotesBorder: string;
  };
  typography: {
    headingFont: string;
    headingSize: number;
    bodySize: number;
  };
  layout: {
    cover: { centered: boolean; accentBar?: boolean };
    content: { bulletStyle: "dot" | "dash" | "numbered" };
  };
};

export function hexToRgb(hex: string): [number, number, number] {
  const match = hex.replace(/^#/, "").match(/.{2}/g);
  if (!match || match.length !== 3) return [0, 0, 0];
  return match.map((c) => parseInt(c, 16)) as [number, number, number];
}

const TEMPLATES: PitchDeckTemplate[] = [
  {
    id: "minimal",
    name: "Minimal",
    colors: {
      background: "#fcfcfd",
      heading: "#1c1e2f",
      subheading: "#707a89",
      bullets: "#232734",
      accent: "#1c1e2f",
      footer: "#8c92a0",
      border: "#e2e2e2",
      speakerNotesBg: "#f7f9fd",
      speakerNotesBorder: "#e8ecf5",
    },
    typography: {
      headingFont: "helvetica",
      headingSize: 28,
      bodySize: 13,
    },
    layout: {
      cover: { centered: true, accentBar: false },
      content: { bulletStyle: "dot" },
    },
  },
  {
    id: "professional-blue",
    name: "Professional Blue",
    colors: {
      background: "#f8fafc",
      heading: "#0f172a",
      subheading: "#475569",
      bullets: "#334155",
      accent: "#2563eb",
      footer: "#64748b",
      border: "#cbd5e1",
      speakerNotesBg: "#eff6ff",
      speakerNotesBorder: "#bfdbfe",
    },
    typography: {
      headingFont: "helvetica",
      headingSize: 28,
      bodySize: 13,
    },
    layout: {
      cover: { centered: true, accentBar: true },
      content: { bulletStyle: "dot" },
    },
  },
  {
    id: "bold-dark",
    name: "Bold Dark",
    colors: {
      background: "#0f172a",
      heading: "#f8fafc",
      subheading: "#94a3b8",
      bullets: "#e2e8f0",
      accent: "#38bdf8",
      footer: "#64748b",
      border: "#334155",
      speakerNotesBg: "#1e293b",
      speakerNotesBorder: "#475569",
    },
    typography: {
      headingFont: "helvetica",
      headingSize: 28,
      bodySize: 13,
    },
    layout: {
      cover: { centered: true, accentBar: true },
      content: { bulletStyle: "dash" },
    },
  },
  {
    id: "warm-earthy",
    name: "Warm Earthy",
    colors: {
      background: "#faf5f0",
      heading: "#292524",
      subheading: "#78716c",
      bullets: "#44403c",
      accent: "#c2410c",
      footer: "#a8a29e",
      border: "#d6d3d1",
      speakerNotesBg: "#fff7ed",
      speakerNotesBorder: "#fed7aa",
    },
    typography: {
      headingFont: "times",
      headingSize: 26,
      bodySize: 13,
    },
    layout: {
      cover: { centered: true, accentBar: true },
      content: { bulletStyle: "dash" },
    },
  },
  {
    id: "tech-modern",
    name: "Tech Modern",
    colors: {
      background: "#f1f5f9",
      heading: "#0f172a",
      subheading: "#475569",
      bullets: "#334155",
      accent: "#06b6d4",
      footer: "#64748b",
      border: "#cbd5e1",
      speakerNotesBg: "#ecfeff",
      speakerNotesBorder: "#a5f3fc",
    },
    typography: {
      headingFont: "courier",
      headingSize: 26,
      bodySize: 12,
    },
    layout: {
      cover: { centered: true, accentBar: true },
      content: { bulletStyle: "numbered" },
    },
  },
];

export function getTemplateById(id: PitchDeckTemplateId | string | null): PitchDeckTemplate {
  const template = TEMPLATES.find((t) => t.id === id);
  return template ?? TEMPLATES[0];
}

export function getAllTemplates(): PitchDeckTemplate[] {
  return [...TEMPLATES];
}

export const DEFAULT_TEMPLATE_ID: PitchDeckTemplateId = "minimal";

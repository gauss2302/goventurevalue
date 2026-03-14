import { Link } from "@tanstack/react-router";
import {
  BarChart3,
  Brain,
  FileSpreadsheet,
  GitBranch,
  Layers,
  Presentation,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";

const footerLinks = {
  company: [
    { label: "About Us", href: "#solutions" },
    { label: "Contact", href: "#" },
    { label: "Academy", href: "/academy" },
    { label: "Careers", href: "#" },
  ],
  product: [
    { label: "Financial Models", href: "#features" },
    { label: "Pitch Decks", href: "#features" },
    { label: "Integrations", href: "#resources" },
    { label: "Pricing", href: "#pricing" },
  ],
};

const floatingIcons = [
  { icon: FileSpreadsheet, x: "5%", y: "55%" },
  { icon: TrendingUp, x: "16%", y: "75%" },
  { icon: Presentation, x: "28%", y: "50%" },
  { icon: Brain, x: "40%", y: "72%" },
  { icon: BarChart3, x: "52%", y: "52%" },
  { icon: Target, x: "64%", y: "76%" },
  { icon: Sparkles, x: "75%", y: "48%" },
  { icon: GitBranch, x: "86%", y: "70%" },
  { icon: Layers, x: "94%", y: "54%" },
];

export default function Footer() {
  return (
    <footer className="relative bg-[var(--surface)] px-6 pt-16 pb-8">
      <div className="mx-auto max-w-[1200px]">
        {/* Top section */}
        <div className="grid grid-cols-1 gap-10 md:grid-cols-[1.5fr_auto_auto]">
          {/* Brand + tagline */}
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--brand-ink)]">
                <div className="grid grid-cols-2 gap-[3px]">
                  <div className="h-[7px] w-[7px] rounded-full bg-[var(--brand-primary)]" />
                  <div className="h-[7px] w-[7px] rounded-full bg-[var(--brand-ink)]" />
                  <div className="h-[7px] w-[7px] rounded-full bg-[var(--brand-primary)]" />
                  <div className="h-[7px] w-[7px] rounded-full bg-[var(--brand-primary)]" />
                </div>
              </div>
              <span
                className="text-lg font-bold tracking-tight text-[var(--brand-ink)]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Havamind
              </span>
            </div>
            <h3
              className="mt-5 max-w-xs text-2xl font-bold leading-tight text-[var(--brand-ink)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Build your model,
              <br />
              tell your story
            </h3>
          </div>

          {/* Link columns */}
          <div className="flex flex-col gap-3">
            {footerLinks.company.map((link) => (
              <FooterLink key={link.label} {...link} />
            ))}
          </div>
          <div className="flex flex-col gap-3">
            {footerLinks.product.map((link) => (
              <FooterLink key={link.label} {...link} />
            ))}
          </div>
        </div>

        {/* Floating icon decoration area */}
        <div className="relative mt-12 h-40 overflow-hidden rounded-[var(--radius-xl)]">
          {floatingIcons.map(({ icon: Icon, x, y }, i) => (
            <div
              key={i}
              className="absolute animate-float"
              style={{
                left: x,
                top: y,
                animationDelay: `${i * 0.4}s`,
              }}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-[var(--shadow-sm)]">
                <Icon className="h-5 w-5 text-[var(--brand-muted)]" />
              </div>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-[var(--border-soft)] pt-6 sm:flex-row">
          <p className="text-xs text-[var(--brand-muted)]">
            &copy; {new Date().getFullYear()} Havamind &mdash; AI-powered financial modeling &amp; pitch decks. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a
              href="#"
              className="text-xs text-[var(--brand-muted)] transition-colors hover:text-[var(--brand-ink)]"
            >
              Privacy Policy
            </a>
            <a
              href="#"
              className="text-xs text-[var(--brand-muted)] transition-colors hover:text-[var(--brand-ink)]"
            >
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ label, href }: { label: string; href: string }) {
  const isInternal = href.startsWith("/") && !href.startsWith("#");
  const cls =
    "flex items-center gap-1.5 text-sm text-[var(--brand-muted)] transition-colors hover:text-[var(--brand-ink)]";

  if (isInternal) {
    return (
      <Link to={href} className={cls}>
        <span className="text-[var(--brand-muted)]">&rarr;</span> {label}
      </Link>
    );
  }

  return (
    <a href={href} className={cls}>
      <span className="text-[var(--brand-muted)]">&rarr;</span> {label}
    </a>
  );
}

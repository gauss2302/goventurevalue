import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion, useInView } from "framer-motion";
import type { Easing } from "framer-motion";
import { useState, useEffect, useRef, useMemo, type CSSProperties } from "react";
import {
  Check,
  FileSpreadsheet,
  GitBranch,
  Menu,
  Presentation,
  Sparkles,
  TrendingUp,
  X,
  Zap,
  BarChart3,
  Brain,
  Target,
  ArrowRight,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Footer from "./Footer";

const features = [
  {
    icon: Brain,
    title: "AI-Powered Projections",
    description:
      "Describe your business in plain English. Our AI builds a complete 5-year financial model with revenue, costs, and cash flow — ready to refine.",
  },
  {
    icon: Presentation,
    title: "Investor-Ready Pitch Decks",
    description:
      "Generate polished slide decks that stay in sync with your model. When assumptions change, your deck updates automatically.",
  },
  {
    icon: GitBranch,
    title: "Scenario Analysis",
    description:
      "Run conservative, base, and optimistic cases side by side. Stress-test your assumptions and show investors you've done the homework.",
  },
  {
    icon: Target,
    title: "Valuation Engine",
    description:
      "DCF, revenue multiples, and comparable analysis tied directly to your projections. Your thesis lives alongside the math.",
  },
];

const solutions = [
  {
    icon: FileSpreadsheet,
    title: "Financial Modeling",
    description:
      "Build revenue models, P&L statements, and cash flow projections from your assumptions — no spreadsheet gymnastics required.",
  },
  {
    icon: Presentation,
    title: "Pitch Deck Generation",
    description:
      "Turn your financial model into a compelling investor narrative with AI-generated slides that tell your startup's story.",
  },
  {
    icon: GitBranch,
    title: "Scenario Planning",
    description:
      "Compare multiple futures instantly. Every scenario stays traceable back to the assumptions that matter most.",
  },
];

const scenarioData = {
  years: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5"],
  scenarios: [
    {
      name: "Conservative",
      color: "#6B7280",
      revenue: [120, 216, 346, 484, 629],
      valuation: "$2.8M",
      growth: "15% CAGR",
    },
    {
      name: "Base Case",
      color: "#1B76FC",
      revenue: [180, 396, 713, 1140, 1710],
      valuation: "$6.4M",
      growth: "32% CAGR",
    },
    {
      name: "Optimistic",
      color: "#16A34A",
      revenue: [240, 600, 1260, 2268, 3856],
      valuation: "$12.1M",
      growth: "48% CAGR",
    },
  ],
};

const testimonials = [
  {
    quote:
      "Havamind cut our fundraising prep from 6 weeks to 3 days. The AI built our base model, and we just refined the assumptions. Our Series A deck was investor-ready on day one.",
    name: "Marcus T.",
    role: "CEO, Fintech Startup",
  },
  {
    quote:
      "The scenario analysis alone is worth it. I showed my investors three cases side by side and they said it was the most thorough model they'd seen from a seed-stage founder.",
    name: "Sarah K.",
    role: "Solo Founder, SaaS",
  },
  {
    quote:
      "I'm not a finance person. Havamind let me build a real DCF valuation without hiring a consultant. The AI explains every number so I actually understand my own model.",
    name: "James L.",
    role: "Technical Co-founder",
  },
  {
    quote:
      "We used to dread investor updates. Now the pitch deck auto-syncs with our model — when we update revenue assumptions, the slides reflect it instantly. Game changer.",
    name: "Priya R.",
    role: "COO, Marketplace Startup",
  },
  {
    quote:
      "Went from a napkin idea to a full financial model and pitch deck in one afternoon. The AI asked the right questions and built something I'd have paid $5k for from a consultant.",
    name: "Daniel M.",
    role: "First-time Founder",
  },
];

const pricingPlans = [
  {
    name: "Starter",
    subtitle: "Perfect for solo founders.",
    price: "$0",
    featured: false,
    features: [
      "1 financial model",
      "Basic AI projections",
      "3 scenario comparisons",
      "PDF export",
      "Community support",
      "5-year projections",
    ],
  },
  {
    name: "Pro",
    subtitle: "For serious fundraisers.",
    price: "$29",
    featured: true,
    features: [
      "Unlimited models",
      "Advanced AI with GPT-4",
      "Unlimited scenarios",
      "Pitch deck generation",
      "Excel & Google Sheets export",
      "Priority support",
    ],
  },
  {
    name: "Team",
    subtitle: "For startups with co-founders.",
    price: "$79",
    featured: false,
    features: [
      "Everything in Pro",
      "5 team members",
      "Real-time collaboration",
      "Version history",
      "Custom branding on decks",
      "Dedicated account manager",
    ],
  },
];

const easeOut: Easing = "easeOut";

export default function LandingPage() {
  const prefersReducedMotion = Boolean(useReducedMotion());
  const [mobileNav, setMobileNav] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const fadeUp = (delay = 0) =>
    prefersReducedMotion
      ? {}
      : {
          initial: { opacity: 0, y: 24 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, amount: 0.2 },
          transition: { duration: 0.5, delay, ease: easeOut },
        };

  return (
    <main className="relative min-h-screen overflow-x-clip bg-[var(--page)]">
      {/* ───── NAVBAR ───── */}
      <nav
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-[color-mix(in_srgb,var(--surface)_90%,transparent)] shadow-[var(--shadow-sm)] backdrop-blur-lg"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-6">
          <Link
            to="/"
            className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
          >
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-primary)] text-[15px] font-extrabold text-white shadow-[0_6px_16px_color-mix(in_srgb,var(--brand-primary)_35%,transparent)]"
              style={{ fontFamily: "var(--font-display)" }}
              aria-hidden
            >
              H
            </span>
            <span className="font-display text-lg font-extrabold tracking-[-0.02em] text-[var(--brand-ink)]">
              Havamind
            </span>
          </Link>

          <div className="hidden items-center gap-8 lg:flex">
            {[
              { label: "Features", href: "#features" },
              { label: "Solutions", href: "#solutions" },
              { label: "Scenarios", href: "#resources" },
              { label: "Pricing", href: "#pricing" },
            ].map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-[13px] text-[var(--brand-muted)] transition-colors hover:text-[var(--brand-ink)]"
              >
                {item.label}
              </a>
            ))}
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            <Button
              variant="ghost"
              asChild
              className="text-[var(--brand-muted)] hover:text-[var(--brand-ink)]"
            >
              <Link to="/auth/signin">Sign in</Link>
            </Button>
            <Button
              asChild
              className="rounded-[var(--radius-md)] bg-[var(--brand-ink)] px-5 text-white shadow-[var(--shadow-sm)] hover:bg-[var(--brand-ink)]/90"
            >
              <Link to="/auth/signup">Start free</Link>
            </Button>
          </div>

          <button
            type="button"
            onClick={() => setMobileNav(!mobileNav)}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-[var(--brand-ink)] transition-transform duration-150 active:scale-95 lg:hidden"
            aria-label="Toggle navigation"
          >
            {mobileNav ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>

        <AnimatePresence>
          {mobileNav && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden bg-[color-mix(in_srgb,var(--surface)_95%,transparent)] backdrop-blur-lg lg:hidden"
            >
              <div className="flex flex-col gap-1 px-6 pb-6 pt-2">
                {[
                  { label: "Features", href: "#features" },
                  { label: "Solutions", href: "#solutions" },
                  { label: "Scenarios", href: "#resources" },
                  { label: "Pricing", href: "#pricing" },
                ].map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={() => setMobileNav(false)}
                    className="flex min-h-[44px] items-center rounded-lg px-2 text-[15px] text-[var(--brand-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--brand-ink)]"
                  >
                    {item.label}
                  </a>
                ))}
                <div className="flex gap-3 pt-3">
                  <Button
                    variant="ghost"
                    asChild
                    className="text-[var(--brand-muted)]"
                  >
                    <Link to="/auth/signin" onClick={() => setMobileNav(false)}>
                      Sign in
                    </Link>
                  </Button>
                  <Button
                    asChild
                    className="rounded-[var(--radius-md)] bg-[var(--brand-ink)] px-5 text-white"
                  >
                    <Link to="/auth/signup" onClick={() => setMobileNav(false)}>
                      Start free
                    </Link>
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ───── HERO ───── */}
      <section
        aria-labelledby="hero-heading"
        className="relative overflow-hidden px-6 pt-32 pb-24 lg:pt-40 lg:pb-32"
      >
        <div className="pointer-events-none absolute inset-0 bg-dot-pattern opacity-[0.04]" />

        {/* Floating decorative elements */}
        <motion.div
          className="pointer-events-none absolute left-[8%] top-[18%] hidden lg:block"
          animate={
            prefersReducedMotion ? {} : { y: [0, -12, 0], rotate: [-3, -1, -3] }
          }
          transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
        >
          <div className="w-44 rounded-2xl bg-[var(--brand-accent)] p-4 shadow-[var(--shadow-md)] -rotate-6">
            <p
              className="text-xs font-medium text-[var(--brand-ink)]/70"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Revenue grows 24% QoQ with 74% gross margin and 13-month payback period.
            </p>
          </div>
        </motion.div>

        <motion.div
          className="pointer-events-none absolute left-[5%] top-[55%] hidden lg:block"
          animate={
            prefersReducedMotion ? {} : { y: [0, -8, 0] }
          }
          transition={{
            repeat: Infinity,
            duration: 5,
            ease: "easeInOut",
            delay: 1,
          }}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--surface)] shadow-[var(--shadow-md)]">
            <Sparkles className="h-6 w-6 text-[var(--brand-primary)]" />
          </div>
        </motion.div>

        <motion.div
          className="pointer-events-none absolute right-[6%] top-[14%] hidden lg:block"
          animate={
            prefersReducedMotion
              ? {}
              : { y: [0, -10, 0], rotate: [2, 4, 2] }
          }
          transition={{
            repeat: Infinity,
            duration: 7,
            ease: "easeInOut",
            delay: 0.5,
          }}
        >
          <div className="w-48 rounded-2xl bg-[var(--surface)] p-4 shadow-[var(--shadow-md)] rotate-3">
            <p className="text-xs font-semibold text-[var(--brand-ink)]">
              Series A Readiness
            </p>
            <div className="mt-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[var(--brand-muted)]">
                  Model completeness
                </span>
                <span className="text-[11px] font-semibold text-[var(--success)]">94%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[var(--brand-muted)]">
                  Deck score
                </span>
                <span className="text-[11px] font-semibold text-[var(--brand-primary)]">8.6/10</span>
              </div>
              <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-[var(--brand-primary)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--brand-primary)]">
                <TrendingUp className="h-3 w-3" /> Investor-ready
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="pointer-events-none absolute bottom-[15%] left-[3%] hidden lg:block"
          animate={
            prefersReducedMotion ? {} : { y: [0, -14, 0] }
          }
          transition={{
            repeat: Infinity,
            duration: 6.5,
            ease: "easeInOut",
            delay: 2,
          }}
        >
          <div className="w-56 rounded-2xl bg-[var(--surface)] p-4 shadow-[var(--shadow-md)]">
            <p className="text-xs font-semibold text-[var(--brand-ink)]">
              Scenario Comparison
            </p>
            <div className="mt-3 space-y-2">
              <TaskRow label="Conservative" progress={45} color="#6B7280" />
              <TaskRow label="Base case" progress={72} color="var(--brand-primary)" />
              <TaskRow label="Optimistic" progress={95} color="#16A34A" />
            </div>
          </div>
        </motion.div>

        <motion.div
          className="pointer-events-none absolute bottom-[12%] right-[4%] hidden lg:block"
          animate={
            prefersReducedMotion ? {} : { y: [0, -10, 0], rotate: [3, 5, 3] }
          }
          transition={{
            repeat: Infinity,
            duration: 5.5,
            ease: "easeInOut",
            delay: 1.5,
          }}
        >
          <div className="w-48 rounded-2xl bg-[var(--surface)] p-4 shadow-[var(--shadow-md)] rotate-3">
            <p className="text-xs font-semibold text-[var(--brand-ink)]">
              Valuation
            </p>
            <p
              className="mt-2 text-2xl font-bold text-[var(--brand-primary)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              $4.2M
            </p>
            <p className="text-[11px] text-[var(--brand-muted)]">
              Pre-money · DCF method
            </p>
            <div className="mt-2 flex gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--brand-primary)_12%,transparent)] text-[var(--brand-primary)]">
                <BarChart3 className="h-4 w-4" />
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]">
                <TrendingUp className="h-4 w-4" />
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--brand-accent)_14%,transparent)] text-[var(--brand-accent)]">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Hero content */}
        <div className="relative mx-auto max-w-[1200px] text-center">
          <motion.div
            initial={
              prefersReducedMotion ? undefined : { opacity: 0, y: 30 }
            }
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: easeOut }}
          >
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface)] shadow-[var(--shadow-md)]">
              <div className="grid grid-cols-2 gap-[3px]">
                <div className="h-[8px] w-[8px] rounded-full bg-[var(--brand-primary)]" />
                <div className="h-[8px] w-[8px] rounded-full bg-[var(--brand-ink)]" />
                <div className="h-[8px] w-[8px] rounded-full bg-[var(--brand-primary)]" />
                <div className="h-[8px] w-[8px] rounded-full bg-[var(--brand-primary)]" />
              </div>
            </div>

            <h1
              id="hero-heading"
              className="mx-auto max-w-3xl text-[clamp(2.5rem,5vw,3.5rem)] leading-[1.08] text-[var(--brand-ink)]"
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                letterSpacing: "-0.025em",
              }}
            >
              Model, pitch, and raise
              <br />
              <span className="text-[var(--brand-muted)]">all in one place</span>
            </h1>

            <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-[var(--brand-muted)]">
              AI-powered financial modeling and pitch deck generation for
              founders. Go from assumptions to investor-ready materials in
              minutes, not months.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                size="lg"
                asChild
                className="h-12 rounded-full bg-[var(--brand-primary)] px-8 text-[15px] font-semibold text-white shadow-[0_8px_24px_color-mix(in_srgb,var(--brand-primary)_30%,transparent)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--brand-primary-hover)] hover:shadow-[0_12px_32px_color-mix(in_srgb,var(--brand-primary)_40%,transparent)] active:scale-[0.97]"
              >
                <Link to="/auth/signup">
                  Build your model free
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="lg"
                asChild
                className="h-12 rounded-full border border-[var(--border-soft)] px-6 text-[15px] text-[var(--brand-muted)] hover:text-[var(--brand-ink)]"
              >
                <Link to="/auth/signin">Sign in to workspace</Link>
              </Button>
            </div>

            <motion.div
              {...fadeUp(0.4)}
              className="mx-auto mt-12 grid max-w-xl grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6"
            >
              {[
                { value: "12k+", label: "Founder sessions" },
                { value: "$340M", label: "Modeled pipeline" },
                { value: "92%", label: "Investor-ready score" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <p
                    className="text-xl font-bold text-[var(--brand-ink)]"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {stat.value}
                  </p>
                  <p className="mt-1 text-[11px] uppercase tracking-wider text-[var(--brand-muted)]">
                    {stat.label}
                  </p>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ───── SOLUTIONS ───── */}
      <section id="solutions" className="relative px-6 py-20 lg:py-28">
        <div className="mx-auto max-w-[1200px]">
          <motion.div {...fadeUp()} className="text-center">
            <PillLabel>Solutions</PillLabel>
            <h2
              className="mx-auto mt-5 max-w-lg text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.12] text-[var(--brand-ink)]"
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                letterSpacing: "-0.02em",
              }}
            >
              From napkin idea
              <br />
              to investor meeting
            </h2>
          </motion.div>

          <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
            {solutions.map((sol, idx) => {
              const Icon = sol.icon;
              return (
                <motion.div
                  key={sol.title}
                  {...fadeUp(idx * 0.1)}
                  className="text-center"
                >
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--surface-2)]">
                    <Icon className="h-5 w-5 text-[var(--brand-ink)]" />
                  </div>
                  <h3
                    className="text-[15px] font-semibold text-[var(--brand-ink)]"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {sol.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--brand-muted)]">
                    {sol.description}
                  </p>
                </motion.div>
              );
            })}
          </div>

          {/* Dashboard preview card */}
          <motion.div
            {...fadeUp(0.2)}
            className="relative mt-16 overflow-hidden rounded-[var(--radius-xl)] bg-gradient-to-b from-[var(--brand-primary)] to-[var(--brand-accent)] p-2 shadow-[var(--shadow-lg)]"
          >
            <div className="overflow-hidden rounded-[calc(var(--radius-xl)-8px)] bg-[var(--surface)]">
              <div className="p-6 lg:p-10">
                <div className="flex flex-col gap-6 lg:flex-row">
                  <div className="flex-1 space-y-4">
                    <p
                      className="text-xl font-semibold text-[var(--brand-ink)]"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      Your Startup Dashboard
                    </p>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <DashboardCard title="Key Assumptions">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs text-[var(--brand-muted)]">
                            <span className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
                              MRR Growth
                            </span>
                            <span className="font-medium text-[var(--brand-ink)]">18% m/m</span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-[var(--brand-muted)]">
                            <span className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-[var(--brand-accent)]" />
                              CAC
                            </span>
                            <span className="font-medium text-[var(--brand-ink)]">$142</span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-[var(--brand-muted)]">
                            <span className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-[var(--brand-primary)]" />
                              LTV/CAC
                            </span>
                            <span className="font-medium text-[var(--brand-primary)]">4.2x</span>
                          </div>
                        </div>
                      </DashboardCard>
                      <DashboardCard title="Runway">
                        <p
                          className="text-3xl font-bold text-[var(--brand-ink)]"
                          style={{ fontFamily: "var(--font-display)" }}
                        >
                          23.4
                          <span className="ml-1 text-sm font-medium text-[var(--brand-muted)]">months</span>
                        </p>
                        <div className="mt-2 flex items-center gap-1.5">
                          <TrendingUp className="h-3 w-3 text-[var(--success)]" />
                          <span className="text-[11px] font-medium text-[var(--success)]">+4.2 vs last month</span>
                        </div>
                      </DashboardCard>
                    </div>
                  </div>
                  <div className="w-full lg:w-64">
                    <DashboardCard title="ARR Projection">
                      <div className="flex items-end gap-1">
                        {[20, 28, 38, 45, 55, 68, 82, 95].map((h, i) => (
                          <div
                            key={i}
                            className="flex-1 rounded-t bg-[var(--brand-primary)]/20"
                            style={{ height: `${h}px` }}
                          />
                        ))}
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[10px] text-[var(--brand-muted)]">Y1</span>
                        <span className="text-[10px] font-medium text-[var(--brand-primary)]">$1.2M ARR</span>
                      </div>
                    </DashboardCard>
                  </div>
                </div>
              </div>
            </div>
            <motion.div
              className="pointer-events-none absolute -right-4 top-1/2 hidden -translate-y-1/2 lg:block"
              animate={
                prefersReducedMotion ? {} : { y: [0, -8, 0] }
              }
              transition={{
                repeat: Infinity,
                duration: 4,
                ease: "easeInOut",
              }}
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface)] shadow-[var(--shadow-md)]">
                <Check className="h-7 w-7 text-[var(--brand-primary)]" />
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ───── FEATURES ───── */}
      <section
        id="features"
        className="relative bg-[var(--surface)] px-6 py-20 lg:py-28"
      >
        <div className="mx-auto max-w-[1200px]">
          <motion.div {...fadeUp()} className="text-center">
            <PillLabel>Features</PillLabel>
            <h2
              className="mx-auto mt-5 max-w-lg text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.12] text-[var(--brand-ink)]"
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                letterSpacing: "-0.02em",
              }}
            >
              Everything you need to raise
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-[var(--brand-muted)]">
              Forget disconnected spreadsheets and slide decks.
            </p>
          </motion.div>

          <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2">
            {features.slice(0, 2).map((feat, idx) => (
              <FeatureCard key={feat.title} feature={feat} index={idx} fadeUp={fadeUp} />
            ))}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
            {features.slice(2).map((feat, idx) => (
              <FeatureCard
                key={feat.title}
                feature={feat}
                index={idx + 2}
                fadeUp={fadeUp}
                large
              />
            ))}
          </div>

          <motion.p
            {...fadeUp(0.3)}
            className="mt-10 text-center text-sm text-[var(--brand-muted)]"
          >
            and a lot more features...
          </motion.p>
        </div>
      </section>

      {/* ───── SCENARIO VALUATION ───── */}
      <section id="resources" className="relative px-6 py-20 lg:py-28">
        <div className="mx-auto max-w-[1200px]">
          <motion.div {...fadeUp()} className="text-center">
            <PillLabel>Scenario Analysis</PillLabel>
            <h2
              className="mx-auto mt-5 max-w-lg text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.12] text-[var(--brand-ink)]"
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                letterSpacing: "-0.02em",
              }}
            >
              Three scenarios,
              <br />
              one clear picture
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm text-[var(--brand-muted)]">
              Run conservative, base, and optimistic projections side by side.
              See how each assumption impacts your valuation in real time.
            </p>
          </motion.div>

          <motion.div {...fadeUp(0.15)} className="mt-14">
            <ValuationSpreadsheet prefersReducedMotion={prefersReducedMotion} />
          </motion.div>
        </div>
      </section>

      {/* ───── TESTIMONIALS ───── */}
      <section className="relative bg-[var(--surface)] px-6 py-20 lg:py-28">
        <div className="mx-auto max-w-[1200px]">
          <motion.div {...fadeUp()} className="text-center">
            <PillLabel>Testimonials</PillLabel>
            <h2
              className="mx-auto mt-5 max-w-lg text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.12] text-[var(--brand-ink)]"
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                letterSpacing: "-0.02em",
              }}
            >
              Founders just like you
              <br />
              are already raising with Havamind
            </h2>
          </motion.div>

          <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-3">
            <div className="space-y-5">
              <TestimonialCard testimonial={testimonials[0]} fadeUp={fadeUp} index={0} />
              <TestimonialCard testimonial={testimonials[4]} fadeUp={fadeUp} index={4} />
            </div>
            <div className="space-y-5">
              <TestimonialCard testimonial={testimonials[1]} fadeUp={fadeUp} index={1} />
              <TestimonialCard testimonial={testimonials[3]} fadeUp={fadeUp} index={3} />
            </div>
            <div className="space-y-5">
              <TestimonialCard testimonial={testimonials[2]} fadeUp={fadeUp} index={2} />
              <motion.div
                {...fadeUp(0.3)}
                className="relative overflow-hidden rounded-[var(--radius-lg)] bg-gradient-to-br from-[color-mix(in_srgb,var(--brand-primary)_10%,transparent)] to-[color-mix(in_srgb,var(--brand-accent)_10%,transparent)] shadow-[var(--shadow-sm)]"
              >
                <div className="p-6">
                  <Sparkles className="h-8 w-8 text-[var(--brand-primary)]" />
                  <p
                    className="mt-3 text-lg font-bold text-[var(--brand-ink)]"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    See it in action
                  </p>
                  <p className="mt-1 text-sm text-[var(--brand-muted)]">
                    Watch a founder build a complete model and pitch deck in under 10 minutes.
                  </p>
                  <div className="mt-4 flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand-primary)] text-white">
                      <svg className="h-4 w-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                    <span className="text-xs font-medium text-[var(--brand-muted)]">
                      Watch demo (9 min)
                    </span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* ───── PRICING ───── */}
      <section id="pricing" className="relative px-6 py-20 lg:py-28">
        <div className="mx-auto max-w-[1200px]">
          <motion.div {...fadeUp()} className="text-center">
            <PillLabel>Pricing</PillLabel>
            <h2
              className="mx-auto mt-5 max-w-lg text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.12] text-[var(--brand-ink)]"
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                letterSpacing: "-0.02em",
              }}
            >
              Simple pricing plans
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-[var(--brand-muted)]">
              Start free. Upgrade when you're ready to raise.
            </p>
          </motion.div>

          <div className="mt-14 grid grid-cols-1 items-start gap-6 md:grid-cols-3">
            {pricingPlans.map((plan, idx) => (
              <PricingCard key={plan.name} plan={plan} index={idx} fadeUp={fadeUp} />
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

/* ─── Sub-components ─── */

function PillLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-1.5 text-xs font-medium text-[var(--brand-muted)]">
      {children}
    </span>
  );
}

function TaskRow({
  label,
  progress,
  color,
}: {
  label: string;
  progress: number;
  color: string;
}) {
  const capped = Math.min(progress, 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-[var(--brand-muted)]">{label}</span>
        <span className="text-[10px] font-medium text-[var(--brand-muted)]">
          {progress}%
        </span>
      </div>
      <div className="h-1 w-full rounded-full bg-[var(--border-soft)]">
        <div
          className="h-full rounded-full"
          style={{ width: `${capped}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function DashboardCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-4">
      <p
        className="mb-3 text-xs font-semibold text-[var(--brand-ink)]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {title}
      </p>
      {children}
    </div>
  );
}

function FeatureCard({
  feature,
  index,
  fadeUp,
  large,
}: {
  feature: (typeof features)[number];
  index: number;
  fadeUp: (delay?: number) => Record<string, unknown>;
  large?: boolean;
}) {
  const Icon = feature.icon;
  return (
    <motion.div
      {...fadeUp(index * 0.08)}
      className={`group overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)] transition-all duration-300 hover:shadow-[var(--shadow-md)] ${large ? "md:p-8" : ""}`}
    >
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface-2)]">
        <Icon className="h-5 w-5 text-[var(--brand-ink)]" />
      </div>
      <h3
        className="text-base font-semibold text-[var(--brand-ink)]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {feature.title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-[var(--brand-muted)]">
        {feature.description}
      </p>
    </motion.div>
  );
}

function ValuationSpreadsheet({ prefersReducedMotion }: { prefersReducedMotion: boolean }) {
  const [activeScenario, setActiveScenario] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, amount: 0.3 });

  const maxRevenue = useMemo(
    () => Math.max(...scenarioData.scenarios.flatMap((s) => s.revenue)),
    [],
  );

  const maxValuation = useMemo(
    () =>
      Math.max(
        ...scenarioData.scenarios.map((s) =>
          Number.parseFloat(s.valuation.replace(/[$M]/g, "")),
        ),
      ),
    [],
  );

  const scenario = scenarioData.scenarios[activeScenario];
  const columnLabels = ["A", "B", "C", "D", "E", "F"];
  const grossMargins = useMemo(
    () =>
      activeScenario === 0
        ? [62, 64, 65, 66, 67]
        : activeScenario === 1
          ? [68, 70, 72, 73, 74]
          : [70, 73, 75, 77, 78],
    [activeScenario],
  );

  const parseValuation = (value: string) =>
    Number.parseFloat(value.replace(/[$M]/g, ""));

  return (
    <div
      ref={containerRef}
      className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border-soft)] bg-[var(--surface)] shadow-[var(--shadow-lg)]"
    >
      {/* Window chrome */}
      <div className="flex items-center justify-between border-b border-[var(--border-soft)] bg-[color-mix(in_srgb,var(--surface-2)_92%,var(--brand-primary)_8%)] px-4 py-2.5 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-[#FF5F57]" />
            <div className="h-3 w-3 rounded-full bg-[#FEBC2E]" />
            <div className="h-3 w-3 rounded-full bg-[#28C840]" />
          </div>
          <div className="hidden h-4 w-px bg-[var(--border-soft)] sm:block" />
          <FileSpreadsheet className="h-4 w-4 shrink-0 text-[var(--success)]" />
          <span
            className="truncate text-xs font-semibold text-[var(--brand-ink)] sm:text-[13px]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Havamind — Scenario Valuation Model
          </span>
        </div>
        <span className="hidden rounded-full border border-[var(--border-soft)] bg-[var(--surface)] px-2.5 py-0.5 text-[10px] font-medium text-[var(--brand-muted)] sm:inline">
          Live preview
        </span>
      </div>

      {/* Formula bar */}
      <div className="flex items-center gap-2 border-b border-[var(--border-soft)] bg-[var(--surface-2)] px-3 py-2 sm:px-4">
        <span className="shrink-0 rounded border border-[var(--border-soft)] bg-[var(--surface)] px-2 py-0.5 text-[10px] font-semibold text-[var(--brand-muted)]">
          fx
        </span>
        <code className="truncate text-[11px] text-[var(--brand-ink)] sm:text-xs">
          =DCF(FCF_5Y, WACC 12%, Terminal 3%) →{" "}
          <span style={{ color: scenario.color }}>{scenario.valuation}</span>
        </code>
      </div>

      {/* Scenario tabs */}
      <div className="flex gap-1 border-b border-[var(--border-soft)] bg-[var(--surface-2)] p-1.5 sm:px-2">
        {scenarioData.scenarios.map((s, i) => {
          const isActive = activeScenario === i;
          return (
            <button
              key={s.name}
              type="button"
              onClick={() => setActiveScenario(i)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-md)] px-3 py-2 text-xs font-medium transition-all sm:text-[13px]",
                isActive
                  ? "bg-[var(--surface)] text-[var(--brand-ink)] shadow-[var(--shadow-sm)]"
                  : "text-[var(--brand-muted)] hover:bg-[color-mix(in_srgb,var(--surface)_70%,transparent)] hover:text-[var(--brand-ink)]",
              )}
              style={
                isActive
                  ? { boxShadow: `inset 0 -2px 0 0 ${s.color}` }
                  : undefined
              }
            >
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              <span className="truncate">{s.name}</span>
            </button>
          );
        })}
      </div>

      <div className="p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
          {/* Spreadsheet + chart */}
          <div className="space-y-5">
            <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-soft)]">
              {/* Column letters */}
              <div className="grid grid-cols-[minmax(88px,1.1fr)_repeat(5,minmax(0,1fr))] border-b border-[var(--border-soft)] bg-[var(--surface-2)]">
                <div className="border-r border-[var(--border-soft)] px-3 py-1.5" />
                {columnLabels.slice(1).map((col, i) => (
                  <div
                    key={col}
                    className="border-r border-[var(--border-soft)] px-2 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wider text-[var(--brand-muted)] last:border-r-0"
                  >
                    {col}
                    <span className="mt-0.5 block text-[9px] font-normal normal-case tracking-normal">
                      {scenarioData.years[i]}
                    </span>
                  </div>
                ))}
              </div>

              {/* Revenue row */}
              <SpreadsheetRow
                rowLabel="1"
                metric="Revenue ($K)"
                values={scenario.revenue.map((v) => `$${v.toLocaleString()}`)}
                valueClassName="font-semibold tabular-nums"
                valueStyle={{ color: scenario.color }}
                animate={!prefersReducedMotion && isInView}
                activeScenario={activeScenario}
                rowKey="revenue"
              />

              {/* Growth row */}
              <SpreadsheetRow
                rowLabel="2"
                metric="YoY Growth"
                values={[
                  "—",
                  ...scenario.revenue.slice(1).map((val, i) => {
                    const prev = scenario.revenue[i];
                    const growth = Math.round(((val - prev) / prev) * 100);
                    return `+${growth}%`;
                  }),
                ]}
                valueClassName="font-medium tabular-nums text-[var(--success)]"
                animate={!prefersReducedMotion && isInView}
                activeScenario={activeScenario}
                rowKey="growth"
              />

              {/* Gross margin row */}
              <SpreadsheetRow
                rowLabel="3"
                metric="Gross Margin"
                values={grossMargins.map((m) => `${m}%`)}
                valueClassName="font-medium tabular-nums text-[var(--brand-ink)]"
                animate={false}
                activeScenario={activeScenario}
                rowKey="margin"
                isLast
              />
            </div>

            {/* Chart */}
            <div className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[color-mix(in_srgb,var(--surface-2)_55%,var(--surface)_45%)] p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">
                    Revenue trajectory
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-[var(--brand-ink)]">
                    {scenario.name} · 5-year projection
                  </p>
                </div>
                <div
                  className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${scenario.color} 14%, transparent)`,
                    color: scenario.color,
                  }}
                >
                  {scenario.growth}
                </div>
              </div>

              <div className="relative">
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 flex flex-col justify-between"
                  style={{ height: 168 }}
                  aria-hidden
                >
                  {[0, 1, 2, 3].map((line) => (
                    <div
                      key={line}
                      className="border-t border-dashed border-[color-mix(in_srgb,var(--border-soft)_80%,transparent)]"
                    />
                  ))}
                </div>

                <div className="flex items-end gap-2 sm:gap-3" style={{ height: 168 }}>
                  {scenario.revenue.map((val, i) => {
                    const pct = Math.max(8, (val / maxRevenue) * 100);
                    return (
                      <div
                        key={`${activeScenario}-bar-${i}`}
                        className="relative flex flex-1 flex-col items-center"
                        style={{ height: 168 }}
                      >
                        <span
                          className="mb-1.5 text-[10px] font-semibold tabular-nums sm:text-[11px]"
                          style={{ color: scenario.color }}
                        >
                          ${val >= 1000 ? `${(val / 1000).toFixed(1)}M` : `${val}K`}
                        </span>
                        <div className="flex w-full flex-1 items-end">
                          <motion.div
                            className="relative w-full rounded-t-[6px] shadow-[0_8px_20px_color-mix(in_srgb,var(--brand-ink)_8%,transparent)]"
                            style={{
                              background: `linear-gradient(180deg, color-mix(in srgb, ${scenario.color} 88%, white) 0%, ${scenario.color} 100%)`,
                            }}
                            initial={
                              prefersReducedMotion || !isInView
                                ? { height: `${pct}%` }
                                : { height: 0 }
                            }
                            animate={{ height: `${pct}%` }}
                            transition={{
                              duration: 0.55,
                              delay: i * 0.08,
                              ease: "easeOut",
                            }}
                          />
                        </div>
                        <span className="mt-2 text-[10px] font-medium text-[var(--brand-muted)]">
                          Y{i + 1}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Summary panel */}
          <div className="flex flex-col gap-4">
            <div
              className="relative overflow-hidden rounded-[var(--radius-lg)] border p-5"
              style={{
                borderColor: `color-mix(in srgb, ${scenario.color} 35%, var(--border-soft))`,
                background: `linear-gradient(145deg, color-mix(in srgb, ${scenario.color} 10%, var(--surface)) 0%, var(--surface) 55%)`,
              }}
            >
              <div
                className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-40 blur-2xl"
                style={{ backgroundColor: scenario.color }}
                aria-hidden
              />
              <div className="relative">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" style={{ color: scenario.color }} />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">
                    {scenario.name} valuation
                  </p>
                </div>
                <motion.p
                  key={`val-${activeScenario}`}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mt-3 text-[clamp(2rem,4vw,2.75rem)] font-extrabold leading-none tracking-[-0.02em]"
                  style={{ fontFamily: "var(--font-display)", color: scenario.color }}
                >
                  {scenario.valuation}
                </motion.p>
                <p className="mt-2 text-xs text-[var(--brand-muted)]">
                  Pre-money · DCF method · WACC 12%
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <MetricTile label="Revenue CAGR" value={scenario.growth} />
              <MetricTile
                label="Year 5 revenue"
                value={`$${(scenario.revenue[4] / 1000).toFixed(1)}M`}
                accent={scenario.color}
              />
              <MetricTile
                label="Gross margin (Y5)"
                value={`${grossMargins[4]}%`}
              />
              <MetricTile
                label="Multiple implied"
                value={`${(parseValuation(scenario.valuation) / (scenario.revenue[4] / 1000)).toFixed(1)}x`}
              />
            </div>

            <div className="flex-1 rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-5">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">
                  Compare scenarios
                </p>
                <BarChart3 className="h-4 w-4 text-[var(--brand-muted)]" />
              </div>
              <div className="space-y-3">
                {scenarioData.scenarios.map((s, i) => {
                  const amount = parseValuation(s.valuation);
                  const width = `${(amount / maxValuation) * 100}%`;
                  const isActive = i === activeScenario;
                  return (
                    <button
                      key={s.name}
                      type="button"
                      onClick={() => setActiveScenario(i)}
                      className={cn(
                        "w-full rounded-[var(--radius-md)] px-2 py-1.5 text-left transition-colors",
                        isActive && "bg-[color-mix(in_srgb,var(--surface-2)_80%,transparent)]",
                      )}
                    >
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-2 text-xs text-[var(--brand-ink)]">
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: s.color }}
                          />
                          <span className={cn("truncate", isActive && "font-semibold")}>
                            {s.name}
                          </span>
                        </span>
                        <span
                          className="shrink-0 text-xs font-semibold tabular-nums"
                          style={{ color: s.color }}
                        >
                          {s.valuation}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: s.color }}
                          initial={
                            prefersReducedMotion || !isInView
                              ? { width }
                              : { width: 0 }
                          }
                          animate={{ width }}
                          transition={{ duration: 0.5, delay: i * 0.06 }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-soft)] bg-[var(--surface-2)] px-4 py-2 text-[10px] text-[var(--brand-muted)] sm:px-6">
        <span>
          Sheet: <strong className="font-semibold text-[var(--brand-ink)]">Valuation</strong>
        </span>
        <span className="hidden sm:inline">5-year model · USD · Updated live</span>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-medium"
          style={{
            color: scenario.color,
            backgroundColor: `color-mix(in srgb, ${scenario.color} 12%, transparent)`,
          }}
        >
          <span className="relative flex h-1.5 w-1.5">
            <span
              className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
              style={{ backgroundColor: scenario.color }}
            />
            <span
              className="relative inline-flex h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: scenario.color }}
            />
          </span>
          {scenario.name} active
        </span>
      </div>
    </div>
  );
}

function SpreadsheetRow({
  rowLabel,
  metric,
  values,
  valueClassName,
  valueStyle,
  animate,
  activeScenario,
  rowKey,
  isLast = false,
}: {
  rowLabel: string;
  metric: string;
  values: string[];
  valueClassName?: string;
  valueStyle?: CSSProperties;
  animate: boolean;
  activeScenario: number;
  rowKey: string;
  isLast?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-[minmax(88px,1.1fr)_repeat(5,minmax(0,1fr))] bg-[var(--surface)]",
        !isLast && "border-b border-[var(--border-soft)]",
      )}
    >
      <div className="flex items-center gap-2 border-r border-[var(--border-soft)] bg-[color-mix(in_srgb,var(--surface-2)_65%,var(--surface)_35%)] px-3 py-2.5">
        <span className="w-4 shrink-0 text-[10px] font-medium text-[var(--brand-muted)]">
          {rowLabel}
        </span>
        <span className="text-[11px] font-medium text-[var(--brand-ink)] sm:text-xs">
          {metric}
        </span>
      </div>
      {values.map((value, i) => (
        <motion.div
          key={`${activeScenario}-${rowKey}-${i}`}
          initial={animate ? { opacity: 0, y: 4 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: i * 0.05 }}
          className={cn(
            "border-r border-[var(--border-soft)] px-2 py-2.5 text-center text-[11px] last:border-r-0 sm:text-xs",
            valueClassName,
          )}
          style={valueStyle}
        >
          {value}
        </motion.div>
      ))}
    </div>
  );
}

function MetricTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--brand-muted)]">
        {label}
      </p>
      <p
        className="mt-1.5 text-lg font-bold leading-none tracking-[-0.01em] text-[var(--brand-ink)]"
        style={{ fontFamily: "var(--font-display)", color: accent }}
      >
        {value}
      </p>
    </div>
  );
}

function TestimonialCard({
  testimonial,
  fadeUp,
  index,
}: {
  testimonial: (typeof testimonials)[number];
  fadeUp: (delay?: number) => Record<string, unknown>;
  index: number;
}) {
  return (
    <motion.div
      {...fadeUp(index * 0.08)}
      className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-5 shadow-[var(--shadow-sm)]"
    >
      <p className="text-sm leading-relaxed text-[var(--brand-ink)]">
        &ldquo;{testimonial.quote}&rdquo;
      </p>
      <div className="mt-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--surface-2)]">
          <span className="text-xs font-semibold text-[var(--brand-ink)]">
            {testimonial.name.charAt(0)}
          </span>
        </div>
        <div>
          <p className="text-xs font-semibold text-[var(--brand-ink)]">
            {testimonial.name}
          </p>
          <p className="text-[11px] text-[var(--brand-muted)]">
            {testimonial.role}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function PricingCard({
  plan,
  index,
  fadeUp,
}: {
  plan: (typeof pricingPlans)[number];
  index: number;
  fadeUp: (delay?: number) => Record<string, unknown>;
}) {
  const isFeatured = plan.featured;

  return (
    <motion.div
      {...fadeUp(index * 0.1)}
      className={`relative overflow-hidden rounded-[var(--radius-lg)] p-6 transition-all duration-300 ${
        isFeatured
          ? "bg-[var(--brand-primary)] text-white shadow-[var(--shadow-lg)] scale-[1.02] z-10"
          : "border border-[var(--border-soft)] bg-[var(--surface)] shadow-[var(--shadow-sm)]"
      }`}
    >
      {isFeatured && (
        <div className="absolute -right-3 -top-3">
          <div className="flex h-12 w-12 items-center justify-center">
            <Zap className="h-6 w-6 text-[var(--brand-accent)]" />
          </div>
        </div>
      )}

      <div>
        <h3
          className={`text-lg font-bold ${isFeatured ? "text-white" : "text-[var(--brand-ink)]"}`}
          style={{ fontFamily: "var(--font-display)" }}
        >
          {plan.name}
        </h3>
        <p
          className={`mt-1 text-xs ${isFeatured ? "text-white/70" : "text-[var(--brand-muted)]"}`}
        >
          {plan.subtitle}
        </p>
      </div>

      <div className="mt-5">
        <span
          className={`text-[3rem] font-extrabold leading-none ${isFeatured ? "text-white" : "text-[var(--brand-ink)]"}`}
          style={{ fontFamily: "var(--font-display)" }}
        >
          {plan.price}
        </span>
        <span
          className={`text-sm ${isFeatured ? "text-white/70" : "text-[var(--brand-muted)]"}`}
        >
          /mo
        </span>
        {isFeatured && (
          <p className="mt-1 text-xs font-medium text-white/80">Most popular</p>
        )}
      </div>

      <Button
        asChild
        className={`mt-6 w-full rounded-[var(--radius-md)] font-semibold ${
          isFeatured
            ? "bg-[var(--surface)] text-[var(--brand-ink)] hover:bg-[color-mix(in_srgb,var(--surface)_90%,transparent)]"
            : "bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary-hover)]"
        }`}
      >
        <Link to="/auth/signup">Get started</Link>
      </Button>

      <ul className="mt-6 space-y-3">
        {plan.features.map((feat) => (
          <li key={feat} className="flex items-start gap-2.5">
            <Check
              className={`mt-0.5 h-4 w-4 shrink-0 ${isFeatured ? "text-white/80" : "text-[var(--brand-primary)]"}`}
            />
            <span
              className={`text-sm ${isFeatured ? "text-white/90" : "text-[var(--brand-muted)]"}`}
            >
              {feat}
            </span>
          </li>
        ))}
      </ul>

      <button
        className={`mt-5 text-xs font-medium underline underline-offset-2 ${isFeatured ? "text-white/70 hover:text-white" : "text-[var(--brand-primary)] hover:text-[var(--brand-primary-hover)]"}`}
      >
        Learn more
      </button>
    </motion.div>
  );
}

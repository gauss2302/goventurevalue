import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion, useInView } from "framer-motion";
import type { Easing } from "framer-motion";
import { useState, useEffect, useRef, useMemo } from "react";
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
    <div className="relative min-h-screen overflow-x-clip bg-[var(--page)]">
      {/* ───── NAVBAR ───── */}
      <nav
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-white/90 shadow-[var(--shadow-sm)] backdrop-blur-lg"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-6">
          <Link
            to="/"
            className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
          >
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
              className="overflow-hidden bg-white/95 backdrop-blur-lg lg:hidden"
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
      <section className="relative overflow-hidden px-6 pt-32 pb-24 lg:pt-40 lg:pb-32">
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
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-[var(--shadow-md)]">
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
          <div className="w-48 rounded-2xl bg-white p-4 shadow-[var(--shadow-md)] rotate-3">
            <p className="text-xs font-semibold text-[var(--brand-ink)]">
              Series A Readiness
            </p>
            <div className="mt-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[var(--brand-muted)]">
                  Model completeness
                </span>
                <span className="text-[11px] font-semibold text-green-500">94%</span>
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
          <div className="w-56 rounded-2xl bg-white p-4 shadow-[var(--shadow-md)]">
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
          <div className="w-48 rounded-2xl bg-white p-4 shadow-[var(--shadow-md)] rotate-3">
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
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-500">
                <BarChart3 className="h-4 w-4" />
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50 text-green-500">
                <TrendingUp className="h-4 w-4" />
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-500">
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
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-[var(--shadow-md)]">
              <div className="grid grid-cols-2 gap-[3px]">
                <div className="h-[8px] w-[8px] rounded-full bg-[var(--brand-primary)]" />
                <div className="h-[8px] w-[8px] rounded-full bg-[var(--brand-ink)]" />
                <div className="h-[8px] w-[8px] rounded-full bg-[var(--brand-primary)]" />
                <div className="h-[8px] w-[8px] rounded-full bg-[var(--brand-primary)]" />
              </div>
            </div>

            <h1
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
                className="h-12 rounded-full bg-[var(--brand-primary)] px-8 text-[15px] font-semibold text-white shadow-[0_8px_24px_rgba(79,70,186,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#3d36a3] hover:shadow-[0_12px_32px_rgba(79,70,186,0.4)] active:scale-[0.97]"
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
            className="relative mt-16 overflow-hidden rounded-[var(--radius-xl)] bg-gradient-to-b from-[var(--brand-primary)] to-[#36C9F9] p-2 shadow-[var(--shadow-lg)]"
          >
            <div className="overflow-hidden rounded-[calc(var(--radius-xl)-8px)] bg-white">
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
                              <div className="h-1.5 w-1.5 rounded-full bg-green-400" />
                              MRR Growth
                            </span>
                            <span className="font-medium text-[var(--brand-ink)]">18% m/m</span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-[var(--brand-muted)]">
                            <span className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
                              CAC
                            </span>
                            <span className="font-medium text-[var(--brand-ink)]">$142</span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-[var(--brand-muted)]">
                            <span className="flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />
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
                          <TrendingUp className="h-3 w-3 text-green-500" />
                          <span className="text-[11px] font-medium text-green-500">+4.2 vs last month</span>
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
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-[var(--shadow-md)]">
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
                className="relative overflow-hidden rounded-[var(--radius-lg)] bg-gradient-to-br from-blue-50 to-indigo-50 shadow-[var(--shadow-sm)]"
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
    </div>
  );
}

/* ─── Sub-components ─── */

function PillLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[var(--border-soft)] bg-white px-4 py-1.5 text-xs font-medium text-[var(--brand-muted)]">
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
    <div className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-white p-4">
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
      className={`group overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-white p-6 shadow-[var(--shadow-sm)] transition-all duration-300 hover:shadow-[var(--shadow-md)] ${large ? "md:p-8" : ""}`}
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

  const maxVal = useMemo(
    () => Math.max(...scenarioData.scenarios.flatMap((s) => s.revenue)),
    [],
  );

  const scenario = scenarioData.scenarios[activeScenario];

  return (
    <div ref={containerRef} className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border-soft)] bg-white shadow-[var(--shadow-lg)]">
      {/* Excel-style toolbar */}
      <div className="flex items-center justify-between border-b border-[var(--border-soft)] bg-[var(--surface-2)] px-4 py-2 sm:px-6">
        <div className="flex items-center gap-3">
          <FileSpreadsheet className="h-4 w-4 text-green-600" />
          <span className="text-xs font-semibold text-[var(--brand-ink)]" style={{ fontFamily: "var(--font-display)" }}>
            Havamind — Scenario Valuation Model
          </span>
        </div>
        <div className="hidden items-center gap-1.5 sm:flex">
          <div className="h-3 w-3 rounded-full bg-[#FF5F57]" />
          <div className="h-3 w-3 rounded-full bg-[#FEBC2E]" />
          <div className="h-3 w-3 rounded-full bg-[#28C840]" />
        </div>
      </div>

      {/* Scenario tabs */}
      <div className="flex border-b border-[var(--border-soft)]">
        {scenarioData.scenarios.map((s, i) => (
          <button
            key={s.name}
            onClick={() => setActiveScenario(i)}
            className={`flex-1 px-4 py-2.5 text-xs font-medium transition-all sm:text-[13px] ${
              activeScenario === i
                ? "border-b-2 bg-white text-[var(--brand-ink)]"
                : "bg-[var(--surface)] text-[var(--brand-muted)] hover:bg-white hover:text-[var(--brand-ink)]"
            }`}
            style={{
              borderBottomColor: activeScenario === i ? s.color : "transparent",
            }}
          >
            <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
            {s.name}
          </button>
        ))}
      </div>

      <div className="p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
          {/* Chart area */}
          <div>
            {/* Header row — Excel style */}
            <div className="mb-4 grid grid-cols-6 gap-px overflow-hidden rounded-lg border border-[var(--border-soft)] bg-[var(--border-soft)]">
              <div className="bg-[var(--surface-2)] px-3 py-2 text-[11px] font-semibold text-[var(--brand-muted)]">
                Metric
              </div>
              {scenarioData.years.map((y) => (
                <div key={y} className="bg-[var(--surface-2)] px-3 py-2 text-center text-[11px] font-semibold text-[var(--brand-muted)]">
                  {y}
                </div>
              ))}
            </div>

            {/* Revenue row */}
            <div className="mb-1 grid grid-cols-6 gap-px overflow-hidden rounded-lg border border-[var(--border-soft)] bg-[var(--border-soft)]">
              <div className="bg-white px-3 py-2 text-[11px] font-medium text-[var(--brand-ink)]">
                Revenue ($K)
              </div>
              {scenario.revenue.map((val, i) => (
                <motion.div
                  key={`${activeScenario}-rev-${i}`}
                  initial={prefersReducedMotion || !isInView ? false : { opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: i * 0.08 }}
                  className="bg-white px-3 py-2 text-center text-[11px] font-semibold tabular-nums"
                  style={{ color: scenario.color }}
                >
                  ${val.toLocaleString()}
                </motion.div>
              ))}
            </div>

            {/* Growth row */}
            <div className="mb-6 grid grid-cols-6 gap-px overflow-hidden rounded-lg border border-[var(--border-soft)] bg-[var(--border-soft)]">
              <div className="bg-white px-3 py-2 text-[11px] font-medium text-[var(--brand-ink)]">
                YoY Growth
              </div>
              <div className="bg-white px-3 py-2 text-center text-[11px] text-[var(--brand-muted)]">—</div>
              {scenario.revenue.slice(1).map((val, i) => {
                const prev = scenario.revenue[i];
                const growth = Math.round(((val - prev) / prev) * 100);
                return (
                  <motion.div
                    key={`${activeScenario}-gr-${i}`}
                    initial={prefersReducedMotion || !isInView ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, delay: (i + 1) * 0.08 }}
                    className="bg-white px-3 py-2 text-center text-[11px] font-medium tabular-nums text-green-600"
                  >
                    +{growth}%
                  </motion.div>
                );
              })}
            </div>

            {/* Bar chart */}
            <div className="flex items-end gap-2 sm:gap-3" style={{ height: 180 }}>
              {scenario.revenue.map((val, i) => {
                const pct = (val / maxVal) * 100;
                return (
                  <div key={`${activeScenario}-bar-${i}`} className="flex flex-1 flex-col items-center gap-1.5">
                    <motion.div
                      className="w-full rounded-t-lg"
                      style={{ backgroundColor: scenario.color }}
                      initial={prefersReducedMotion || !isInView ? { height: `${pct}%` } : { height: 0 }}
                      animate={{ height: `${pct}%` }}
                      transition={{ duration: 0.6, delay: i * 0.1, ease: "easeOut" }}
                    />
                    <span className="text-[10px] font-medium text-[var(--brand-muted)]">
                      {scenarioData.years[i]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Summary panel */}
          <div className="space-y-4">
            <div className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-5">
              <p className="text-[11px] uppercase tracking-wider text-[var(--brand-muted)]">
                {scenario.name} Valuation
              </p>
              <motion.p
                key={`val-${activeScenario}`}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-2 text-3xl font-extrabold"
                style={{ fontFamily: "var(--font-display)", color: scenario.color }}
              >
                {scenario.valuation}
              </motion.p>
              <p className="mt-1 text-xs text-[var(--brand-muted)]">Pre-money · DCF method</p>
            </div>

            <div className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-5">
              <p className="text-[11px] uppercase tracking-wider text-[var(--brand-muted)]">
                Revenue Growth
              </p>
              <motion.p
                key={`growth-${activeScenario}`}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="mt-2 text-xl font-bold text-[var(--brand-ink)]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {scenario.growth}
              </motion.p>
            </div>

            <div className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface)] p-5">
              <p className="text-[11px] uppercase tracking-wider text-[var(--brand-muted)]">
                Year 5 Revenue
              </p>
              <motion.p
                key={`y5-${activeScenario}`}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className="mt-2 text-xl font-bold"
                style={{ fontFamily: "var(--font-display)", color: scenario.color }}
              >
                ${(scenario.revenue[4] / 1000).toFixed(1)}M
              </motion.p>
            </div>

            {/* All scenarios comparison */}
            <div className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-white p-5">
              <p className="mb-3 text-[11px] uppercase tracking-wider text-[var(--brand-muted)]">
                Compare All
              </p>
              {scenarioData.scenarios.map((s, i) => (
                <div
                  key={s.name}
                  className={`flex items-center justify-between py-1.5 ${i === activeScenario ? "font-semibold" : ""}`}
                >
                  <span className="flex items-center gap-2 text-xs text-[var(--brand-ink)]">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                    {s.name}
                  </span>
                  <span className="text-xs font-semibold tabular-nums" style={{ color: s.color }}>
                    {s.valuation}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
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
      className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-white p-5 shadow-[var(--shadow-sm)]"
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
          : "border border-[var(--border-soft)] bg-white shadow-[var(--shadow-sm)]"
      }`}
    >
      {isFeatured && (
        <div className="absolute -right-3 -top-3">
          <div className="flex h-12 w-12 items-center justify-center">
            <Zap className="h-6 w-6 text-yellow-300" />
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
            ? "bg-white text-[var(--brand-ink)] hover:bg-white/90"
            : "bg-[var(--brand-primary)] text-white hover:bg-[#3d36a3]"
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
        className={`mt-5 text-xs font-medium underline underline-offset-2 ${isFeatured ? "text-white/70 hover:text-white" : "text-[var(--brand-primary)] hover:text-[#1565D8]"}`}
      >
        Learn more
      </button>
    </motion.div>
  );
}

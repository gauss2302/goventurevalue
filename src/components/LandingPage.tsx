import { Link } from "@tanstack/react-router";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { useRef, useState } from "react";
import Footer from "./Footer";

type TrustStat = {
  value: string;
  label: string;
  tone: "primary" | "secondary" | "ice";
};

type StoryChapter = {
  id: string;
  step: string;
  title: string;
  body: string;
  outcomes: string[];
  image: string;
  metricLabel: string;
  metricValue: string;
  note: string;
};

type MosaicCard = {
  id: string;
  title: string;
  description: string;
  image: string;
  badge: string;
  layout: string;
  rotate: number;
};

const trustStats: TrustStat[] = [
  { value: "12k+", label: "Founder sessions", tone: "primary" },
  { value: "$340M", label: "Modeled pipeline", tone: "secondary" },
  { value: "92%", label: "Investor-ready score", tone: "ice" },
];

const storyChapters: StoryChapter[] = [
  {
    id: "capture",
    step: "Chapter 01",
    title: "Capture the first model in one sitting",
    body: "Start with the assumptions you already have. The workspace turns rough numbers into a full model surface without forcing spreadsheet complexity too early.",
    outcomes: [
      "Revenue and cohort assumptions stay connected",
      "Runway pressure is visible from day one",
      "No hand-built spreadsheet templates required",
    ],
    image:
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1400&q=80",
    metricLabel: "Setup time",
    metricValue: "18 min",
    note: "The first draft is built for momentum, not perfection.",
  },
  {
    id: "pressure-test",
    step: "Chapter 02",
    title: "Pressure-test multiple scenarios before meetings",
    body: "Move through conservative, base, and optimistic cases as one narrative. Every scenario keeps assumptions traceable so your story remains coherent under scrutiny.",
    outcomes: [
      "Scenario deltas are visible instantly",
      "Every update propagates across P&L and cash flow",
      "Funding ask is aligned to runway variance",
    ],
    image:
      "https://images.unsplash.com/photo-1559136555-9303baea8ebd?auto=format&fit=crop&w=1400&q=80",
    metricLabel: "Scenarios compared",
    metricValue: "3.4x faster",
    note: "Scenario shifts become a discussion tool, not a panic moment.",
  },
  {
    id: "narrate",
    step: "Chapter 03",
    title: "Translate your numbers into investor language",
    body: "Export board-ready snapshots that combine valuation logic, growth assumptions, and risk framing in one format your stakeholders can read quickly.",
    outcomes: [
      "Valuation thesis is tied to evidence",
      "Core KPIs are mapped to stage priorities",
      "Deck and model stay in sync as assumptions evolve",
    ],
    image:
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1400&q=80",
    metricLabel: "Board prep",
    metricValue: "2 hours saved",
    note: "The model starts acting like a narrative system.",
  },
];

const mosaicCards: MosaicCard[] = [
  {
    id: "playbook",
    title: "Valuation playbooks",
    description:
      "Prebuilt structures for SaaS, marketplaces, and transaction-heavy products.",
    image:
      "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80",
    badge: "Frameworks",
    layout: "md:col-span-7 md:row-span-2",
    rotate: -1.8,
  },
  {
    id: "reviews",
    title: "Founder review room",
    description:
      "Commentary layers keep assumption debates attached to the relevant numbers.",
    image:
      "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80",
    badge: "Collaboration",
    layout: "md:col-span-5",
    rotate: 1.4,
  },
  {
    id: "signals",
    title: "Signal dashboard",
    description:
      "Operational metrics and valuation sensitivity live in one visual command panel.",
    image:
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80",
    badge: "Analytics",
    layout: "md:col-span-4",
    rotate: -1.2,
  },
  {
    id: "investor-kit",
    title: "Investor narrative kit",
    description:
      "Generate concise memo-style outputs for quick diligence and follow-up rounds.",
    image:
      "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80",
    badge: "Story Output",
    layout: "md:col-span-8",
    rotate: 1.1,
  },
];

const stripRows = [
  [
    "Runway = Cash / Burn Rate",
    "LTV/CAC > 3.0x target",
    "Revenue Growth 24% QoQ",
    "Gross Margin 74%",
    "Payback Period 13 months",
    "ARR Multiple 8.4x",
  ],
  [
    "Scenario Weighting: 20/55/25",
    "WACC baseline 11.2%",
    "Terminal Growth 2.8%",
    "Net Burn -$182k",
    "Activation 47%",
    "Net Dollar Retention 122%",
  ],
  [
    "DCF bridge validated",
    "Sensitivity: CAC +15%",
    "Cohort month 6 retention 81%",
    "Pipeline coverage 4.6 months",
    "Monthly active users 128k",
    "Conversion to paid 6.4%",
  ],
];

const springConfig = {
  stiffness: 110,
  damping: 28,
  mass: 0.35,
};

export default function LandingPage() {
  const prefersReducedMotion = Boolean(useReducedMotion());
  const heroRef = useRef<HTMLElement | null>(null);
  const storyRef = useRef<HTMLElement | null>(null);
  const stripRef = useRef<HTMLElement | null>(null);
  const [activeChapter, setActiveChapter] = useState(0);

  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const { scrollYProgress: storyProgress } = useScroll({
    target: storyRef,
    offset: ["start start", "end end"],
  });
  const { scrollYProgress: stripProgress } = useScroll({
    target: stripRef,
    offset: ["start end", "end start"],
  });

  const heroTextY = useSpring(
    useTransform(heroProgress, [0, 1], [0, prefersReducedMotion ? 0 : 70]),
    springConfig
  );
  const heroVisualY = useSpring(
    useTransform(heroProgress, [0, 1], [0, prefersReducedMotion ? 0 : 120]),
    springConfig
  );
  const heroVisualScale = useSpring(
    useTransform(heroProgress, [0, 1], [1, prefersReducedMotion ? 1 : 1.08]),
    springConfig
  );
  const heroOpacity = useSpring(
    useTransform(heroProgress, [0, 1], [1, prefersReducedMotion ? 1 : 0.5]),
    springConfig
  );

  const stripRowOneX = useSpring(
    useTransform(
      stripProgress,
      [0, 1],
      [prefersReducedMotion ? 0 : 100, prefersReducedMotion ? 0 : -120]
    ),
    springConfig
  );
  const stripRowTwoX = useSpring(
    useTransform(
      stripProgress,
      [0, 1],
      [prefersReducedMotion ? 0 : -80, prefersReducedMotion ? 0 : 140]
    ),
    springConfig
  );
  const stripRowThreeX = useSpring(
    useTransform(
      stripProgress,
      [0, 1],
      [prefersReducedMotion ? 0 : 120, prefersReducedMotion ? 0 : -100]
    ),
    springConfig
  );

  useMotionValueEvent(storyProgress, "change", (latest) => {
    const nextIndex = Math.min(
      storyChapters.length - 1,
      Math.max(0, Math.round(latest * (storyChapters.length - 1)))
    );
    setActiveChapter((current) => (current === nextIndex ? current : nextIndex));
  });

  const activeStory = storyChapters[activeChapter] ?? storyChapters[0];

  return (
    <div className="relative min-h-screen overflow-x-clip bg-[var(--page)] text-[var(--brand-ink)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(circle_at_top_right,rgba(79,70,186,0.17),transparent_62%)]" />
      <div className="pointer-events-none absolute left-0 top-56 h-[24rem] w-[24rem] rounded-full bg-[radial-gradient(circle,rgba(249,137,107,0.16),transparent_72%)] blur-3xl" />
      <div className="pointer-events-none absolute -right-16 top-[52rem] h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgba(132,232,244,0.2),transparent_72%)] blur-3xl" />

      <section ref={heroRef} className="relative px-6 pt-12 pb-24 lg:px-10 lg:pt-20">
        <div className="mx-auto max-w-[1200px]">
          <motion.div
            initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]"
          >
            <motion.div style={{ y: heroTextY }} className="relative space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(79,70,186,0.2)] bg-white px-4 py-2 text-xs uppercase tracking-[0.16em] text-[var(--brand-primary)] shadow-[var(--card-shadow)]">
                Founder valuation workspace
              </div>

              <div className="space-y-4">
                <p
                  className="text-2xl leading-none text-[var(--brand-secondary)]"
                  style={{ fontFamily: "var(--font-script)" }}
                >
                  Built for the teams that move fast
                </p>
                <h1 className="max-w-[14ch] text-4xl font-[var(--font-display)] leading-tight text-[var(--brand-ink)] md:text-6xl">
                  Finance storytelling that sharpens every investor conversation.
                </h1>
                <p className="max-w-xl text-base leading-relaxed text-[var(--brand-muted)] md:text-lg">
                  Build your model, test scenarios, and shape a clear valuation
                  narrative in one continuous flow. No disconnected decks, no
                  manual spreadsheet merges.
                </p>
              </div>

              <div className="flex flex-col items-start gap-4 sm:flex-row">
                <Link
                  to="/auth/signup"
                  className="inline-flex items-center rounded-full bg-[var(--brand-primary)] px-7 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(79,70,186,0.32)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(79,70,186,0.38)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-primary)]"
                >
                  Start free workspace
                </Link>
                <Link
                  to="/auth/signin"
                  className="inline-flex items-center rounded-full border border-[var(--border-soft)] bg-white px-7 py-3 text-sm font-semibold text-[var(--brand-ink)] shadow-[var(--card-shadow)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--card-shadow-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-primary)]"
                >
                  Sign in
                </Link>
              </div>

              <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-3">
                {trustStats.map((stat) => (
                  <TrustStatCard key={stat.label} stat={stat} />
                ))}
              </div>
            </motion.div>

            <motion.div
              style={{ y: heroVisualY, scale: heroVisualScale, opacity: heroOpacity }}
              className="relative"
            >
              <div className="absolute -left-5 -top-6 h-40 w-40 rounded-full bg-[rgba(79,70,186,0.16)] blur-3xl" />
              <div className="absolute -right-8 bottom-0 h-44 w-44 rounded-full bg-[rgba(249,137,107,0.18)] blur-3xl" />

              <div className="relative overflow-hidden rounded-[calc(var(--card-radius)+0.4rem)] border border-[var(--border-soft)] bg-white p-4 shadow-[var(--card-shadow-hover)]">
                <figure className="relative h-[27rem] overflow-hidden rounded-[calc(var(--card-radius)-0.25rem)]">
                  <img
                    src="https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=1400&q=80"
                    alt="Founders discussing financial strategy"
                    className="h-full w-full object-cover"
                    loading="eager"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_42%,rgba(28,30,47,0.65)_100%)]" />
                  <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-white/30 bg-[rgba(28,30,47,0.5)] p-4 backdrop-blur-sm">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/70">
                      Live model pulse
                    </p>
                    <p className="mt-1 text-lg font-[var(--font-display)] text-white">
                      Series A readiness: 8.6 / 10
                    </p>
                  </div>
                </figure>

                <div className="pointer-events-none absolute -left-7 top-8 hidden w-56 -rotate-3 rounded-2xl border border-[var(--border-soft)] bg-white p-4 shadow-[var(--card-shadow)] md:block">
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--brand-muted)]">
                    Scenario confidence
                  </p>
                  <p className="mt-2 text-2xl font-[var(--font-display)] text-[var(--brand-primary)]">
                    74%
                  </p>
                  <p className="text-xs text-[var(--brand-muted)]">
                    base case conviction
                  </p>
                </div>

                <div className="pointer-events-none absolute -right-7 bottom-10 hidden w-56 rotate-2 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-4 shadow-[var(--card-shadow)] md:block">
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--brand-muted)]">
                    Runway outlook
                  </p>
                  <p className="mt-2 text-2xl font-[var(--font-display)] text-[var(--brand-secondary)]">
                    23.4 months
                  </p>
                  <p className="text-xs text-[var(--brand-muted)]">
                    post-raise projection
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section ref={storyRef} className="relative px-6 py-16 lg:px-10 lg:py-24">
        <div className="pointer-events-none absolute -top-10 inset-x-0 h-20 bg-[var(--page)]" />
        <div className="mx-auto max-w-[1200px]">
          <motion.div
            initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mb-12 max-w-2xl"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--brand-muted)]">
              Scroll Story
            </p>
            <h2 className="mt-3 text-3xl font-[var(--font-display)] leading-tight text-[var(--brand-ink)] md:text-5xl">
              One runway story, told in chapters your investors can follow.
            </h2>
          </motion.div>

          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_30rem]">
            <div className="space-y-14">
              {storyChapters.map((chapter, index) => {
                const isActive = index === activeChapter;
                return (
                  <motion.article
                    key={chapter.id}
                    initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 26 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.45, ease: "easeOut" }}
                    className={`relative min-h-[24rem] rounded-[var(--card-radius)] border bg-white p-6 shadow-[var(--card-shadow)] lg:min-h-[62vh] lg:p-8 ${
                      isActive
                        ? "border-[rgba(79,70,186,0.34)]"
                        : "border-[var(--border-soft)]"
                    }`}
                  >
                    <div className="max-w-xl">
                      <p className="text-xs uppercase tracking-[0.18em] text-[var(--brand-muted)]">
                        {chapter.step}
                      </p>
                      <h3 className="mt-2 text-2xl font-[var(--font-display)] leading-tight text-[var(--brand-ink)]">
                        {chapter.title}
                      </h3>
                      <p className="mt-3 text-sm leading-relaxed text-[var(--brand-muted)] md:text-base">
                        {chapter.body}
                      </p>

                      <ul className="mt-5 space-y-2 text-sm text-[var(--brand-ink)]">
                        {chapter.outcomes.map((outcome) => (
                          <li key={outcome} className="flex items-start gap-3">
                            <span className="mt-1 h-2 w-2 rounded-full bg-[var(--brand-primary)]" />
                            <span>{outcome}</span>
                          </li>
                        ))}
                      </ul>

                      <p
                        className="mt-5 text-xl text-[var(--brand-secondary)]"
                        style={{ fontFamily: "var(--font-script)" }}
                      >
                        {chapter.note}
                      </p>
                    </div>

                    <div className="mt-6 overflow-hidden rounded-3xl border border-[var(--border-soft)] lg:hidden">
                      <img
                        src={chapter.image}
                        alt={chapter.title}
                        className="h-56 w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  </motion.article>
                );
              })}
            </div>

            <div className="hidden lg:block">
              <div className="sticky top-24">
                <StoryStage
                  chapter={activeStory}
                  reducedMotion={prefersReducedMotion}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative px-6 py-24 lg:px-10">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[rgba(79,70,186,0.04)]"
          style={{ clipPath: "polygon(0 40%,100% 0,100% 100%,0 100%)" }}
        />
        <div className="mx-auto max-w-[1200px]">
          <motion.div
            initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="mb-10 max-w-3xl"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--brand-muted)]">
              Evidence Mosaic
            </p>
            <h2 className="mt-3 text-3xl font-[var(--font-display)] text-[var(--brand-ink)] md:text-4xl">
              Non-linear blocks built for operator context.
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-12 md:auto-rows-[14rem]">
            {mosaicCards.map((card, index) => (
              <motion.article
                key={card.id}
                initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.45, delay: index * 0.08, ease: "easeOut" }}
                className={`group relative overflow-hidden rounded-[var(--card-radius)] border border-[var(--border-soft)] bg-white shadow-[var(--card-shadow)] ${card.layout}`}
                style={{ rotate: prefersReducedMotion ? 0 : card.rotate }}
              >
                <img
                  src={card.image}
                  alt={card.title}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(28,30,47,0.05)_12%,rgba(28,30,47,0.76)_100%)]" />
                <div className="relative flex h-full flex-col justify-end p-5">
                  <span className="mb-3 inline-flex w-fit rounded-full border border-white/30 bg-white/20 px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-white backdrop-blur-sm">
                    {card.badge}
                  </span>
                  <h3 className="text-xl font-[var(--font-display)] text-white">
                    {card.title}
                  </h3>
                  <p className="mt-2 max-w-[34ch] text-sm text-white/80">
                    {card.description}
                  </p>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section
        ref={stripRef}
        className="relative overflow-hidden px-6 py-20 lg:px-10 lg:py-24"
      >
        <div className="mx-auto max-w-[1200px] rounded-[calc(var(--card-radius)+0.4rem)] border border-[var(--border-soft)] bg-white px-5 py-8 shadow-[var(--card-shadow)] md:px-8">
          <p className="mb-5 text-xs uppercase tracking-[0.2em] text-[var(--brand-muted)]">
            Dynamic data strip
          </p>
          <motion.div style={{ x: stripRowOneX }} className="mb-3 flex w-max gap-3">
            {[...stripRows[0], ...stripRows[0]].map((item, idx) => (
              <FormulaChip key={`row-1-${idx}`} value={item} />
            ))}
          </motion.div>
          <motion.div style={{ x: stripRowTwoX }} className="mb-3 flex w-max gap-3">
            {[...stripRows[1], ...stripRows[1]].map((item, idx) => (
              <FormulaChip key={`row-2-${idx}`} value={item} tone="secondary" />
            ))}
          </motion.div>
          <motion.div style={{ x: stripRowThreeX }} className="flex w-max gap-3">
            {[...stripRows[2], ...stripRows[2]].map((item, idx) => (
              <FormulaChip key={`row-3-${idx}`} value={item} tone="ice" />
            ))}
          </motion.div>
        </div>
      </section>

      <section className="relative px-6 py-20 pb-24 lg:px-10 lg:pt-24">
        <motion.div
          initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="mx-auto max-w-[980px] overflow-hidden rounded-[calc(var(--card-radius)+0.5rem)] border border-[var(--border-soft)] bg-[linear-gradient(125deg,rgba(79,70,186,0.96),rgba(79,70,186,0.88),rgba(36,88,255,0.8))] p-8 text-white shadow-[0_24px_56px_rgba(47,44,120,0.35)] md:p-12"
        >
          <div className="relative">
            <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-[rgba(249,137,107,0.36)] blur-3xl" />
            <div className="pointer-events-none absolute -left-20 bottom-0 h-48 w-48 rounded-full bg-[rgba(132,232,244,0.38)] blur-3xl" />
            <div className="relative">
              <p className="text-xs uppercase tracking-[0.2em] text-white/75">
                Ready for diligence
              </p>
              <h2 className="mt-4 max-w-[18ch] text-3xl font-[var(--font-display)] leading-tight md:text-5xl">
                Build your next investor update from one living model.
              </h2>
              <p className="mt-4 max-w-2xl text-sm text-white/85 md:text-base">
                Start with a free workspace and keep every assumption, scenario,
                and valuation output aligned as your company evolves.
              </p>
              <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row">
                <Link
                  to="/auth/signup"
                  className="inline-flex items-center rounded-full bg-white px-7 py-3 text-sm font-semibold text-[var(--brand-primary)] shadow-[var(--card-shadow)] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  Create free account
                </Link>
                <Link
                  to="/auth/signin"
                  className="inline-flex items-center rounded-full border border-white/40 px-7 py-3 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  Sign in to workspace
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
}

function TrustStatCard({ stat }: { stat: TrustStat }) {
  const toneClass =
    stat.tone === "primary"
      ? "text-[var(--brand-primary)] bg-[rgba(79,70,186,0.1)]"
      : stat.tone === "secondary"
        ? "text-[var(--brand-secondary)] bg-[rgba(249,137,107,0.16)]"
        : "text-[#2458FF] bg-[rgba(36,88,255,0.12)]";

  return (
    <div className="rounded-2xl border border-[var(--border-soft)] bg-white p-4 shadow-[var(--card-shadow)]">
      <div className={`inline-flex rounded-xl px-3 py-1 text-xs ${toneClass}`}>
        Live signal
      </div>
      <p className="mt-3 text-2xl font-[var(--font-display)] text-[var(--brand-ink)]">
        {stat.value}
      </p>
      <p className="text-xs uppercase tracking-[0.12em] text-[var(--brand-muted)]">
        {stat.label}
      </p>
    </div>
  );
}

function StoryStage({
  chapter,
  reducedMotion,
}: {
  chapter: StoryChapter;
  reducedMotion: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-[calc(var(--card-radius)+0.1rem)] border border-[var(--border-soft)] bg-white p-5 shadow-[var(--card-shadow-hover)]">
      <AnimatePresence mode="wait">
        <motion.figure
          key={chapter.id}
          initial={{ opacity: 0, y: reducedMotion ? 0 : 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reducedMotion ? 0 : -16 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="relative overflow-hidden rounded-3xl"
        >
          <img
            src={chapter.image}
            alt={chapter.title}
            className="h-[26rem] w-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_40%,rgba(28,30,47,0.7)_100%)]" />
          <figcaption className="absolute bottom-4 left-4 right-4 rounded-2xl border border-white/25 bg-[rgba(28,30,47,0.46)] p-4 backdrop-blur-sm">
            <p className="text-xs uppercase tracking-[0.18em] text-white/70">
              {chapter.metricLabel}
            </p>
            <p className="mt-1 text-2xl font-[var(--font-display)] text-white">
              {chapter.metricValue}
            </p>
          </figcaption>
        </motion.figure>
      </AnimatePresence>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${chapter.id}-title`}
          initial={{ opacity: 0, y: reducedMotion ? 0 : 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reducedMotion ? 0 : -10 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="mt-4 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-muted)] p-4"
        >
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--brand-muted)]">
            Active chapter
          </p>
          <h4 className="mt-2 text-lg font-[var(--font-display)] text-[var(--brand-ink)]">
            {chapter.title}
          </h4>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function FormulaChip({
  value,
  tone = "primary",
}: {
  value: string;
  tone?: "primary" | "secondary" | "ice";
}) {
  const toneClass =
    tone === "primary"
      ? "border-[rgba(79,70,186,0.24)] bg-[rgba(79,70,186,0.08)] text-[var(--brand-primary)]"
      : tone === "secondary"
        ? "border-[rgba(249,137,107,0.3)] bg-[rgba(249,137,107,0.12)] text-[var(--brand-secondary)]"
        : "border-[rgba(36,88,255,0.26)] bg-[rgba(36,88,255,0.1)] text-[#2458FF]";

  return (
    <div
      className={`inline-flex whitespace-nowrap rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] ${toneClass}`}
    >
      {value}
    </div>
  );
}

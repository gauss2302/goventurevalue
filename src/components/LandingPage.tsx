import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Set mounted to true after component mounts to trigger animations
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-20 left-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl animate-pulse z-0" />
      <div
        className="absolute bottom-0 right-1/4 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse z-0"
        style={{ animationDelay: "1s" }}
      />
      <div
        className="absolute top-1/2 left-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse z-0"
        style={{ animationDelay: "2s" }}
      />

      {/* Navigation */}
      <nav
        className={`relative z-20 px-4 sm:px-6 lg:px-8 py-6 transition-all duration-700 ${
          mounted ? "opacity-100 translate-y-0" : "opacity-100 translate-y-0"
        }`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer hover:scale-105 transition-transform">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <span className="text-xl font-bold text-white">GoVentureValue</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/auth/signin"
              className="text-slate-300 hover:text-white font-medium transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/auth/signup"
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg transition-all shadow-lg shadow-emerald-500/30 hover:scale-105 active:scale-95"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-24">
          <div className="text-center">
            <div
              className={`inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-emerald-400 text-sm font-medium mb-8 transition-all duration-700 delay-100 ${
                mounted
                  ? "opacity-100 translate-y-0"
                  : "opacity-100 translate-y-0"
              }`}
            >
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              Now with AI-powered insights
            </div>

            <h1
              className={`text-5xl md:text-7xl font-bold text-white mb-6 leading-tight transition-all duration-700 delay-200 ${
                mounted
                  ? "opacity-100 translate-y-0"
                  : "opacity-100 translate-y-0"
              }`}
            >
              Build Financial Models
              <span
                className={`block bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent transition-all duration-700 delay-300 ${
                  mounted
                    ? "opacity-100 translate-y-0"
                    : "opacity-100 translate-y-0"
                }`}
              >
                That Impress Investors
              </span>
            </h1>

            <p
              className={`text-xl text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed transition-all duration-700 delay-400 ${
                mounted
                  ? "opacity-100 translate-y-0"
                  : "opacity-100 translate-y-0"
              }`}
            >
              Create professional startup financial models in minutes. Perfect
              for founders preparing pitch decks and fundraising materials.
            </p>

            <div
              className={`flex flex-col sm:flex-row gap-4 justify-center items-center transition-all duration-700 delay-500 ${
                mounted
                  ? "opacity-100 translate-y-0"
                  : "opacity-100 translate-y-0"
              }`}
            >
              <Link
                to="/auth/signup"
                className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/30 transition-all text-lg hover:scale-105 active:scale-95"
              >
                Start Free Trial
              </Link>
              <Link
                to="/auth/signin"
                className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl border border-white/20 transition-all text-lg backdrop-blur-sm hover:scale-105 active:scale-95"
              >
                Sign In
              </Link>
            </div>

            {/* Stats */}
            <div
              className={`mt-16 grid grid-cols-3 gap-8 max-w-3xl mx-auto transition-all duration-700 delay-700 ${
                mounted
                  ? "opacity-100 translate-y-0"
                  : "opacity-100 translate-y-0"
              }`}
            >
              <StatCard value="1,000+" label="Models Created" />
              <StatCard value="$50M+" label="Funding Raised" />
              <StatCard value="98%" label="Satisfaction" />
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className={`text-center mb-16 transition-all duration-700 ${
              mounted
                ? "opacity-100 translate-y-0"
                : "opacity-100 translate-y-0"
            }`}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Everything You Need for Financial Modeling
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Professional-grade tools trusted by founders and investors
              worldwide
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={
                <svg
                  className="w-7 h-7"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              }
              title="5-Year Projections"
              description="Generate comprehensive P&L, cash flow, and balance sheet projections with multiple scenarios."
              delay={0}
              mounted={mounted}
            />
            <FeatureCard
              icon={
                <svg
                  className="w-7 h-7"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              }
              title="DCF Valuation"
              description="Calculate enterprise value using industry-standard discounted cash flow methodology."
              delay={100}
              mounted={mounted}
            />
            <FeatureCard
              icon={
                <svg
                  className="w-7 h-7"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
                  />
                </svg>
              }
              title="Investor-Ready"
              description="Export professional reports and presentations perfect for VC meetings and pitch decks."
              delay={200}
              mounted={mounted}
            />
            <FeatureCard
              icon={
                <svg
                  className="w-7 h-7"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              }
              title="Market Sizing"
              description="Define TAM, SAM, and SOM with year-over-year penetration analysis."
              delay={300}
              mounted={mounted}
            />
            <FeatureCard
              icon={
                <svg
                  className="w-7 h-7"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              }
              title="Real-Time Updates"
              description="See how changes to assumptions instantly update your entire financial model."
              delay={400}
              mounted={mounted}
            />
            <FeatureCard
              icon={
                <svg
                  className="w-7 h-7"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              }
              title="Secure & Private"
              description="Your financial data is encrypted and stored securely. You own your models."
              delay={500}
              mounted={mounted}
            />
          </div>
        </div>
      </div>

      {/* Floating Formulas Section */}
      <div className="py-16 relative z-10 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative h-64 md:h-80">
            {/* Floating Formula Elements */}
            <FloatingFormula
              formula="DCF = Σ(CFₜ / (1+r)ᵗ)"
              position={{ top: "10%", left: "5%" }}
              delay={0}
              mounted={mounted}
            />
            <FloatingFormula
              formula="NPV = Σ(CFₜ / (1+r)ᵗ) - I₀"
              position={{ top: "20%", right: "10%" }}
              delay={200}
              mounted={mounted}
            />
            <FloatingFormula
              formula="IRR: NPV = 0"
              position={{ top: "50%", left: "15%" }}
              delay={400}
              mounted={mounted}
            />
            <FloatingFormula
              formula="ARR = (Avg Profit / Investment) × 100"
              position={{ bottom: "20%", right: "8%" }}
              delay={600}
              mounted={mounted}
            />
            <FloatingFormula
              formula="ROI = (Gain - Cost) / Cost"
              position={{ bottom: "10%", left: "20%" }}
              delay={800}
              mounted={mounted}
            />
            <FloatingFormula
              formula="P/E = Price / Earnings"
              position={{ top: "35%", right: "25%" }}
              delay={300}
              mounted={mounted}
            />
            <FloatingFormula
              formula="EV = Market Cap + Debt - Cash"
              position={{ top: "60%", left: "8%" }}
              delay={500}
              mounted={mounted}
            />
            <FloatingFormula
              formula="EBITDA = Revenue - COGS - OpEx"
              position={{ bottom: "30%", left: "12%" }}
              delay={700}
              mounted={mounted}
            />
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-24 relative z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="backdrop-blur-xl bg-gradient-to-r from-emerald-600/90 to-emerald-700/90 rounded-3xl p-12 text-center border border-emerald-500/30 shadow-2xl shadow-emerald-500/20 relative overflow-hidden hover:scale-[1.02] transition-transform duration-300">
            <div className="absolute inset-0 bg-white/10 rounded-full blur-3xl animate-pulse" />

            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Ready to Create Your Financial Model?
              </h2>
              <p className="text-emerald-100 text-lg mb-8 max-w-2xl mx-auto">
                Join thousands of founders who are using our platform to raise
                funding and build successful startups.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/auth/signup"
                  className="px-8 py-4 bg-white text-emerald-700 font-semibold rounded-xl hover:bg-emerald-50 transition-all text-lg shadow-lg hover:scale-105 active:scale-95"
                >
                  Create Free Account
                </Link>
                <Link
                  to="/auth/signin"
                  className="px-8 py-4 bg-emerald-500/30 text-white font-semibold rounded-xl border border-emerald-400/50 hover:bg-emerald-500/40 transition-all text-lg hover:scale-105 active:scale-95"
                >
                  Sign In
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 cursor-pointer hover:scale-105 transition-transform">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <span className="text-white font-semibold">GoVentureValue</span>
            </div>
            <p className="text-slate-500 text-sm">
              © {new Date().getFullYear()} GoVentureValue. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center hover:scale-105 transition-transform cursor-default">
      <div className="text-3xl md:text-4xl font-bold text-white">{value}</div>
      <div className="text-slate-400 text-sm mt-1">{label}</div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  delay,
  mounted,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay: number;
  mounted: boolean;
}) {
  return (
    <div
      className={`backdrop-blur-sm bg-white/5 rounded-2xl p-6 border border-white/10 hover:border-emerald-500/50 hover:bg-white/10 transition-all group cursor-pointer hover:-translate-y-2 ${
        mounted ? "opacity-100 translate-y-0" : "opacity-100 translate-y-0"
      }`}
      style={{
        transitionDelay: `${delay + 800}ms`,
        transitionDuration: "700ms",
      }}
    >
      <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 mb-4 group-hover:bg-emerald-500/30 transition-all group-hover:rotate-6 group-hover:scale-110">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-slate-400 leading-relaxed">{description}</p>
    </div>
  );
}

function FloatingFormula({
  formula,
  position,
  delay,
  mounted,
}: {
  formula: string;
  position: { top?: string; bottom?: string; left?: string; right?: string };
  delay: number;
  mounted: boolean;
}) {
  return (
    <div
      className={`absolute backdrop-blur-md bg-emerald-500/10 border border-emerald-400/30 rounded-xl px-4 py-3 text-emerald-300 font-mono text-sm md:text-base shadow-lg shadow-emerald-500/20 animate-float hover:scale-110 hover:bg-emerald-500/20 hover:border-emerald-400/50 ${
        mounted ? "opacity-100" : "opacity-0"
      }`}
      style={{
        ...position,
        animationDelay: `${delay}ms`,
        transition: `opacity 0.8s ease-in-out ${delay}ms`,
      }}
    >
      {formula}
    </div>
  );
}

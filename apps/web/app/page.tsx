import Hero from '@/components/landing/Hero';
import TerminalDemo from '@/components/landing/TerminalDemo';
import Features from '@/components/landing/Features';
import Pricing from '@/components/landing/Pricing';
import Testimonials from '@/components/landing/Testimonials';
import LandingNav from '@/components/landing/LandingNav';
import LandingFooter from '@/components/landing/LandingFooter';

export default function LandingPage() {
  return (
    <div className="bg-[#0F0F14] min-h-screen">
      <LandingNav />
      <main>
        <Hero />

        {/* Live product demo */}
        <section id="demo" className="bg-[#16161E] py-24 md:py-32 border-y border-[rgba(255,255,255,0.08)]">
          <div className="max-w-6xl mx-auto px-6 md:px-12 grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-white/40 mb-4">
                How it works
              </p>
              <h2 className="font-mono font-medium text-white text-3xl md:text-5xl tracking-tight leading-tight mb-6">
                Watch a change
                <br />
                earn its commit.
              </h2>
              <p className="font-sans text-base text-white/60 leading-relaxed max-w-md">
                You ask in plain language. NOXES scans your resources, reads the
                relevant files, and proposes a diff. Nothing touches disk until
                you approve — then it applies under a git checkpoint, reversible
                at any time.
              </p>
            </div>
            <TerminalDemo />
          </div>
        </section>

        <Features />
        <Pricing />
        <Testimonials />
      </main>
      <LandingFooter />
    </div>
  );
}

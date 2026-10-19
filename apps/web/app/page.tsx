import AboutNoxes from '@/components/landing/AboutNoxes';
import Features from '@/components/landing/Features';
import GetStarted from '@/components/landing/GetStarted';
import Hero from '@/components/landing/Hero';
import LandingFooter from '@/components/landing/LandingFooter';
import LandingNav from '@/components/landing/LandingNav';
import Projects from '@/components/landing/Projects';
import TerminalDemo from '@/components/landing/TerminalDemo';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#101426] text-[#F4F5FB]">
      <LandingNav />
      <main>
        <Hero />
        <Projects />

        <section id="demo" className="border-y border-white/[0.08] bg-[#151B33] py-24 md:py-32">
          <div className="mx-auto grid max-w-7xl items-center gap-14 px-6 md:px-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
            <div>
              <p className="brand-eyebrow">How the flagship works</p>
              <h2 className="brand-display mt-5 text-4xl font-semibold leading-tight text-[#F4F5FB] md:text-6xl">
                Ask clearly.
                <br />
                Review calmly.
              </h2>
              <p className="mt-6 max-w-lg text-base leading-relaxed text-[#AEB5D0] md:text-lg">
                Describe the change you want. NOXES reads the relevant server resources and prepares a diff. You review and approve it; a Git checkpoint is made before the change is applied.
              </p>
              <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.14em] text-[#8D96B7]">
                No approval, no file change.
              </p>
            </div>
            <TerminalDemo />
          </div>
        </section>

        <Features />
        <AboutNoxes />
        <GetStarted />
      </main>
      <LandingFooter />
    </div>
  );
}

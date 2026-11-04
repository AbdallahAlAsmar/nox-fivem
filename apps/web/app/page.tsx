import AboutNoxes from '@/components/landing/AboutNoxesMotion';
import Features from '@/components/landing/Features';
import GetStarted from '@/components/landing/GetStarted';
import Hero from '@/components/landing/Hero';
import LandingFooter from '@/components/landing/LandingFooter';
import LandingNav from '@/components/landing/LandingNav';
import Projects from '@/components/landing/ProjectsMotion';
import ScrollReveal from '@/components/landing/ScrollReveal';
import TerminalDemo from '@/components/landing/TerminalDemo';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#111315] text-[#F4F1E9]">
      <LandingNav />
      <main>
        <Hero />
        <Projects />

        <section id="demo" className="border-y border-[#414548] bg-[#181A1D] py-24 md:py-32">
          <ScrollReveal className="mx-auto grid max-w-7xl items-center gap-14 px-6 md:px-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
            <div>
              <p className="brand-eyebrow">Verification First</p>
              <h2 className="brand-display mt-5 text-4xl font-black uppercase tracking-tight text-[#F4F1E9] md:text-6xl">
                Ask clearly.
                <br />
                <span className="text-[#E83708]">Review calmly.</span>
              </h2>
              <p className="mt-6 max-w-lg text-base leading-relaxed text-[#B6B0A4] md:text-lg">
                Describe the change you want. NOXES reads your server resources and drafts a precise diff. You review every line; a Git checkpoint is created before anything touches disk.
              </p>
              <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.16em] text-[#68665F]">
                No approval, no file change.
              </p>
            </div>
            <TerminalDemo />
          </ScrollReveal>
        </section>

        <Features />
        <AboutNoxes />
        <GetStarted />
      </main>
      <LandingFooter />
    </div>
  );
}

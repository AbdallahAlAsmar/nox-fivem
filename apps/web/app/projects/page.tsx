import type { Metadata } from 'next';
import LandingFooter from '@/components/landing/LandingFooter';
import LandingNav from '@/components/landing/LandingNav';
import Projects from '@/components/landing/Projects';

export const metadata: Metadata = {
  title: 'Projects',
  description: 'Explore the software projects created by NOXES, starting with AI-assisted FiveM server development.',
  openGraph: {
    title: 'NOXES projects',
    description: 'A growing portfolio of practical tools for people building their own digital worlds.',
  },
};

export default function ProjectsPage() {
  return (
    <div className="min-h-screen bg-[#101426] text-[#F4F5FB]">
      <LandingNav />
      <main className="pt-16">
        <section className="brand-hero relative overflow-hidden px-6 py-20 md:px-12 md:py-28">
          <div aria-hidden="true" className="brand-grid pointer-events-none absolute inset-0" />
          <div className="relative mx-auto max-w-7xl">
            <p className="brand-eyebrow">Built under one roof</p>
            <h1 className="brand-display mt-5 max-w-4xl text-5xl font-semibold leading-tight text-[#F4F5FB] md:text-7xl">
              NOXES projects,
              <br />
              <span className="text-[#D8F36A]">in one place.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-[#AEB5D0] md:text-lg">
              NOXES is an independent software studio. This portfolio is designed to grow as new projects are ready to share.
            </p>
          </div>
        </section>
        <Projects />
      </main>
      <LandingFooter />
    </div>
  );
}

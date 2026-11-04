import Link from 'next/link';
import { ArrowUpRight, Check, GitBranch, ScanSearch } from 'lucide-react';
import ScrollReveal from './ScrollReveal';

const highlights = [
  { icon: ScanSearch, label: 'Resource-aware assistance' },
  { icon: Check, label: 'Review before apply' },
  { icon: GitBranch, label: 'Git checkpoints' },
];

export default function ProjectsMotion() {
  return (
    <section id="projects" className="relative overflow-hidden border-t border-[#414548] bg-[#111315] py-28 md:py-40" aria-labelledby="projects-heading">
      <div className="mx-auto max-w-7xl px-6 md:px-12">
        <ScrollReveal className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <p className="brand-eyebrow">Studio Portfolio</p>
            <h2 id="projects-heading" className="brand-display mt-5 text-5xl font-black uppercase tracking-tight text-[#F4F1E9] md:text-7xl">
              One studio.<br /><span className="text-[#E83708]">Many worlds.</span>
            </h2>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-[#B6B0A4] md:text-base">
            NOXES is an umbrella for creator-centric systems. We introduce each product only when it is verified and ready for real builders.
          </p>
        </ScrollReveal>

        <ScrollReveal className="mt-16" delay={100}>
          <article className="project-feature relative overflow-hidden border border-[#414548] bg-[#181A1D]">
            <div className="absolute inset-y-0 right-0 hidden w-[48%] bg-[#202326] lg:block" aria-hidden="true" />
            <div className="relative grid lg:grid-cols-[1fr_0.9fr]">
              <div className="p-7 md:p-12">
                <div className="flex items-start justify-between gap-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-sm border border-[#414548] bg-[#111315]">
                    <img src="/brand/13_Desktop_App_Icon.png" alt="" aria-hidden="true" className="h-7 w-7" />
                  </div>
                  <span className="rounded-sm border border-[#E83708]/30 bg-[#E83708]/10 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-[#E83708]">Flagship project</span>
                </div>
                <p className="mt-14 font-mono text-[10px] uppercase tracking-[0.16em] text-[#68665F]">For FiveM server owners</p>
                <h3 className="brand-display mt-2 text-4xl font-bold uppercase tracking-tight text-[#F4F1E9] md:text-6xl">NOXES for FiveM</h3>
                <p className="mt-5 max-w-xl text-sm leading-relaxed text-[#B6B0A4] md:text-base">
                  An AI-assisted workspace for understanding server resources and proposing changes you can review before they are applied.
                </p>
                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                  {highlights.map(({ icon: Icon, label }) => (
                    <div key={label} className="flex items-start gap-2 text-xs leading-relaxed text-[#F4F1E9]/80">
                      <Icon aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#E83708]" />
                      {label}
                    </div>
                  ))}
                </div>
                <Link href="/sign-up" className="brand-button-primary relative mt-10 inline-flex">
                  Explore the flagship <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              </div>

              <div className="relative min-h-[360px] overflow-hidden border-t border-[#414548] bg-[#202326] p-7 lg:border-l lg:border-t-0 md:p-10">
                <div className="project-grid absolute inset-0" aria-hidden="true" />
                <div className="relative flex h-full flex-col justify-between">
                  <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.16em] text-[#68665F]"><span>Signal map / live</span><span className="flex items-center gap-2 text-[#E83708]"><i className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#E83708]" /> Connected</span></div>
                  <div className="project-map" aria-hidden="true">
                    <span className="map-node map-node-main" />
                    <span className="map-node map-node-a" />
                    <span className="map-node map-node-b" />
                    <span className="map-node map-node-c" />
                    <span className="map-line map-line-a" />
                    <span className="map-line map-line-b" />
                    <span className="map-line map-line-c" />
                    <span className="map-label map-label-main">server.cfg</span>
                    <span className="map-label map-label-a">resources</span>
                    <span className="map-label map-label-b">shop.lua</span>
                    <span className="map-label map-label-c">checkpoint</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-[#414548] pt-4 font-mono text-[9px] uppercase tracking-[0.12em] text-[#68665F]"><span>04 resources mapped</span><span>01 staged change</span></div>
                </div>
              </div>
            </div>
          </article>
        </ScrollReveal>

        <ScrollReveal className="mt-5" delay={180}>
          <div className="flex flex-col justify-between gap-6 border border-dashed border-[#414548] bg-[#181A1D]/60 p-7 md:flex-row md:items-center md:p-9">
            <div><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#68665F]">Future offerings</p><h3 className="brand-display mt-2 text-2xl font-bold uppercase tracking-tight text-[#F4F1E9]">Authored for what comes next.</h3></div>
            <p className="max-w-xl text-sm leading-relaxed text-[#B6B0A4]">Future NOXES tools will expand to other creator ecosystems as they take shape. No synthetic claims, just real engineering when ready.</p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

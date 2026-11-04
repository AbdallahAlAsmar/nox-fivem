import Link from 'next/link';
import { ArrowUpRight, Check, GitBranch, ScanSearch } from 'lucide-react';

export type NoxesProject = {
  name: string;
  audience: string;
  description: string;
  href: string;
  stage: string;
  highlights: string[];
};

export const NOXES_PROJECTS: NoxesProject[] = [
  {
    name: 'NOXES for FiveM',
    audience: 'For FiveM server owners',
    description: 'An AI-assisted workspace for understanding server resources and proposing changes you can review before they are applied.',
    href: '/sign-up',
    stage: 'Flagship project',
    highlights: ['Resource-aware assistance', 'Review before apply', 'Git checkpoints'],
  },
];

export default function Projects() {
  return (
    <section id="projects" className="border-t border-[#414548] bg-[#111315] py-24 md:py-32" aria-labelledby="projects-heading">
      <div className="mx-auto max-w-7xl px-6 md:px-12">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="brand-eyebrow">Studio Portfolio</p>
            <h2 id="projects-heading" className="brand-display mt-5 text-4xl font-black uppercase tracking-tight text-[#F4F1E9] md:text-6xl">
              One studio. Many worlds to author.
            </h2>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-[#B6B0A4] md:text-base">
            NOXES is an umbrella for creator-centric systems. We introduce each product here only when it is verified and ready for real builders.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {NOXES_PROJECTS.map((project) => (
            <article key={project.name} className="relative overflow-hidden rounded-sm border border-[#414548] bg-[#202326] p-7 md:p-9">
              <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full border border-[#414548]/40 bg-[#E83708]/[0.03]" />
              <div className="relative flex items-start justify-between gap-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-sm border border-[#414548] bg-[#181A1D]">
                  <img src="/brand/noxes-symbol.svg" alt="" aria-hidden="true" className="h-7 w-7" />
                </div>
                <span className="rounded-sm border border-[#E83708]/30 bg-[#E83708]/10 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-[#E83708]">{project.stage}</span>
              </div>

              <div className="relative mt-8">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#68665F]">{project.audience}</p>
                <h3 className="brand-display mt-2 text-3xl font-bold uppercase tracking-tight text-[#F4F1E9] md:text-4xl">{project.name}</h3>
                <p className="mt-3.5 max-w-xl text-sm leading-relaxed text-[#B6B0A4] md:text-base">{project.description}</p>
              </div>

              <ul className="relative mt-6 grid gap-2 sm:grid-cols-3">
                {project.highlights.map((highlight, index) => (
                  <li key={highlight} className="flex items-start gap-2 text-xs leading-relaxed text-[#F4F1E9]/80">
                    <span className="mt-0.5 text-[#E83708]">
                      {index === 0 ? <ScanSearch aria-hidden="true" className="h-3.5 w-3.5" /> : index === 1 ? <Check aria-hidden="true" className="h-3.5 w-3.5" /> : <GitBranch aria-hidden="true" className="h-3.5 w-3.5" />}
                    </span>
                    {highlight}
                  </li>
                ))}
              </ul>

              <Link href={project.href} className="brand-button-secondary relative mt-8 inline-flex">
                Explore the flagship <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </article>
          ))}

          <div className="flex min-h-80 flex-col justify-between rounded-sm border border-dashed border-[#414548] bg-[#181A1D]/60 p-7 md:p-9">
            <span className="flex h-10 w-10 items-center justify-center rounded-sm border border-[#414548] bg-[#202326] text-xl font-light text-[#E83708]" aria-hidden="true">+</span>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#68665F]">Future Offerings</p>
              <h3 className="brand-display mt-2 text-2xl font-bold uppercase tracking-tight text-[#F4F1E9]">Authored for what comes next.</h3>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-[#B6B0A4]">
                Future NOXES tools will expand to other creator ecosystems as they take shape. No synthetic claims, just real engineering when ready.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

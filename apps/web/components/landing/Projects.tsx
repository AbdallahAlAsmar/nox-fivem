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
    <section id="projects" className="bg-[#0B1020] py-24 md:py-32" aria-labelledby="projects-heading">
      <div className="mx-auto max-w-7xl px-6 md:px-12">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="brand-eyebrow">The NOXES portfolio</p>
            <h2 id="projects-heading" className="brand-display mt-5 text-4xl font-semibold leading-tight text-[#F4F5FB] md:text-6xl">
              One studio. Many things to build.
            </h2>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-[#AEB5D0] md:text-base">
            NOXES is an umbrella for practical software. We share each project here when it is ready to meet the people it is for.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {NOXES_PROJECTS.map((project) => (
            <article key={project.name} className="relative overflow-hidden rounded-[1.5rem] border border-white/[0.12] bg-gradient-to-br from-[#20294A] to-[#171D37] p-7 md:p-9">
              <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full border border-[#7F91F6]/15 bg-[#5B72F2]/[0.08]" />
              <div className="relative flex items-start justify-between gap-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-[#101426]/65">
                  <img src="/brand/noxes-symbol.svg" alt="" aria-hidden="true" className="h-10 w-10" />
                </div>
                <span className="rounded-full border border-[#D8F36A]/20 bg-[#D8F36A]/[0.08] px-3 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-[#D8F36A]">{project.stage}</span>
              </div>

              <div className="relative mt-8">
                <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#AAB6FF]">{project.audience}</p>
                <h3 className="brand-display mt-2 text-3xl font-semibold text-[#F4F5FB] md:text-4xl">{project.name}</h3>
                <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#C1C8E0] md:text-base">{project.description}</p>
              </div>

              <ul className="relative mt-6 grid gap-2 sm:grid-cols-3">
                {project.highlights.map((highlight, index) => (
                  <li key={highlight} className="flex items-start gap-2 text-xs leading-relaxed text-[#CBD1E6]">
                    <span className="mt-0.5 text-[#D8F36A]">
                      {index === 0 ? <ScanSearch aria-hidden="true" className="h-3.5 w-3.5" /> : index === 1 ? <Check aria-hidden="true" className="h-3.5 w-3.5" /> : <GitBranch aria-hidden="true" className="h-3.5 w-3.5" />}
                    </span>
                    {highlight}
                  </li>
                ))}
              </ul>

              <Link href={project.href} className="brand-button-secondary relative mt-8 inline-flex min-h-10 px-4 py-2 text-sm">
                Explore the flagship <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </article>
          ))}

          <div className="flex min-h-80 flex-col justify-between rounded-[1.5rem] border border-dashed border-white/[0.16] bg-white/[0.02] p-7 md:p-9">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.1] text-2xl font-light text-[#AAB6FF]" aria-hidden="true">+</span>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#8D96B7]">More to come</p>
              <h3 className="brand-display mt-2 text-2xl font-semibold text-[#F4F5FB]">A home for the next idea.</h3>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-[#AEB5D0]">
                Future NOXES projects will have a place here as they take shape. No placeholders, just real work when it is ready.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

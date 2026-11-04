import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function GetStarted() {
  return (
    <section id="get-started" className="relative overflow-hidden border-t border-[#414548] bg-[#111315] py-24 md:py-32" aria-labelledby="get-started-heading">
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 top-0 h-80 w-80 rounded-full bg-[#E83708]/5 blur-[120px]" />
      <div className="relative mx-auto flex max-w-7xl flex-col gap-8 px-6 md:px-12 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="brand-eyebrow">NOXES for FiveM</p>
          <h2 id="get-started-heading" className="brand-display mt-5 text-4xl font-black uppercase tracking-tight text-[#F4F1E9] md:text-6xl">
            Shape systems. Tell stories. Move worlds.
          </h2>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-[#B6B0A4] md:text-lg">
            Inspect your server resources, review every change line-by-line, and author your digital world with total confidence.
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-5">
          <Link href="/sign-up" className="brand-button-primary">
            Create your workspace <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
          <Link href="/projects" className="text-sm font-medium text-[#B6B0A4] hover:text-[#F4F1E9] transition-colors">
            Explore projects
          </Link>
        </div>
      </div>
    </section>
  );
}

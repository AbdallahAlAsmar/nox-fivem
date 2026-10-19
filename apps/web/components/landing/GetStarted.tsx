import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function GetStarted() {
  return (
    <section id="get-started" className="relative overflow-hidden border-t border-white/[0.08] bg-[#0B1020] py-24 md:py-32" aria-labelledby="get-started-heading">
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 top-0 h-80 w-80 rounded-full bg-[#5B72F2]/10 blur-[100px]" />
      <div className="relative mx-auto flex max-w-7xl flex-col gap-8 px-6 md:px-12 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="brand-eyebrow">Start with your FiveM server</p>
          <h2 id="get-started-heading" className="brand-display mt-5 text-4xl font-semibold leading-tight text-[#F4F5FB] md:text-6xl">
            Build what comes next.
          </h2>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-[#AEB5D0] md:text-lg">
            Explore your resources, review suggested changes, and stay in control of what happens to your server.
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-5">
          <Link href="/sign-up" className="brand-button-primary">
            Create your workspace <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
          <Link href="/projects" className="brand-link text-sm">Explore projects</Link>
        </div>
      </div>
    </section>
  );
}

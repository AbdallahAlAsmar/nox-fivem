import Link from 'next/link';
import { ArrowDownRight, ArrowRight, Check, GitBranch, ScanSearch } from 'lucide-react';

const PROMISES = ['You stay in control', 'Made for real communities', 'Room to grow'];

export default function Hero() {
  return (
    <section id="home" className="brand-hero relative min-h-[760px] overflow-hidden pt-24 md:min-h-[820px]">
      <div aria-hidden="true" className="brand-grid pointer-events-none absolute inset-0" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-32 top-12 h-[34rem] w-[34rem] rounded-full bg-[#5B72F2]/10 blur-[110px]" />

      <div className="relative mx-auto grid min-h-[700px] max-w-7xl items-center gap-16 px-6 py-16 md:px-12 lg:grid-cols-[0.92fr_1.08fr] lg:gap-10 lg:py-20">
        <div className="relative z-10 max-w-2xl">
          <p className="brand-eyebrow brand-enter">An independent software studio</p>
          <h1 className="brand-display brand-enter brand-enter-delay-1 mt-7 text-[clamp(3.5rem,8vw,6.7rem)] font-semibold leading-[0.98] text-[#F4F5FB]">
            Build what
            <br />
            <span className="text-[#D8F36A]">comes next.</span>
          </h1>
          <p className="brand-enter brand-enter-delay-2 mt-7 max-w-xl text-lg leading-relaxed text-[#CCD2E8] md:text-xl">
            NOXES makes thoughtful software for people shaping their own digital worlds. First up: clearer, safer tools for FiveM server owners.
          </p>

          <div className="brand-enter brand-enter-delay-3 mt-9 flex flex-wrap gap-3">
            <a href="#projects" className="brand-button-primary">
              Explore NOXES <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </a>
            <a href="#about" className="brand-button-secondary">
              What we believe <ArrowDownRight aria-hidden="true" className="h-4 w-4" />
            </a>
          </div>

          <ul className="mt-12 flex flex-wrap gap-x-6 gap-y-3 text-sm text-[#AEB5D0]" aria-label="NOXES principles">
            {PROMISES.map((promise) => (
              <li key={promise} className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#5B72F2]/15 text-[#AAB6FF]">
                  <Check aria-hidden="true" className="h-3 w-3" strokeWidth={2.5} />
                </span>
                {promise}
              </li>
            ))}
          </ul>
        </div>

        <div className="brand-stage brand-enter brand-enter-delay-2 mx-auto w-full max-w-2xl lg:ml-auto">
          <div className="brand-stage-orbit" aria-hidden="true" />
          <img
            src="/brand/noxes-mark-motion.svg"
            alt=""
            aria-hidden="true"
            className="absolute -right-2 -top-12 z-10 h-16 w-16 opacity-90 md:-right-4 md:-top-10 md:h-20 md:w-20"
          />

          <div className="brand-product-window relative z-[1] overflow-hidden">
            <div className="brand-window-bar flex items-center justify-between gap-4 px-5 py-4 md:px-6">
              <div className="flex items-center gap-3">
                <img src="/brand/noxes-symbol.svg" alt="" aria-hidden="true" className="h-8 w-8" />
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#9098B7]">NOXES for FiveM</p>
                  <p className="mt-0.5 text-sm font-medium text-[#F4F5FB]">A calmer way to build</p>
                </div>
              </div>
              <span className="rounded-full border border-[#D8F36A]/25 bg-[#D8F36A]/10 px-3 py-1 font-mono text-[9px] uppercase tracking-[0.13em] text-[#D8F36A]">Review first</span>
            </div>

            <div className="grid min-h-[330px] sm:grid-cols-[145px_1fr]">
              <aside className="hidden border-r border-white/[0.08] p-4 sm:block" aria-label="Example project navigation">
                <p className="mb-4 px-2 font-mono text-[9px] uppercase tracking-[0.15em] text-[#747D9F]">Your workspace</p>
                <div className="flex items-center gap-2 rounded-lg bg-[#5B72F2]/15 px-2.5 py-2 text-xs text-[#E3E7FF]">
                  <ScanSearch aria-hidden="true" className="h-3.5 w-3.5 text-[#9BAAFF]" />
                  Resources
                </div>
                <div className="mt-2 flex items-center gap-2 px-2.5 py-2 text-xs text-[#828BA8]">
                  <GitBranch aria-hidden="true" className="h-3.5 w-3.5" />
                  Change history
                </div>
              </aside>

              <div className="min-w-0 p-4 md:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#8D96B7]">Example workflow</p>
                    <h2 className="mt-1 text-base font-medium text-[#F4F5FB]">Review a proposed change</h2>
                  </div>
                  <span className="rounded-md border border-white/[0.1] px-2 py-1 font-mono text-[9px] text-[#AEB5D0]">1 file</span>
                </div>

                <div className="mt-5 overflow-hidden rounded-xl border border-white/[0.09] bg-[#0B1020]">
                  <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-2.5">
                    <span className="font-mono text-[10px] text-[#969FBE]">resources / shop / config.lua</span>
                    <span className="font-mono text-[9px] text-[#7D87A8]">+2&nbsp; −1</span>
                  </div>
                  <div className="overflow-x-auto px-4 py-4 font-mono text-[10px] leading-[2] sm:text-[11px]">
                    <p className="text-[#707A9A]">&nbsp; local weekendBonus = false</p>
                    <p className="brand-code-remove">− local discount = 0</p>
                    <p className="brand-code-add">+ local discount = weekendBonus and 0.2 or 0</p>
                    <p className="brand-code-add">+ -- staged for your review</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-3 rounded-xl border border-[#5B72F2]/25 bg-[#5B72F2]/[0.08] p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
                  <div>
                    <p className="text-xs font-medium text-[#E6E9FA]">Nothing changes until you approve.</p>
                    <p className="mt-1 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.09em] text-[#9AA4C5]">
                      <GitBranch aria-hidden="true" className="h-3 w-3" /> Git checkpoint before apply
                    </p>
                  </div>
                  <span className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#D8F36A] px-4 py-2 text-xs font-semibold text-[#151A27]">Approve change</span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-white/[0.08] px-5 py-3 font-mono text-[9px] uppercase tracking-[0.13em] text-[#747D9F] md:px-6">
              <span>Human in control</span>
              <span>Example interface</span>
            </div>
          </div>

          <div className="absolute -bottom-6 -left-5 hidden items-center gap-3 rounded-2xl border border-white/[0.12] bg-[#1A2140]/90 p-3 shadow-xl backdrop-blur md:flex">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#D8F36A]/10 text-[#D8F36A]">
              <GitBranch aria-hidden="true" className="h-4 w-4" />
            </span>
            <span>
              <span className="block text-xs font-medium text-white">Reviewable by design</span>
              <span className="mt-0.5 block font-mono text-[9px] uppercase tracking-wider text-[#929BB9]">Your files · your call</span>
            </span>
          </div>
        </div>
      </div>

      <div className="brand-section-rule absolute bottom-0 left-0 right-0" aria-hidden="true" />
    </section>
  );
}

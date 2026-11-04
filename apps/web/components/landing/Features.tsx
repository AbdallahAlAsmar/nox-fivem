import { FileSearch2, GitBranch, ScanLine, ShieldCheck } from 'lucide-react';
import ScrollReveal from './ScrollReveal';

const FEATURES = [
  {
    icon: ShieldCheck,
    index: '01',
    title: 'You stay in control',
    body: 'The assistant proposes a change for you to review. Your files are only updated after you approve it.',
  },
  {
    icon: GitBranch,
    index: '02',
    title: 'A way back is built in',
    body: 'A Git checkpoint is created before an approved change is applied, so you can trace the work and roll it back.',
  },
  {
    icon: FileSearch2,
    index: '03',
    title: 'It understands your resources',
    body: 'NOXES scans server resources and reads Lua manifests to help map files and dependencies across a project.',
  },
  {
    icon: ScanLine,
    index: '04',
    title: 'The details stay visible',
    body: 'Review proposed file changes, see their status, and keep the decision in your hands from request to apply.',
  },
];

export default function Features() {
  return (
    <section className="relative overflow-hidden bg-[#111315] py-28 md:py-40" aria-labelledby="principles-heading">
      <div aria-hidden="true" className="brand-section-scan absolute inset-x-0 top-0 h-40" />
      <div className="mx-auto max-w-7xl px-6 md:px-12">
        <ScrollReveal className="max-w-3xl">
          <p className="brand-eyebrow">Operating Principles</p>
          <h2 id="principles-heading" className="brand-display mt-5 text-5xl font-black uppercase tracking-tight text-[#F4F1E9] md:text-7xl">
            Build with a<br /><span className="text-[#E83708]">clear signal.</span>
          </h2>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-[#B6B0A4] md:text-lg">
            Complexity moves. Clarity is authored. NOXES turns the invisible work of running a world into a sequence you can see, question, and own.
          </p>
        </ScrollReveal>

        <div className="mt-16 grid gap-px overflow-hidden border border-[#414548] bg-[#414548] sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, index, title, body }, featureIndex) => (
            <ScrollReveal key={index} delay={featureIndex * 90} className="h-full">
              <article className="feature-panel group relative flex h-full min-h-72 flex-col bg-[#181A1D] p-6 transition-colors duration-300 hover:bg-[#202326] md:p-7">
                <div className="flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-sm bg-[#E83708]/15 text-[#E83708] transition-transform duration-300 group-hover:scale-110">
                    <Icon aria-hidden="true" className="h-5 w-5" strokeWidth={1.8} />
                  </span>
                  <span className="font-mono text-[11px] tracking-[0.16em] text-[#68665F]">{index}</span>
                </div>
                <h3 className="mt-auto pt-12 text-base font-semibold tracking-tight text-[#F4F1E9]">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-[#B6B0A4]">{body}</p>
                <span aria-hidden="true" className="feature-line mt-6 block h-px w-8 bg-[#E83708] transition-all duration-300 group-hover:w-full" />
              </article>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

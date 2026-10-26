import { FileSearch2, GitBranch, ScanLine, ShieldCheck } from 'lucide-react';

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
    <section className="bg-[#111315] py-24 md:py-32" aria-labelledby="principles-heading">
      <div className="mx-auto max-w-7xl px-6 md:px-12">
        <div className="max-w-2xl">
          <p className="brand-eyebrow">Operating Principles</p>
          <h2 id="principles-heading" className="brand-display mt-5 text-4xl font-black uppercase tracking-tight text-[#F4F1E9] md:text-6xl">
            Built for creators. Not consumers.
          </h2>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-[#B6B0A4] md:text-lg">
            Complexity moves. Clarity is authored. We engineer automation that makes your work transparent while keeping you firmly in command.
          </p>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, index, title, body }) => (
            <article key={index} className="group min-h-64 rounded-sm border border-[#414548] bg-[#202326] p-6 transition-all duration-200 hover:border-[#68665F] hover:-translate-y-1 md:p-7">
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-sm bg-[#E83708]/15 text-[#E83708]">
                  <Icon aria-hidden="true" className="h-5 w-5" strokeWidth={1.8} />
                </span>
                <span className="font-mono text-[11px] tracking-[0.16em] text-[#68665F]">{index}</span>
              </div>
              <h3 className="mt-8 text-base font-semibold tracking-tight text-[#F4F1E9]">{title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-[#B6B0A4]">{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

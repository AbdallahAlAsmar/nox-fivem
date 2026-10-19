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
    <section className="bg-[#101426] py-24 md:py-32" aria-labelledby="principles-heading">
      <div className="mx-auto max-w-7xl px-6 md:px-12">
        <div className="max-w-2xl">
          <p className="brand-eyebrow">NOXES for FiveM</p>
          <h2 id="principles-heading" className="brand-display mt-5 text-4xl font-semibold leading-tight text-[#F4F5FB] md:text-6xl">
            Built to make the hard parts feel manageable.
          </h2>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-[#AEB5D0] md:text-lg">
            We believe useful automation should make your work clearer, while keeping you firmly in charge.
          </p>
        </div>

        <div className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, index, title, body }) => (
            <article key={index} className="brand-surface group min-h-64 p-6 transition-transform duration-200 hover:-translate-y-1 md:p-7">
              <div className="flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#5B72F2]/15 text-[#AAB6FF]">
                  <Icon aria-hidden="true" className="h-5 w-5" strokeWidth={1.8} />
                </span>
                <span className="font-mono text-[10px] tracking-[0.12em] text-[#8D96B7]">{index}</span>
              </div>
              <h3 className="mt-9 text-lg font-semibold tracking-tight text-[#F4F5FB]">{title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-[#AEB5D0]">{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

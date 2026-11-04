import { Compass, HeartHandshake, Lightbulb, UserRoundCheck } from 'lucide-react';
import ScrollReveal from './ScrollReveal';

const VALUES = [
  { icon: UserRoundCheck, title: 'Human authorship', body: 'We build tools that augment creator intuition without ever usurping control. You inspect and decide.' },
  { icon: Lightbulb, title: 'Deliberate clarity', body: 'Complex runtime environments made transparent. Every proposed change is visible before it touches disk.' },
  { icon: HeartHandshake, title: 'Built for creators', body: 'Crafted specifically for the builders who shape and care for their servers every single day.' },
  { icon: Compass, title: 'Worlds in motion', body: 'Resilient, high-fidelity tooling designed to move with your ideas as your world scales.' },
];

export default function AboutNoxesMotion() {
  return (
    <section id="about" className="relative overflow-hidden border-t border-[#414548] bg-[#111315] py-28 md:py-40" aria-labelledby="about-heading">
      <div className="mx-auto grid max-w-7xl gap-16 px-6 md:px-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <ScrollReveal className="lg:sticky lg:top-28 lg:self-start">
          <p className="brand-eyebrow">Studio Belief</p>
          <h2 id="about-heading" className="brand-display mt-5 text-5xl font-black uppercase tracking-tight text-[#F4F1E9] md:text-7xl">
            Make the<br /><span className="text-[#E83708]">complex</span><br />legible.
          </h2>
          <p className="mt-6 max-w-lg text-base leading-relaxed text-[#B6B0A4] md:text-lg">
            We create practical software for ambitious builders: tools that eliminate friction, respect the person at the helm, and honor the physical craft of making a world feel alive.
          </p>
          <div className="mt-10 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.16em] text-[#68665F]"><span className="h-px w-12 bg-[#E83708]" /> NOXES / 2026</div>
        </ScrollReveal>

        <div className="grid gap-px border border-[#414548] bg-[#414548] sm:grid-cols-2">
          {VALUES.map(({ icon: Icon, title, body }, index) => (
            <ScrollReveal key={title} delay={index * 100} className="h-full">
              <article className="group flex h-full min-h-64 flex-col bg-[#202326] p-6 transition-colors duration-300 hover:bg-[#181A1D] md:p-8">
                <div className="flex items-center justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-sm bg-[#E83708]/15 text-[#E83708]"><Icon aria-hidden="true" className="h-5 w-5" strokeWidth={1.8} /></span><span className="font-mono text-[10px] tracking-[0.16em] text-[#68665F]">0{index + 1}</span></div>
                <h3 className="mt-auto pt-12 text-base font-semibold text-[#F4F1E9]">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#B6B0A4]">{body}</p>
              </article>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

import { Compass, HeartHandshake, Lightbulb, UserRoundCheck } from 'lucide-react';

const VALUES = [
  { icon: UserRoundCheck, title: 'Human Authorship', body: 'We build tools that augment creator intuition without ever usurping control. You inspect and decide.' },
  { icon: Lightbulb, title: 'Deliberate Clarity', body: 'Complex runtime environments made transparent. Every proposed change is visible before it touches disk.' },
  { icon: HeartHandshake, title: 'Built for Creators', body: 'Crafted specifically for the builders who shape and care for their servers every single day.' },
  { icon: Compass, title: 'Worlds in Motion', body: 'Resilient, high-fidelity tooling designed to move with your ideas as your world scales.' },
];

export default function AboutNoxes() {
  return (
    <section id="about" className="border-t border-[#414548] bg-[#111315] py-24 md:py-32" aria-labelledby="about-heading">
      <div className="mx-auto grid max-w-7xl gap-14 px-6 md:px-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <div>
          <p className="brand-eyebrow">Studio Belief</p>
          <h2 id="about-heading" className="brand-display mt-5 text-4xl font-black uppercase tracking-tight text-[#F4F1E9] md:text-6xl">
            A software studio for people who shape digital worlds.
          </h2>
          <p className="mt-6 max-w-lg text-base leading-relaxed text-[#B6B0A4] md:text-lg">
            Complexity moves. Clarity is authored. We create practical software for ambitious builders: tools that eliminate friction, respect the person at the helm, and honor physical craft.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {VALUES.map(({ icon: Icon, title, body }, index) => (
            <article key={title} className="rounded-sm border border-[#414548] bg-[#202326] p-6 md:p-7">
              <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-[#E83708]/15 text-[#E83708]">
                <Icon aria-hidden="true" className="h-5 w-5" strokeWidth={1.8} />
              </div>
              <p className="mt-6 font-mono text-[10px] tracking-[0.16em] text-[#68665F]">0{index + 1}</p>
              <h3 className="mt-2 text-base font-semibold text-[#F4F1E9]">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#B6B0A4]">{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

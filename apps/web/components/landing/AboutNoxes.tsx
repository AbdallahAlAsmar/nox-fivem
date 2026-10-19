import { Compass, HeartHandshake, Lightbulb, UserRoundCheck } from 'lucide-react';

const VALUES = [
  { icon: UserRoundCheck, title: 'People stay in charge', body: 'We build tools that help people do more without taking decisions away from them.' },
  { icon: Lightbulb, title: 'Make the complex clear', body: 'Good software should turn a tangle of work into a next step you can understand.' },
  { icon: HeartHandshake, title: 'Built for communities', body: 'The best digital worlds are shaped by the people who care for them every day.' },
  { icon: Compass, title: 'Keep moving forward', body: 'NOXES is an umbrella for curious, useful projects that grow with the people using them.' },
];

export default function AboutNoxes() {
  return (
    <section id="about" className="bg-[#101426] py-24 md:py-32" aria-labelledby="about-heading">
      <div className="mx-auto grid max-w-7xl gap-14 px-6 md:px-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <div>
          <p className="brand-eyebrow">The idea behind NOXES</p>
          <h2 id="about-heading" className="brand-display mt-5 text-4xl font-semibold leading-tight text-[#F4F5FB] md:text-6xl">
            A studio for people who make their own worlds.
          </h2>
          <p className="mt-6 max-w-lg text-base leading-relaxed text-[#AEB5D0] md:text-lg">
            We create practical software for ambitious communities: tools that clear the busywork, respect the person at the controls, and leave space for better ideas.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {VALUES.map(({ icon: Icon, title, body }, index) => (
            <article key={title} className="rounded-2xl border border-white/[0.09] bg-white/[0.025] p-6 md:p-7">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#5B72F2]/15 text-[#AAB6FF]">
                <Icon aria-hidden="true" className="h-5 w-5" strokeWidth={1.8} />
              </div>
              <p className="mt-7 font-mono text-[10px] tracking-[0.16em] text-[#8D96B7]">0{index + 1}</p>
              <h3 className="mt-2 text-lg font-semibold text-[#F4F5FB]">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#AEB5D0]">{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

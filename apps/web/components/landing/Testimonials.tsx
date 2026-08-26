'use client';

import { motion } from 'framer-motion';

// PLACEHOLDER TESTIMONIALS — replace with real quotes before launch.
const QUOTES = [
  {
    quote: '[Your testimonial here — what did NOXES save you from doing manually?]',
    author: 'SERVER OWNER',
    handle: '@you-here',
  },
  {
    quote: '[Another slot — a specific result works best: "rebalanced my economy in one evening"]',
    author: 'COMMUNITY LEAD',
    handle: '@another-slot',
  },
  {
    quote: '[Third slot — trust angle: "every change is checkpointed, so I let it work"]',
    author: 'DEVELOPER',
    handle: '@third-slot',
  },
];

export default function Testimonials() {
  return (
    <section className="bg-[#0F0F14] py-24 md:py-32">
      <div className="max-w-6xl mx-auto px-6 md:px-12">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="font-mono text-xs uppercase tracking-[0.25em] text-white/40 mb-4"
        >
          Operators on NOXES
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="font-mono font-medium text-white text-3xl md:text-5xl tracking-tight mb-16"
        >
          Run by people who
          <br />
          read the diffs.
        </motion.h2>

        <div className="grid md:grid-cols-3 gap-6">
          {QUOTES.map((q, i) => (
            <motion.figure
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.55, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="bg-[#16161E] border border-[rgba(255,255,255,0.08)] p-8 flex flex-col"
            >
              <blockquote className="font-sans text-sm text-white/70 leading-relaxed flex-1">
                “{q.quote}”
              </blockquote>
              <figcaption className="mt-8 pt-6 border-t border-[rgba(255,255,255,0.08)]">
                <div className="font-mono text-xs uppercase tracking-wider text-white">{q.author}</div>
                <div className="font-mono text-[10px] text-white/30 mt-0.5">{q.handle}</div>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}

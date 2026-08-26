'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { motion } from 'framer-motion';

const WireframeAegis = dynamic(() => import('./WireframeAegis'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/20">loading mark…</div>
    </div>
  ),
});

export default function Hero() {
  return (
    <section className="relative min-h-[92vh] flex items-center overflow-hidden bg-[#0F0F14]">
      {/* Structural grid — barely-there column lines, no glow */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #ffffff 1px, transparent 1px)',
          backgroundSize: 'calc(100% / 6) 100%',
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 grid lg:grid-cols-2 gap-16 items-center w-full py-24">
        {/* Copy */}
        <div>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="font-mono text-xs uppercase tracking-[0.25em] text-white/40 mb-6"
          >
            AI operations for FiveM servers
          </motion.p>

          <h1 className="font-mono font-medium text-white leading-[1.05] tracking-[0.02em] text-5xl md:text-7xl">
            {['YOUR SERVER.', 'YOUR RULES.'].map((line, i) => (
              <motion.span
                key={line}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 + i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                className="block"
              >
                {line}
              </motion.span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="font-sans text-base md:text-lg text-white/60 mt-6 max-w-md leading-relaxed"
          >
            NOXES reads your server files, proposes changes as reviewable diffs,
            and applies them only after you approve — every edit checkpointed in
            git, every action reversible.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-wrap gap-4 mt-10"
          >
            <Link href="/sign-up" className="noxes-btn-primary inline-block text-center">
              Get started
            </Link>
            <a href="#demo" className="noxes-btn-ghost inline-block text-center">
              See it work
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="flex items-center gap-3 mt-10 font-mono text-[11px] uppercase tracking-wider text-white/30"
          >
            <span className="w-1.5 h-1.5 bg-[#3DFFA2]" style={{ animation: 'cursor-blink 1.06s steps(1) infinite' }} />
            approval-gated · git-checkpointed · reversible
          </motion.div>
        </div>

        {/* Mark */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="hidden lg:block h-[520px]"
        >
          <WireframeAegis />
        </motion.div>
      </div>

      {/* Scroll cue */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 font-mono text-[10px] uppercase tracking-[0.3em] text-white/25"
      >
        scroll ↓
      </motion.div>
    </section>
  );
}

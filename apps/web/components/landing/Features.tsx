'use client';

import { motion } from 'framer-motion';
import { ShieldCheck, GitBranch, Users, PackageSearch } from 'lucide-react';

const FEATURES = [
  {
    icon: ShieldCheck,
    title: 'APPROVAL-GATED EDITS',
    body: 'The AI never writes directly. Every change arrives as a reviewable diff — you approve, it applies. No approval, no write.',
  },
  {
    icon: GitBranch,
    title: 'GIT CHECKPOINTS',
    body: 'Before any file is touched, a checkpoint commit is created. Roll back to any point in one click. Your history is your safety net.',
  },
  {
    icon: Users,
    title: 'PLAYER MANAGEMENT',
    body: 'Live player lists with ban and unban flows. Persistent records, honest errors when the server agent is offline.',
  },
  {
    icon: PackageSearch,
    title: 'RESOURCE SCANNING',
    body: 'Full resource indexing with Lua manifest parsing — dependencies, provides, and file maps across every [category] folder.',
  },
];

export default function Features() {
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
          What it does
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="font-mono font-medium text-white text-3xl md:text-5xl tracking-tight mb-16"
        >
          Built like infrastructure.
        </motion.h2>

        <div className="grid md:grid-cols-2 gap-px bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.08)]">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.55, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="group bg-[#16161E] p-8 hover:bg-[#1a1a24] transition-colors duration-100"
            >
              <f.icon className="w-5 h-5 text-white/50 group-hover:text-[#3DFFA2] transition-colors duration-100 mb-6" strokeWidth={1.5} />
              <h3 className="font-mono text-sm uppercase tracking-[0.15em] text-white mb-3">
                {f.title}
              </h3>
              <p className="font-sans text-sm text-white/50 leading-relaxed">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

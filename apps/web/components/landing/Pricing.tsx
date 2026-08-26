'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

// PLACEHOLDER PRICING — replace with real numbers before launch.
const TIERS = [
  {
    name: 'STARTER',
    price: '$0',
    period: '/mo',
    blurb: 'For trying NOXES on a single server.',
    features: ['1 server', '50 AI actions / month', 'Approval-gated edits', 'Git checkpoints'],
    cta: 'Start free',
    featured: false,
  },
  {
    name: 'OPERATOR',
    price: '$19',
    period: '/mo',
    blurb: 'For serious server owners running daily.',
    features: [
      '3 servers',
      '1,000 AI actions / month',
      'Player management',
      'Resource scanning',
      'Priority support',
    ],
    cta: 'Choose Operator',
    featured: true,
  },
  {
    name: 'NETWORK',
    price: '$49',
    period: '/mo',
    blurb: 'For communities running multiple servers.',
    features: [
      '10 servers',
      '5,000 AI actions / month',
      'Everything in Operator',
      'Audit log exports',
      'Early access features',
    ],
    cta: 'Choose Network',
    featured: false,
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="bg-[#0A0A0F] py-24 md:py-32 border-y border-[rgba(255,255,255,0.08)]">
      <div className="max-w-6xl mx-auto px-6 md:px-12">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="font-mono text-xs uppercase tracking-[0.25em] text-white/40 mb-4"
        >
          Pricing
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="font-mono font-medium text-white text-3xl md:text-5xl tracking-tight mb-16"
        >
          Pick your seat.
        </motion.h2>

        <div className="grid md:grid-cols-3 gap-6">
          {TIERS.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.55, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className={`p-8 flex flex-col ${t.featured ? 'bg-[#16161E] border border-[#3DFFA2]/40' : 'bg-[#16161E] border border-[rgba(255,255,255,0.08)]'}`}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-mono text-sm uppercase tracking-[0.2em] text-white">{t.name}</h3>
                {t.featured && (
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#3DFFA2] border border-[#3DFFA2]/40 px-2 py-0.5">
                    popular
                  </span>
                )}
              </div>

              <div className="mb-2">
                <span className="font-mono text-5xl font-medium text-white">{t.price}</span>
                <span className="font-mono text-sm text-white/40 ml-1">{t.period}</span>
              </div>
              <p className="font-sans text-xs text-white/40 mb-8">{t.blurb}</p>

              <ul className="space-y-3 mb-10 flex-1">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 font-sans text-sm text-white/60">
                    <span className="w-1 h-1 bg-[#3DFFA2] mt-2 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href="/sign-up"
                className={t.featured ? 'noxes-btn-primary w-full text-center block' : 'noxes-btn-ghost w-full text-center block'}
              >
                {t.cta}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

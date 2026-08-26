'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -48, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-200 ${
        scrolled ? 'bg-[#0F0F14]/95 border-b border-[rgba(255,255,255,0.08)]' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <img src="/noxes-logo.svg" alt="NOXES" className="h-7" />
        </Link>

        <nav className="hidden md:flex items-center gap-8 font-mono text-xs uppercase tracking-[0.15em] text-white/50">
          <a href="#demo" className="hover:text-white transition-colors">Demo</a>
          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
        </nav>

        <Link
          href="/sign-up"
          className="font-mono text-xs uppercase tracking-[0.15em] bg-white text-[#0F0F14] px-4 py-2 hover:opacity-85 transition-opacity"
        >
          Get started
        </Link>
      </div>
    </motion.header>
  );
}

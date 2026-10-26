'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowUpRight, Menu, X } from 'lucide-react';

const LINKS = [
  { href: '/projects', label: 'Projects' },
  { href: '/#demo', label: 'How it works' },
  { href: '/#about', label: 'Studio' },
];

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return (
    <header className={`brand-nav fixed inset-x-0 top-0 z-50 border-b ${scrolled ? 'is-scrolled' : 'border-transparent'}`}>
      <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between px-6 md:px-12">
        <Link href="/" className="inline-flex items-center gap-3.5 focus-visible:outline-none" aria-label="NOXES home">
          <img src="/brand/noxes-symbol.svg" alt="" aria-hidden="true" className="h-7 w-7" />
          <span className="font-display text-2xl font-black tracking-wider text-[#F4F1E9] uppercase">NOXES</span>
          <span className="hidden sm:inline-block font-mono text-[10px] tracking-[0.2em] text-[#68665F] uppercase border-l border-[#414548] pl-3 py-0.5">
            Worlds in Motion
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Main navigation">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm font-medium text-[#B6B0A4] hover:text-[#F4F1E9] transition-colors">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-5 md:flex">
          <Link href="/sign-in" className="text-sm font-medium text-[#B6B0A4] hover:text-[#F4F1E9] transition-colors">
            Sign in
          </Link>
          <Link href="/sign-up" className="brand-button-primary">
            Get started <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-sm border border-[#414548] bg-[#202326] text-[#F4F1E9] md:hidden"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X aria-hidden="true" className="h-5 w-5" /> : <Menu aria-hidden="true" className="h-5 w-5" />}
        </button>
      </div>

      {menuOpen && (
        <nav id="mobile-navigation" className="border-t border-[#414548] bg-[#111315]/95 px-6 py-5 shadow-2xl backdrop-blur-xl md:hidden" aria-label="Mobile navigation">
          <div className="mx-auto flex max-w-7xl flex-col gap-2">
            {LINKS.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className="rounded-sm px-3 py-2.5 text-sm font-medium text-[#F4F1E9] hover:bg-[#202326]">
                {link.label}
              </Link>
            ))}
            <div className="mt-4 flex flex-col gap-3 border-t border-[#414548] pt-4">
              <Link href="/sign-in" onClick={() => setMenuOpen(false)} className="brand-button-secondary w-full">
                Sign in
              </Link>
              <Link href="/sign-up" onClick={() => setMenuOpen(false)} className="brand-button-primary w-full">
                Get started
              </Link>
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}

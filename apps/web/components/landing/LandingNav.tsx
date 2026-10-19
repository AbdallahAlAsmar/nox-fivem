'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowUpRight, Menu, X } from 'lucide-react';

const LINKS = [
  { href: '/projects', label: 'Projects' },
  { href: '/#demo', label: 'How it works' },
  { href: '/#about', label: 'About NOXES' },
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
    <header className={`brand-nav fixed inset-x-0 top-0 z-50 border-b ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between px-5 md:px-12">
        <Link href="/" className="inline-flex items-center rounded-md" aria-label="NOXES home">
          <img src="/brand/noxes-logo.svg" alt="NOXES" className="h-8 w-auto" />
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Main navigation">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="brand-link text-sm">{link.label}</Link>
          ))}
        </nav>

        <div className="hidden items-center gap-5 md:flex">
          <Link href="/sign-in" className="brand-link text-sm">Sign in</Link>
          <Link href="/sign-up" className="brand-button-primary min-h-10 px-4 py-2 text-sm">
            Get started <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white md:hidden"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X aria-hidden="true" className="h-5 w-5" /> : <Menu aria-hidden="true" className="h-5 w-5" />}
        </button>
      </div>

      {menuOpen && (
        <nav id="mobile-navigation" className="border-t border-white/10 bg-[#101426]/[0.98] px-5 py-4 shadow-2xl backdrop-blur-xl md:hidden" aria-label="Mobile navigation">
          <div className="mx-auto flex max-w-7xl flex-col gap-1">
            {LINKS.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-3 text-sm text-[#D8DCEF] hover:bg-white/[0.06]">
                {link.label}
              </Link>
            ))}
            <div className="mt-2 flex gap-3 border-t border-white/10 pt-4">
              <Link href="/sign-in" onClick={() => setMenuOpen(false)} className="brand-button-secondary flex-1">Sign in</Link>
              <Link href="/sign-up" onClick={() => setMenuOpen(false)} className="brand-button-primary flex-1">Get started</Link>
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}

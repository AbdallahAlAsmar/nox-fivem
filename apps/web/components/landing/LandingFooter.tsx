import Link from 'next/link';

export default function LandingFooter() {
  return (
    <footer className="bg-[#0A0A0F] border-t border-[rgba(255,255,255,0.08)]">
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2.5">
          <img src="/noxes-logo.svg" alt="NOXES" className="h-6 opacity-80" />
        </div>

        <nav className="flex items-center gap-8 font-mono text-[11px] uppercase tracking-[0.15em] text-white/40">
          <a href="#demo" className="hover:text-white transition-colors">Demo</a>
          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
        </nav>

        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/25">
          NOXES<span className="text-[#3DFFA2]">.</span> — approval-gated AI ops
        </p>
      </div>
    </footer>
  );
}

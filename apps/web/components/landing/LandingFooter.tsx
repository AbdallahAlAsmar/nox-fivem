import Link from 'next/link';

const YEAR = new Date().getFullYear();

export default function LandingFooter() {
  return (
    <footer className="border-t border-[#414548] bg-[#111315]">
      <div className="mx-auto grid max-w-7xl gap-9 px-6 py-11 md:grid-cols-[1fr_auto_1fr] md:items-center md:px-12">
        <Link href="/" aria-label="NOXES home" className="inline-flex w-fit rounded-sm focus-visible:outline-none">
          <img
            src="/brand/14_Small_NOXES_Worlds_in_Motion_Lockup.png"
            alt="NOXES — Worlds in Motion"
            className="h-10 w-auto object-contain"
          />
        </Link>
        <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
          <Link href="/projects" className="text-sm font-medium text-[#B6B0A4] hover:text-[#F4F1E9] transition-colors">Projects</Link>
          <Link href="/#about" className="text-sm font-medium text-[#B6B0A4] hover:text-[#F4F1E9] transition-colors">About</Link>
          <Link href="/sign-in" className="text-sm font-medium text-[#B6B0A4] hover:text-[#F4F1E9] transition-colors">Sign in</Link>
          <Link href="/sign-up" className="text-sm font-medium text-[#B6B0A4] hover:text-[#F4F1E9] transition-colors">Get started</Link>
        </nav>
        <p className="font-mono text-xs text-[#68665F] md:text-right">© {YEAR} NOXES · Worlds in Motion.</p>
      </div>
    </footer>
  );
}

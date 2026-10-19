import Link from 'next/link';

const YEAR = new Date().getFullYear();

export default function LandingFooter() {
  return (
    <footer className="bg-[#101426]">
      <div className="mx-auto grid max-w-7xl gap-9 px-6 py-11 md:grid-cols-[1fr_auto_1fr] md:items-center md:px-12">
        <Link href="/" aria-label="NOXES home" className="inline-flex w-fit rounded-md">
          <img src="/brand/noxes-logo.svg" alt="NOXES" className="h-8 w-auto" />
        </Link>
        <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
          <Link href="/projects" className="brand-link">Projects</Link>
          <Link href="/#about" className="brand-link">About</Link>
          <Link href="/sign-in" className="brand-link">Sign in</Link>
          <Link href="/sign-up" className="brand-link">Get started</Link>
        </nav>
        <p className="text-sm text-[#8D96B7] md:text-right">© {YEAR} NOXES · Build what comes next.</p>
      </div>
    </footer>
  );
}

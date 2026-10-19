import { Inter } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { ThemeProvider } from '@/context/ThemeContext';
import { AgentStatusProvider } from '@/contexts/AgentStatusContext';
import { NotificationProvider } from '@/components/notifications';
import { Toaster } from '@/components/ui/sonner';
import { KeyboardShortcuts } from '@/components/layout/KeyboardShortcuts';
import './globals.css';

const hasValidClerkConfig =
  /^pk_(test|live)_[\w+/=-]+$/.test(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '') &&
  /^sk_(test|live)_[\w+/=-]+$/.test(process.env.CLERK_SECRET_KEY || '');

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
  preload: true,
});

export const metadata = {
  title: {
    default: 'NOXES — Build what comes next.',
    template: '%s | NOXES',
  },
  description:
    'NOXES creates thoughtful software for people shaping their own digital worlds, starting with safer AI-assisted development for FiveM servers.',
  openGraph: {
    type: 'website',
    siteName: 'NOXES',
    title: 'NOXES — Build what comes next.',
    description: 'Thoughtful software for people shaping their own digital worlds.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NOXES — Build what comes next.',
    description: 'Thoughtful software for people shaping their own digital worlds.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className={`${inter.variable} min-h-screen bg-[#101426] text-white`}>
        {!hasValidClerkConfig ? (
          <main className="min-h-screen bg-[#101426] flex items-center justify-center p-6">
            <section className="max-w-xl border border-white/10 bg-[#20294A] p-8 md:p-10">
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-[#5B72F2] mb-5">NOXES setup required</p>
              <h1 className="font-mono text-2xl md:text-3xl text-white mb-4">Authentication is not configured</h1>
              <p className="font-sans text-sm leading-relaxed text-white/60 mb-6">
                Add valid Clerk keys to the web app environment before using NOXES. Both values are required; the site is unavailable until authentication is configured.
              </p>
              <ul className="font-mono text-xs text-white/70 space-y-2">
                <li>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY — pk_test_… or pk_live_…</li>
                <li>CLERK_SECRET_KEY — sk_test_… or sk_live_…</li>
              </ul>
            </section>
          </main>
        ) : (
          <ClerkProvider afterSignUpUrl="/dashboard" afterSignInUrl="/dashboard">
            <ThemeProvider>
              <AgentStatusProvider>
                <NotificationProvider>
                  {children}
                  <KeyboardShortcuts />
                  <Toaster
                    position="bottom-right"
                    toastOptions={{
                      style: {
                        background: '#20294A',
                        border: '1px solid rgba(91,114,242,0.3)',
                        color: '#FFFFFF',
                        borderRadius: '0px',
                        fontFamily: "'JetBrains Mono', monospace",
                      },
                    }}
                  />
                </NotificationProvider>
              </AgentStatusProvider>
            </ThemeProvider>
          </ClerkProvider>
        )}
      </body>
    </html>
  );
}

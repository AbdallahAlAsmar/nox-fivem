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
    default: 'NOXES.',
    template: '%s | NOXES.',
  },
  description:
    'NOXES. — AI-powered server development assistant that safely reads, modifies, and manages your FiveM server files.',
  openGraph: {
    type: 'website',
    siteName: 'NOXES.',
    description: 'AI-powered FiveM server development assistant.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body className={`${inter.variable} font-sans min-h-screen bg-[#0a0a0f] text-white`}>
        {!hasValidClerkConfig ? (
          <main className="min-h-screen bg-[#0F0F14] flex items-center justify-center p-6">
            <section className="max-w-xl border border-white/10 bg-[#16161E] p-8 md:p-10">
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-[#3DFFA2] mb-5">NOXES setup required</p>
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
                        background: '#16161E',
                        border: '1px solid rgba(94,106,210,0.3)',
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

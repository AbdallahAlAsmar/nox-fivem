import { Inter, Barlow_Condensed, JetBrains_Mono } from 'next/font/google';
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

const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['600', '700', '800', '900'],
  display: 'swap',
  variable: '--font-display',
  preload: true,
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
  preload: true,
});

export const metadata = {
  title: {
    default: 'NOXES — Worlds in Motion.',
    template: '%s | NOXES',
  },
  description:
    'Complexity moves. Clarity is authored. Built for creators. Not consumers. NOXES makes tools for people who shape digital worlds, starting with NOXES for FiveM.',
  openGraph: {
    type: 'website',
    siteName: 'NOXES',
    title: 'NOXES — Worlds in Motion.',
    description: 'Complexity moves. Clarity is authored. Built for creators. Not consumers.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NOXES — Worlds in Motion.',
    description: 'Complexity moves. Clarity is authored. Built for creators. Not consumers.',
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
      </head>
      <body className={`${inter.variable} ${barlowCondensed.variable} ${jetbrainsMono.variable} min-h-screen bg-[#111315] text-[#F4F1E9] font-sans antialiased`}>
        {!hasValidClerkConfig ? (
          <main className="min-h-screen bg-[#111315] flex items-center justify-center p-6">
            <section className="max-w-xl border border-[#414548] bg-[#202326] p-8 md:p-10 rounded-sm">
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-[#E83708] mb-5">NOXES setup required</p>
              <h1 className="font-display uppercase text-2xl md:text-3xl text-[#F4F1E9] mb-4 tracking-tight">Authentication is not configured</h1>
              <p className="font-sans text-sm leading-relaxed text-[#F4F1E9]/70 mb-6">
                Add valid Clerk keys to the web app environment before using NOXES. Both values are required; the site is unavailable until authentication is configured.
              </p>
              <ul className="font-mono text-xs text-[#F4F1E9]/70 space-y-2">
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
                        background: '#202326',
                        border: '1px solid #414548',
                        color: '#F4F1E9',
                        borderRadius: '4px',
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

import { Inter } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { ThemeProvider } from '@/context/ThemeContext';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
  preload: true,
});

export const metadata = {
  title: {
    default: 'NOX // FiveM',
    template: '%s | NOX // FiveM',
  },
  description:
    'NOX // FiveM — AI-powered server development assistant that safely reads, modifies, and manages your FiveM server files.',
  openGraph: {
    type: 'website',
    siteName: 'NOX // FiveM',
    description: 'AI-powered FiveM server development assistant.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      afterSignUpUrl="/dashboard"
      afterSignInUrl="/dashboard"
    >
      <ThemeProvider>
        <html
          lang="en"
          className="dark"
          style={{ colorScheme: 'dark' }}
        >
          <head>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
          </head>
          <body
            className={`${inter.variable} font-sans min-h-screen`}
            style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
          >
            {children}
            <Toaster
              position="bottom-right"
              toastOptions={{
                style: {
                  background: '#16161E',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#FFFFFF',
                  borderRadius: '0px',
                  fontFamily: "'JetBrains Mono', monospace",
                },
              }}
            />
          </body>
        </html>
      </ThemeProvider>
    </ClerkProvider>
  );
}

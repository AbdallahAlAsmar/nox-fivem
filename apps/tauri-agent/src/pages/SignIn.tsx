import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Eye, EyeOff, Loader2, Mail, Lock, ExternalLink } from 'lucide-react'
import { SignIn as ClerkSignIn } from '@clerk/clerk-react'

const PK = 'pk_test_cmVsZXZhbnQtcmFtLTkxMjAuY2xlcmsuYWNjb3VudHMuZGV2JA'
// Windows Tauri WebView serves the app from http://tauri.localhost (NOT
// tauri://localhost, which is the macOS/Linux scheme). Windows is the
// primary target, so use its origin for OAuth redirects.
const REDIRECT = 'http://tauri.localhost/'

// OAuth provider URL template — opens browser for the full Clerk auth flow
const oauthUrl = (provider: string) =>
  `https://accounts.clerk.com/sign-in/oauth/${provider}?publishable_key=${PK}&redirect_url=${encodeURIComponent(REDIRECT)}`

export default function SignIn() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [showCustomForm, setShowCustomForm] = useState(false)

  const openBrowser = (url: string) => {
    ;(window as any).open?.(url, '_blank') ?? window.open(url, '_blank')
  }

  const handleOAuth = (provider: string) => {
    openBrowser(oauthUrl(provider))
  }

  return (
    <div className="min-h-screen bg-[#0F0F14] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-0 font-mono mb-4">
            <span className="text-white font-bold text-3xl leading-none">|</span>
            <span className="text-white font-mono text-3xl font-medium tracking-[0.2em] ml-1">NOX<span className="font-normal opacity-60">.</span></span>
          </div>
          <h1 className="font-mono text-sm uppercase tracking-[0.2em] text-[rgba(255,255,255,0.5)]">
            {mode === 'signin' ? 'Sign in to NOX // FiveM' : 'Create your account'}
          </h1>
        </div>

        {/* Use Clerk's built-in SignIn component for proper auth flow */}
        <div className="bg-[#16161E] border border-[rgba(255,255,255,0.08)] p-6">
          <ClerkSignIn
            appearance={{
              variables: {
                colorPrimary: '#5E6AD2',
                colorBackground: '#16161E',
                colorInputBackground: '#0A0A0F',
                colorInputText: '#ffffff',
                colorText: '#ffffff',
                colorTextSecondary: 'rgba(255,255,255,0.6)',
                colorShadow: 'rgba(0,0,0,0.4)',
                fontFamily: 'Inter, system-ui, sans-serif',
                fontFamilyButtons: "'JetBrains Mono', monospace",
                borderRadius: '0px',
              },
              elements: {
                card: 'bg-[#16161E] border border-[rgba(255,255,255,0.08)] shadow-none',
                headerTitle: 'hidden',
                headerSubtitle: 'hidden',
                socialButtonsBlockButton: 'border border-[rgba(255,255,255,0.1)] text-white hover:border-[rgba(255,255,255,0.2)] hover:bg-[rgba(255,255,255,0.04)]',
                socialButtonsBlockButtonText: 'font-mono text-xs uppercase tracking-[1.4px]',
                formFieldInput: 'bg-transparent border border-[rgba(255,255,255,0.1)] text-white placeholder:text-[rgba(255,255,255,0.25)] rounded-none',
                formFieldLabel: 'text-[rgba(255,255,255,0.6)] font-mono text-xs uppercase tracking-wider',
                formButtonPrimary: 'bg-white text-[#0F0F14] font-mono text-xs uppercase tracking-[1.4px] hover:opacity-85 rounded-none',
                footerActionLink: 'text-[#5E6AD2] hover:underline font-mono text-xs',
                footerActionText: 'text-[rgba(255,255,255,0.4)]',
                dividerRow: 'gap-3',
              },
            }}
            afterSignInUrl="/"
            afterSignUpUrl="/"
            redirectUrl={REDIRECT}
            routing="hash"
          />
        </div>

        <p className="text-center font-mono text-[10px] text-[rgba(255,255,255,0.2)] mt-6 uppercase tracking-wider">
          NOX // FiveM Developer Tools
        </p>
      </motion.div>
    </div>
  )
}

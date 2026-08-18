import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Eye, EyeOff, Loader2, Mail, Lock, ExternalLink } from 'lucide-react'

const PK = 'pk_test_cmVsZXZhbnQtcmFtLTkxMjAuY2xlcmsuYWNjb3VudHMuZGV2JA'
const REDIRECT = 'tauri://localhost/'

// OAuth provider URL template — opens browser for the full Clerk auth flow
const oauthUrl = (provider: string) =>
  `https://accounts.clerk.com/sign-in/oauth/${provider}?publishable_key=${PK}&redirect_url=${encodeURIComponent(REDIRECT)}`

export default function SignInPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const openBrowser = (url: string) => {
    // tauri::invoke('open_url', { url }) or window.open fallback
    ;(window as any).open?.(url, '_blank') ?? window.open(url, '_blank')
  }

  const handleOAuth = (provider: string) => {
    openBrowser(oauthUrl(provider))
  }

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields')
      return
    }
    setLoading(true)
    setError(null)

    try {
      const ck = (window as any).__noxClerk
      if (!ck) throw new Error('Clerk not initialized — reload the app')

      if (mode === 'signin') {
        await ck.signIn.create({ identifier: email, password })
        await ck.session.create()
      } else {
        await ck.signUp.create({ emailAddress: email, password })
        await ck.signUp.prepareEmailAddressVerification()
        if (ck.signUp.unverifiedFields?.includes('emailAddress')) {
          setError('Check your email for the verification code.')
        }
      }
    } catch (err: any) {
      setError(err?.errors?.[0]?.long_message || err?.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0F0F14] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <img src="/nox-avatar.svg" alt="NOX" className="w-7 h-7 opacity-90" />
            <span className="font-mono text-white text-xl font-medium tracking-[0.2em]">NOX<span className="font-normal opacity-60">.</span></span>
          </div>
          <p className="font-sans text-sm text-[rgba(255,255,255,0.4)]">
            {mode === 'signin' ? 'Sign in to your account' : 'Create your account'}
          </p>
        </div>

        <div className="bg-[#16161E] border border-[rgba(255,255,255,0.08)] p-6">
          {error && (
            <div className="border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.05)] p-3 font-mono text-xs text-[#ef4444] mb-4 flex items-center gap-2">
              <span>!</span> {error}
            </div>
          )}

          {/* Social login buttons */}
          <div className="space-y-2 mb-5">
            <button onClick={() => handleOAuth('google')}
              className="w-full flex items-center gap-3 px-4 py-2.5 font-mono text-xs uppercase tracking-[1.4px] text-white border border-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.2)] hover:bg-[rgba(255,255,255,0.04)] transition-colors duration-100">
              <span className="w-5 h-5 flex items-center justify-center text-[rgba(255,255,255,0.5)] font-bold text-xs">G</span>
              Google
              <ExternalLink className="w-3.5 h-3.5 ml-auto text-[rgba(255,255,255,0.25)]" />
            </button>
            <button onClick={() => handleOAuth('discord')}
              className="w-full flex items-center gap-3 px-4 py-2.5 font-mono text-xs uppercase tracking-[1.4px] text-white border border-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.2)] hover:bg-[rgba(255,255,255,0.04)] transition-colors duration-100">
              <span className="w-5 h-5 flex items-center justify-center text-[rgba(255,255,255,0.5)] font-bold text-xs">D</span>
              Discord
              <ExternalLink className="w-3.5 h-3.5 ml-auto text-[rgba(255,255,255,0.25)]" />
            </button>
            <button onClick={() => handleOAuth('microsoft')}
              className="w-full flex items-center gap-3 px-4 py-2.5 font-mono text-xs uppercase tracking-[1.4px] text-white border border-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.2)] hover:bg-[rgba(255,255,255,0.04)] transition-colors duration-100">
              <span className="w-5 h-5 flex items-center justify-center text-[rgba(255,255,255,0.5)] font-bold text-xs">M</span>
              Microsoft
              <ExternalLink className="w-3.5 h-3.5 ml-auto text-[rgba(255,255,255,0.25)]" />
            </button>
            <button onClick={() => handleOAuth('apple')}
              className="w-full flex items-center gap-3 px-4 py-2.5 font-mono text-xs uppercase tracking-[1.4px] text-white border border-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.2)] hover:bg-[rgba(255,255,255,0.04)] transition-colors duration-100">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.03.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              Apple
              <ExternalLink className="w-3.5 h-3.5 ml-auto text-[rgba(255,255,255,0.25)]" />
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-[rgba(255,255,255,0.08)]" />
            <span className="font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.3)]">or</span>
            <div className="flex-1 h-px bg-[rgba(255,255,255,0.08)]" />
          </div>

          {/* Email/Password form */}
          <div className="space-y-4">
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.5)] mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgba(255,255,255,0.3)]" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-transparent border border-[rgba(255,255,255,0.1)] text-sm text-white placeholder:text-[rgba(255,255,255,0.25)] focus:outline-none focus:border-[#5E6AD2] transition-colors duration-100"
                  onKeyDown={(e) => e.key === 'Enter' && handleAuth()} />
              </div>
            </div>

            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.5)] mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgba(255,255,255,0.3)]" />
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-transparent border border-[rgba(255,255,255,0.1)] text-sm text-white placeholder:text-[rgba(255,255,255,0.25)] focus:outline-none focus:border-[#5E6AD2] transition-colors duration-100"
                  onKeyDown={(e) => e.key === 'Enter' && handleAuth()} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.3)] hover:text-white transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button onClick={handleAuth} disabled={loading || !email.trim() || !password.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 font-mono text-xs uppercase tracking-[1.4px] text-[#0F0F14] bg-white hover:opacity-85 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity duration-100">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>
                {mode === 'signin' ? 'Sign In' : 'Create Account'}
                <ArrowRight className="w-4 h-4" />
              </>}
            </button>
          </div>

          {/* Toggle mode */}
          <div className="mt-6 text-center">
            <p className="font-sans text-xs text-[rgba(255,255,255,0.4)]">
              {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
              <button onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null) }}
                className="font-mono text-xs uppercase tracking-wider text-[#5E6AD2] hover:underline">
                {mode === 'signin' ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </div>
        </div>

        <p className="text-center font-mono text-[10px] text-[rgba(255,255,255,0.2)] mt-6 uppercase tracking-wider">
          NOX // FiveM Developer Tools
        </p>
      </motion.div>
    </div>
  )
}

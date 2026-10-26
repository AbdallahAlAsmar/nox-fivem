import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2, AlertCircle, ExternalLink } from 'lucide-react'
import { useClerk, useSignIn } from '@clerk/clerk-react'
import { open as openUrl } from '@tauri-apps/plugin-shell'
import { invoke, isTauri } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'

function clerkError(err: unknown): string {
  if (err && typeof err === 'object' && 'errors' in err) {
    const errors = (err as { errors: Array<{ longMessage?: string; message?: string }> }).errors
    if (Array.isArray(errors) && errors.length) {
      return errors.map((item) => item.longMessage || item.message || 'Sign-in failed').join(' ')
    }
  }
  return err instanceof Error ? err.message : String(err)
}

export default function SignIn() {
  const clerk = useClerk()
  const { signIn, setActive, isLoaded: signInLoaded } = useSignIn()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [socialLoading, setSocialLoading] = useState<'oauth_google' | 'oauth_discord' | null>(null)

  // The system browser returns to the Rust loopback listener. Clerk only
  // finishes the session if those callback params are on this window, then
  // handleRedirectCallback runs — a reload alone drops the handshake.
  useEffect(() => {
    if (!isTauri()) return

    let cleanup: (() => void) | undefined

    const setupListeners = async () => {
      const unlistenCallback = await listen<string>('oauth:callback', async (event) => {
        try {
          const incoming = new URL(event.payload)
          const here = new URL(window.location.href)
          incoming.searchParams.forEach((value, key) => {
            here.searchParams.set(key, value)
          })
          window.history.replaceState({}, '', `${here.pathname}${here.search}${here.hash}`)
          await clerk.handleRedirectCallback({
            signInForceRedirectUrl: here.pathname,
            signUpForceRedirectUrl: here.pathname,
          })
        } catch (err) {
          setError(clerkError(err))
          setSocialLoading(null)
        }
      })

      const unlistenError = await listen<string>('oauth:error', (event) => {
        setError(event.payload || 'OAuth failed')
        setLoading(false)
        setSocialLoading(null)
      })

      cleanup = () => {
        unlistenCallback()
        unlistenError()
      }
    }

    setupListeners()

    return () => {
      void invoke('stop_oauth_server_cmd').catch(() => {})
      cleanup?.()
    }
  }, [clerk])

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!signInLoaded || !signIn) {
      setError('Auth is still loading — try again in a moment.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const attempt = await signIn.create({
        strategy: 'password',
        identifier: email,
        password,
      })
      if (attempt.status === 'complete' && attempt.createdSessionId) {
        await setActive({ session: attempt.createdSessionId })
        return
      }
      setError(
        attempt.status === 'needs_second_factor'
          ? 'This account needs a second factor. Use the web dashboard to finish signing in, then reopen NOXES.'
          : `Sign-in stopped at “${attempt.status}”. Check the email and password and try again.`,
      )
    } catch (err) {
      setError(clerkError(err))
    } finally {
      setLoading(false)
    }
  }

  const handleOAuth = async (strategy: 'oauth_google' | 'oauth_discord') => {
    if (!isTauri()) {
      setError('Social sign-in is available in the NOXES desktop app. Use email and password here.')
      return
    }

    setSocialLoading(strategy)
    setError(null)

    try {
      if (!signInLoaded || !signIn) {
        setError('Auth is still loading — try again in a moment.')
        setSocialLoading(null)
        return
      }

      const port = await invoke<number>('start_oauth_server_cmd')
      const redirectUrl = `http://127.0.0.1:${port}/callback`
      const attempt = await signIn.create({
        strategy,
        redirectUrl,
      })
      const external = attempt.firstFactorVerification?.externalVerificationRedirectURL
      if (!external) {
        setError('This provider is not enabled for the NOXES Clerk app.')
        setSocialLoading(null)
        return
      }
      await openUrl(external.toString())
    } catch (err) {
      setError(clerkError(err))
      setSocialLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#111315] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <img src="/brand/noxes-symbol.svg" alt="NOXES" className="w-8 h-8" />
            <span className="text-[#F4F1E9] font-display font-extrabold text-3xl tracking-[0.2em]">
              NOXES<span className="text-[#E83708]">.</span>
            </span>
          </div>
          <h1 className="font-sans text-xs uppercase tracking-[0.2em] text-[#68665F]">
            Sign in to NOXES · Worlds in Motion
          </h1>
        </div>

        {/* Card */}
        <div className="bg-[#202326] border border-[#414548] p-6 space-y-5">
          {/* Email/password form — stays in-app */}
          <form onSubmit={handleEmailSignIn} className="space-y-4">
            <div>
              <label className="block font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.6)] mb-1.5">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full bg-transparent border border-[#414548] text-white placeholder:text-[rgba(255,255,255,0.25)] px-3 py-2 font-mono text-sm focus:border-[rgba(255,255,255,0.3)] focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.6)] mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="w-full bg-transparent border border-[#414548] text-white placeholder:text-[rgba(255,255,255,0.25)] px-3 py-2 font-mono text-sm focus:border-[rgba(255,255,255,0.3)] focus:outline-none transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !signInLoaded}
              className="w-full bg-[#E83708] hover:bg-[#d43106] text-[#111315] font-semibold font-mono text-xs uppercase tracking-[1.4px] py-2.5 hover:opacity-85 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin inline mr-2" />
              ) : null}
              Continue
            </button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#414548]" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-[#202326] text-[rgba(255,255,255,0.3)] font-mono uppercase tracking-wider">
                or
              </span>
            </div>
          </div>

          {/* Social buttons — open in SYSTEM browser */}
          <div className="space-y-2">
            <button
              onClick={() => handleOAuth('oauth_google')}
              disabled={!!socialLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-[#414548] text-white hover:border-[rgba(255,255,255,0.18)] hover:bg-[rgba(255,255,255,0.04)] transition-colors disabled:opacity-50 font-mono text-xs uppercase tracking-[1.4px]"
            >
              {socialLoading === 'oauth_google' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#E83708]" />
              ) : (
                <ExternalLink className="w-3.5 h-3.5 text-[rgba(255,255,255,0.4)]" />
              )}
              Continue with Google
            </button>
            <button
              onClick={() => handleOAuth('oauth_discord')}
              disabled={!!socialLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-[#414548] text-white hover:border-[rgba(255,255,255,0.18)] hover:bg-[rgba(255,255,255,0.04)] transition-colors disabled:opacity-50 font-mono text-xs uppercase tracking-[1.4px]"
            >
              {socialLoading === 'oauth_discord' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#E83708]" />
              ) : (
                <ExternalLink className="w-3.5 h-3.5 text-[rgba(255,255,255,0.4)]" />
              )}
              Continue with Discord
            </button>
          </div>

          {/* Info text */}
          <p className="text-center font-mono text-[10px] text-[rgba(255,255,255,0.25)] leading-relaxed">
            Social login opens in your browser. Email sign-in stays in-app.
          </p>

          {/* Error message */}
          {error && (
            <div className="flex items-start gap-2 p-3 border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.05)]">
              <AlertCircle className="w-4 h-4 text-[#ef4444] flex-shrink-0 mt-0.5" />
              <p className="font-mono text-xs text-[#ef4444] leading-[1.5] break-all">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center font-mono text-[10px] text-[rgba(255,255,255,0.2)] mt-6 uppercase tracking-wider">
          NOXES · Worlds in Motion.
        </p>
      </motion.div>
    </div>
  )
}

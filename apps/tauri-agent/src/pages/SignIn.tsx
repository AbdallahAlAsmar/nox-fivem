import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2, AlertCircle, ExternalLink } from 'lucide-react'
import { useClerk, useSignIn } from '@clerk/clerk-react'
import { open as openUrl } from '@tauri-apps/plugin-shell'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'

const CLERK_FRONTEND_API = 'clerk.noxes.dev'

export default function SignIn() {
  const clerk = useClerk()
  const { signIn, isLoaded: signInLoaded } = useSignIn()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [socialLoading, setSocialLoading] = useState<'oauth_google' | 'oauth_discord' | null>(null)

  // Listen for OAuth callback from Rust backend
  useEffect(() => {
    let cleanup: (() => void) | undefined

    const setupListeners = async () => {
      const unlistenCallback = await listen<string>('oauth:callback', () => {
        window.location.reload()
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
  }, [])

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!signInLoaded || !signIn) {
      setError('Auth is still loading — try again in a moment.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      await signIn.create({
        strategy: 'password',
        identifier: email,
        password,
      })
    } catch (err) {
      const msg =
        err && typeof err === 'object' && 'errors' in err
          ? JSON.stringify((err as { errors: unknown }).errors)
          : err instanceof Error
            ? err.message
            : String(err)
      setError(msg)
      setLoading(false)
    }
  }

  const handleOAuth = async (strategy: 'oauth_google' | 'oauth_discord') => {
    setSocialLoading(strategy)
    setError(null)

    try {
      const port = await invoke<number>('start_oauth_server_cmd')
      const redirectUrl = `http://127.0.0.1:${port}/callback`

      // Open Clerk's OAuth authorize page in the SYSTEM browser
      const oauthUrl = new URL('/v1/oauth/authorize', `https://${CLERK_FRONTEND_API}`)
      oauthUrl.searchParams.set('client_name', 'clerk')
      oauthUrl.searchParams.set('response_type', 'code')
      oauthUrl.searchParams.set('redirect_uri', redirectUrl)
      oauthUrl.searchParams.set('scope', 'openid profile email')
      oauthUrl.searchParams.set('state', strategy)

      await openUrl(oauthUrl.toString())
    } catch (err) {
      const msg =
        err && typeof err === 'object' && 'errors' in err
          ? JSON.stringify((err as { errors: unknown }).errors)
          : err instanceof Error
            ? err.message
            : String(err)
      setError(msg)
      setSocialLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#0F0F14] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-0 font-mono mb-4">
            <span className="text-white font-bold text-3xl leading-none">|</span>
            <span className="text-white font-mono text-3xl font-medium tracking-[0.2em] ml-1">
              NOXES<span className="font-normal opacity-60">.</span>
            </span>
          </div>
          <h1 className="font-mono text-sm uppercase tracking-[0.2em] text-[rgba(255,255,255,0.5)]">
            Sign in to NOXES
          </h1>
        </div>

        {/* Card */}
        <div className="bg-[#16161E] border border-[rgba(255,255,255,0.08)] p-6 space-y-5">
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
                className="w-full bg-transparent border border-[rgba(255,255,255,0.1)] text-white placeholder:text-[rgba(255,255,255,0.25)] px-3 py-2 font-mono text-sm focus:border-[rgba(255,255,255,0.3)] focus:outline-none transition-colors"
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
                className="w-full bg-transparent border border-[rgba(255,255,255,0.1)] text-white placeholder:text-[rgba(255,255,255,0.25)] px-3 py-2 font-mono text-sm focus:border-[rgba(255,255,255,0.3)] focus:outline-none transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !signInLoaded}
              className="w-full bg-white text-[#0F0F14] font-mono text-xs uppercase tracking-[1.4px] py-2.5 hover:opacity-85 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
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
              <div className="w-full border-t border-[rgba(255,255,255,0.08)]" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-[#16161E] text-[rgba(255,255,255,0.3)] font-mono uppercase tracking-wider">
                or
              </span>
            </div>
          </div>

          {/* Social buttons — open in SYSTEM browser */}
          <div className="space-y-2">
            <button
              onClick={() => handleOAuth('oauth_google')}
              disabled={!!socialLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-[rgba(255,255,255,0.08)] text-white hover:border-[rgba(255,255,255,0.18)] hover:bg-[rgba(255,255,255,0.04)] transition-colors disabled:opacity-50 font-mono text-xs uppercase tracking-[1.4px]"
            >
              {socialLoading === 'oauth_google' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#3DFFA2]" />
              ) : (
                <ExternalLink className="w-3.5 h-3.5 text-[rgba(255,255,255,0.4)]" />
              )}
              Continue with Google
            </button>
            <button
              onClick={() => handleOAuth('oauth_discord')}
              disabled={!!socialLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-[rgba(255,255,255,0.08)] text-white hover:border-[rgba(255,255,255,0.18)] hover:bg-[rgba(255,255,255,0.04)] transition-colors disabled:opacity-50 font-mono text-xs uppercase tracking-[1.4px]"
            >
              {socialLoading === 'oauth_discord' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#3DFFA2]" />
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
          NOXES · FiveM Developer Tools
        </p>
      </motion.div>
    </div>
  )
}
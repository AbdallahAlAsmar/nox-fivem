import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { SignIn as ClerkSignIn, useClerk, useSignIn } from '@clerk/clerk-react'

const PROVIDER_LABELS: Record<string, string> = {
  oauth_google: 'Google',
  oauth_discord: 'Discord',
  oauth_github: 'GitHub',
  oauth_microsoft: 'Microsoft',
  oauth_apple: 'Apple',
  oauth_twitch: 'Twitch',
}

function providerLabel(strategy: string): string {
  return PROVIDER_LABELS[strategy]
    ?? strategy.replace(/^oauth_/, '').replace(/_/g, ' ')
}

function errorMessage(err: unknown): string {
  // Tauri commands reject with plain strings; treating those as unknown errors
  // hid useful failures behind the unhelpful "Sign-in failed" fallback.
  if (typeof err === 'string' && err.trim()) return err
  if (err && typeof err === 'object' && 'errors' in err) {
    const errors = (err as { errors?: { longMessage?: string; message?: string }[] }).errors
    const first = errors?.[0]
    const message = first?.longMessage || first?.message
    if (message) return message
  }
  if (err instanceof Error) return err.message
  return 'Sign-in failed'
}

export default function SignIn() {
  const { signIn, isLoaded } = useSignIn()
  const clerk = useClerk()
  const [providers, setProviders] = useState<{ strategy: string; label: string }[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoaded) return
    const social = (window.Clerk as { environment?: { userSettings?: { social?: Record<string, { enabled?: boolean }> } } } | undefined)
      ?.environment?.userSettings?.social
    if (!social) return
    setProviders(
      Object.entries(social)
        .filter(([, value]) => value?.enabled)
        .map(([strategy]) => ({ strategy, label: providerLabel(strategy) })),
    )
  }, [isLoaded])

  // Clerk's sign-up form shares this screen. Clear an old social-login error as
  // soon as the user moves into the email/password flow so it can't look like
  // the email form itself failed.
  useEffect(() => {
    const clearProviderError = () => setError(null)
    window.addEventListener('hashchange', clearProviderError)
    return () => window.removeEventListener('hashchange', clearProviderError)
  }, [])

  const startOAuth = async (strategy: string) => {
    if (!isLoaded || !signIn || busy) return
    setError(null)
    setBusy(strategy)
    let stage = 'Preparing the sign-in callback'
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      const base = await invoke<string>('oauth_callback_base')
      const redirectUrl = `${base}/sso-callback`
      // Production Clerk only hands the session back to a second browser when
      // the sign-in is started as a native request and the return address is
      // on the instance allowlist.
      stage = 'Connecting to Clerk'
      const response = await fetch(
        'https://clerk.noxes.dev/v1/client/sign_ins?_is_native=true',
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Bearer ${window.Clerk.publishableKey}`,
          },
          body: new URLSearchParams({
            strategy,
            redirect_url: redirectUrl,
            action_complete_redirect_url: `${window.location.origin}/`,
          }),
        },
      )
      const payload = await response.json()
      if (!response.ok) {
        const clerkError = payload?.errors?.[0]
        const wrapped = Object.assign(new Error(clerkError?.long_message || clerkError?.message || 'Sign-in failed'), {
          errors: payload?.errors,
        })
        throw wrapped
      }
      const redirect = payload?.response?.first_factor_verification?.external_verification_redirect_url
      if (!redirect) {
        throw new Error('Clerk did not return a sign-in link for this provider')
      }
      stage = 'Opening your browser'
      await Promise.race([
        invoke('open_external_url', { url: redirect }),
        new Promise((_, reject) => {
          window.setTimeout(() => reject(new Error('The browser did not open. Try again.')), 8000)
        }),
      ])
    } catch (err) {
      const message = errorMessage(err)
      const code = err && typeof err === 'object' && 'errors' in err
        ? (err as { errors?: { code?: string }[] }).errors?.[0]?.code
        : undefined
      if (code === 'session_exists' || /already signed in/i.test(message)) {
        const sessionId = clerk.session?.id
          || clerk.client?.lastActiveSessionId
          || clerk.client?.signedInSessions?.[0]?.id
          || clerk.client?.sessions?.[0]?.id
        if (sessionId) {
          await clerk.setActive({ session: sessionId })
          return
        }
      }
      setError(`${stage}: ${message}`)
    } finally {
      setBusy(null)
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
          <div className="inline-flex items-center gap-0 font-mono mb-4">
            <span className="text-white font-bold text-3xl leading-none">|</span>
            <span className="text-white font-mono text-3xl font-medium tracking-[0.2em] ml-1">NOX<span className="font-normal opacity-60">.</span></span>
          </div>
          <h1 className="font-mono text-sm uppercase tracking-[0.2em] text-[rgba(255,255,255,0.5)]">
            Sign in to NOX // FiveM
          </h1>
        </div>

        <div className="bg-[#16161E] border border-[rgba(255,255,255,0.08)] p-6">
          <div className="flex flex-col gap-2 mb-4">
            {providers.map((provider) => (
              <button
                key={provider.strategy}
                type="button"
                disabled={!isLoaded || busy !== null}
                onClick={() => void startOAuth(provider.strategy)}
                className="w-full border border-[rgba(255,255,255,0.1)] text-white hover:border-[rgba(255,255,255,0.2)] hover:bg-[rgba(255,255,255,0.04)] font-mono text-xs uppercase tracking-[1.4px] py-2.5 disabled:opacity-40"
              >
                {busy === provider.strategy ? 'Opening browser…' : `Continue with ${provider.label}`}
              </button>
            ))}
          </div>
          {error && (
            <p className="font-mono text-[11px] text-[#ff8a8a] mb-4 leading-relaxed">{error}</p>
          )}
          <div id="clerk-captcha" />

          {/* Email and password stay in this window. Clerk's own social
              buttons navigate to the Account Portal, so they are hidden. */}
          <div onFocusCapture={() => setError(null)}>
            <ClerkSignIn
              routing="hash"
              withSignUp
              forceRedirectUrl="/"
              fallbackRedirectUrl="/"
              signUpForceRedirectUrl="/"
              signUpFallbackRedirectUrl="/"
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
                  socialButtonsRoot: 'hidden',
                  socialButtons: 'hidden',
                  dividerRow: 'hidden',
                  formFieldInput: 'bg-transparent border border-[rgba(255,255,255,0.1)] text-white placeholder:text-[rgba(255,255,255,0.25)] rounded-none',
                  formFieldLabel: 'text-[rgba(255,255,255,0.6)] font-mono text-xs uppercase tracking-wider',
                  formButtonPrimary: 'bg-white text-[#0F0F14] font-mono text-xs uppercase tracking-[1.4px] hover:opacity-85 rounded-none',
                  footerActionLink: 'text-[#5E6AD2] hover:underline font-mono text-xs',
                  footerActionText: 'text-[rgba(255,255,255,0.4)]',
                },
              }}
            />
          </div>
        </div>

        <p className="text-center font-mono text-[10px] text-[rgba(255,255,255,0.2)] mt-6 uppercase tracking-wider">
          NOX // FiveM Developer Tools
        </p>
      </motion.div>
    </div>
  )
}

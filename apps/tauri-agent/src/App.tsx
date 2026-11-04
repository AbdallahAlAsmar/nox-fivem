'use client'

import { ClerkProvider, useUser, useAuth, useClerk } from '@clerk/clerk-react'
import { ErrorBoundary } from './components/ErrorBoundary'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Chat from './pages/Chat'
import Changes from './pages/Changes'
import Settings from './pages/Settings'
import ErrorAnalysis from './pages/ErrorAnalysis'
import ResourceFinder from './pages/ResourceFinder'
import Players from './pages/Players'
import Account from './pages/Account'
import Billing from './pages/Billing'
import SignIn from './pages/SignIn'
import { useCallback, useEffect, useRef, useState } from 'react'
import { isTauri } from '@tauri-apps/api/core'
import { setTokenGetter } from './api'
import { clerkPublishableKey } from './clerk'

type Page = 'dashboard' | 'chat' | 'resources' | 'changes' | 'players' | 'settings' | 'errors' | 'account' | 'billing'

async function activateClerkSession(clerk: ReturnType<typeof useClerk>): Promise<boolean> {
  const client = clerk.client
  if (!client) return false
  const sessionId = clerk.session?.id
    || client.signIn?.createdSessionId
    || client.signUp?.createdSessionId
    || client.lastActiveSessionId
    || client.signedInSessions?.[0]?.id
    || client.sessions?.[0]?.id
  if (!sessionId) return false
  await clerk.setActive({ session: sessionId })
  window.history.replaceState(null, '', '/')
  return true
}

function OAuthBridge() {
  const clerk = useClerk()
  const pending = useRef<string | null>(null)
  const seen = useRef<string | null>(null)

  const consume = useCallback(async (fullUrl: string) => {
    if (!clerk.loaded) {
      pending.current = fullUrl
      return
    }
    if (seen.current === fullUrl) return
    seen.current = fullUrl
    try {
      // Keep the callback params off this page. The sign-in form treats them
      // as its own OAuth attempt and shows "External Account was not found."
      const incoming = new URL(fullUrl)
      const nonce = incoming.searchParams.get('rotating_token_nonce')
        || new URLSearchParams(incoming.hash.replace(/^#\??/, '')).get('rotating_token_nonce')
      if (nonce) {
        await clerk.client.reload({ rotatingTokenNonce: nonce })
      }
      const signIn = clerk.client.signIn
      const signUp = clerk.client.signUp
      if (!signIn?.createdSessionId && !signUp?.createdSessionId && !clerk.client.signedInSessions?.length) {
        try {
          await signUp.create({ transfer: true })
        } catch {
          // The Google attempt is not a new-account transfer.
        }
      }
      const activated = await activateClerkSession(clerk)
      if (!activated) {
        const verificationError = signIn?.firstFactorVerification?.error
        console.error('[oauth] callback did not create a session', verificationError)
        seen.current = null
      }
    } catch (err) {
      console.error('[oauth] callback failed', err)
      seen.current = null
    }
  }, [clerk])

  useEffect(() => {
    // OAuth callback events are only emitted by the native loopback server.
    // In the browser, Tauri's event plugin has no transformCallback bridge.
    if (!isTauri()) return

    let unlisten: (() => void) | undefined
    let cancelled = false
    void import('@tauri-apps/api/event').then(({ listen }) =>
      listen<string>('oauth-callback', (event) => {
        void consume(event.payload)
      }),
    ).then((fn) => {
      if (cancelled) fn()
      else unlisten = fn
    }).catch((err) => {
      console.error('[oauth] listener failed', err)
    })
    return () => {
      cancelled = true
      unlisten?.()
    }
  }, [consume])

  useEffect(() => {
    if (clerk.loaded && pending.current) {
      const url = pending.current
      pending.current = null
      void consume(url)
    }
  }, [clerk, consume])

  return null
}

function AppContent() {
  const { user, isLoaded } = useUser()
  const clerk = useClerk()
  const { getToken } = useAuth()
  const [clerkTimedOut, setClerkTimedOut] = useState(false)
  // Register Clerk's getToken with the api layer so every request resolves a
  // FRESH short-lived JWT instead of a stale cached one.
  setTokenGetter(async () => {
    try {
      return await getToken?.()
    } catch {
      return null
    }
  })
  const [currentPage, setCurrentPage] = useState<Page>('dashboard')
  const [selectedServerId, setSelectedServerId] = useState<string | undefined>(() => {
    return localStorage.getItem('selected_server_id') || undefined
  })

  useEffect(() => {
    if (isLoaded) return
    const timer = window.setTimeout(() => setClerkTimedOut(true), 12000)
    return () => window.clearTimeout(timer)
  }, [isLoaded])

  // Google finishes in the system browser and leaves a session on this client
  // that is not active yet. Until setActive runs, the screen stays on sign-in
  // and the next click says "You're already signed in."
  useEffect(() => {
    if (!isLoaded || user) return
    void activateClerkSession(clerk).catch((err) => {
      console.error('[oauth] could not activate session', err)
    })
  }, [isLoaded, user, clerk])

  const handleNavigate = (page: string) => {
    setCurrentPage(page as Page)
  }

  const handleSelectServer = (serverId: string) => {
    setSelectedServerId(serverId)
    if (serverId) {
      localStorage.setItem('selected_server_id', serverId)
      setCurrentPage('chat')
    }
  }

  const handleAddServer = () => {
    setCurrentPage('dashboard')
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#0F0F14] flex items-center justify-center px-6">
        <div className="font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.3)] text-center">
          {clerkTimedOut
            ? 'Clerk did not finish loading. Check the network and restart the app.'
            : 'Loading...'}
        </div>
      </div>
    )
  }

  // If not authenticated, show the custom sign-in page
  if (!user) {
    return <SignIn />
  }

  const renderPage = () => {
    const serverId = currentPage === 'chat' ? selectedServerId : undefined
    switch (currentPage) {
      case 'dashboard': return <Dashboard onNavigate={handleNavigate} onServerSelect={handleSelectServer} />
      case 'chat': return <Chat serverId={serverId} />
      case 'resources': return <ResourceFinder serverId={selectedServerId} />
      case 'changes': return <Changes serverId={selectedServerId} />
      case 'players': return <Players serverId={selectedServerId} />
      case 'settings': return <Settings />
      case 'account': return <Account />
      case 'billing': return <Billing />
      case 'errors': return <ErrorAnalysis serverId={selectedServerId || 'local'} />
      default: return <Dashboard onNavigate={handleNavigate} onServerSelect={handleSelectServer} />
    }
  }

  return (
    <Layout currentPage={currentPage} onNavigate={handleNavigate} selectedServerId={selectedServerId}>
      <div className="animate-fade-in h-full">
        {renderPage()}
      </div>
    </Layout>
  )
}

export default function App() {
  const publishableKey = clerkPublishableKey()
  if (!publishableKey) {
    return (
      <div className="min-h-screen bg-[#0F0F14] flex items-center justify-center px-6">
        <p className="font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.45)] text-center">
          Missing Clerk publishable key. Set VITE_CLERK_DEVELOPMENT_PUBLISHABLE_KEY in apps/tauri-agent/.env.
        </p>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <ClerkProvider
        publishableKey={publishableKey}
        // Relative URLs keep transfers inside this window. Without them Clerk
        // sends Google/Discord through the hosted Account Portal.
        signInUrl="/"
        signUpUrl="/"
        signInFallbackRedirectUrl="/"
        signUpFallbackRedirectUrl="/"
        signInForceRedirectUrl="/"
        signUpForceRedirectUrl="/"
        allowedRedirectProtocols={['http:', 'https:']}
      >
        <OAuthBridge />
        <AppContent />
      </ClerkProvider>
    </ErrorBoundary>
  )
}

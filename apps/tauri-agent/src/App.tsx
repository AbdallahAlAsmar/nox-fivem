'use client'

import { ClerkProvider, useUser, useAuth, ClerkLoading, ClerkLoaded, SignedOut, SignedIn } from '@clerk/clerk-react'
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
import { OnboardingTour } from './components/OnboardingTour'
import { useState, useEffect } from 'react'
import { setTokenGetter } from './api'

type Page = 'dashboard' | 'chat' | 'resources' | 'changes' | 'players' | 'settings' | 'errors' | 'account' | 'billing'

// Use test key for local development (allows localhost)
// Use pk_live_Y2xlcmsubm94ZXMuZGV2JA for production
const CLERK_PUBLISHABLE_KEY = process.env.NODE_ENV === 'production'
  ? 'pk_live_Y2xlcmsubm94ZXMuZGV2JA'
  : 'pk_test_cmVsZXZhbnQtcmFtLTkxMjAuY2xlcmsuYWNjb3VudHMuZGV2JA'

function AppContent() {
  const { user, isSignedIn, isLoaded } = useUser()
  const { getToken } = useAuth()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    console.log('[AppContent] useUser result:', { user: user ? 'present' : 'null', isSignedIn, isLoaded })
  }, [user, isSignedIn, isLoaded])

  useEffect(() => {
    setTokenGetter(async () => {
      try {
        return await getToken?.()
      } catch {
        return null
      }
    })
  }, [getToken])

  const [currentPage, setCurrentPage] = useState<Page>('dashboard')
  const [selectedServerId, setSelectedServerId] = useState<string | undefined>(() => {
    return localStorage.getItem('selected_server_id') || undefined
  })

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
    <>
      {!isLoaded ? (
        <div className="min-h-screen bg-[#0F0F14] flex items-center justify-center">
          <div className="font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.3)]">
            Loading Clerk... (isLoaded: {String(isLoaded)}, isSignedIn: {String(isSignedIn)})
          </div>
        </div>
      ) : !isSignedIn ? (
        <SignIn />
      ) : (
        <Layout currentPage={currentPage} onNavigate={handleNavigate} selectedServerId={selectedServerId}>
          <div className="animate-fade-in h-full">
            {renderPage()}
            <OnboardingTour currentPage={currentPage} />
          </div>
        </Layout>
      )}
      {error && (
        <div className="fixed bottom-4 left-4 bg-red-900/50 border border-red-500/50 text-red-200 px-4 py-2 font-mono text-xs">
          {error}
        </div>
      )}
    </>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <ClerkProvider
        publishableKey={CLERK_PUBLISHABLE_KEY}
      >
        <AppContent />
      </ClerkProvider>
    </ErrorBoundary>
  )
}
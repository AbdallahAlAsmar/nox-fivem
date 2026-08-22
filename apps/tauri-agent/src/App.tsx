'use client'

import { ClerkProvider, useUser, useAuth } from '@clerk/clerk-react'
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
import { useState, useEffect } from 'react'
import type { Server } from './api'

type Page = 'dashboard' | 'chat' | 'resources' | 'changes' | 'players' | 'settings' | 'errors' | 'account' | 'billing'

const CLERK_PUBLISHABLE_KEY = 'pk_test_cmVsZXZhbnQtcmFtLTkxMjAuY2xlcmsuYWNjb3VudHMuZGV2JA'

function AppContent() {
  const { user, isLoaded } = useUser()
  const { getToken } = useAuth()
  const [currentPage, setCurrentPage] = useState<Page>('dashboard')
  const [selectedServerId, setSelectedServerId] = useState<string | undefined>(() => {
    return localStorage.getItem('selected_server_id') || undefined
  })

  useEffect(() => {
    if (user && isLoaded) {
      window.__nox_clerk_user = {
        id: user.id,
        email: user.primaryEmailAddress?.emailAddress ?? '',
        name: user.fullName ?? user.username ?? user.id,
      }
      getToken?.().then((t) => {
        if (t) window.__nox_clerk_token = t
      }).catch(() => {})
    } else if (!user && isLoaded) {
      window.__nox_clerk_user = null
      window.__nox_clerk_token = null
    }
  }, [user, isLoaded, getToken])

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
      <div className="min-h-screen bg-[#0F0F14] flex items-center justify-center">
        <div className="font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.3)]">Loading...</div>
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
      case 'settings': return <Settings onThemeChange={() => {}} />
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
  return (
    <ErrorBoundary>
      <ClerkProvider
        publishableKey={CLERK_PUBLISHABLE_KEY}
        afterSignInUrl="/"
        afterSignUpUrl="/"
      >
        <AppContent />
      </ClerkProvider>
    </ErrorBoundary>
  )
}

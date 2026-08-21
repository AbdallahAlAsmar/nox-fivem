'use client'

import { ClerkProvider, SignIn, useUser, useAuth } from '@clerk/clerk-react'
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
import Onboarding from './components/Onboarding'
import { useState, useEffect } from 'react'
import type { Server } from './api'

type Page = 'dashboard' | 'chat' | 'resources' | 'changes' | 'players' | 'settings' | 'errors' | 'account' | 'billing'

const CLERK_PUBLISHABLE_KEY = 'pk_test_cmVsZXZhbnQtcmFtLTkxMjAuY2xlcmsuYWNjb3VudHMuZGV2JA'

const signInAppearance = {
  variables: {
    colorPrimary: '#5E6AD2',
    colorBackground: '#16161E',
    colorInputBackground: '#0A0A0F',
    colorInputText: '#ffffff',
    colorText: '#ffffff',
    colorTextSecondary: 'rgba(255,255,255,0.6)',
    colorShadow: 'rgba(0,0,0,0.4)',
    fontFamily: 'Inter, system-ui, sans-serif',
    fontFamilyButton: "'JetBrains Mono', monospace",
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
}

function AppContent() {
  const { user, isLoaded } = useUser()
  const { getToken } = useAuth()
  const [currentPage, setCurrentPage] = useState<Page>('dashboard')
  const [selectedServerId, setSelectedServerId] = useState<string | undefined>(() => {
    return localStorage.getItem('selected_server_id') || undefined
  })
  const [showOnboarding, setShowOnboarding] = useState(false)

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
    }

    const hasCompleted = localStorage.getItem('onboarding-complete')
    if (!hasCompleted) setShowOnboarding(true)
  }, [user, isLoaded, getToken])

  const handleOnboardingComplete = () => {
    localStorage.setItem('onboarding-complete', 'true')
    setShowOnboarding(false)
  }

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
    // Just trigger the modal - Dashboard component handles it
    // This is called from the button, Dashboard already has the modal state
    setCurrentPage('dashboard')
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#0F0F14] flex items-center justify-center">
        <div className="font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.3)]">Loading…</div>
      </div>
    )
  }

  if (!user) {
    const redirectUrl = '/?' + new URLSearchParams(window.location.search).toString()
    return (
      <div className="min-h-screen bg-[#0F0F14] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-0 font-mono mb-4">
              <span className="text-white font-bold text-3xl leading-none">|</span>
              <span className="text-white font-mono text-3xl font-medium tracking-[0.2em] ml-1">NOX<span className="font-normal opacity-60">.</span></span>
            </div>
            <h1 className="font-mono text-sm uppercase tracking-[0.2em] text-[rgba(255,255,255,0.5)]">Sign in to NOX // FiveM</h1>
          </div>
          <SignIn
            appearance={signInAppearance}
            afterSignInUrl="/"
            afterSignUpUrl="/"
            redirectUrl={redirectUrl}
          />
        </div>
      </div>
    )
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
    <>
      {showOnboarding && (
        <Onboarding onComplete={handleOnboardingComplete} />
      )}
      <Layout currentPage={currentPage} onNavigate={handleNavigate} selectedServerId={selectedServerId}>
        <div className="animate-fade-in h-full">
          {renderPage()}
        </div>
      </Layout>
    </>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} afterSignInUrl="/" afterSignUpUrl="/">
        <AppContent />
      </ClerkProvider>
    </ErrorBoundary>
  )
}

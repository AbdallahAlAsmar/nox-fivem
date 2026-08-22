import { useAuth, useUser } from '@clerk/clerk-react'

interface ClerkUser {
  id: string
  email: string
  name: string
}

interface ClerkContextType {
  user: ClerkUser | null
  token: string | null
  isLoaded: boolean
  signIn: () => void
  signOut: () => void
}

import { createContext, useContext, useEffect, useState } from 'react'

const ClerkContext = createContext<ClerkContextType>({
  user: null,
  token: null,
  isLoaded: false,
  signIn: () => {},
  signOut: () => {},
})

export function useClerk() {
  return useContext(ClerkContext)
}

export function ClerkContextProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoaded: clerkLoaded } = useUser()
  const { getToken, signOut: clerkSignOut } = useAuth()
  const [token, setToken] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    if (!clerkLoaded) return
    setIsLoaded(true)

    if (user) {
      const clerkUser: ClerkUser = {
        id: user.id,
        email: user.primaryEmailAddress?.emailAddress ?? '',
        name: user.fullName ?? user.username ?? user.id,
      }
      window.__nox_clerk_user = clerkUser
      window.__nox_clerk_token = null
      ;(window as any).__nox_clerk_user = clerkUser

      getToken?.().then((t) => {
        if (t) {
          setToken(t)
          window.__nox_clerk_token = t
        }
      }).catch(() => {})
    } else {
      window.__nox_clerk_user = null
      window.__nox_clerk_token = null
      setToken(null)
    }
  }, [user, clerkLoaded, getToken])

  const signIn = () => {
    window.location.href = '/sign-in'
  }

  const signOut = async () => {
    try {
      await clerkSignOut?.()
    } catch (e) {
      console.warn('Clerk signOut failed:', e)
    }
    window.__nox_clerk_user = null
    window.__nox_clerk_token = null
  }

  return (
    <ClerkContext.Provider value={{
      user: user ? { id: user.id, email: user.primaryEmailAddress?.emailAddress ?? '', name: user.fullName ?? user.username ?? user.id } : null,
      token,
      isLoaded,
      signIn,
      signOut,
    }}>
      {children}
    </ClerkContext.Provider>
  )
}

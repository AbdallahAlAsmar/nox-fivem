import { useState, useEffect, createContext, useContext, type ReactNode } from 'react'

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

export function ClerkProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ClerkUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const ck = (window as any).__noxClerk

    // Check session once Clerk is ready
    const checkSession = async (c: any) => {
      try {
        // Wait for Clerk to be fully initialized
        const waitForReady = () =>
          new Promise<void>((resolve) => {
            if (c.loaded) { resolve(); return }
            const poll = setInterval(() => {
              if (c.loaded) { clearInterval(poll); resolve() }
            }, 200)
            setTimeout(() => { clearInterval(poll); resolve() }, 8000)
          })

        await waitForReady()

        if (c.user) {
          const clerkUser: ClerkUser = {
            id: c.user.id,
            email: c.user.emailAddresses?.[0]?.emailAddress || '',
            name: c.user.fullName || c.user.firstName || c.user.id,
          }
          setUser(clerkUser)
          window.__nox_clerk_user = clerkUser
        }
        const t = await c.getToken?.()
        if (t) {
          setToken(t)
          window.__nox_clerk_token = t
        }
      } catch (e) {
        console.warn('Clerk session check failed:', e)
      }
      setIsLoaded(true)
    }

    if (ck) {
      // Clerk already loaded — check session immediately
      ck.load?.().catch(console.warn)
      checkSession(ck)
    } else {
      // Wait for Clerk to appear
      const poll = setInterval(() => {
        const c = (window as any).__noxClerk
        if (c) {
          clearInterval(poll)
          c.load?.().catch(console.warn)
          checkSession(c)
        }
      }, 200)
      setTimeout(() => clearInterval(poll), 8000)
    }
  }, [])

  const signIn = () => {
    ;(window as any).__noxClerk?.navigate?.('/sign-in')
  }

  const signOut = async () => {
    const ck = (window as any).__noxClerk
    if (ck?.signOut) {
      try { await ck.signOut() } catch (e) { console.warn('Clerk signOut failed:', e) }
    }
    setUser(null)
    setToken(null)
    window.__nox_clerk_user = null
    window.__nox_clerk_token = null
  }

  return (
    <ClerkContext.Provider value={{ user, token, isLoaded, signIn, signOut }}>
      {children}
    </ClerkContext.Provider>
  )
}

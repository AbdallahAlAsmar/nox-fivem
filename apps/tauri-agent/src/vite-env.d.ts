/// <reference types="vite/client" />

declare global {
  interface Window {
    __nox_clerk_user?: { id: string; email: string; name: string } | null
    __nox_clerk_token?: string | null
    __noxClerk?: any
  }
}

export {}

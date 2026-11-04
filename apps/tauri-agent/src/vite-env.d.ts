/// <reference types="vite/client" />

declare global {
  interface Window {
    __noxClerk?: any
    Clerk?: any
  }
}

export {}

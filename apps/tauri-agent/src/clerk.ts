// The desktop app must use the same Clerk instance as the web dashboard and
// the orchestrator. A leftover publishable key from another instance lets the
// sign-in screen appear, then every API call is rejected.
export function clerkPublishableKey(): string {
  const dev = import.meta.env.VITE_CLERK_DEVELOPMENT_PUBLISHABLE_KEY as string | undefined
  const prod = import.meta.env.VITE_CLERK_PRODUCTION_PUBLISHABLE_KEY as string | undefined
  // The VPS verifies production Clerk tokens (clerk.noxes.dev). The development
  // instance signs in, then every orchestrator call is rejected.
  const key = prod || dev
  return (key || '').trim()
}

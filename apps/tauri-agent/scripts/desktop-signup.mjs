import { createRequire } from 'node:module'

const require = createRequire('C:/Users/2026/Desktop/Noxes/Noxes-app/apps/tauri-agent/package.json')
const { chromium } = require('playwright')
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222')
const page = browser
  .contexts()
  .flatMap((context) => context.pages())
  .find((item) => item.url().includes('localhost:1420'))
if (!page) {
  console.log('sign-in page not open')
  process.exit(1)
}

const result = await page.evaluate(async () => {
  const clerk = window.Clerk
  if (!clerk) return { error: 'Clerk is not on the page' }
  if (!clerk.loaded) await clerk.load()
  try {
    let signUp = await clerk.client.signUp.create({
      emailAddress: 'noxes.desktop+clerk_test@example.com',
      password: 'NoxesLocalE2E!2026',
    })
    const created = {
      status: signUp.status,
      unverified: signUp.unverifiedFields,
      session: signUp.createdSessionId || null,
    }
    if (signUp.status !== 'complete') {
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
      signUp = await signUp.attemptEmailAddressVerification({ code: '424242' })
    }
    if (signUp.status === 'complete' && signUp.createdSessionId) {
      await clerk.setActive({ session: signUp.createdSessionId })
    }
    return {
      created,
      status: signUp.status,
      missing: signUp.missingFields,
      unverified: signUp.unverifiedFields,
      session: signUp.createdSessionId || null,
      signedIn: !!clerk.user,
    }
  } catch (error) {
    const errors = error && error.errors
    return {
      error: Array.isArray(errors)
        ? errors.map((item) => `${item.code}: ${item.longMessage || item.message}`)
        : String(error),
    }
  }
})
console.log(JSON.stringify(result, null, 2))
process.exit(result.error ? 1 : 0)

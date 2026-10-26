import { createRequire } from 'node:module'

const require = createRequire('C:/Users/2026/Desktop/Noxes/Noxes-app/apps/tauri-agent/package.json')
const { chromium } = require('playwright')

const FIXTURE = 'C:/Users/2026/AppData/Local/noxes-ui-fixture'
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222')
const page = browser
  .contexts()
  .flatMap((context) => context.pages())
  .find((item) => item.url().includes('localhost:1420'))
if (!page) {
  console.log('desktop page not open')
  process.exit(1)
}

async function bodyText() {
  return page.locator('body').innerText()
}

await page.waitForTimeout(1500)
let text = await bodyText()
console.log('SCREEN', text.slice(0, 400).replace(/\n/g, ' | '))

if (text.includes('SIGN IN TO NOXES')) {
  const activated = await page.evaluate(async () => {
    const clerk = window.Clerk
    if (!clerk) return { error: 'no clerk' }
    if (!clerk.loaded) await clerk.load()
    const sessions = clerk.client?.sessions || []
    const sessionId = sessions[0]?.id || null
    if (sessionId) {
      await clerk.setActive({ session: sessionId })
    }
    return {
      sessionId,
      count: sessions.length,
      user: clerk.user?.id || null,
      statuses: sessions.map((session) => session.status),
    }
  })
  console.log('ACTIVATE', JSON.stringify(activated))
  await page.waitForTimeout(1500)
  text = await bodyText()
  if (text.includes('SIGN IN TO NOXES')) {
    await page.getByPlaceholder('you@example.com').fill('noxes.desktop+clerk_test@example.com')
    await page.getByPlaceholder('Enter your password').fill('NoxesLocalE2E!2026')
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await page.waitForTimeout(4000)
    text = await bodyText()
  }
  console.log('AFTER SIGNIN', text.slice(0, 600).replace(/\n/g, ' | '))
  if (text.includes('SIGN IN TO NOXES')) {
    process.exit(1)
  }
}

// Dismiss the first-run tour if it is covering the dashboard.
const skip = page.getByRole('button', { name: 'Skip' })
if (await skip.count()) {
  await skip.first().click()
  await page.waitForTimeout(300)
}

if (!(await bodyText()).includes('ADD SERVER') && !(await bodyText()).includes('Add Server')) {
  const servers = page.getByRole('button', { name: /Navigate to Servers/i })
  if (await servers.count()) await servers.first().click()
  await page.waitForTimeout(500)
}

const add = page.getByRole('button', { name: /Add Server/i })
await add.first().click()
await page.getByPlaceholder('My FiveM Server').fill('UI Fixture')
const dir = page.getByPlaceholder('C:/FXServer/server-data')
await dir.fill(FIXTURE)
await dir.blur()
await page.getByText('Valid FiveM server').waitFor({ timeout: 15000 })
await page.getByRole('button', { name: 'Create Server' }).click()
await page.getByText(/created & connected/i).waitFor({ timeout: 20000 })
console.log('SERVER CONNECTED')

await page.locator('text=UI Fixture').last().click()
await page.getByPlaceholder('Ask about your server').waitFor({ timeout: 15000 })
const agent = page.getByText('Agent Live')
await agent.waitFor({ timeout: 15000 })
console.log('AGENT LIVE')

const input = page.getByPlaceholder('Ask about your server')
await input.fill('Read resources/demo/config.lua and tell me the exact value of Config.Greeting. Do not change any files.')
await input.press('Enter')
await page.getByText('fixture-greeting-ui', { exact: false }).waitFor({ timeout: 120000 })
console.log('CHAT READ OK')

await input.fill('Change Config.Greeting in resources/demo/config.lua to applied-from-desktop. Stage the change for me to approve. Do not invent other files.')
await input.press('Enter')
await page.getByText(/Thinking/i).waitFor({ timeout: 15000 }).catch(() => {})
await page.getByText('Thinking', { exact: false }).waitFor({ state: 'detached', timeout: 180000 }).catch(() => {})
await page.getByRole('button', { name: 'Changes' }).click()
const apply = page.getByRole('button', { name: 'Apply' }).first()
await apply.waitFor({ timeout: 20000 })
await apply.click()
await page.getByText(/applied/i).first().waitFor({ timeout: 30000 })
console.log('APPLY CLICKED')
process.exit(0)

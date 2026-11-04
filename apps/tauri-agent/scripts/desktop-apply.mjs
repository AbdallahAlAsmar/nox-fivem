import { createRequire } from 'node:module'
import fs from 'node:fs'

const require = createRequire('C:/Users/2026/Desktop/Noxes/Noxes-app/apps/tauri-agent/package.json')
const { chromium } = require('playwright')

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222')
const page = browser
  .contexts()
  .flatMap((context) => context.pages())
  .find((item) => item.url().includes('localhost:1420'))
if (!page) {
  console.log('desktop page not open')
  process.exit(1)
}

async function waitUntilReady() {
  await page.waitForFunction(() => {
    const input = document.querySelector('input[placeholder^="Ask about your server"]')
    return input instanceof HTMLInputElement && !input.disabled
  }, { timeout: 180000 })
}

await waitUntilReady()
const input = page.getByPlaceholder('Ask about your server')
await input.fill('Change Config.Greeting in resources/demo/config.lua to applied-from-desktop. Use propose_remote_write so I can approve it. Do not edit any other file.')
await input.press('Enter')
console.log('CHANGE SENT')
await waitUntilReady()
console.log('CHANGE DONE')
console.log((await page.locator('body').innerText()).slice(-800).replace(/\n/g, ' | '))

await page.getByRole('button', { name: 'Changes', exact: true }).first().click()
const apply = page.getByRole('button', { name: 'Apply', exact: true }).first()
await apply.waitFor({ timeout: 20000 })
await apply.click()
await page.getByText(/applied/i).first().waitFor({ timeout: 30000 })
const file = fs.readFileSync('C:/Users/2026/AppData/Local/noxes-ui-fixture/resources/demo/config.lua', 'utf8')
console.log('FILE', file.replace(/\n/g, ' | '))
if (!file.includes('applied-from-desktop')) {
  console.log('file was not updated')
  process.exit(1)
}
console.log('APPLY OK')
process.exit(0)

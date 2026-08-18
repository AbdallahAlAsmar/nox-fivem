// Post-build script: copy Clerk JS files from public/ to dist/assets/
// This ensures Clerk chunks are available in the production build
import { copyFileSync, mkdirSync, existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, 'public')
const distDir = join(__dirname, 'dist')
const assetsDir = join(distDir, 'assets')

// Ensure assets directory exists
mkdirSync(assetsDir, { recursive: true })

// List of Clerk JS files to copy
const clerkFiles = [
  'clerk.browser.js',
  'framework_clerk.browser_0cc2cca54d.js',
  'ui-common_clerk.browser_0cc2cc_5.127.2.js',
  'signin_clerk.browser_0cc2cc_5.127.2.js',
  'signup_clerk.browser_0cc2cc_5.127.2.js',
  'base-account-sdk_clerk.browser_0cc2cc_5.127.2.js',
  'op-plans-page_clerk.browser_0cc2cc_5.127.2.js',
  'subscriptionDetails_clerk.browser_0cc2cc_5.127.2.js',
  'taskSetupMFA_clerk.browser_0cc2cc_5.127.2.js',
  'vendors_clerk.browser_0cc2cc_5.127.2.js',
  'web3-solana-wallet-buttons_clerk.browser_0cc2cc_5.127.2.js',
  'zxcvbn-ts-core_clerk.browser_0cc2cc_5.127.2.js',
  'zxcvbn-common_clerk.browser_0cc2cc_5.127.2.js',
]

// Also copy numbered chunks from dist/ subfolder
const numberedChunks = [
  '2172_clerk.browser_0cc2cc_5.127.2.js',
  '4170_clerk.browser_0cc2cc_5.127.2.js',
  '5192_clerk.browser_0cc2cc_5.127.2.js',
]

let copied = 0
let errors = 0

for (const file of [...clerkFiles, ...numberedChunks]) {
  const src = join(publicDir, file)
  const dest = join(assetsDir, file)
  
  if (existsSync(src)) {
    try {
      copyFileSync(src, dest)
      copied++
    } catch (e) {
      console.error(`Failed to copy ${file}:`, e.message)
      errors++
    }
  } else {
    console.warn(`Source not found: ${src}`)
  }
}

console.log(`Copied ${copied} Clerk JS files to dist/assets/ (${errors} errors)`)

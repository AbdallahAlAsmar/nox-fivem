import fs from 'node:fs'
import { createRequire } from 'node:module'

const env = fs.readFileSync(new URL('../.env', import.meta.url), 'utf8')
const url = env.match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim().replace(/^["']|["']$/g, '')
if (!url) {
  console.log('no database url')
  process.exit(1)
}
process.env.DATABASE_URL = url

const require = createRequire('C:/Users/2026/Desktop/Noxes/Noxes-app/packages/db/package.json')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const change = await prisma.change.findUnique({
  where: { id: 'cmvfhqnna000p111dxjdm53yr' },
  select: { status: true, applyResult: true, diff: true, filesTouched: true },
})
console.log(JSON.stringify({
  status: change?.status,
  applyResult: change?.applyResult,
  filesTouched: change?.filesTouched,
  diff: String(change?.diff ?? '').slice(0, 800),
}, null, 2))
await prisma.$disconnect()

import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'

const env = { ...process.env }

if (process.platform === 'win32') {
  const mingwDirectories = [
    env.MINGW_BIN,
    'C:\\msys64\\mingw64\\bin',
    'C:\\msys64\\ucrt64\\bin',
  ].filter(Boolean)

  const mingwBin = mingwDirectories.find((directory) =>
    existsSync(path.join(directory, 'dlltool.exe')) &&
    existsSync(path.join(directory, 'gcc.exe')),
  )

  if (mingwBin) {
    env.PATH = `${mingwBin};${env.PATH ?? ''}`
  }
}

const tauriCli = path.join(
  process.cwd(),
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'tauri.cmd' : 'tauri',
)
const result = spawnSync(tauriCli, process.argv.slice(2), {
  env,
  stdio: 'inherit',
  shell: process.platform === 'win32',
})

if (result.error) {
  console.error(`Could not start Tauri: ${result.error.message}`)
  process.exit(1)
}

process.exit(result.status ?? 1)

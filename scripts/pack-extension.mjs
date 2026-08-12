import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const zip = path.join(root, 'public', 'extension', 'faceto0l-extension.zip')
const staging = path.join(process.env.TEMP || '/tmp', 'faceto0l-ext-flat')
const src = path.join(root, 'extension')

fs.rmSync(staging, { recursive: true, force: true })
fs.mkdirSync(staging, { recursive: true })
fs.mkdirSync(path.dirname(zip), { recursive: true })

// Flat pack: manifest.json at zip root so Load unpacked works after Windows unzip
for (const f of fs.readdirSync(src)) {
  const from = path.join(src, f)
  if (fs.statSync(from).isFile()) {
    fs.copyFileSync(from, path.join(staging, f))
  }
}

if (fs.existsSync(zip)) fs.unlinkSync(zip)

// Compress staging/* into zip (files at root of archive)
execFileSync(
  'powershell',
  [
    '-NoProfile',
    '-Command',
    `Compress-Archive -Path '${staging}\\*' -DestinationPath '${zip}' -Force`,
  ],
  { stdio: 'inherit' },
)

console.log('ZIP_OK', fs.statSync(zip).size)

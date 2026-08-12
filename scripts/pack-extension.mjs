import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const zip = path.join(root, 'public', 'extension', 'faceto0l-extension.zip')
const staging = path.join(process.env.TEMP || '/tmp', 'faceto0l-ext-pack')
const folder = path.join(staging, 'faceto0l-extension')

fs.rmSync(staging, { recursive: true, force: true })
fs.mkdirSync(folder, { recursive: true })
fs.mkdirSync(path.dirname(zip), { recursive: true })

for (const f of fs.readdirSync(path.join(root, 'extension'))) {
  fs.copyFileSync(path.join(root, 'extension', f), path.join(folder, f))
}

if (fs.existsSync(zip)) fs.unlinkSync(zip)

execFileSync(
  'powershell',
  ['-NoProfile', '-Command', `Compress-Archive -Path '${folder}' -DestinationPath '${zip}' -Force`],
  { stdio: 'inherit' },
)

console.log('ZIP_OK', fs.statSync(zip).size)

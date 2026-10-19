import { readFile, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const source = new URL('../packages/client/public/afy-mark.svg', import.meta.url)
const png = await sharp(await readFile(source)).png().toBuffer()
for (const target of [
  '../packages/client/public/logo.png',
  '../packages/client/public/coding-agents/hermes.png',
  '../packages/client/public/coding-agents/ekko-agent.png',
  '../packages/desktop/build/icon.png',
  '../packages/desktop/build/icon.icon/Assets/hermes-logo.png',
]) await writeFile(new URL(target, import.meta.url), png)
const result = spawnSync(process.execPath, [fileURLToPath(new URL('../packages/desktop/scripts/generate-rounded-icons.mjs', import.meta.url))], { stdio: 'inherit' })
if (result.error) throw result.error
if (result.status !== 0) throw new Error('Icon generation failed')
await writeFile(new URL('../packages/client/public/favicon.ico', import.meta.url), await readFile(new URL('../packages/desktop/build/icon.ico', import.meta.url)))

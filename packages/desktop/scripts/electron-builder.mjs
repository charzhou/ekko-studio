#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { windowsBuildArgs } from './windows-build-args.mjs'

const sourceArgs = process.argv.slice(2)
if (sourceArgs.some(arg => /^(--)?(mac|linux)(=|$)/.test(arg) || arg === '-m' || arg === '-l')) {
  console.error('Studio desktop packaging supports Windows only.')
  process.exit(1)
}
const args = windowsBuildArgs(sourceArgs.some(arg => /^(--)?win(=|$)/.test(arg))
  ? sourceArgs
  : ['--win', ...sourceArgs])
const require = createRequire(import.meta.url)
const electronBuilderCli = require.resolve('electron-builder/cli')
const result = spawnSync(process.execPath, [electronBuilderCli, ...args, '--publish=never'], { stdio: 'inherit' })
if (result.error) console.error(result.error.message)
process.exit(result.error ? 1 : result.status ?? 1)

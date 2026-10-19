#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runtimeReleaseMetadata, verifyBundledRuntime } from './verify-bundled-runtime.mjs'

const desktopRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const manifest = await verifyBundledRuntime(resolve(desktopRoot, 'resources', 'runtime'), 'win32', 'x64')
const metadataPath = resolve(desktopRoot, 'build', 'runtime-release.json')
mkdirSync(dirname(metadataPath), { recursive: true })
writeFileSync(metadataPath, `${JSON.stringify(runtimeReleaseMetadata(manifest), null, 2)}\n`)
console.log(`[package] staged offline runtime ${manifest.hermesAgentVersion} (${manifest.hermesSource.commit})`)

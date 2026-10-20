#!/usr/bin/env node
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { checkServerModuleBoundaries } from './server-module-boundaries.mjs'
import { hasManagedMcpNodeMode } from './managed-mcp-harness.mjs'
import { checkDshModuleBoundaries } from './dsh-module-harness.mjs'
import { checkCodingAgentModuleBoundaries } from './coding-agent-module-harness.mjs'
import { checkJevIntegrations } from './jev-harness.mjs'
import { checkUiTheme } from './ui-theme-harness.mjs'

const root = process.cwd()
const failures = []
failures.push(...await checkDshModuleBoundaries(root))
failures.push(...await checkCodingAgentModuleBoundaries(root))
failures.push(...await checkJevIntegrations(root))
failures.push(...await checkUiTheme(root))

function fail(message) {
  failures.push(message)
}

async function readText(relativePath) {
  return readFile(path.join(root, relativePath), 'utf8')
}

function requireFile(relativePath) {
  if (!existsSync(path.join(root, relativePath))) {
    fail(`Missing required harness file: ${relativePath}`)
  }
}

function requireDir(relativePath) {
  if (!existsSync(path.join(root, relativePath))) {
    fail(`Missing required project directory: ${relativePath}`)
  }
}

for (const file of [
  'AGENTS.md',
  'ARCHITECTURE.md',
  'DEVELOPMENT.md',
  'docs/harness/README.md',
  'docs/harness/validation.md',
  'docs/harness/worktree-runbook.md',
  'docs/harness/pr-review.md',
  'docs/harness/server-module-boundaries.md',
  'docs/harness/jev-integrations.md',
  'scripts/jev-integrations.json',
  'docs/harness/frontend-ui.md',
  'scripts/ui-theme-baseline.json',
]) {
  requireFile(file)
}

for (const dir of [
  'packages/client/src',
  'packages/server/src',
  'packages/desktop',
  'packages/desktop/build/icons',
  'tests/client',
  'tests/server',
  'tests/e2e',
  '.github/workflows',
]) {
  requireDir(dir)
}

for (const icon of [
  'packages/desktop/build/icon.png',
  'packages/desktop/build/icon.ico',
  'packages/desktop/build/icons/16x16.png',
  'packages/desktop/build/icons/32x32.png',
  'packages/desktop/build/icons/48x48.png',
  'packages/desktop/build/icons/64x64.png',
  'packages/desktop/build/icons/128x128.png',
  'packages/desktop/build/icons/256x256.png',
  'packages/desktop/build/icons/512x512.png',
]) {
  requireFile(icon)
}

const agents = await readText('AGENTS.md')
const agentLines = agents.trimEnd().split(/\r?\n/)
if (agentLines.length > 120) {
  fail(`AGENTS.md should stay short; found ${agentLines.length} lines, expected <= 120`)
}

for (const requiredLink of [
  'DEVELOPMENT.md',
  'ARCHITECTURE.md',
  'docs/harness/README.md',
  'docs/harness/validation.md',
  'docs/harness/worktree-runbook.md',
  'docs/harness/pr-review.md',
]) {
  if (!agents.includes(requiredLink)) {
    fail(`AGENTS.md must link to ${requiredLink}`)
  }
}

if (!agents.includes('docs/harness/frontend-ui.md')) {
  fail('AGENTS.md must link to docs/harness/frontend-ui.md')
}

const packageJson = JSON.parse(await readText('package.json'))
for (const scriptName of [
  'harness:check',
  'test',
  'test:coverage',
  'test:e2e',
  'build',
]) {
  if (!packageJson.scripts?.[scriptName]) {
    fail(`package.json is missing script: ${scriptName}`)
  }
}

const architecture = await readText('ARCHITECTURE.md')
for (const phrase of [
  'packages/client/src',
  'packages/server/src',
  'packages/desktop',
  'HERMES_WEB_UI_HOME',
  'fail_on_unmatched_files: true',
]) {
  if (!architecture.includes(phrase)) {
    fail(`ARCHITECTURE.md should document: ${phrase}`)
  }
}

const buildWorkflow = await readText('.github/workflows/build.yml')
if (!buildWorkflow.includes('npm run harness:check')) {
  fail('Build workflow must run npm run harness:check')
}

for (const failure of await checkServerModuleBoundaries(root)) {
  fail(failure)
}

for (const [file, factory] of [
  ['packages/server/src/modules/hermes/services/mcp/studio-autoinject.ts', 'managedConfig'],
  ['packages/server/src/modules/ekko/services/mcp.ts', 'managedMcpServerConfig'],
  ['packages/server/src/modules/coding-agents/services/index.ts', 'hermesMcpServerConfig'],
]) {
  if (!hasManagedMcpNodeMode(await readText(file), factory)) {
    fail(`${file}: ${factory} must inject ELECTRON_RUN_AS_NODE: '1' into every managed MCP env; Electron fallback must not launch the desktop GUI`)
  }
}


const desktopManifest = JSON.parse(await readText('packages/desktop/package.json'))
const desktopBuild = await readText('packages/desktop/electron-builder.yml')
const manualBuild = await readText('.github/workflows/desktop-manual-build.yml')
if (!desktopBuild.includes('productName: Studio')) fail('Windows application must display Studio')
if (!desktopBuild.includes('appId: com.hermeswebui.studio')) fail('OEM keeps the existing application ID')
if (desktopManifest.name !== 'hermes-studio') fail('OEM keeps the existing desktop package identity')
if (/^(?:mac|linux):/m.test(desktopBuild)) fail('Studio only distributes Windows desktop installers')
if (!manualBuild.includes('--win nsis') || !manualBuild.includes('--publish never')) fail('Windows build must produce installer artifacts without publication')
if (/action-gh-release|gh release/.test(manualBuild)) fail('Studio Windows CI must not publish releases')
// Build-time preparation supplies offline runtime artifacts; it must not restore
// application runtime download/update endpoints or publication feeds.
if (!manualBuild.includes('run prepare:runtime') || !manualBuild.includes('run package:runtime')
  || !manualBuild.includes('studio-runtime-windows-')) fail('Studio Windows CI must prepare and upload offline runtime artifacts')
for (const retired of ['packages/esp32-c3', 'packages/tos', 'Dockerfile', 'docker-compose.yml']) {
  if (existsSync(path.join(root, retired))) fail('Retired OEM distribution remains: ' + retired)
}
if ((await readText('scripts/build-server.mjs')).includes('dist/mcu')) fail('Server build must not stage hardware firmware')
for (const asset of ['packages/client/public/logo-original.png', 'packages/client/public/relay-logo.png', 'packages/client/src/assets/image.gif', 'packages/client/src/assets/thinking.gif']) {
  if (existsSync(path.join(root, asset))) fail('Retired OEM artwork remains: ' + asset)
}
if (!(await readText('packages/client/index.html')).includes('<title>Studio</title>')) fail('Web page must display Studio')
if (failures.length > 0) {
  console.error('Harness check failed:')
  for (const failure of failures) console.error('- ' + failure)
  process.exitCode = 1
} else {
  console.log('Harness check passed: architecture, theme, JEV, managed MCP and Studio OEM distribution contracts.')
}

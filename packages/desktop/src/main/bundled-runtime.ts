import { createHash } from 'node:crypto'
import { execFile } from 'node:child_process'
import { createReadStream, existsSync, readFileSync } from 'node:fs'
import { mkdir, mkdtemp, rename, rm, stat, writeFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { promisify } from 'node:util'
import { extractTarGzipArchive } from './runtime-archive'
import { repairMovedHermesRuntime } from './runtime-relocation'

const execute = promisify(execFile)
const RECEIPT = 'afy-bundled-runtime.json'

type BundledManifest = {
  schema: number
  platform: string
  hermesAgentVersion: string
  hermesSource: { repository: string; ref: string; commit: string; installMethod: string }
  asset: { name: string; sha256: string; size: number }
}

type PrepareOptions = {
  resourceDirectory: string
  storageRoot: string
  platform: string
  activeDirectory?: string
  onProgress?: (stage: 'verify' | 'extract' | 'ready') => void
}

function readManifest(resourceDirectory: string, platform: string): BundledManifest {
  const manifest = JSON.parse(readFileSync(join(resourceDirectory, `hermes-runtime-${platform}.json`), 'utf8')) as BundledManifest
  if (manifest.schema !== 2 || manifest.platform !== platform
    || !/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(manifest.hermesAgentVersion || '')
    || !manifest.hermesSource?.repository || !manifest.hermesSource.ref
    || manifest.hermesSource.installMethod !== 'git'
    || !/^[a-f0-9]{40}$/.test(manifest.hermesSource.commit || '')
    || !/^[a-f0-9]{64}$/.test(manifest.asset?.sha256 || '')
    || !Number.isSafeInteger(manifest.asset.size) || manifest.asset.size <= 0) {
    throw new Error('Invalid bundled Studio runtime manifest')
  }
  const expectedName = `hermes-runtime-hermes-agent-${manifest.hermesAgentVersion}-${platform}.tar.gz`
  if (manifest.asset.name !== expectedName || basename(manifest.asset.name) !== manifest.asset.name) {
    throw new Error('Invalid bundled Studio runtime archive name')
  }
  return manifest
}

function validateExtractedRuntime(root: string, expected: BundledManifest): void {
  const actual = JSON.parse(readFileSync(join(root, 'runtime-manifest.json'), 'utf8')) as BundledManifest
  if (actual.schema !== expected.schema || actual.platform !== expected.platform
    || actual.hermesAgentVersion !== expected.hermesAgentVersion
    || actual.hermesSource?.commit !== expected.hermesSource.commit
    || actual.hermesSource.repository !== expected.hermesSource.repository
    || actual.hermesSource.ref !== expected.hermesSource.ref
    || actual.hermesSource.installMethod !== 'git'
    || actual.asset?.name !== expected.asset.name) {
    throw new Error('Extracted Studio runtime identity does not match its bundle')
  }
  const required = [
    'python/base/python.exe', 'python/venv/Scripts/python.exe',
    'python/venv/Scripts/hermes.cmd', 'python/venv/pyvenv.cfg',
    'python/run_agent.py', 'python/cli.py', 'python/pyproject.toml',
    'python/.git/HEAD', 'node/node.exe', 'git/cmd/git.exe',
  ]
  const missing = required.filter(file => !existsSync(join(root, file)))
  if (missing.length) throw new Error(`Bundled Studio runtime is incomplete: ${missing.join(', ')}`)
  const stamp = JSON.parse(readFileSync(join(root, 'python', 'install-stamp.json'), 'utf8')) as { updateMechanism?: string }
  if (stamp.updateMechanism !== 'external') throw new Error('Bundled Studio runtime must use external management')
}

function isReusable(root: string, manifest: BundledManifest): boolean {
  try {
    const receipt = JSON.parse(readFileSync(join(root, RECEIPT), 'utf8')) as { archiveSha256?: string }
    if (receipt.archiveSha256 !== manifest.asset.sha256) return false
    validateExtractedRuntime(root, manifest)
    return true
  } catch {
    return false
  }
}

async function verifyArchive(file: string, manifest: BundledManifest): Promise<void> {
  if ((await stat(file)).size !== manifest.asset.size) throw new Error('Bundled runtime archive size mismatch')
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(file)) hash.update(chunk)
  if (hash.digest('hex') !== manifest.asset.sha256) throw new Error('Bundled runtime archive checksum mismatch')
}

export async function validateBundledRuntimePython(root: string): Promise<void> {
  // Do not touch the real Hermes home, or allow lazy installs to hide missing
  // packages. Check the copied editable install from outside its source tree.
  const validation = await mkdtemp(join(tmpdir(), 'studio-runtime-check-'))
  try {
    const env = { ...process.env }
    for (const key of Object.keys(env)) {
      if (['PYTHONPATH', 'PYTHONHOME', 'VIRTUAL_ENV', 'UV_PROJECT_ENVIRONMENT', 'HERMES_PYTHON'].includes(key.toUpperCase())) delete env[key]
    }
    Object.assign(env, {
      HERMES_HOME: join(validation, 'home'),
      HERMES_DISABLE_LAZY_INSTALLS: '1',
      PYTHONDONTWRITEBYTECODE: '1',
      UV_PYTHON_DOWNLOADS: 'never',
    })
    const source = join(root, 'python')
    const venv = join(source, 'venv')
    await execute(join(venv, 'Scripts', 'python.exe'), ['-c', [
      'from pathlib import Path',
      'import sys, run_agent, hermes_cli, openai, anthropic, mcp',
      'from run_agent import AIAgent',
      `source = Path(${JSON.stringify(source)}).resolve()`,
      `venv = Path(${JSON.stringify(venv)}).resolve()`,
      'assert Path(sys.prefix).resolve() == venv',
      'for module in (run_agent, hermes_cli, openai, anthropic, mcp):',
      '    assert Path(module.__file__).resolve().is_relative_to(source), module.__name__',
      'assert callable(AIAgent)',
    ].join('\n')], { cwd: validation, env, windowsHide: true, timeout: 120_000, maxBuffer: 2 * 1024 * 1024 })
  } finally {
    await rm(validation, { recursive: true, force: true })
  }
}

export async function prepareBundledRuntime(options: PrepareOptions): Promise<string> {
  if (options.platform !== 'win-x64') throw new Error(`Unsupported bundled runtime platform: ${options.platform}`)
  const manifest = readManifest(options.resourceDirectory, options.platform)
  const versionKey = `${manifest.hermesAgentVersion}-${manifest.asset.sha256.slice(0, 16)}`
  let target = join(options.storageRoot, 'hermes', versionKey, options.platform)
  const candidates = new Set([options.activeDirectory, target].filter((value): value is string => Boolean(value)))
  for (const candidate of candidates) {
    if (!isReusable(candidate, manifest)) continue
    try {
      repairMovedHermesRuntime(candidate, candidate, candidate)
      await validateBundledRuntimePython(candidate)
      options.onProgress?.('ready')
      return candidate
    } catch (error) {
      console.warn(`[runtime] cached Studio runtime failed validation; preparing a fresh copy: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  options.onProgress?.('verify')
  const archive = join(options.resourceDirectory, manifest.asset.name)
  await verifyArchive(archive, manifest)
  // Keep a corrupt cache for diagnosis. Never replace any existing environment
  // or the user's data in order to prepare a new runtime.
  if (existsSync(target)) target = join(options.storageRoot, 'hermes', `${versionKey}-${Date.now()}`, options.platform)
  await mkdir(dirname(target), { recursive: true })
  const stage = await mkdtemp(join(dirname(target), '.studio-install-'))
  try {
    options.onProgress?.('extract')
    await extractTarGzipArchive(archive, stage)
    validateExtractedRuntime(stage, manifest)
    repairMovedHermesRuntime(stage, stage, stage)
    await validateBundledRuntimePython(stage)
    repairMovedHermesRuntime(stage, stage, target)
    await writeFile(join(stage, RECEIPT), JSON.stringify({ archiveSha256: manifest.asset.sha256 }, null, 2) + '\n')
    await rename(stage, target)
    options.onProgress?.('ready')
    return target
  } finally {
    await rm(stage, { recursive: true, force: true })
  }
}

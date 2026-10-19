import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs'
import {
  cp as copyAsync,
  mkdir as mkdirAsync,
  rename as renameAsync,
  rm as removeAsync,
} from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { app } from 'electron'
import {
  desktopRuntimeDir,
  desktopRuntimeVersion,
  runtimePlatformKey,
  runtimeStorageRoot,
  webUiHome,
  webuiDir,
} from './paths'
import {
  compareHermesAgentVersions,
  hermesAgentVersionFromRuntimeTag,
  runtimeManifestMatchesHermesAgentVersion,
} from './runtime-version'
import {
  repairMovedHermesRuntime,
  windowsRuntimeNeedsRelocationRepair,
} from './runtime-relocation'
import { t } from './desktop-i18n'

const RUNTIME_MANIFEST_NAME = 'runtime-manifest.json'
const PACKAGED_RUNTIME_RELEASE_NAME = 'runtime-release.json'
const ACTIVE_RUNTIME_VERSION_NAME = 'active-version.json'

export type RuntimeDownloadSource = 'cf' | 'github'

type RuntimeManifest = {
  schema: number
  platform: string
  hermesAgentVersion?: string
  hermesSource?: {
    repository?: string
    ref?: string
    commit?: string
    installMethod?: string
  }
  asset?: {
    name: string
    url?: string
    sha256?: string
    size?: number
  }
}

type PackagedRuntimeRelease = {
  tag?: string
  hermesAgentVersion?: string
}

type ActiveRuntimeVersion = {
  schema?: number
  desktopAppVersion?: string
  hermesRuntimeVersion?: string
  webUiVersion?: string
  runtimeDirectory?: string
  runtimeRootDirectory?: string
  pendingRuntimeRootDirectory?: string
  runtimeMigrationError?: string
  runtimeActivationError?: string
  runtimeValidationFailures?: Array<{
    version: string
    platform: string
    directory: string
    reason: string
    failedAt: string
  }>
  webUiDirectory?: string
  platform?: string
  updatedAt?: string
}

export type RuntimeProgress = {
  stage: 'resolve' | 'download' | 'verify' | 'extract' | 'ready'
  message: string
  detail?: string
  percent?: number
  receivedBytes?: number
  totalBytes?: number
}

type RuntimeProgressHandler = (progress: RuntimeProgress) => void

function requiredRuntimeFiles(root: string): string[] {
  const pythonRoot = runtimePythonEnvironmentRoot(root)
  const pythonBin = runtimePythonExecutable(pythonRoot)
  const hermesBin = process.platform === 'win32'
    ? join(pythonRoot, 'Scripts', 'hermes.cmd')
    : join(pythonRoot, 'bin', 'hermes')
  const nodeBin = process.platform === 'win32'
    ? join(root, 'node', 'node.exe')
    : join(root, 'node', 'bin', 'node')
  const files = [
    pythonBin,
    hermesBin,
    join(root, 'python', 'run_agent.py'),
    join(root, 'python', 'cli.py'),
    nodeBin,
    join(root, RUNTIME_MANIFEST_NAME),
  ]
  if (process.platform === 'win32') files.push(join(root, 'git', 'cmd', 'git.exe'))
  return files
}

function runtimePythonEnvironmentRoot(runtimeRoot: string): string {
  const sourceRoot = join(runtimeRoot, 'python')
  const venvRoot = join(sourceRoot, 'venv')
  const venvPythons = process.platform === 'win32'
    ? [join(venvRoot, 'Scripts', 'python.exe'), join(venvRoot, 'python.exe')]
    : [join(venvRoot, 'bin', 'python3')]
  return venvPythons.some(existsSync) ? venvRoot : sourceRoot
}

function runtimePythonExecutable(environmentRoot: string): string {
  if (process.platform !== 'win32') return join(environmentRoot, 'bin', 'python3')
  const standardVenvPython = join(environmentRoot, 'Scripts', 'python.exe')
  return existsSync(standardVenvPython)
    ? standardVenvPython
    : join(environmentRoot, 'python.exe')
}

function missingRuntimeFiles(root: string): string[] {
  return requiredRuntimeFiles(root).filter(file => !existsSync(file))
}

function requiredWebUiFiles(root: string): string[] {
  return [
    join(root, 'package.json'),
    join(root, 'bin', 'hermes-web-ui.mjs'),
    join(root, 'dist', 'server', 'index.js'),
  ]
}

function validateWebUiVersion(root: string, version: string): void {
  const missing = requiredWebUiFiles(root).filter(file => !existsSync(file))
  if (missing.length > 0) {
    throw new Error(`Web UI ${version} is missing required files: ${missing.map(file => relative(root, file)).join(', ')}`)
  }
}

function webUiVersionReady(root: string): boolean {
  return requiredWebUiFiles(root).every(file => existsSync(file))
}

function validateWebUiVersions(root: string): void {
  if (!existsSync(root)) return
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const versionRoot = join(root, entry.name)
    validateWebUiVersion(versionRoot, entry.name)
  }
}

function validateRuntimeDirectory(root: string, label: string): void {
  const missing = missingRuntimeFiles(root)
  if (missing.length > 0) {
    throw new Error(`${label} is missing required files: ${missing.map(file => relative(root, file)).join(', ')}`)
  }
  const manifest = readCachedRuntimeManifest(root)
  if (!manifest) {
    throw new Error(`${label} has an invalid ${RUNTIME_MANIFEST_NAME}`)
  }
  if (manifest.platform && manifest.platform !== runtimePlatformKey()) {
    throw new Error(`Runtime platform mismatch: expected ${runtimePlatformKey()}, received ${manifest.platform}`)
  }
  if (manifest.schema >= 2) {
    const sourceFiles = [
      join(root, 'python', '.git', 'HEAD'),
      join(root, 'python', 'pyproject.toml'),
    ]
    const missingSourceFiles = sourceFiles.filter(file => !existsSync(file))
    if (missingSourceFiles.length > 0) {
      throw new Error(
        `${label} is missing updateable Hermes source files: `
        + missingSourceFiles.map(file => relative(root, file)).join(', '),
      )
    }
    if (manifest.hermesSource?.installMethod !== 'git'
      || !manifest.hermesSource.repository
      || !manifest.hermesSource.ref
      || !/^[0-9a-f]{40}$/i.test(manifest.hermesSource.commit || '')) {
      throw new Error(`${label} has invalid Hermes Git source metadata`)
    }
  }
}

function runtimeDirectoryReadyForMigration(root: string): boolean {
  try {
    validateRuntimeDirectory(root, 'Runtime')
    return true
  } catch {
    return false
  }
}

function runtimeReady(): boolean {
  return rootRuntimeReady(desktopRuntimeDir())
}

function rootRuntimeReady(root: string): boolean {
  const pythonRoot = runtimePythonEnvironmentRoot(root)
  const gitPath = process.platform === 'win32' ? join(root, 'git', 'cmd', 'git.exe') : null
  const hermesPath = process.platform === 'win32'
    ? [
        join(pythonRoot, 'Scripts', 'hermes.cmd'),
        join(pythonRoot, 'Scripts', 'hermes.exe'),
      ].find(existsSync)
    : join(pythonRoot, 'bin', 'hermes')
  return existsSync(runtimePythonExecutable(pythonRoot))
    && Boolean(hermesPath)
    && existsSync(process.platform === 'win32' ? join(root, 'node', 'node.exe') : join(root, 'node', 'bin', 'node'))
    && (!gitPath || existsSync(gitPath))
}

export function isDesktopRuntimeReady(): boolean {
  return runtimeReady()
}

export function repairUpdatedDesktopRuntimeLaunchers(): boolean {
  if (process.platform !== 'win32') return false

  const runtimeRoot = desktopRuntimeDir()
  if (!windowsRuntimeNeedsRelocationRepair(runtimeRoot)) return false

  try {
    const repair = repairMovedHermesRuntime(runtimeRoot, runtimeRoot, runtimeRoot)
    const repaired = !windowsRuntimeNeedsRelocationRepair(runtimeRoot)
      && (repair.editableFilesRewritten > 0 || repair.launchersRewritten > 0)
    if (repaired) {
      console.log(
        `[runtime] repaired cached Windows Runtime: `
        + `${repair.editableFilesRewritten} path reference(s), `
        + `${repair.launchersRewritten} launcher(s)`,
      )
    }
    return repaired
  } catch (err) {
    console.warn(
      `[runtime] failed to repair cached Windows Runtime: `
      + `${err instanceof Error ? err.message : String(err)}`,
    )
    return false
  }
}

function packagedRuntimeReleaseMetadata(): PackagedRuntimeRelease | null {
  const candidates = app.isPackaged
    ? [join(process.resourcesPath, 'build', PACKAGED_RUNTIME_RELEASE_NAME)]
    : [join(app.getAppPath(), 'build', PACKAGED_RUNTIME_RELEASE_NAME)]

  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue
    try {
      const metadata = JSON.parse(readFileSync(candidate, 'utf-8')) as { tag?: unknown; hermesAgentVersion?: unknown }
      return {
        tag: typeof metadata.tag === 'string' && metadata.tag.trim() ? metadata.tag.trim() : undefined,
        hermesAgentVersion: typeof metadata.hermesAgentVersion === 'string' && metadata.hermesAgentVersion.trim()
          ? metadata.hermesAgentVersion.trim()
          : undefined,
      }
    } catch {}
  }

  return null
}

export function cachedRuntimeNeedsPackagedReleaseUpdate(): boolean {
  const metadata = packagedRuntimeReleaseMetadata()
  const expectedVersion = process.env.HERMES_DESKTOP_RUNTIME_RELEASE_TAG
    ? hermesAgentVersionFromRuntimeTag(process.env.HERMES_DESKTOP_RUNTIME_RELEASE_TAG)
    : metadata?.hermesAgentVersion || hermesAgentVersionFromRuntimeTag(metadata?.tag)
  if (!expectedVersion) return false
  const manifest = readCachedRuntimeManifest(desktopRuntimeDir())
  const assetVersion = typeof manifest?.asset?.name === 'string'
    ? manifest.asset.name.match(/hermes-agent-([^-]+)-/)?.[1]
    : undefined
  const cachedVersion = manifest?.hermesAgentVersion || assetVersion
  const comparison = compareHermesAgentVersions(cachedVersion, expectedVersion)
  if (comparison !== null) return comparison < 0
  const match = runtimeManifestMatchesHermesAgentVersion(manifest, expectedVersion)
  return match === false
}

function readCachedRuntimeManifest(root: string): RuntimeManifest | null {
  const file = join(root, RUNTIME_MANIFEST_NAME)
  if (!existsSync(file)) return null
  try {
    return JSON.parse(readFileSync(file, 'utf-8')) as RuntimeManifest
  } catch {
    return null
  }
}

function webUiVersion(): string {
  const packageJson = join(webuiDir(), 'package.json')
  try {
    const metadata = JSON.parse(readFileSync(packageJson, 'utf-8')) as { version?: unknown }
    if (typeof metadata.version === 'string' && metadata.version.trim()) return metadata.version.trim()
  } catch {}
  return app.getVersion()
}

function activeVersionPath(): string {
  return join(webUiHome(), 'desktop-runtime', ACTIVE_RUNTIME_VERSION_NAME)
}

function readActiveRuntimeVersion(): ActiveRuntimeVersion | null {
  const file = activeVersionPath()
  if (!existsSync(file)) return null
  try {
    return JSON.parse(readFileSync(file, 'utf-8')) as ActiveRuntimeVersion
  } catch {
    return null
  }
}

function writeActiveRuntimeManifest(active: ActiveRuntimeVersion): void {
  const file = activeVersionPath()
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, JSON.stringify(active, null, 2) + '\n')
}

async function copyTreeForMigration(source: string, destination: string): Promise<void> {
  // Hermes/uv can add directory symlinks after an update. Recreating them
  // requires elevated Windows privileges, so make the migrated copy self-contained.
  const materializeLinks = process.platform === 'win32'
  await copyAsync(source, destination, {
    recursive: true,
    force: true,
    dereference: materializeLinks,
    verbatimSymlinks: !materializeLinks,
  })
}

export async function migratePendingRuntimeRoot(
  onProgress?: RuntimeProgressHandler,
): Promise<{ migrated: boolean; error: string }> {
  const active = readActiveRuntimeVersion()
  const pendingRoot = active?.pendingRuntimeRootDirectory?.trim()
  if (!active || !pendingRoot) return { migrated: false, error: '' }

  const sourceRuntime = desktopRuntimeDir()
  const sourceRoot = runtimeStorageRoot()
  const sourceWebUiRoot = join(sourceRoot, 'webui')
  const targetRoot = resolve(pendingRoot)
  const manifest = readCachedRuntimeManifest(sourceRuntime)
  const version = manifest?.hermesAgentVersion || active.hermesRuntimeVersion || desktopRuntimeVersion()
  const targetRuntime = join(targetRoot, 'hermes', version, runtimePlatformKey())
  const targetWebUiRoot = join(targetRoot, 'webui')
  const tempRuntime = join(dirname(targetRuntime), `.runtime-migration-${process.pid}-${Date.now()}`)
  const tempWebUiRoot = join(targetRoot, `.webui-migration-${process.pid}-${Date.now()}`)

  try {
    const relativeTarget = relative(resolve(sourceRuntime), targetRoot)
    if (relativeTarget === ''
      || (relativeTarget !== '..' && !relativeTarget.startsWith(`..${sep}`) && !isAbsolute(relativeTarget))) {
      throw new Error('Runtime migration destination cannot be inside the current Runtime directory')
    }

    if (resolve(sourceRuntime) === resolve(targetRuntime)) {
      const next: ActiveRuntimeVersion = {
        ...active,
        runtimeRootDirectory: targetRoot,
        runtimeMigrationError: '',
        updatedAt: new Date().toISOString(),
      }
      delete next.pendingRuntimeRootDirectory
      delete next.webUiDirectory
      writeActiveRuntimeManifest(next)
      return { migrated: true, error: '' }
    }

    const shouldCopyRuntime = !runtimeDirectoryReadyForMigration(targetRuntime)
    if (shouldCopyRuntime && !rootRuntimeReady(sourceRuntime)) {
      throw new Error(`Current Runtime is incomplete: ${sourceRuntime}`)
    }

    const shouldMergeWebUi = existsSync(sourceWebUiRoot)
      && resolve(sourceWebUiRoot) !== resolve(targetWebUiRoot)
    const webUiVersionsToCopy: string[] = []
    if (shouldMergeWebUi) {
      const sourceVersions = readdirSync(sourceWebUiRoot, { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name)
      const sourceVersionSet = new Set(sourceVersions)

      if (existsSync(targetWebUiRoot)) {
        for (const entry of readdirSync(targetWebUiRoot, { withFileTypes: true })) {
          if (entry.isDirectory() && !sourceVersionSet.has(entry.name)) {
            validateWebUiVersion(join(targetWebUiRoot, entry.name), entry.name)
          }
        }
      }

      for (const webUiVersion of sourceVersions) {
        const targetVersion = join(targetWebUiRoot, webUiVersion)
        if (webUiVersionReady(targetVersion)) continue
        validateWebUiVersion(join(sourceWebUiRoot, webUiVersion), webUiVersion)
        webUiVersionsToCopy.push(webUiVersion)
      }
    }

    if (shouldCopyRuntime || webUiVersionsToCopy.length > 0) {
      onProgress?.({
        stage: 'extract',
        message: t('runtime.migrating'),
        detail: targetRoot,
      })
    }

    if (shouldCopyRuntime) {
      await mkdirAsync(dirname(targetRuntime), { recursive: true })
      await removeAsync(tempRuntime, { recursive: true, force: true })
      await copyTreeForMigration(sourceRuntime, tempRuntime)
      const relocation = repairMovedHermesRuntime(tempRuntime, sourceRuntime, targetRuntime)
      if (relocation.editableFilesRewritten || relocation.launchersRewritten) {
        console.log(
          `[runtime] repaired migrated Hermes runtime: `
          + `${relocation.editableFilesRewritten} editable reference(s), `
          + `${relocation.launchersRewritten} launcher(s)`,
        )
      }
      validateRuntimeDirectory(tempRuntime, 'Migrated Runtime')
    }

    if (webUiVersionsToCopy.length > 0) {
      await removeAsync(tempWebUiRoot, { recursive: true, force: true })
      await mkdirAsync(tempWebUiRoot, { recursive: true })
      for (const webUiVersion of webUiVersionsToCopy) {
        const stagedVersion = join(tempWebUiRoot, webUiVersion)
        await copyTreeForMigration(join(sourceWebUiRoot, webUiVersion), stagedVersion)
        validateWebUiVersion(stagedVersion, webUiVersion)
      }
      validateWebUiVersions(tempWebUiRoot)
    }

    if (shouldCopyRuntime) {
      await removeAsync(targetRuntime, { recursive: true, force: true })
      await renameAsync(tempRuntime, targetRuntime)
    }
    if (webUiVersionsToCopy.length > 0) {
      await mkdirAsync(targetWebUiRoot, { recursive: true })
      for (const webUiVersion of webUiVersionsToCopy) {
        const targetVersion = join(targetWebUiRoot, webUiVersion)
        await removeAsync(targetVersion, { recursive: true, force: true })
        await renameAsync(join(tempWebUiRoot, webUiVersion), targetVersion)
      }
      await removeAsync(tempWebUiRoot, { recursive: true, force: true })
    }

    const next: ActiveRuntimeVersion = {
      ...active,
      schema: 1,
      hermesRuntimeVersion: version,
      runtimeDirectory: targetRuntime,
      runtimeRootDirectory: targetRoot,
      runtimeMigrationError: '',
      platform: runtimePlatformKey(),
      updatedAt: new Date().toISOString(),
    }
    delete next.pendingRuntimeRootDirectory
    delete next.webUiDirectory
    writeActiveRuntimeManifest(next)
    console.log(
      `[runtime] switched desktop runtime storage to ${targetRoot}; `
      + `${shouldCopyRuntime ? 'copied' : 'reused'} Runtime, copied ${webUiVersionsToCopy.length} Web UI version(s); `
      + `previous storage retained at ${sourceRoot}`,
    )
    return { migrated: true, error: '' }
  } catch (err) {
    await Promise.allSettled([
      removeAsync(tempRuntime, { recursive: true, force: true }),
      removeAsync(tempWebUiRoot, { recursive: true, force: true }),
    ])
    const error = err instanceof Error ? err.message : String(err)
    const next: ActiveRuntimeVersion = {
      ...active,
      runtimeMigrationError: error,
      updatedAt: new Date().toISOString(),
    }
    delete next.pendingRuntimeRootDirectory
    delete next.webUiDirectory
    try {
      writeActiveRuntimeManifest(next)
    } catch (writeErr) {
      console.warn(`[runtime] failed to persist desktop runtime storage migration error: ${writeErr instanceof Error ? writeErr.message : String(writeErr)}`)
    }
    console.warn(`[runtime] failed to migrate desktop runtime storage: ${error}`)
    return { migrated: false, error }
  }
}

export function writeActiveRuntimeVersion(
  runtimeRoot = desktopRuntimeDir(),
  options: { clearRuntimeActivationError?: boolean } = {},
): void {
  const manifest = readCachedRuntimeManifest(runtimeRoot)
  const hermesRuntimeVersion = manifest?.hermesAgentVersion || desktopRuntimeVersion()
  const selectedWebUiDirectory = webuiDir()
  const active = readActiveRuntimeVersion()
  const desktopAppVersion = app.getVersion().trim()
  const previousDesktopAppVersion = active?.desktopAppVersion?.trim() || ''
  const desktopAppVersionChanged = Boolean(
    active
    && desktopAppVersion
    && previousDesktopAppVersion !== desktopAppVersion,
  )
  const activeWebUiVersion = active?.webUiVersion?.trim().replace(/^v/, '') || ''
  const expectedWebUiDirectory = activeWebUiVersion
    ? join(runtimeStorageRoot(), 'webui', activeWebUiVersion)
    : ''
  const hasWebUiOverride = !!process.env.HERMES_WEB_UI_DIR?.trim()
  const usingDownloadedWebUi = !!expectedWebUiDirectory
    && resolve(selectedWebUiDirectory) === resolve(expectedWebUiDirectory)
  const next: ActiveRuntimeVersion = {
    ...(active || {}),
    schema: 1,
    desktopAppVersion,
    hermesRuntimeVersion,
    runtimeDirectory: runtimeRoot,
    platform: runtimePlatformKey(),
    updatedAt: new Date().toISOString(),
  }
  next.runtimeValidationFailures = (active?.runtimeValidationFailures || [])
    .filter(failure => resolve(failure.directory) !== resolve(runtimeRoot))
  if (desktopAppVersionChanged) {
    delete next.webUiVersion
    if (activeWebUiVersion) {
      console.log(
        `[runtime] desktop updated from ${previousDesktopAppVersion || 'a legacy version'} `
        + `to ${desktopAppVersion}; using bundled Web UI`,
      )
    }
  } else if (hasWebUiOverride) {
    // Development overrides are temporary and must not replace the persisted downloaded version.
  } else if (usingDownloadedWebUi) {
    next.webUiVersion = webUiVersion()
  } else {
    delete next.webUiVersion
  }
  delete next.webUiDirectory
  if (options.clearRuntimeActivationError) delete next.runtimeActivationError
  writeActiveRuntimeManifest(next)
}

// Runtime installation is managed outside this distribution. Ignore every legacy
// URL/source/force-update override while retaining existing local runtimes.
export async function ensureDesktopRuntime(
  onProgress?: RuntimeProgressHandler,
  _source?: RuntimeDownloadSource,
): Promise<void> {
  if (!runtimeReady()) throw new Error(t('runtime.localRequired'))
  onProgress?.({ stage: 'ready', message: t('runtime.ready') })
}

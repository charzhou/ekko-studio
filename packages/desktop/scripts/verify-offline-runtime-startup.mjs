import { mkdtemp, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { isAbsolute, join, relative } from 'node:path'

const require = createRequire(import.meta.url)

export async function verifyOfflineRuntimeStartup(resourceDirectory) {
  if (process.platform !== 'win32' || process.arch !== 'x64') {
    throw new Error('Packaged offline runtime initialization must be verified on native Windows x64')
  }
  // Exercise the exact main-process provisioner with the resources copied by
  // electron-builder. Its own Python check isolates HERMES_HOME and disables
  // lazy dependency installs; this check never activates a user installation.
  const { prepareBundledRuntime, validateBundledRuntimePython } = require('../dist/main/bundled-runtime.js')
  if (typeof validateBundledRuntimePython !== 'function') {
    throw new Error('Desktop build does not export bundled runtime Python validation')
  }
  const sandbox = await mkdtemp(join(tmpdir(), 'AFY Studio 离线初始化-'))
  try {
    const storageRoot = join(sandbox, '用户数据 AFY Studio')
    const initialProgress = []
    const runtime = await prepareBundledRuntime({
      resourceDirectory,
      storageRoot,
      platform: 'win-x64',
      onProgress: stage => initialProgress.push(stage),
    })
    const relativeRuntime = relative(storageRoot, runtime)
    if (!relativeRuntime || relativeRuntime.startsWith('..') || isAbsolute(relativeRuntime)
      || !initialProgress.includes('verify') || !initialProgress.includes('extract')
      || initialProgress.at(-1) !== 'ready') {
      throw new Error('Packaged runtime did not initialize a fresh isolated cache')
    }
    // The provisioner checks staging before rename. Validate again at its final
    // destination to catch a venv config or editable path still naming staging.
    await validateBundledRuntimePython(runtime)
    const reusedProgress = []
    const reusedRuntime = await prepareBundledRuntime({
      resourceDirectory,
      storageRoot,
      platform: 'win-x64',
      onProgress: stage => reusedProgress.push(stage),
    })
    if (reusedRuntime !== runtime || reusedProgress.includes('extract')
      || reusedProgress.includes('verify') || reusedProgress.at(-1) !== 'ready') {
      throw new Error('Packaged offline runtime cache was not reused on second initialization')
    }
    await validateBundledRuntimePython(reusedRuntime)
    console.log('[package] verified offline runtime extraction, final-path imports and second-launch reuse with spaces and Chinese paths')
  } finally {
    await rm(sandbox, { recursive: true, force: true })
  }
}

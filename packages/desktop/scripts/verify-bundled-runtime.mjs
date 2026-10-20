import { createReadStream, readFileSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'

export async function verifyBundledRuntime(runtimeRoot, platform, arch) {
  if (platform !== 'win32' || arch !== 'x64') {
    throw new Error(`Studio offline installers currently require win32-x64, received ${platform}-${arch}`)
  }
  const platformKey = `win-${arch}`
  const manifestPath = join(runtimeRoot, `hermes-runtime-${platformKey}.json`)
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  if (manifest.schema !== 2 || manifest.platform !== platformKey
    || manifest.targetOs !== platform || manifest.targetArch !== arch) {
    throw new Error(`Bundled runtime manifest platform/schema mismatch: ${manifestPath}`)
  }
  if (typeof manifest.hermesAgentVersion !== 'string'
    || !/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(manifest.hermesAgentVersion)
    || typeof manifest.hermesSource?.repository !== 'string'
    || !manifest.hermesSource.repository
    || typeof manifest.hermesSource.ref !== 'string'
    || !manifest.hermesSource.ref
    || !/^[0-9a-f]{40}$/.test(manifest.hermesSource?.commit || '')
    || manifest.hermesSource.installMethod !== 'git') {
    throw new Error(`Bundled runtime source identity is incomplete: ${manifestPath}`)
  }
  const expectedAsset = `hermes-runtime-hermes-agent-${manifest.hermesAgentVersion}-${platformKey}.tar.gz`
  if (manifest.asset?.name !== expectedAsset
    || !/^[0-9a-f]{64}$/.test(manifest.asset?.sha256 || '')
    || !Number.isSafeInteger(manifest.asset?.size) || manifest.asset.size <= 0) {
    throw new Error(`Bundled runtime archive metadata is invalid: ${manifestPath}`)
  }
  const archivePath = join(runtimeRoot, expectedAsset)
  if (!statSync(archivePath).isFile() || statSync(archivePath).size !== manifest.asset.size) {
    throw new Error(`Bundled runtime archive size mismatch: ${archivePath}`)
  }
  const checksum = readFileSync(`${archivePath}.sha256`, 'utf8').trim()
  if (checksum !== `${manifest.asset.sha256}  ${expectedAsset}`) {
    throw new Error(`Bundled runtime checksum file disagrees with manifest: ${archivePath}.sha256`)
  }
  const digest = createHash('sha256')
  for await (const chunk of createReadStream(archivePath)) digest.update(chunk)
  if (digest.digest('hex') !== manifest.asset.sha256) {
    throw new Error(`Bundled runtime archive SHA-256 mismatch: ${archivePath}`)
  }
  return manifest
}

export function runtimeReleaseMetadata(manifest) {
  return {
    tag: `hermes-${manifest.hermesAgentVersion}-runtime`,
    hermesAgentVersion: manifest.hermesAgentVersion,
    hermesSource: {
      repository: manifest.hermesSource.repository,
      ref: manifest.hermesSource.ref,
      commit: manifest.hermesSource.commit,
    },
  }
}

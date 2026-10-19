import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  desktopPreloadArguments,
  remoteServerUrlFromEnv,
  remoteServerUrlFromSettings,
  resolveRemoteServerUrl,
  waitForRemoteServerReady,
} from '../../packages/desktop/src/main/remote-server'

afterEach(() => { vi.unstubAllGlobals() })

describe('AFY Studio local desktop server', () => {
  it('ignores remote URLs from old settings and launch environment', () => {
    const home = mkdtempSync(join(tmpdir(), 'afy-local-server-'))
    try {
      writeFileSync(join(home, 'desktop-remote-server.json'), JSON.stringify({ serverUrl: 'https://remote.example.com' }))
      const env = { EKKO_STUDIO_DESKTOP_SERVER_URL: 'https://another.example.com' }
      expect(remoteServerUrlFromEnv(env)).toBeNull()
      expect(remoteServerUrlFromSettings(home)).toBeNull()
      expect(resolveRemoteServerUrl(env, home)).toBeNull()
    } finally {
      rmSync(home, { recursive: true, force: true })
    }
  })

  it('never sends a remote readiness request', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await expect(waitForRemoteServerReady('https://remote.example.com', 1000)).rejects.toThrow('disabled')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each(['main', 'pet', 'chat'] as const)('never enables remote mode for a %s window', kind => {
    expect(desktopPreloadArguments(kind, true)).toEqual(kind === 'main' ? [] : [`--hermes-window-kind=${kind}`])
  })
})

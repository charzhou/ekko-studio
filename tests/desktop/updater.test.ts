import { EventEmitter } from 'node:events'
import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  check: vi.fn(), download: vi.fn(), install: vi.fn(), feed: vi.fn(), dialog: vi.fn(),
}))
vi.mock('electron', () => ({ dialog: { showMessageBox: mocks.dialog } }))
vi.mock('electron-updater', async () => ({
  autoUpdater: Object.assign(new EventEmitter(), {
    checkForUpdates: mocks.check, downloadUpdate: mocks.download,
    quitAndInstall: mocks.install, setFeedURL: mocks.feed,
  }),
}))

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('AFY Studio disabled desktop updater', () => {
  it.each(['true', 'false'])('never checks, downloads or installs even with the legacy auto-update flag %s', async flag => {
    vi.stubEnv('HERMES_DESKTOP_ENABLE_AUTO_UPDATE', flag)
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const updater = await import('../../packages/desktop/src/main/updater')
    const beforeInstall = vi.fn()
    updater.initAutoUpdater({ beforeQuitAndInstall: beforeInstall })
    await updater.checkForDesktopUpdates(false)
    await updater.checkForDesktopUpdates(true)
    expect(updater.downloadDesktopUpdate()).toMatchObject({ status: 'idle', version: '' })
    expect(updater.cancelDesktopUpdateDownload()).toMatchObject({ status: 'idle' })
    expect(await updater.installDesktopUpdate()).toMatchObject({ status: 'idle' })
    for (const mock of [...Object.values(mocks), fetchMock, beforeInstall]) expect(mock).not.toHaveBeenCalled()
  })

  it('ignores update events and returns independent legacy state snapshots', async () => {
    const updater = await import('../../packages/desktop/src/main/updater')
    const { autoUpdater } = await import('electron-updater')
    const changed = vi.fn()
    updater.initAutoUpdater({ onStateChange: changed })
    autoUpdater.emit('update-available', { version: '99.0.0' })
    autoUpdater.emit('update-downloaded', { version: '99.0.0' })
    const state = updater.getDesktopUpdateState()
    state.status = 'installing'
    expect(updater.getDesktopUpdateState()).toMatchObject({ status: 'idle', version: '' })
    expect(changed).not.toHaveBeenCalled()
    expect(mocks.install).not.toHaveBeenCalled()
  })
})

import type { DesktopUpdateState } from './updater-types'

interface AutoUpdaterOptions {
  beforeQuitAndInstall?: () => void | Promise<void>
  onInstallFailure?: () => void | Promise<void>
  onStateChange?: (state: DesktopUpdateState) => void
  onShowProgress?: () => void
}

// Keep the released IPC shape for existing renderers. This OEM distribution has
// no update provider, updater listeners, background checks, or installer hooks.
export function getDesktopUpdateState(): DesktopUpdateState {
  return {
    revision: 0, status: 'idle', version: '', percent: null,
    transferred: 0, total: 0, bytesPerSecond: 0,
  }
}

export function initAutoUpdater(_options: AutoUpdaterOptions = {}): void {}

export async function checkForDesktopUpdates(_manual: boolean): Promise<void> {}

export function downloadDesktopUpdate(): DesktopUpdateState {
  return getDesktopUpdateState()
}

export function cancelDesktopUpdateDownload(): DesktopUpdateState {
  return getDesktopUpdateState()
}

export async function installDesktopUpdate(): Promise<DesktopUpdateState> {
  return getDesktopUpdateState()
}

// Legacy names remain exported for compatibility with existing launchers.
export const REMOTE_SERVER_URL_ENV = 'EKKO_STUDIO_DESKTOP_SERVER_URL'
export const REMOTE_SERVER_SETTINGS_NAME = 'desktop-remote-server.json'

export function desktopPreloadArguments(kind: 'main' | 'pet' | 'chat', _remoteMode = false): string[] {
  return kind === 'main' ? [] : [`--hermes-window-kind=${kind}`]
}

export function normalizeRemoteServerUrl(_value: unknown): null { return null }
export function remoteServerUrlFromEnv(_env: NodeJS.ProcessEnv = process.env): null { return null }
export function remoteServerUrlFromSettings(_home?: string): null { return null }
export function resolveRemoteServerUrl(_env: NodeJS.ProcessEnv = process.env, _home?: string): null { return null }
export function remoteReadyTimeoutMs(_env: NodeJS.ProcessEnv = process.env): number { return 30_000 }

export async function waitForRemoteServerReady(_serverUrl: string, _timeoutMs: number): Promise<void> {
  throw new Error('Remote server connections are disabled in Studio')
}

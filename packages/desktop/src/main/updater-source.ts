export function desktopUpdateChannel(_platform = process.platform, _arch = process.arch): string {
  return 'disabled'
}

export type DesktopUpdateSource = { channel: 'disabled'; url: ''; fallbackUrl: '' }

export function validateTestUpdateUrl(_value: unknown): never {
  throw new Error('Desktop updates are disabled in AFY Studio')
}

export function resolveDesktopUpdateSource(_metadata: unknown): DesktopUpdateSource {
  return { channel: 'disabled', url: '', fallbackUrl: '' }
}

export function readDesktopUpdateSource(_appPath: string): DesktopUpdateSource {
  return resolveDesktopUpdateSource(null)
}

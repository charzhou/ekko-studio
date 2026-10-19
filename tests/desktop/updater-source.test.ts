import { describe, expect, it } from 'vitest'
import { desktopUpdateChannel, readDesktopUpdateSource, resolveDesktopUpdateSource, validateTestUpdateUrl } from '../../packages/desktop/src/main/updater-source'

describe('disabled desktop update sources', () => {
  it.each([null, {}, { desktopUpdate: { channel: 'test', url: 'https://updates.example.com' } }])(
    'ignores old package feed metadata: %j', metadata => {
      expect(resolveDesktopUpdateSource(metadata)).toEqual({ channel: 'disabled', url: '', fallbackUrl: '' })
    },
  )

  it('keeps legacy channel callers disabled', () => {
    expect(desktopUpdateChannel('win32', 'x64')).toBe('disabled')
    expect(desktopUpdateChannel('win32', 'arm64')).toBe('disabled')
  })

  it('does not read a package or provide a replacement feed', () => {
    expect(readDesktopUpdateSource('/missing/package')).toMatchObject({ channel: 'disabled' })
    expect(() => validateTestUpdateUrl('https://updates.example.com')).toThrow('disabled')
  })
})

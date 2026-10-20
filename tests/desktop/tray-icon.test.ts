import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('Studio Windows tray icon', () => {
  it('ships and packages the Windows tray asset', () => {
    const config = readFileSync(resolve('packages/desktop/electron-builder.yml'), 'utf8')
    expect(existsSync(resolve('packages/desktop/build/trayWindows.png'))).toBe(true)
    expect(config).toContain('- "trayWindows.png"')
    expect(config).not.toContain('trayMac.png')
    expect(config).not.toContain('trayLinux.png')
  })
})

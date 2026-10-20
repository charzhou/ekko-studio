import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('Studio Windows app icon', () => {
  it('ships the Windows icon assets and references only the Windows icon in packaging', () => {
    const config = readFileSync(resolve('packages/desktop/electron-builder.yml'), 'utf8')
    expect(existsSync(resolve('packages/desktop/build/icon.png'))).toBe(true)
    expect(existsSync(resolve('packages/desktop/build/icon.ico'))).toBe(true)
    expect(config).toContain('productName: Studio')
    expect(config).toContain('icon: build/icon.ico')
    expect(config).not.toContain('mac:')
    expect(config).not.toContain('linux:')
  })
})

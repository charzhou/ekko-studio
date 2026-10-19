import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('Windows-only packaging workflow', () => {
  it('builds a complete x64 installer from the offline runtime artifact', () => {
    const workflow = readFileSync('.github/workflows/desktop-manual-build.yml', 'utf8')
    expect(workflow).toContain('options: [x64]')
    expect(workflow).toContain('needs: runtime')
    expect(workflow).toContain('actions/download-artifact@v4')
    expect(workflow).toContain('path: packages/desktop/resources/runtime')
    expect(workflow).toContain('npm --prefix packages/desktop run dist')
    expect(workflow).toContain('actions/upload-artifact@v4')
    expect(workflow).not.toContain('release_tag')
    expect(workflow).not.toContain('latest.yml')
  })

  it('rejects non-Windows targets in the builder wrapper', () => {
    const script = readFileSync('packages/desktop/scripts/electron-builder.mjs', 'utf8')
    expect(script).toContain('Windows only')
    expect(script).toContain("arg === '-m' || arg === '-l'")
  })
})

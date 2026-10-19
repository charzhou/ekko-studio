import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function read(path: string): string {
  return readFileSync(resolve(path), 'utf8')
}

describe('Sharp runtime packaging guardrails', () => {
  it('provides a production runtime smoke test command', () => {
    const packageJson = JSON.parse(read('package.json')) as { scripts?: Record<string, string> }

    expect(packageJson.scripts?.['verify:sharp-runtime']).toBe('node scripts/verify-sharp-runtime.mjs')
  })

  it('runs the smoke test after production pruning in the Windows desktop workflow', () => {
    const source = read('.github/workflows/desktop-manual-build.yml')
    const pruneIndex = source.indexOf('npm prune --omit=dev')
    const smokeTestIndex = source.indexOf('npm run verify:sharp-runtime')

    expect(pruneIndex).toBeGreaterThan(-1)
    expect(smokeTestIndex).toBeGreaterThan(pruneIndex)
    expect(source).toContain('target_arch')
    expect(source).toContain('windows-latest')
    expect(source).toContain('windows-11-arm')
  })
})
